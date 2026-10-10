import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as commentService from '../../services/commentService'
import { toInt } from '../../utils/helpers'

export const list = asyncHandler(async (req: Request, res: Response) => {
  sendOk(
    res,
    await commentService.listComments({
      status: req.query.status !== undefined ? toInt(req.query.status, 0) : undefined,
      score: req.query.score !== undefined ? toInt(req.query.score, 0) : undefined,
      keyword: req.query.keyword ? String(req.query.keyword) : undefined,
      page: toInt(req.query.page, 1),
      pageSize: toInt(req.query.pageSize, 10),
    }),
  )
})

export const setStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = z.object({ status: z.number().int().min(0).max(1) }).parse(req.body)
  sendOk(res, await commentService.setCommentStatus(toInt(req.params.id, 0), status as 0 | 1), '状态已更新')
})

export const reply = asyncHandler(async (req: Request, res: Response) => {
  const { content } = z.object({ content: z.string().min(1).max(500) }).parse(req.body)
  sendOk(res, await commentService.replyComment(toInt(req.params.id, 0), content), '回复成功')
})
