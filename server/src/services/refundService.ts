import { Op, type WhereOptions } from 'sequelize'
import { sequelize } from '../config/database'
import {
  FinanceRecord,
  InventoryLog,
  Order,
  OrderItem,
  OrderRefund,
  PaymentRecord,
  ProductSku,
} from '../models'
import { AppError } from '../utils/errors'
import {
  BALANCE_LOG_TYPE,
  ERR,
  FINANCE_TYPE,
  INVENTORY_TYPE,
  ORDER_STATUS,
  PAY_CHANNEL,
  PAY_STATUS,
  REFUND_STATUS,
  REFUND_TYPE,
  POINTS_TYPE,
} from '../constants'
import { generateNo } from '../utils/helpers'
import { formatDate } from '../utils/serializers'
import { writeOrderLog } from '../utils/orderLog'
import { applyPoints } from './pointsService'
import { applyBalance } from './walletService'
import { syncProductAggregate } from '../utils/productAggregate'
import { getPaymentAdapter } from '../adapters/payment'
import type { PayChannel } from '../adapters/payment'

const refundInclude = [
  { model: Order, as: 'order' },
  { model: OrderItem, as: 'item' },
]

type RefundRow = OrderRefund & { order?: Order | null; item?: OrderItem | null }

function toRefundDto(r: RefundRow) {
  return {
    id: Number(r.id),
    refundNo: r.refundNo,
    orderId: Number(r.orderId),
    orderNo: r.order?.orderNo ?? '',
    orderItemId: r.orderItemId ? Number(r.orderItemId) : null,
    productName: r.item?.productName ?? '',
    productImage: r.item?.productImage ?? '',
    type: r.type,
    reason: r.reason ?? '',
    amount: Number(r.amount),
    images: r.images ?? [],
    status: r.status,
    auditRemark: r.auditRemark ?? '',
    auditAt: r.auditAt ? formatDate(r.auditAt) : null,
    createdAt: formatDate(r.createdAt),
  }
}

/** 审核拒绝后按订单已有时间戳推断应回退的状态 */
function inferStatus(order: Order): number {
  if (order.receiveTime) return ORDER_STATUS.FINISHED
  if (order.shipTime) return ORDER_STATUS.SHIPPED
  return ORDER_STATUS.PAID
}

const REFUNDABLE_STATUS: number[] = [ORDER_STATUS.PAID, ORDER_STATUS.SHIPPED, ORDER_STATUS.FINISHED]

export interface ApplyRefundInput {
  orderNo: string
  orderItemId?: number
  type: number
  reason: string
  amount?: number
  images?: string[]
}

/** 用户申请售后：订单转「退款中」，明细标记申请中 */
export async function applyRefund(userId: number, input: ApplyRefundInput) {
  return sequelize.transaction(async (transaction) => {
    const order = await Order.findOne({
      where: { orderNo: input.orderNo, userId, userDeleted: 0 },
      include: [{ model: OrderItem, as: 'items' }],
      transaction,
    })
    if (!order) throw AppError.notFound('订单不存在')
    if (!REFUNDABLE_STATUS.includes(order.status)) {
      throw new AppError('当前订单状态不可申请售后', ERR.ORDER_STATUS_INVALID)
    }

    const items = (order.get('items') as OrderItem[] | undefined) ?? []
    let item: OrderItem | null = null
    if (input.orderItemId) {
      item = items.find((i) => Number(i.id) === input.orderItemId) ?? null
      if (!item) throw AppError.notFound('订单商品不存在')
    }

    const paid = Number(order.paidAmount) > 0 ? Number(order.paidAmount) : Number(order.payAmount)
    const amount = input.amount ?? (item ? Number(item.subtotal) : paid)
    if (amount <= 0 || amount > paid) throw new AppError('退款金额不合法', ERR.PARAM)

    const refund = await OrderRefund.create(
      {
        refundNo: generateNo('RF'),
        orderId: Number(order.id),
        orderItemId: item ? Number(item.id) : null,
        userId,
        type: input.type,
        reason: input.reason,
        amount: amount.toFixed(2),
        images: input.images ?? null,
        status: REFUND_STATUS.PENDING,
      },
      { transaction },
    )

    if (item) {
      item.refundStatus = 1
      await item.save({ transaction })
    }
    order.status = ORDER_STATUS.REFUNDING
    await order.save({ transaction })

    await writeOrderLog(
      Number(order.id),
      'refund_apply',
      `user:${userId}`,
      `申请售后（${refund.refundNo}），金额 ¥${amount.toFixed(2)}`,
      transaction,
    )

    return toRefundDto(refund as unknown as RefundRow)
  })
}

