import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as adminProductService from '../../services/adminProductService'
import { toInt } from '../../utils/helpers'

const specSchema = z.object({
  name: z.string().min(1).max(50),
  sort: z.number().int().optional(),
  values: z.array(z.string().min(1)).optional(),
})

export const groups = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await adminProductService.listSpecGroups())
})

export const createGroup = asyncHandler(async (req: Request, res: Response) => {
  const input = specSchema.parse(req.body)
  sendOk(res, await adminProductService.createSpecGroup(input), '规格组已创建')
})

export const updateGroup = asyncHandler(async (req: Request, res: Response) => {
  const input = specSchema.partial().parse(req.body)
  sendOk(res, await adminProductService.updateSpecGroup(toInt(req.params.id, 0), input), '规格组已更新')
})

export const removeGroup = asyncHandler(async (req: Request, res: Response) => {
  await adminProductService.deleteSpecGroup(toInt(req.params.id, 0))
  sendOk(res, null, '规格组已删除')
})
