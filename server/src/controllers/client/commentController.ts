import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { toUploadUrl } from '../../middlewares/upload'
import { sendOk } from '../../utils/response'
import { AppError } from '../../utils/errors'
import * as commentService from '../../services/commentService'

const createSchema = z.object({
  orderItemId: z.number().int().positive(),
  score: z.number().int().min(1).max(5),
  content: z.string().min(1).max(1000),
  images: z.array(z.string().max(255)).max(6).optional(),
  isAnonymous: z.boolean().optional(),
})

export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = createSchema.parse(req.body)
  sendOk(res, await commentService.createComment(req.auth!.uid, input), '评价发布成功')
})

export const mine = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await commentService.myComments(req.auth!.uid))
})

/** 评价晒单图片上传：返回可访问 URL，最多随评价提交 6 张 */
export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new AppError('请选择要上传的图片')
  sendOk(res, { url: toUploadUrl('comments', req.file.filename) }, '上传成功')
})
