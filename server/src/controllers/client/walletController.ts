import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import { PAY_CHANNEL } from '../../constants'
import { toInt } from '../../utils/helpers'
import * as walletService from '../../services/walletService'
import type { PayChannel } from '../../adapters/payment'

const rechargeSchema = z.object({
  amount: z
    .number()
    .positive('充值金额必须大于 0')
    .max(50000, '单笔充值不能超过 ¥50000')
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, '充值金额最多保留 2 位小数'),
  // 充值渠道只允许微信 / 支付宝 / 沙箱，余额不能充值自身
  channel: z.union([z.literal(1), z.literal(2), z.literal(4)]),
})

/** 我的钱包：余额 + 资金明细 + 充值记录 */
export const mine = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await walletService.getWallet(req.auth!.uid))
})

/** 创建充值单（用户端余额充值入口） */
export const createRecharge = asyncHandler(async (req: Request, res: Response) => {
  const input = rechargeSchema.parse(req.body ?? {})
  sendOk(
    res,
    await walletService.createRecharge(req.auth!.uid, {
      amount: input.amount,
      channel: input.channel as PayChannel,
    }),
    '充值单已创建',
  )
})

/** 充值状态查询（同步回跳后轮询） */
export const rechargeStatus = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await walletService.queryRechargeStatus(req.auth!.uid, req.params.payNo))
})

/** 充值回调：免鉴权，验签由支付适配器负责 */
export const rechargeCallback = asyncHandler(async (req: Request, res: Response) => {
  const channel = toInt(req.params.channel, PAY_CHANNEL.SANDBOX) as PayChannel
  const result = await walletService.handleRechargeCallback(channel, req.body)
  res.json({ code: 0, message: 'OK', data: result, timestamp: Date.now() })
})
