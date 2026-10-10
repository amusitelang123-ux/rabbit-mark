import { createHash } from 'crypto'
import { config } from '../../config'
import { AppError } from '../../utils/errors'
import { ERR } from '../../constants'
import type {
  CallbackPayload,
  PayChannel,
  PaymentAdapter,
  PrepayInput,
  PrepayResult,
  QueryResult,
  RefundInput,
  RefundResult,
} from './types'

/** 沙箱签名：md5(payNo + secret)，用于模拟网关验签 */
function sign(payNo: string): string {
  return createHash('md5').update(`${payNo}${config.adapter.paySecret}`).digest('hex')
}

export class SandboxPaymentAdapter implements PaymentAdapter {
  readonly name = 'sandbox'

  async prepay(input: PrepayInput): Promise<PrepayResult> {
    const token = sign(input.payNo)
    return {
      payNo: input.payNo,
      channel: input.channel,
      amount: input.amount,
      payParams: { sandboxToken: token, channel: String(input.channel) },
      payUrl: `/pay/sandbox?payNo=${input.payNo}&token=${token}`,
    }
  }

  parseCallback(_channel: PayChannel, raw: unknown): CallbackPayload {
    const body = (raw ?? {}) as Record<string, unknown>
    const payNo = String(body.payNo ?? '')
    if (!payNo) throw new AppError('支付回调缺少支付单号', ERR.PAY_FAILED)
    if (String(body.sandboxToken ?? '') !== sign(payNo)) {
      throw new AppError('沙箱支付验签失败', ERR.PAY_FAILED)
    }
    return {
      payNo,
      thirdPartyNo: `SANDBOX${Date.now()}`,
      amount: String(body.amount ?? '0'),
      success: body.success === undefined ? true : Boolean(body.success),
      raw: JSON.stringify(body),
      paidAt: new Date(),
    }
  }

  async query(_payNo: string): Promise<QueryResult> {
    // 沙箱无异步网关，真实状态以本地 payment_records 为准
    return { status: 'PENDING' }
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    return { success: true, refundNo: `R${input.payNo}${Date.now()}` }
  }
}

export const sandboxAdapter = new SandboxPaymentAdapter()
