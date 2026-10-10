import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as adminProductService from '../../services/adminProductService'
import { toInt } from '../../utils/helpers'

const categorySchema = z.object({
  name: z.string().min(1).max(50),
  parentId: z.number().int().nonnegative().optional(),
  icon: z.string().max(255).optional(),
  sort: z.number().int().optional(),
  status: z.number().int().min(0).max(1).optional(),
})

const brandSchema = z.object({
  name: z.string().min(1).max(50),
  logo: z.string().max(255).optional(),
  sort: z.number().int().optional(),
  status: z.number().int().min(0).max(1).optional(),
})

export const tree = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await adminProductService.listCategoryTree())
})

export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = categorySchema.parse(req.body)
  sendOk(res, await adminProductService.createCategory(input), '分类已创建')
})

export const update = asyncHandler(async (req: Request, res: Response) => {
  const input = categorySchema.omit({ parentId: true }).partial().parse(req.body)
  sendOk(res, await adminProductService.updateCategory(toInt(req.params.id, 0), input), '分类已更新')
})

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await adminProductService.deleteCategory(toInt(req.params.id, 0))
  sendOk(res, null, '分类已删除')
})

export const brands = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await adminProductService.listBrands())
})

export const createBrand = asyncHandler(async (req: Request, res: Response) => {
  const input = brandSchema.parse(req.body)
  sendOk(res, await adminProductService.createBrand(input), '品牌已创建')
})

export const updateBrand = asyncHandler(async (req: Request, res: Response) => {
  const input = brandSchema.partial().parse(req.body)
  sendOk(res, await adminProductService.updateBrand(toInt(req.params.id, 0), input), '品牌已更新')
})

export const removeBrand = asyncHandler(async (req: Request, res: Response) => {
  await adminProductService.deleteBrand(toInt(req.params.id, 0))
  sendOk(res, null, '品牌已删除')
})
