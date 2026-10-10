import type { Request, Response } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as pointsService from '../../services/pointsService'
import { listActivePromotions } from '../../services/promotionService'

export const myPoints = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await pointsService.listMyPoints(req.auth!.uid))
})

export const signIn = asyncHandler(async (req: Request, res: Response) => {
  const result = await pointsService.signIn(req.auth!.uid)
  sendOk(res, result, `签到成功，获得 ${result.gain} 积分`)
})

/** 结算页展示当前生效的满减活动 */
export const activePromotions = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await listActivePromotions())
})
