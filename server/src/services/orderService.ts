import { Op } from 'sequelize'
import { sequelize } from '../config/database'
import {
  Cart,
  Coupon,
  InventoryLog,
  Order,
  OrderItem,
  OrderLogistics,
  Product,
  ProductSku,
  UserAddress,
  UserCoupon,
} from '../models'
import { AppError } from '../utils/errors'
import { ERR, ORDER_STATUS } from '../constants'
import { generateNo, round2 } from '../utils/helpers'
import { toOrderDto } from '../utils/serializers'

const orderInclude = [
  { model: OrderItem, as: 'items' },
  { model: OrderLogistics, as: 'logistics' },
]

interface CreateOrderInput {
  addressId?: number
  couponId?: number
  remark?: string
  source?: number
}

export async function createOrder(userId: number, input: CreateOrderInput) {
  return sequelize.transaction(async (transaction) => {
    const cartRows = await Cart.findAll({
      where: { userId, selected: 1 },
      include: [
        { model: Product, as: 'product' },
        { model: ProductSku, as: 'sku' },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    })
    if (!cartRows.length) throw new AppError('购物车中没有选中的商品', ERR.CART_EMPTY)

    const address = input.addressId
      ? await UserAddress.findOne({ where: { id: input.addressId, userId }, transaction })
      : await UserAddress.findOne({ where: { userId }, order: [['isDefault', 'DESC']], transaction })
    if (!address) throw new AppError('请先选择收货地址', ERR.PARAM)

    let goodsTotal = 0
    const snapshots: {
      product: Product | null
      sku: ProductSku | null
      quantity: number
      subtotal: number
    }[] = []

    for (const row of cartRows) {
      const product = row.get('product') as Product | null
      const sku = row.get('sku') as ProductSku | null
      if (!product || !sku || product.status !== 1 || sku.status !== 1) {
        throw new AppError(`商品「${product?.name ?? ''}」已下架`, ERR.PRODUCT_OFF_SHELF)
      }
      const available = sku.stock - sku.lockedStock
      if (available < row.quantity) {
        throw new AppError(`「${product.name}」库存不足`, ERR.STOCK_NOT_ENOUGH)
      }
      const subtotal = round2(Number(sku.price) * row.quantity)
      goodsTotal += subtotal
      snapshots.push({ product, sku, quantity: row.quantity, subtotal })
    }
    goodsTotal = round2(goodsTotal)

    const freightAmount = goodsTotal >= 99 ? 0 : 8

    let couponAmount = 0
    let userCoupon: UserCoupon | null = null
    if (input.couponId) {
      userCoupon = await UserCoupon.findOne({
        where: { id: input.couponId, userId, status: 0 },
        transaction,
      })
      if (!userCoupon) throw new AppError('优惠券不可用', ERR.COUPON_INVALID)
      const coupon = await Coupon.findByPk(userCoupon.couponId, { transaction })
      if (!coupon || goodsTotal < Number(coupon.minAmount)) {
        throw new AppError('未达到优惠券使用门槛', ERR.COUPON_INVALID)
      }
      couponAmount =
        coupon.type === 1
          ? Math.min(Number(coupon.amount), goodsTotal)
          : round2(goodsTotal * (1 - Number(coupon.discountRate)))
    }

    const payAmount = round2(goodsTotal + freightAmount - couponAmount)

    const order = await Order.create(
      {
        orderNo: generateNo('XTX'),
        userId,
        status: ORDER_STATUS.PENDING_PAY,
        totalAmount: goodsTotal.toFixed(2),
        discountAmount: couponAmount.toFixed(2),
        couponAmount: couponAmount.toFixed(2),
        freightAmount: freightAmount.toFixed(2),
        payAmount: payAmount.toFixed(2),
        couponId: userCoupon ? Number(userCoupon.id) : null,
        receiverName: address.receiver,
        receiverPhone: address.phone,
        receiverAddress: `${address.province}${address.city}${address.district}${address.detail}`,
        remark: input.remark ?? '',
        source: input.source ?? 1,
      },
      { transaction },
    )

    for (const snap of snapshots) {
      const { product, sku, quantity, subtotal } = snap
      if (!product || !sku) continue
      await OrderItem.create(
        {
          orderId: Number(order.id),
          productId: Number(product.id),
          skuId: Number(sku.id),
          productName: product.name,
          skuSpecText: sku.specText ?? '',
          productImage: sku.image ?? product.mainImage ?? '',
          price: sku.price,
          quantity,
          subtotal: subtotal.toFixed(2),
        },
        { transaction },
      )
      const before = sku.lockedStock
      sku.lockedStock = before + quantity
      await sku.save({ transaction })
      await InventoryLog.create(
        {
          skuId: Number(sku.id),
          type: 2,
          change: quantity,
          before,
          after: sku.lockedStock,
          operator: `user:${userId}`,
          remark: `订单 ${order.orderNo} 锁定库存`,
        },
        { transaction },
      )
    }

    if (userCoupon) {
      userCoupon.status = 1
      userCoupon.orderId = Number(order.id)
      userCoupon.usedAt = new Date()
      await userCoupon.save({ transaction })
    }

    await Cart.destroy({ where: { userId, selected: 1 }, transaction })

    const full = await Order.findByPk(order.id, { include: orderInclude, transaction })
    return toOrderDto(full as unknown as Parameters<typeof toOrderDto>[0])
  })
}

export async function listOrders(userId: number, status?: number) {
  const where: Record<string, unknown> = { userId }
  if (status) where.status = status
  const rows = await Order.findAll({ where, include: orderInclude, order: [['id', 'DESC']] })
  return rows.map((o) => toOrderDto(o as unknown as Parameters<typeof toOrderDto>[0]))
}

/** 管理端订单列表（不限定用户） */
export async function listAllOrders(status?: number, page = 1, pageSize = 10) {
  const where: Record<string, unknown> = {}
  if (status) where.status = status
  const { rows, count } = await Order.findAndCountAll({
    where,
    include: orderInclude,
    order: [['id', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    distinct: true,
  })
  return {
    list: rows.map((o) => toOrderDto(o as unknown as Parameters<typeof toOrderDto>[0])),
    page,
    pageSize,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  }
}

export async function getOrder(userId: number, orderNo: string) {
  const order = await Order.findOne({ where: { orderNo, userId }, include: orderInclude })
  if (!order) throw AppError.notFound('订单不存在')
  return toOrderDto(order as unknown as Parameters<typeof toOrderDto>[0])
}

export async function cancelOrder(userId: number, orderNo: string) {
  return sequelize.transaction(async (transaction) => {
    const order = await Order.findOne({ where: { orderNo, userId }, transaction })
    if (!order) throw AppError.notFound('订单不存在')
    if (order.status !== ORDER_STATUS.PENDING_PAY) {
      throw new AppError('当前订单状态不可取消', ERR.ORDER_STATUS_INVALID)
    }
    await releaseLockedStock(Number(order.id), userId, transaction)
    order.status = ORDER_STATUS.CLOSED
    order.closeTime = new Date()
    await order.save({ transaction })
    return toOrderDto(order as unknown as Parameters<typeof toOrderDto>[0])
  })
}

export async function confirmOrder(userId: number, orderNo: string) {
  const order = await Order.findOne({ where: { orderNo, userId } })
  if (!order) throw AppError.notFound('订单不存在')
  if (order.status !== ORDER_STATUS.SHIPPED) {
    throw new AppError('当前订单状态不可确认收货', ERR.ORDER_STATUS_INVALID)
  }
  order.status = ORDER_STATUS.FINISHED
  order.receiveTime = new Date()
  order.finishTime = new Date()
  await order.save()
  return toOrderDto(order as unknown as Parameters<typeof toOrderDto>[0])
}

async function releaseLockedStock(
  orderId: number,
  userId: number,
  transaction: import('sequelize').Transaction,
) {
  const items = await OrderItem.findAll({ where: { orderId }, transaction })
  for (const item of items) {
    const sku = await ProductSku.findByPk(item.skuId, { transaction, lock: transaction.LOCK.UPDATE })
    if (!sku) continue
    const before = sku.lockedStock
    sku.lockedStock = Math.max(0, before - item.quantity)
    await sku.save({ transaction })
    await InventoryLog.create(
      {
        skuId: Number(sku.id),
        type: 4,
        change: -item.quantity,
        before,
        after: sku.lockedStock,
        operator: `user:${userId}`,
        remark: '取消订单回退锁定库存',
      },
      { transaction },
    )
  }
}

/** 待支付订单超时自动关单（定时任务调用） */
export async function closeExpiredOrders(minutes = 30) {
  const deadline = new Date(Date.now() - minutes * 60 * 1000)
  const expired = await Order.findAll({
    where: { status: ORDER_STATUS.PENDING_PAY, createdAt: { [Op.lt]: deadline } },
  })
  for (const order of expired) {
    await sequelize.transaction(async (transaction) => {
      await releaseLockedStock(Number(order.id), Number(order.userId), transaction)
      order.status = ORDER_STATUS.CLOSED
      order.closeTime = new Date()
      await order.save({ transaction })
    })
  }
  return expired.length
}
