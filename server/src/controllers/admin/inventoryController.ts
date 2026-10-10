import type { Request, Response } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as inventoryService from '../../services/inventoryService'
import { toInt } from '../../utils/helpers'

/** 库存预警列表 */
export const alerts = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await inventoryService.listStockAlerts({
    page: toInt(req.query.page, 1),
    pageSize: toInt(req.query.pageSize, 20),
  }))
})

/** 库存变更流水 */
export const logs = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await inventoryService.listInventoryLogs({
    skuId: req.query.skuId ? toInt(req.query.skuId, 0) : undefined,
    type: req.query.type !== undefined ? toInt(req.query.type, 0) : undefined,
    page: toInt(req.query.page, 1),
    pageSize: toInt(req.query.pageSize, 20),
  }))
})
