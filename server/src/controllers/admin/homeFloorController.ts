import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as homeFloorService from '../../services/homeFloorService'
import { toInt } from '../../utils/helpers'

const floorSchema = z.object({
  title: z.string().trim().min(1, '请填写楼层标题').max(50),
  subtitle: z.string().max(100).optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  sort: z.number().int().optional(),
  status: z.number().int().min(0).max(1).optional(),
  productIds: z.array(z.number().int().positive()).max(20, '单个楼层最多选择 20 个商品').optional(),
})

export const list = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await homeFloorService.listFloors())
})

export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = floorSchema.parse(req.body)
  sendOk(res, await homeFloorService.createFloor(input), '楼层已创建')
})

export const update = asyncHandler(async (req: Request, res: Response) => {
  const input = floorSchema.partial().parse(req.body)
  sendOk(res, await homeFloorService.updateFloor(toInt(req.params.id, 0), input), '楼层已更新')
})

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await homeFloorService.deleteFloor(toInt(req.params.id, 0))
  sendOk(res, null, '楼层已删除')
})
