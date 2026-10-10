import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as commentService from '../../services/commentService'

const createSchema = z.object({
  orderItemId: z.number().int().positive(),
  score: z.number().int().min(1).max(5),
  content: z.string().min(1).max(1000),
  images: z.array(z.string()).optional(),
  isAnonymous: z.boolean().optional(),
})

export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = createSchema.parse(req.body)
  sendOk(res, await commentService.createComment(req.auth!.uid, input), '评价发布成功')
})

export const mine = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await commentService.myComments(req.auth!.uid))
})
