import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import { toUploadUrl } from '../../middlewares/upload'
import { AppError } from '../../utils/errors'
import * as feedbackService from '../../services/feedbackService'
import * as settingsService from '../../services/settingsService'

const feedbackSchema = z.object({
  type: z.number().int().min(1).max(3),
  content: z.string().min(5, '请至少填写 5 个字').max(2000),
  images: z.array(z.string()).max(6).optional(),
  contact: z.string().max(100).optional(),
  orderNo: z.string().max(32).optional(),
})

const listQuerySchema = z.object({
  orderNo: z.string().trim().max(32).optional(),
})

/** 提交留言工单（咨询 / 投诉 / 建议） */
export const create = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await feedbackService.createFeedback(req.auth!.uid, feedbackSchema.parse(req.body)), '提交成功')
})

/** 我的工单与回复进度；支持按订单号筛选 */
export const mine = asyncHandler(async (req: Request, res: Response) => {
  const { orderNo } = listQuerySchema.parse(req.query)
  sendOk(res, await feedbackService.listMyFeedbacks(req.auth!.uid, orderNo))
})

/** 留言凭证上传：返回可访问 URL，最多随留言提交 6 张 */
export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new AppError('请选择要上传的图片')
  sendOk(res, { url: toUploadUrl('feedbacks', req.file.filename) }, '上传成功')
})

/** 公开的系统配置（站点名称、客服信息） */
export const publicConfig = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await settingsService.publicSettings())
})
