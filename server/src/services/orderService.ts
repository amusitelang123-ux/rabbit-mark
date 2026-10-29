import { Op, type WhereOptions } from 'sequelize'
import { sequelize } from '../config/database'
import {
  Cart,
  FinanceRecord,
  InventoryLog,
  Order,
  OrderItem,
  OrderLog,
  OrderLogistics,
  Product,
  ProductSku,
  UserAddress,
} from '../models'
import { AppError } from '../utils/errors'
import { ERR, FINANCE_TYPE, INVENTORY_TYPE, ORDER_STATUS } from '../constants'
import { generateNo, round2 } from '../utils/helpers'
import { syncProductAggregate } from '../utils/productAggregate'
import { writeOrderLog } from '../utils/orderLog'
import { calcPromotionDiscount } from './promotionService'
import {
  consumeCoupon,
  findBestCoupon,
  findUsableCoupon,
  restoreCoupon,
  type CouponLine,
  type CouponSelection,
} from './couponService'
import { calcFreight } from './contentService'
import { awardForOrder } from './pointsService'
import { releaseSeckill, reserveSeckill } from './seckillService'
import { formatDate, toOrderDto } from '../utils/serializers'

const orderInclude = [
  { model: OrderItem, as: 'items' },
  { model: OrderLogistics, as: 'logistics' },
]

