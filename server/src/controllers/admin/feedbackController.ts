import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as feedbackService from '../../services/feedbackService'
import { toInt } from '../../utils/helpers'

export const list = asyncHandler(async (req: Request, res: Response) => {
  sendOk(
    res,
    await feedbackService.listFeedbacks({
      status: req.query.status !== undefined ? toInt(req.query.status, 0) : undefined,
      type: req.query.type !== undefined ? toInt(req.query.type, 0) : undefined,
      keyword: req.query.keyword ? String(req.query.keyword) : undefined,
      page: toInt(req.query.page, 1),
      pageSize: toInt(req.query.pageSize, 10),
    }),
  )
})

export const reply = asyncHandler(async (req: Request, res: Response) => {
  const { content } = z.object({ content: z.string().min(1, '请输入回复内容').max(2000) }).parse(req.body)
  sendOk(
    res,
    await feedbackService.replyFeedback(toInt(req.params.id, 0), content, `admin:${req.auth!.uid}`),
    '回复成功',
  )
})

export const close = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await feedbackService.closeFeedback(toInt(req.params.id, 0)), '工单已关闭')
})
