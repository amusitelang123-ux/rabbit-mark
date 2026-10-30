import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as aiAdminService from '../../services/aiAdminService'

const listSchema = z.object({
  keyword: z.string().trim().max(64).optional(),
  status: z.coerce.number().int().min(0).max(3).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
})

const idSchema = z.object({ id: z.coerce.number().int().positive() })

/** 后台：AI 会话列表 */
export const conversations = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await aiAdminService.listConversations(listSchema.parse(req.query)))
})

/** 后台：会话消息详情 */
export const messages = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idSchema.parse(req.params)
  const data = await aiAdminService.getConversationMessages(id)
  sendOk(res, data ?? [])
})

/** 后台：用量、成本与知识库规模 */
export const usage = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await aiAdminService.usageStats())
})

/** 后台：重建知识库（FAQ / 公告 / 物流 / 运费 / 平台规则） */
export const rebuild = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await aiAdminService.rebuildKnowledge(), '知识库已重建')
})