/** 详情查询才带上操作日志，列表查询不带（避免 N+1 与响应膨胀） */

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

    // 促销叠加顺序（企划 3.1.5）：商品原价 → 秒杀价 → 满减 → 优惠券 → 运费
    let originalTotal = 0
    let goodsTotal = 0
    const snapshots: {
      product: Product | null
      sku: ProductSku | null
      quantity: number
      originalSubtotal: number
      subtotal: number
      seckillProductId: number | null
    }[] = []

    for (const row of cartRows) {
      const product = row.get('product') as Product | null
      const cartSku = row.get('sku') as ProductSku | null
      if (!product || !cartSku || product.status !== 1 || cartSku.status !== 1) {
        throw new AppError(`商品「${product?.name ?? ''}」已下架`, ERR.PRODUCT_OFF_SHELF)
      }
      // 显式对 SKU 行加锁，避免不同用户购物车并发下单造成超卖
      const sku = await ProductSku.findByPk(cartSku.id, { transaction, lock: transaction.LOCK.UPDATE })
      if (!sku) throw new AppError(`「${product.name}」库存不足`, ERR.STOCK_NOT_ENOUGH)
      const available = sku.stock - sku.lockedStock
      if (available < row.quantity) {
        throw new AppError(`「${product.name}」库存不足`, ERR.STOCK_NOT_ENOUGH)
      }

      // 第 2 环：秒杀价（名额足够时同事务行锁预扣；名额不足则按原价成交，不阻断下单）
      const seckill = await reserveSeckill(
        userId,
        Number(product.id),
        Number(sku.id),
        row.quantity,
        transaction,
      )
      const originalSubtotal = round2(Number(sku.price) * row.quantity)
      const unitPrice = seckill ? seckill.seckillPrice : Number(sku.price)
      const subtotal = round2(unitPrice * row.quantity)

      originalTotal += originalSubtotal
      goodsTotal += subtotal
      snapshots.push({
        product,
        sku,
        quantity: row.quantity,
        originalSubtotal,
        subtotal,
        seckillProductId: seckill?.seckillProductId ?? null,
      })
    }
    originalTotal = round2(originalTotal)
    goodsTotal = round2(goodsTotal)
    /** 第 2 环快照：秒杀让利 = 原价总额 - 秒杀后商品额 */
    const seckillAmount = round2(originalTotal - goodsTotal)

    // 第 5 环：运费取自后台运费模板（默认模板），未配置时回退内置规则
    const freightAmount = await calcFreight(goodsTotal, transaction)

    // 第 4 环：优惠券（范围/门槛/有效期都按秒杀后金额校验）
    // couponId = 0 表示用户明确不使用；不传则由服务端自动匹配最优券。
    const couponLines: CouponLine[] = snapshots.map((snap) => ({
      productId: Number(snap.product!.id),
      categoryId: Number(snap.product!.categoryId),
      amount: snap.subtotal,
    }))
    let couponSelection: CouponSelection | null = null
    if (input.couponId === undefined) {
      couponSelection = await findBestCoupon(userId, couponLines, transaction)
    } else if (input.couponId > 0) {
      couponSelection = await findUsableCoupon(userId, input.couponId, couponLines, transaction)
    }
    const couponAmount = couponSelection?.discount ?? 0

    // 第 3 环：满减活动，按秒杀后商品额匹配最优档位
    const promotion = await calcPromotionDiscount(goodsTotal, transaction)
    const promotionAmount = promotion.discount

    const discountAmount = round2(seckillAmount + promotionAmount + couponAmount)
    const payAmount = round2(Math.max(0, originalTotal + freightAmount - discountAmount))

    const order = await Order.create(
      {
        orderNo: generateNo('XTX'),
        userId,
        status: ORDER_STATUS.PENDING_PAY,
        totalAmount: originalTotal.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        seckillAmount: seckillAmount.toFixed(2),
        promotionAmount: promotionAmount.toFixed(2),
        couponAmount: couponAmount.toFixed(2),
        freightAmount: freightAmount.toFixed(2),
        payAmount: payAmount.toFixed(2),
        couponId: couponSelection ? Number(couponSelection.userCoupon.id) : null,
        receiverName: address.receiver,
        receiverPhone: address.phone,
        receiverAddress: `${address.province}${address.city}${address.district}${address.detail}`,
        remark: input.remark ?? '',
        source: input.source ?? 1,
      },
      { transaction },
    )

    for (const snap of snapshots) {
      const { product, sku, quantity, originalSubtotal, subtotal, seckillProductId } = snap
      if (!product || !sku) continue
      await OrderItem.create(
        {
          orderId: Number(order.id),
          productId: Number(product.id),
          skuId: Number(sku.id),
          productName: product.name,
          skuSpecText: sku.specText ?? '',
          productImage: sku.image ?? product.mainImage ?? '',
          price: quantity ? (subtotal / quantity).toFixed(2) : sku.price,
          originalPrice: quantity ? (originalSubtotal / quantity).toFixed(2) : sku.price,
          seckillProductId,
          quantity,
          subtotal: subtotal.toFixed(2),
          discountAmount: round2(originalSubtotal - subtotal).toFixed(2),
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

    if (couponSelection) {
      await consumeCoupon(couponSelection, Number(order.id), transaction)
    }

    await writeOrderLog(
      Number(order.id),
      'create',
      `user:${userId}`,
      `提交订单，应付 ¥${payAmount.toFixed(2)}`,
      transaction,
    )

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

export interface AdminOrderQuery {
  orderNo?: string
  userId?: number
  status?: number
  startTime?: string
  endTime?: string
  page?: number
  pageSize?: number
}

function buildAdminOrderWhere(query: AdminOrderQuery): WhereOptions {
  const conditions: WhereOptions[] = []
  if (query.status) conditions.push({ status: query.status })
  if (query.userId) conditions.push({ userId: query.userId })
  if (query.orderNo) conditions.push({ orderNo: { [Op.like]: `%${query.orderNo}%` } } as WhereOptions)
  if (query.startTime || query.endTime) {
    const range: { [Op.gte]?: Date; [Op.lte]?: Date } = {}
    if (query.startTime) range[Op.gte] = new Date(query.startTime)
    if (query.endTime) range[Op.lte] = new Date(query.endTime)
    conditions.push({ createdAt: range } as WhereOptions)
  }
  return conditions.length ? { [Op.and]: conditions } : {}
}

/** 管理端订单列表（不限定用户，支持多条件筛选） */
export async function listAllOrders(query: AdminOrderQuery = {}) {
  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10))
  const where = buildAdminOrderWhere(query)

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

/** 导出用：按筛选条件取订单（上限 5000 条） */
export async function exportOrders(query: AdminOrderQuery = {}) {
  const where = buildAdminOrderWhere(query)
  const rows = await Order.findAll({
    where,
    include: orderInclude,
    order: [['id', 'DESC']],
    limit: 5000,
  })
  return rows.map((o) => toOrderDto(o as unknown as Parameters<typeof toOrderDto>[0]))
}

/** 管理端订单详情（不限用户） */
export async function getOrderAdmin(orderNo: string) {
  const order = await Order.findOne({
    where: { orderNo },
    include: [...orderInclude, { model: OrderLog, as: 'logs', order: [['id', 'ASC']] }],
  })
  if (!order) throw AppError.notFound('订单不存在')
  return toOrderDto(order as unknown as Parameters<typeof toOrderDto>[0])
}

/** 后台发货：仅「待发货」订单可发货，写入物流信息并转已发货 */
export async function shipOrder(
  orderNo: string,
  input: { company: string; trackingNo: string; traces?: { time: string; text: string }[] },
  operator: string,
) {
  return sequelize.transaction(async (transaction) => {
    const order = await Order.findOne({ where: { orderNo }, transaction, lock: transaction.LOCK.UPDATE })
    if (!order) throw AppError.notFound('订单不存在')
    if (order.status !== ORDER_STATUS.PAID) {
      throw new AppError('当前订单状态不可发货', ERR.ORDER_STATUS_INVALID)
    }
    const now = new Date()
    const traces = input.traces?.length
      ? input.traces
      : [{ time: formatDate(now), text: '商品已出库，等待快递揽收' }]
    const logistics = await OrderLogistics.findOne({ where: { orderId: order.id }, transaction })
    if (logistics) {
      logistics.company = input.company
      logistics.trackingNo = input.trackingNo
      logistics.status = 1
      logistics.traces = traces
      await logistics.save({ transaction })
    } else {
      await OrderLogistics.create(
        {
          orderId: Number(order.id),
          company: input.company,
          trackingNo: input.trackingNo,
          status: 1,
          traces,
        },
        { transaction },
      )
    }
    order.status = ORDER_STATUS.SHIPPED
    order.shipTime = now
    await order.save({ transaction })
    await writeOrderLog(
      Number(order.id),
      'ship',
      operator,
      `${input.company} ${input.trackingNo}`,
      transaction,
    )
    const full = await Order.findByPk(order.id, { include: orderInclude, transaction })
    return toOrderDto(full as unknown as Parameters<typeof toOrderDto>[0])
  })
}

/** 批量发货：逐单处理，单笔失败不影响其它（返回失败明细） */
export async function batchShip(
  orders: { orderNo: string; company: string; trackingNo: string }[],
  operator: string,
) {
  if (!orders.length) throw new AppError('请先选择订单', ERR.PARAM)

  const succeeded: string[] = []
  const failed: { orderNo: string; reason: string }[] = []

  for (const item of orders) {
    try {
      if (!item.company || !item.trackingNo) throw new Error('缺少物流公司或运单号')
      await shipOrder(item.orderNo, { company: item.company, trackingNo: item.trackingNo }, operator)
      succeeded.push(item.orderNo)
    } catch (e) {
      failed.push({ orderNo: item.orderNo, reason: e instanceof Error ? e.message : '发货失败' })
    }
  }

  if (!succeeded.length) {
    throw new AppError(
      `全部 ${orders.length} 笔订单发货失败：${failed[0]?.orderNo} ${failed[0]?.reason}`,
      ERR.PARAM,
    )
  }
  return { succeeded: succeeded.length, failed }
}

/** 后台关闭订单：待付款释放锁定库存；已付款回补真实库存并提示线下退款 */export async function closeOrder(orderNo: string, reason: string, operator: string) {
  return sequelize.transaction(async (transaction) => {
    const order = await Order.findOne({ where: { orderNo }, transaction, lock: transaction.LOCK.UPDATE })
    if (!order) throw AppError.notFound('订单不存在')

    if (order.status === ORDER_STATUS.PENDING_PAY) {
      await releaseLockedStock(Number(order.id), operator, transaction)
      await restoreCoupon(
        Number(order.id),
        order.couponId ? Number(order.couponId) : null,
        transaction,
      )
    } else if (order.status === ORDER_STATUS.PAID) {
      const items = await OrderItem.findAll({ where: { orderId: order.id }, transaction })
      for (const item of items) {
        const sku = await ProductSku.findByPk(item.skuId, { transaction, lock: transaction.LOCK.UPDATE })
        if (!sku) continue
        const before = sku.stock
        sku.stock += item.quantity
        await sku.save({ transaction })
        await InventoryLog.create(
          {
            skuId: Number(sku.id),
            type: INVENTORY_TYPE.MANUAL_ADJUST,
            change: item.quantity,
            before,
            after: sku.stock,
            operator,
            remark: `后台关单回补库存（订单 ${order.orderNo}）`,
          },
          { transaction },
        )
        await syncProductAggregate(Number(sku.productId), transaction)
      }
      order.adminRemark = `${order.adminRemark ?? ''}[后台关单] 已付款订单关闭，需线下退款：${reason}`.slice(0, 255)
    } else {
      throw new AppError('当前订单状态不可关闭', ERR.ORDER_STATUS_INVALID)
    }

    order.status = ORDER_STATUS.CLOSED
    order.closeTime = new Date()
    await order.save({ transaction })
    await writeOrderLog(Number(order.id), 'admin_close', operator, reason, transaction)
    const full = await Order.findByPk(order.id, { include: orderInclude, transaction })
    return toOrderDto(full as unknown as Parameters<typeof toOrderDto>[0])
  })
}

export async function updateAdminRemark(orderNo: string, remark: string, operator: string) {
  return sequelize.transaction(async (transaction) => {
    const order = await Order.findOne({ where: { orderNo }, transaction })
    if (!order) throw AppError.notFound('订单不存在')
    order.adminRemark = remark
    await order.save({ transaction })
    await writeOrderLog(Number(order.id), 'remark', operator, remark, transaction)
    return { orderNo: order.orderNo, adminRemark: order.adminRemark ?? '' }
  })
}

export async function getOrder(userId: number, orderNo: string) {
  const order = await Order.findOne({
    where: { orderNo, userId },
    include: [...orderInclude, { model: OrderLog, as: 'logs', order: [['id', 'ASC']] }],
  })
  if (!order) throw AppError.notFound('订单不存在')
  return toOrderDto(order as unknown as Parameters<typeof toOrderDto>[0])
}

export async function cancelOrder(userId: number, orderNo: string) {
  return sequelize.transaction(async (transaction) => {
    const order = await Order.findOne({
      where: { orderNo, userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    })
    if (!order) throw AppError.notFound('订单不存在')
    if (order.status !== ORDER_STATUS.PENDING_PAY) {
      throw new AppError('当前订单状态不可取消', ERR.ORDER_STATUS_INVALID)
    }
    await releaseLockedStock(Number(order.id), `user:${userId}`, transaction)
    await restoreCoupon(
      Number(order.id),
      order.couponId ? Number(order.couponId) : null,
      transaction,
    )
    order.status = ORDER_STATUS.CLOSED
    order.closeTime = new Date()
    await order.save({ transaction })
    await writeOrderLog(Number(order.id), 'cancel', `user:${userId}`, '用户取消订单', transaction)
    return toOrderDto(order as unknown as Parameters<typeof toOrderDto>[0])
  })
}

export async function confirmOrder(userId: number, orderNo: string) {
  return sequelize.transaction(async (transaction) => {
    const order = await Order.findOne({
      where: { orderNo, userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    })
    if (!order) throw AppError.notFound('订单不存在')
    if (order.status !== ORDER_STATUS.SHIPPED) {
      throw new AppError('当前订单状态不可确认收货', ERR.ORDER_STATUS_INVALID)
    }
    order.status = ORDER_STATUS.FINISHED
    order.receiveTime = new Date()
    order.finishTime = new Date()
    await order.save({ transaction })

    await writeOrderLog(Number(order.id), 'confirm', `user:${userId}`, '用户确认收货', transaction)

    // 订单完成赠送积分（1 元 = 1 积分），失败不阻断收货
    await awardForOrder(
      userId,
      order.orderNo,
      Number(order.paidAmount) || Number(order.payAmount),
      transaction,
    )

    return toOrderDto(order as unknown as Parameters<typeof toOrderDto>[0])
  })
}

/**
 * 支付成功：扣减真实库存 + 释放锁定库存 + 订单转已付款。
 * 必须在支付回调的同一事务内调用；对非「待付款」订单直接返回，保证回调幂等与关单竞态安全。
 */
export async function applyPaymentSuccess(
  orderId: number,
  input: { payType: number; payTime: Date; paidAmount: string; payNo: string },
  transaction: import('sequelize').Transaction,
): Promise<void> {
  const order = await Order.findByPk(orderId, { transaction, lock: transaction.LOCK.UPDATE })
  if (!order) throw AppError.notFound('订单不存在')
  if (order.status !== ORDER_STATUS.PENDING_PAY) return

  const items = await OrderItem.findAll({ where: { orderId }, transaction })
  const salesByProduct = new Map<number, number>()
  for (const item of items) {
    const sku = await ProductSku.findByPk(item.skuId, { transaction, lock: transaction.LOCK.UPDATE })
    if (!sku) continue
    const before = sku.stock
    sku.stock = Math.max(0, sku.stock - item.quantity)
    sku.lockedStock = Math.max(0, sku.lockedStock - item.quantity)
    await sku.save({ transaction })
    await InventoryLog.create(
      {
        skuId: Number(sku.id),
        type: INVENTORY_TYPE.PAID_DEDUCT,
        change: -item.quantity,
        before,
        after: sku.stock,
        operator: `pay:${input.payNo}`,
        remark: '支付成功扣减库存',
      },
      { transaction },
    )
    const pid = Number(sku.productId)
    salesByProduct.set(pid, (salesByProduct.get(pid) ?? 0) + item.quantity)
  }

  for (const [productId, qty] of salesByProduct) {
    await syncProductAggregate(productId, transaction, qty)
  }

  await FinanceRecord.create(
    {
      orderId,
      type: FINANCE_TYPE.INCOME,
      amount: input.paidAmount,
      channel: input.payType,
      status: 1,
      occurredAt: input.payTime,
    },
    { transaction },
  )

  order.status = ORDER_STATUS.PAID
  order.payType = input.payType
  order.payTime = input.payTime
  order.paidAmount = input.paidAmount
  await order.save({ transaction })

  await writeOrderLog(
    orderId,
    'pay',
    'system',
    `支付成功，实付 ¥${input.paidAmount}（${input.payNo}）`,
    transaction,
  )
}

async function releaseLockedStock(
  orderId: number,
  operator: string,
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
        type: INVENTORY_TYPE.CANCEL_RELEASE,
        change: -item.quantity,
        before,
        after: sku.lockedStock,
        operator,
        remark: '取消订单回退锁定库存',
      },
      { transaction },
    )
  }
  // 同步释放下单时预扣的秒杀库存（仅秒杀明细会命中）
  await releaseSeckill(orderId, transaction)
}

/** 待支付订单超时自动关单（定时任务调用） */
export async function closeExpiredOrders(minutes = 30) {
  const deadline = new Date(Date.now() - minutes * 60 * 1000)
  const candidates = await Order.findAll({
    where: { status: ORDER_STATUS.PENDING_PAY, createdAt: { [Op.lt]: deadline } },
  })

  let closed = 0
  for (const candidate of candidates) {
    const didClose = await sequelize.transaction(async (transaction) => {
      // 事务内重新加锁并确认仍是待付款，避免与支付回调/用户取消互相覆盖
      const order = await Order.findOne({
        where: { id: candidate.id, status: ORDER_STATUS.PENDING_PAY },
        transaction,
        lock: transaction.LOCK.UPDATE,
      })
      if (!order) return false

      await releaseLockedStock(Number(order.id), 'system:auto-close', transaction)
      await restoreCoupon(
        Number(order.id),
        order.couponId ? Number(order.couponId) : null,
        transaction,
      )
      order.status = ORDER_STATUS.CLOSED
      order.closeTime = new Date()
      await order.save({ transaction })
      await writeOrderLog(
        Number(order.id),
        'auto_close',
        'system',
        `待支付超 ${minutes} 分钟自动关闭`,
        transaction,
      )
      return true
    })
    if (didClose) closed += 1
  }
  return closed
}
