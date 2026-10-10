import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as refundService from '../../services/refundService'

const applySchema = z.object({
  orderNo: z.string().min(1),
  orderItemId: z.number().int().positive().optional(),
  type: z.number().int().min(1).max(3),
  reason: z.string().min(1).max(255),
  amount: z.number().positive().optional(),
  images: z.array(z.string()).optional(),
})

export const apply = asyncHandler(async (req: Request, res: Response) => {
  const input = applySchema.parse(req.body)
  sendOk(res, await refundService.applyRefund(req.auth!.uid, input), '售后申请已提交')
})

export const mine = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await refundService.listMyRefunds(req.auth!.uid))
})
