import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as couponService from '../../services/couponService'

export const center = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await couponService.couponCenter())
})

export const receive = asyncHandler(async (req: Request, res: Response) => {
  const couponId = z.number().int().positive().parse(Number(req.params.id))
  sendOk(res, await couponService.receiveCoupon(req.auth!.uid, couponId), '领取成功')
})

export const mine = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await couponService.myCoupons(req.auth!.uid))
})
