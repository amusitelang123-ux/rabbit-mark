import { Op, fn, col, type Transaction } from 'sequelize'
import { Order, OrderItem, Product, ProductSku, SeckillActivity, SeckillProduct } from '../models'
import { AppError } from '../utils/errors'
import { ERR, ORDER_STATUS } from '../constants'
import { formatDate } from '../utils/serializers'

/**
 * 计入每人限购的订单状态。
 * 必须包含「待付款」：下单时已预扣秒杀库存，未支付订单同样占用名额，
 * 否则用户可通过反复下单绕过限购。
 */
const COUNTED_STATUS: number[] = [
  ORDER_STATUS.PENDING_PAY,
  ORDER_STATUS.PAID,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.FINISHED,
  ORDER_STATUS.REFUNDING,
  ORDER_STATUS.REFUNDED,
]

/** 进行中的秒杀活动（含商品、剩余库存、限购） */
export async function listActiveSeckills(transaction?: Transaction) {
  const now = new Date()
  const activities = await SeckillActivity.findAll({
    where: { status: 1, startTime: { [Op.lte]: now }, endTime: { [Op.gte]: now } },
    order: [['endTime', 'ASC']],
    transaction,
  })

  const result = []
  for (const activity of activities) {
    const items = await SeckillProduct.findAll({
      where: { activityId: activity.id },
      include: [
        { model: Product, as: 'product' },
        { model: ProductSku, as: 'sku' },
      ],
      order: [['sort', 'ASC']],
      transaction,
    })
    result.push({
      id: Number(activity.id),
      name: activity.name,
      startTime: formatDate(activity.startTime),
      endTime: formatDate(activity.endTime),
      endTimestamp: activity.endTime.getTime(),
      products: items.map((item) => {
        const product = item.get('product') as Product | null
        const sku = item.get('sku') as ProductSku | null
        return {
          id: Number(item.id),
          productId: Number(item.productId),
          skuId: Number(item.skuId),
          productName: product?.name ?? '',
          productImage: product?.mainImage ?? '',
          skuSpecText: sku?.specText ?? '',
          originalPrice: Number(sku?.price ?? 0),
          seckillPrice: Number(item.seckillPrice),
          remaining: Math.max(0, item.seckillStock - item.soldCount),
          limitPerUser: item.limitPerUser,
        }
      }),
    })
  }
  return result
}

/**
 * 查询某 SKU 当前生效的秒杀商品行。
 * 传 transaction 时会加行锁，用于下单时的库存预扣与防超卖。
 */
export async function findActiveSeckill(
  productId: number,
  skuId: number,
  transaction?: Transaction,
): Promise<SeckillProduct | null> {
  const now = new Date()
  return SeckillProduct.findOne({
    where: { productId, skuId },
    include: [
      {
        model: SeckillActivity,
        as: 'activity',
        where: { status: 1, startTime: { [Op.lte]: now }, endTime: { [Op.gte]: now } },
        required: true,
      },
    ],
    // 理论上同一 SKU 不会存在多个并行秒杀（创建时已校验），此处再按最优价兜底
    order: [
      ['seckillPrice', 'ASC'],
      ['id', 'ASC'],
    ],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  })
}

/** 用户在该秒杀商品上已购买的数量（按已支付及之后的订单统计） */
export async function countUserSeckillBought(
  userId: number,
  seckillProductId: number,
  transaction?: Transaction,
): Promise<number> {
  const row = (await OrderItem.findOne({
    where: { seckillProductId },
    attributes: [[fn('COALESCE', fn('SUM', col('quantity')), 0), 'qty']],
    include: [
      {
        model: Order,
        as: 'order',
        where: { userId, status: { [Op.in]: COUNTED_STATUS } },
        required: true,
        attributes: [],
      },
    ],
    raw: true,
    transaction,
  })) as unknown as { qty: string | number } | null
  return Number(row?.qty ?? 0)
}

export interface SeckillReservation {
  seckillProductId: number
  originalPrice: number
  seckillPrice: number
}

/**
 * 下单时校验并预扣秒杀库存。
 * 校验项：剩余库存充足、未超每人限购；通过后 sold_count += quantity（同事务行锁）。
 */
export async function reserveSeckill(
  userId: number,
  productId: number,
  skuId: number,
  quantity: number,
  transaction: Transaction,
): Promise<SeckillReservation | null> {
  const seckill = await findActiveSeckill(productId, skuId, transaction)
  if (!seckill) return null

  const remaining = seckill.seckillStock - seckill.soldCount
  if (remaining < quantity) {
    throw new AppError('秒杀库存不足', ERR.STOCK_NOT_ENOUGH)
  }

  const bought = await countUserSeckillBought(userId, Number(seckill.id), transaction)
  if (bought + quantity > seckill.limitPerUser) {
    throw new AppError(`该秒杀商品每人限购 ${seckill.limitPerUser} 件`, ERR.PARAM)
  }

  seckill.soldCount += quantity
  await seckill.save({ transaction })

  const sku = await ProductSku.findByPk(skuId, { transaction })
  return {
    seckillProductId: Number(seckill.id),
    originalPrice: Number(sku?.price ?? seckill.seckillPrice),
    seckillPrice: Number(seckill.seckillPrice),
  }
}

/** 取消 / 超时关单时释放已预扣的秒杀库存 */
export async function releaseSeckill(
  orderId: number,
  transaction: Transaction,
): Promise<void> {
  const items = await OrderItem.findAll({
    where: { orderId },
    transaction,
  })
  for (const item of items) {
    if (!item.seckillProductId) continue
    const seckill = await SeckillProduct.findByPk(item.seckillProductId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    })
    if (!seckill) continue
    seckill.soldCount = Math.max(0, seckill.soldCount - item.quantity)
    await seckill.save({ transaction })
  }
}
