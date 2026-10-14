import type { Request, Response } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as noticeService from '../../services/noticeService'
import { toInt } from '../../utils/helpers'

/** 公告列表（用户端）：仅返回启用中且已发布的公告 */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit !== undefined ? toInt(req.query.limit, 20) : 20
  sendOk(res, await noticeService.listPublished(limit))
})

/** 公告详情（用户端） */
export const detail = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await noticeService.getPublished(toInt(req.params.id, 0)))
})
