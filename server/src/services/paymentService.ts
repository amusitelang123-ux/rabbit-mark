import { sequelize } from '../config/database'
import { Order, PaymentRecord } from '../models'
import { AppError } from '../utils/errors'
import { ERR, ORDER_STATUS, PAY_STATUS } from '../constants'
import { generateNo } from '../utils/helpers'
import { getPaymentAdapter } from '../adapters/payment'
import type { PayChannel } from '../adapters/payment'
import * as orderService from './orderService'

export interface PrepayInput {
  orderNo: string
  channel: PayChannel
}

/** 发起支付：校验订单 → 复用/创建支付单 → 调适配器拿支付参数 */
export async function prepay(userId: number, input: PrepayInput) {
  const order = await Order.findOne({ where: { orderNo: input.orderNo, userId } })
  if (!order) throw AppError.notFound('订单不存在')
  if (order.status !== ORDER_STATUS.PENDING_PAY) {
    throw new AppError('当前订单状态不可支付', ERR.ORDER_STATUS_INVALID)
  }

  let record = await PaymentRecord.findOne({
    where: { orderId: Number(order.id), userId, channel: input.channel, status: PAY_STATUS.PENDING },
  })
  if (!record) {
    record = await PaymentRecord.create({
      payNo: generateNo('PAY'),
      orderId: Number(order.id),
      orderNo: order.orderNo,
      userId,
      amount: order.payAmount,
      channel: input.channel,
      status: PAY_STATUS.PENDING,
    })
  }

  const adapter = getPaymentAdapter(input.channel)
  const result = await adapter.prepay({
    payNo: record.payNo,
    orderNo: order.orderNo,
    amount: record.amount,
    subject: `小兔鲜订单 ${order.orderNo}`,
    channel: input.channel,
  })
  record.requestBody = JSON.stringify(result)
  await record.save()

  return {
    payNo: record.payNo,
    amount: Number(record.amount),
    payParams: result.payParams,
    payUrl: result.payUrl ?? null,
  }
}

/**
 * 支付回调：验签 → 幂等判断 → 金额一致性 → 置成功 → 同事务内流转订单与扣减库存。
 * 回调处理与订单状态更新必须原子完成。
 */
export async function handleCallback(channel: PayChannel, raw: unknown) {
  const adapter = getPaymentAdapter(channel)
  const payload = adapter.parseCallback(channel, raw)

  return sequelize.transaction(async (transaction) => {
    const record = await PaymentRecord.findOne({
      where: { payNo: payload.payNo },
      transaction,
      lock: transaction.LOCK.UPDATE,
    })
    if (!record) throw AppError.notFound('支付单不存在')

    // 幂等：已成功的回调重复到达直接返回
    if (record.status === PAY_STATUS.SUCCESS) {
      return { payNo: record.payNo, duplicated: true }
    }

    record.callbackBody = payload.raw
    if (!payload.success) {
      record.status = PAY_STATUS.FAILED
      await record.save({ transaction })
      return { payNo: record.payNo, duplicated: false }
    }

    if (Number(record.amount) !== Number(payload.amount)) {
      throw new AppError('支付金额与订单金额不一致', ERR.PAY_AMOUNT_MISMATCH)
    }

    record.status = PAY_STATUS.SUCCESS
    record.thirdPartyNo = payload.thirdPartyNo
    record.paidAt = payload.paidAt
    await record.save({ transaction })

    await orderService.applyPaymentSuccess(
      Number(record.orderId),
      { payType: channel, payTime: payload.paidAt, paidAmount: record.amount, payNo: record.payNo },
      transaction,
    )

    return { payNo: record.payNo, duplicated: false }
  })
}

/** 支付状态查询（前端轮询兜底） */
export async function queryStatus(userId: number, payNo: string) {
  const record = await PaymentRecord.findOne({ where: { payNo, userId } })
  if (!record) throw new AppError('支付单不存在', ERR.PAY_RECORD_NOT_FOUND)
  const order = await Order.findByPk(record.orderId)
  return {
    payNo: record.payNo,
    payStatus: record.status,
    orderNo: record.orderNo,
    orderStatus: order?.status ?? null,
  }
}
