import type { PAY_CHANNEL } from '../../constants'

export type PayChannel = (typeof PAY_CHANNEL)[keyof typeof PAY_CHANNEL]

export interface PrepayInput {
  payNo: string
  orderNo: string
  amount: string
  subject: string
  channel: PayChannel
}

export interface PrepayResult {
  payNo: string
  channel: PayChannel
  amount: string
  /** 前端拉起收银台所需参数（真实网关为签名参数包） */
  payParams: Record<string, string>
  /** 网关跳转地址（可选） */
  payUrl?: string
}

export interface CallbackPayload {
  payNo: string
  thirdPartyNo: string
  amount: string
  success: boolean
  /** 原始报文，落库留痕 */
  raw: string
  paidAt: Date
}

export interface QueryResult {
  status: 'PENDING' | 'SUCCESS' | 'FAILED'
  thirdPartyNo?: string
  paidAt?: Date
}

export interface RefundInput {
  payNo: string
  amount: string
  reason?: string
}

export interface RefundResult {
  success: boolean
  refundNo?: string
}

/**
 * 支付适配器抽象。渠道只决定记录字段，实现类接口形态对齐真实网关，
 * 后续新增 wechat / alipay 实现即可平滑替换。
 */
export interface PaymentAdapter {
  readonly name: string
  prepay(input: PrepayInput): Promise<PrepayResult>
  /** 解析并验签回调报文；非法或验签失败抛 AppError */
  parseCallback(channel: PayChannel, raw: unknown): CallbackPayload
  /** 主动查询（回调丢失兜底） */
  query(payNo: string): Promise<QueryResult>
  /** 退款 */
  refund(input: RefundInput): Promise<RefundResult>
}
