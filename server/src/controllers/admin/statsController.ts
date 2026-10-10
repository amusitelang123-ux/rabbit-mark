import type { Request, Response } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as statsService from '../../services/statsService'
import { toInt } from '../../utils/helpers'

export const salesTrend = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await statsService.salesTrend(toInt(req.query.days, 30)))
})

export const productRank = asyncHandler(async (req: Request, res: Response) => {
  const sortBy = req.query.sortBy === 'amount' ? 'amount' : 'sales'
  sendOk(res, await statsService.productRank(sortBy, toInt(req.query.limit, 10)))
})

export const categorySales = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await statsService.categorySales())
})

export const userAnalysis = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await statsService.userAnalysis(toInt(req.query.days, 30)))
})
