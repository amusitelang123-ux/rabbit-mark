import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as contentService from '../../services/contentService'
import { toInt } from '../../utils/helpers'

/* ---------------------------------- FAQ ----------------------------------- */

const faqSchema = z.object({
  category: z.string().min(1).max(50),
  question: z.string().min(1).max(255),
  answer: z.string().max(2000).optional(),
  sort: z.number().int().optional(),
  status: z.number().int().min(0).max(1).optional(),
})

export const faqs = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await contentService.listFaqs())
})

export const createFaq = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await contentService.createFaq(faqSchema.parse(req.body)), 'FAQ 已创建')
})

export const updateFaq = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await contentService.updateFaq(toInt(req.params.id, 0), faqSchema.partial().parse(req.body)), 'FAQ 已更新')
})

export const removeFaq = asyncHandler(async (req: Request, res: Response) => {
  await contentService.deleteFaq(toInt(req.params.id, 0))
  sendOk(res, null, 'FAQ 已删除')
})

/* -------------------------------- 物流公司 -------------------------------- */

const companySchema = z.object({
  name: z.string().min(1).max(50),
  code: z.string().min(1).max(30),
  phone: z.string().max(20).optional(),
  sort: z.number().int().optional(),
  status: z.number().int().min(0).max(1).optional(),
})

export const logisticsCompanies = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await contentService.listLogisticsCompanies())
})

export const createLogisticsCompany = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await contentService.createLogisticsCompany(companySchema.parse(req.body)), '物流公司已创建')
})

export const updateLogisticsCompany = asyncHandler(async (req: Request, res: Response) => {
  sendOk(
    res,
    await contentService.updateLogisticsCompany(toInt(req.params.id, 0), companySchema.partial().parse(req.body)),
    '物流公司已更新',
  )
})

export const removeLogisticsCompany = asyncHandler(async (req: Request, res: Response) => {
  await contentService.deleteLogisticsCompany(toInt(req.params.id, 0))
  sendOk(res, null, '物流公司已删除')
})

/* -------------------------------- 运费模板 -------------------------------- */

const templateSchema = z.object({
  name: z.string().min(1).max(50),
  freeAmount: z.number().nonnegative().optional(),
  baseFreight: z.number().nonnegative().optional(),
  isDefault: z.number().int().min(0).max(1).optional(),
  status: z.number().int().min(0).max(1).optional(),
})

export const freightTemplates = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await contentService.listFreightTemplates())
})

export const createFreightTemplate = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await contentService.createFreightTemplate(templateSchema.parse(req.body)), '运费模板已创建')
})

export const updateFreightTemplate = asyncHandler(async (req: Request, res: Response) => {
  sendOk(
    res,
    await contentService.updateFreightTemplate(toInt(req.params.id, 0), templateSchema.partial().parse(req.body)),
    '运费模板已更新',
  )
})

export const removeFreightTemplate = asyncHandler(async (req: Request, res: Response) => {
  await contentService.deleteFreightTemplate(toInt(req.params.id, 0))
  sendOk(res, null, '运费模板已删除')
})
