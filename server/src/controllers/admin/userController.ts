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
      tagId: req.query.tagId ? toInt(req.query.tagId, 0) : undefined,
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

/* -------------------------------- 用户标签 -------------------------------- */

const tagNameSchema = z.object({ name: z.string().trim().min(1).max(30) })

export const tags = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await adminUserService.listTags())
})

export const createTag = asyncHandler(async (req: Request, res: Response) => {
  const { name } = tagNameSchema.parse(req.body)
  sendOk(res, await adminUserService.createTag(name), '标签已创建')
})

export const updateTag = asyncHandler(async (req: Request, res: Response) => {
  const { name } = tagNameSchema.parse(req.body)
  sendOk(res, await adminUserService.updateTag(toInt(req.params.id, 0), name), '标签已更新')
})

export const removeTag = asyncHandler(async (req: Request, res: Response) => {
  await adminUserService.deleteTag(toInt(req.params.id, 0))
  sendOk(res, null, '标签已删除')
})

export const setTags = asyncHandler(async (req: Request, res: Response) => {
  const { tagIds } = z.object({ tagIds: z.array(z.number().int().positive()) }).parse(req.body)
  sendOk(res, await adminUserService.setUserTags(toInt(req.params.id, 0), tagIds), '标签已保存')
})

export const adjustBalance = asyncHandler(async (req: Request, res: Response) => {
  const { change } = z.object({ change: z.number().finite() }).parse(req.body)
  sendOk(res, await adminUserService.adjustBalance(toInt(req.params.id, 0), change), '余额已调整')
})
