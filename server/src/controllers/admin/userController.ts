import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as adminUserService from '../../services/adminUserService'
import * as pointsService from '../../services/pointsService'
import { toInt } from '../../utils/helpers'

export const list = asyncHandler(async (req: Request, res: Response) => {
  sendOk(
    res,
    await adminUserService.listUsers({
      keyword: req.query.keyword ? String(req.query.keyword) : undefined,
      status: req.query.status !== undefined ? toInt(req.query.status, 0) : undefined,
      page: toInt(req.query.page, 1),
      pageSize: toInt(req.query.pageSize, 10),
    }),
  )
})

export const detail = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await adminUserService.getUser(toInt(req.params.id, 0)))
})

export const setStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = z.object({ status: z.number().int().min(0).max(1) }).parse(req.body)
  sendOk(res, await adminUserService.setUserStatus(toInt(req.params.id, 0), status as 0 | 1), '状态已更新')
})

export const points = asyncHandler(async (req: Request, res: Response) => {
  sendOk(
    res,
    await pointsService.listUserPoints(toInt(req.params.id, 0), toInt(req.query.page, 1), toInt(req.query.pageSize, 20)),
  )
})

export const adjustPoints = asyncHandler(async (req: Request, res: Response) => {
  const { change, remark } = z
    .object({ change: z.number().int(), remark: z.string().max(255).optional() })
    .parse(req.body)
  sendOk(res, await pointsService.adminAdjust(toInt(req.params.id, 0), change, remark), '积分已调整')
})