export async function listMyRefunds(userId: number) {
  const rows = await OrderRefund.findAll({
    where: { userId },
    include: refundInclude,
    order: [['id', 'DESC']],
  })
  return rows.map((r) => toRefundDto(r as unknown as RefundRow))
}

export interface AdminRefundQuery {
  status?: number
  orderNo?: string
  page?: number
  pageSize?: number
}

export async function listRefunds(query: AdminRefundQuery = {}) {
  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10))
  const conditions: WhereOptions[] = []
  if (query.status !== undefined) conditions.push({ status: query.status })
  const where: WhereOptions = conditions.length ? { [Op.and]: conditions } : {}

  const orderWhere = query.orderNo ? { orderNo: { [Op.like]: `%${query.orderNo}%` } } : undefined

  const { rows, count } = await OrderRefund.findAndCountAll({
    where,
    include: [{ model: Order, as: 'order', where: orderWhere, required: Boolean(orderWhere) }, { model: OrderItem, as: 'item' }],
    order: [['id', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    distinct: true,
  })

  return {
    list: rows.map((r) => toRefundDto(r as unknown as RefundRow)),
    page,
    pageSize,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  }
}

/** 真正执行退款：调用支付适配器、回补库存、写财务流水、关闭售后单 */
async function executeRefund(
  refund: OrderRefund,
  order: Order,
  operator: string,
  transaction: import('sequelize').Transaction,
  logAction: 'refund_approve' | 'refund_receive',
): Promise<void> {
  const payRecord = await PaymentRecord.findOne({
    where: { orderId: order.id, status: PAY_STATUS.SUCCESS },
    transaction,
  })
  const channel = (order.payType ?? PAY_CHANNEL.SANDBOX) as PayChannel
  const result = await getPaymentAdapter(channel).refund({
    payNo: payRecord?.payNo ?? '',
    amount: refund.amount,
    reason: refund.reason ?? undefined,
  })
  if (!result.success) throw new AppError('退款执行失败', ERR.PAY_FAILED)

  // 余额支付：退款原路回到账户余额，并写资金流水
  if (channel === PAY_CHANNEL.BALANCE) {
    await applyBalance(
      order.userId,
      BALANCE_LOG_TYPE.REFUND,
      Number(refund.amount),
      `订单 ${order.orderNo} 售后退款`,
      refund.refundNo,
      transaction,
    )
  }

  refund.status = REFUND_STATUS.REFUNDED
  await refund.save({ transaction })

  if (payRecord) {
    payRecord.status = PAY_STATUS.REFUNDED
    await payRecord.save({ transaction })
  }

  const items = refund.orderItemId
    ? [await OrderItem.findByPk(refund.orderItemId, { transaction })]
    : await OrderItem.findAll({ where: { orderId: order.id }, transaction })

  const salesByProduct = new Map<number, number>()
  for (const item of items) {
    if (!item) continue
    item.refundStatus = 2
    await item.save({ transaction })
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
        remark: `售后退款回补库存（${refund.refundNo}）`,
      },
      { transaction },
    )
    const pid = Number(sku.productId)
    // 赠品未计入销量，回补库存但不回退销量
    if (!item.isGift) salesByProduct.set(pid, (salesByProduct.get(pid) ?? 0) + item.quantity)
  }
  for (const [pid, qty] of salesByProduct) {
    await syncProductAggregate(pid, transaction, -qty)
  }

  await FinanceRecord.create(
    {
      orderId: Number(order.id),
      type: FINANCE_TYPE.REFUND,
      amount: refund.amount,
      channel: order.payType ?? null,
      status: 1,
      occurredAt: new Date(),
    },
    { transaction },
  )

  order.status = ORDER_STATUS.REFUNDED
  await order.save({ transaction })

  // 整单退款退回积分抵现（U-64）；部分退款不退回，避免出现套利
  if (order.pointsUsed > 0 && Number(refund.amount) >= Number(order.paidAmount)) {
    await applyPoints(
      Number(order.userId),
      POINTS_TYPE.DEDUCT,
      order.pointsUsed,
      `订单 ${order.orderNo} 售后退款退回积分`,
      transaction,
    )
  }

  await writeOrderLog(
    Number(order.id),
    logAction,
    operator,
    `${refund.refundNo}：退款 ¥${Number(refund.amount).toFixed(2)}`,
    transaction,
  )
}

