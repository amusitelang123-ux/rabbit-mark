import type { Request, Response } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as contentService from '../../services/contentService'

/** 帮助中心：FAQ 按分类分组 */
export const faqGroups = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await contentService.faqGroups())
})

/** 帮助中心：启用中的物流公司（用于展示合作快递） */
export const logisticsCompanies = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await contentService.listLogisticsCompanies(true))
})
