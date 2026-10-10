import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as adminLevelService from '../../services/adminLevelService'
import { toInt } from '../../utils/helpers'

const levelSchema = z.object({
  name: z.string().min(1).max(50),
  minSpent: z.number().nonnegative().optional(),
  discountRate: z.number().positive().max(1).optional(),
  icon: z.string().max(255).optional(),
  sort: z.number().int().optional(),
  status: z.number().int().min(0).max(1).optional(),
})

export const list = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await adminLevelService.listLevels())
})

export const create = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await adminLevelService.createLevel(levelSchema.parse(req.body)), '等级已创建')
})

export const update = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await adminLevelService.updateLevel(toInt(req.params.id, 0), levelSchema.partial().parse(req.body)), '等级已更新')
})

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await adminLevelService.deleteLevel(toInt(req.params.id, 0))
  sendOk(res, null, '等级已删除')
})