/** 后台审核：仅退款直接退款；退货退款/换货先进入「待收货」，收货后再完成售后 */
export async function auditRefund(
  refundId: number,
  input: { approve: boolean; remark?: string },
  operator: string,
) {
  return sequelize.transaction(async (transaction) => {
    const refund = await OrderRefund.findByPk(refundId, { transaction, lock: transaction.LOCK.UPDATE })
    if (!refund) throw AppError.notFound('售后单不存在')
    if (refund.status !== REFUND_STATUS.PENDING) throw new AppError('该售后单已处理', ERR.PARAM)

    const order = await Order.findByPk(refund.orderId, { transaction, lock: transaction.LOCK.UPDATE })
    if (!order) throw AppError.notFound('订单不存在')

    refund.auditRemark = input.remark ?? ''
    refund.auditAt = new Date()

    if (!input.approve) {
      refund.status = REFUND_STATUS.REJECTED
      await refund.save({ transaction })
      if (refund.orderItemId) {
        const item = await OrderItem.findByPk(refund.orderItemId, { transaction })
        if (item) {
          item.refundStatus = 3
          await item.save({ transaction })
        }
      }
      order.status = inferStatus(order)
      await order.save({ transaction })
      await writeOrderLog(
        Number(order.id),
        'refund_reject',
        operator,
        `${refund.refundNo}：${input.remark || '不符合售后条件'}`,
        transaction,
      )
      return toRefundDto(refund as unknown as RefundRow)
    }

    // 仅退款：审核通过立即退款；退货退款/换货：先等待商家收到退货
    if (refund.type === REFUND_TYPE.REFUND_ONLY) {
      await executeRefund(refund, order, operator, transaction, 'refund_approve')
    } else {
      refund.status = REFUND_STATUS.AWAITING_RETURN
      await refund.save({ transaction })
      await writeOrderLog(
        Number(order.id),
        'refund_agree',
        operator,
        `${refund.refundNo}：同意${refund.type === REFUND_TYPE.EXCHANGE ? '换货' : '退货退款'}，等待收货`,
        transaction,
      )
    }

    return toRefundDto(refund as unknown as RefundRow)
  })
}

/** 后台确认收到退货：退货退款执行退款并回补库存，换货直接完成 */
export async function receiveReturn(refundId: number, operator: string, remark?: string) {
  return sequelize.transaction(async (transaction) => {
    const refund = await OrderRefund.findByPk(refundId, { transaction, lock: transaction.LOCK.UPDATE })
    if (!refund) throw AppError.notFound('售后单不存在')
    if (refund.status !== REFUND_STATUS.AWAITING_RETURN) {
      throw new AppError('该售后单不在待收货状态', ERR.PARAM)
    }

    const order = await Order.findByPk(refund.orderId, { transaction, lock: transaction.LOCK.UPDATE })
    if (!order) throw AppError.notFound('订单不存在')
    if (remark) refund.auditRemark = remark

    if (refund.type === REFUND_TYPE.EXCHANGE) {
      refund.status = REFUND_STATUS.EXCHANGED
      await refund.save({ transaction })
      if (refund.orderItemId) {
        const item = await OrderItem.findByPk(refund.orderItemId, { transaction })
        if (item) {
          item.refundStatus = 0
          await item.save({ transaction })
        }
      }
      order.status = inferStatus(order)
      await order.save({ transaction })
      await writeOrderLog(
        Number(order.id),
        'refund_receive',
        operator,
        `${refund.refundNo}：换货完成`,
        transaction,
      )
    } else {
      await executeRefund(refund, order, operator, transaction, 'refund_receive')
    }

    return toRefundDto(refund as unknown as RefundRow)
  })
}
