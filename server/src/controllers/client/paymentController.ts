import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as paymentService from '../../services/paymentService'
import { PAY_CHANNEL } from '../../constants'
import { toInt } from '../../utils/helpers'
import type { PayChannel } from '../../adapters/payment'

const prepaySchema = z.object({
  orderNo: z.string().min(1),
  channel: z.number().int().min(1).max(4),
})

export const prepay = asyncHandler(async (req: Request, res: Response) => {
  const input = prepaySchema.parse(req.body)
  sendOk(
    res,
    await paymentService.prepay(req.auth!.uid, {
      orderNo: input.orderNo,
      channel: input.channel as PayChannel,
    }),
    '创建支付单成功',
  )
})

/** 支付回调：免鉴权，验签由适配器负责；返回网关约定格式 */
export const callback = asyncHandler(async (req: Request, res: Response) => {
  const channel = toInt(req.params.channel, PAY_CHANNEL.SANDBOX) as PayChannel
  const result = await paymentService.handleCallback(channel, req.body)
  res.json({ code: 0, message: 'OK', data: result, timestamp: Date.now() })
})

export const status = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await paymentService.queryStatus(req.auth!.uid, req.params.payNo))
})
