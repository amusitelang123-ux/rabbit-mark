import type { Request, Response } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as productService from '../../services/productService'
import { AppError } from '../../utils/errors'
import { toInt } from '../../utils/helpers'
import { addFootprint } from '../../services/userService'

export const home = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await productService.getHomeData())
})

export const categories = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await productService.listCategories())
})

export const brands = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await productService.listBrands())
})

export const products = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query
  sendOk(
    res,
    await productService.listProducts({
      categoryId: q.categoryId ? toInt(q.categoryId, 0) : undefined,
      brandId: q.brandId ? toInt(q.brandId, 0) : undefined,
      minPrice: q.minPrice !== undefined ? Number(q.minPrice) : undefined,
      maxPrice: q.maxPrice !== undefined ? Number(q.maxPrice) : undefined,
      keyword: q.keyword ? String(q.keyword) : undefined,
      sortBy: (q.sortBy as productService.ProductListQuery['sortBy']) || 'default',
      page: toInt(q.page, 1),
      pageSize: toInt(q.pageSize, 12),
    }),
  )
})

export const productDetail = asyncHandler(async (req: Request, res: Response) => {
  const id = toInt(req.params.id, 0)
  const product = await productService.getProduct(id)
  if (!product) throw AppError.notFound('商品不存在或已下架')
  if (req.auth) await addFootprint(req.auth.uid, id)
  sendOk(res, product)
})

export const productComments = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await productService.getProductComments(toInt(req.params.id, 0)))
})

export const recommend = asyncHandler(async (req: Request, res: Response) => {
  const id = toInt(req.params.id, 0)
  sendOk(res, await productService.getRecommendProducts(id, toInt(req.query.size, 4)))
})
