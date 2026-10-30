import type { Request, Response } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as statsService from '../../services/statsService'
import { toInt } from '../../utils/helpers'
export const salesTrend = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await statsService.salesTrend(toInt(req.query.days, 30)))
})

export const productRank = asyncHandler(async (req: Request, res: Response) => {
  const raw = String(req.query.sortBy ?? 'sales')
  const sortBy = raw === 'amount' || raw === 'cart' ? raw : 'sales'
  sendOk(res, await statsService.productRank(sortBy, toInt(req.query.limit, 10)))
})

export const categorySales = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await statsService.categorySales())
})

export const userAnalysis = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await statsService.userAnalysis(toInt(req.query.days, 30)))
})

/** 每日经营预聚合（stat_daily） */
export const daily = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await statsService.listDailyStats(toInt(req.query.days, 30)))
})

/** 订单状态分布（A-55） */
export const orderStatus = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await statsService.orderStatusDistribution())
})

/** 活动数据（A-45） */
export const marketing = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await statsService.marketingActivityStats())
})

/** 统计报表导出（A-56）：?type=sales|rank|category|status */
export const exportStats = asyncHandler(async (req: Request, res: Response) => {
  const allowed: statsService.StatsExportType[] = ['sales', 'rank', 'category', 'status']
  const raw = String(req.query.type ?? 'sales') as statsService.StatsExportType
  const type = allowed.includes(raw) ? raw : 'sales'
  const csv = await statsService.exportStatsCsv(type)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="stats-${type}-${Date.now()}.csv"`)
  res.send(csv)
})
