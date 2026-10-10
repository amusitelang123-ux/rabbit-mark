import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { toUploadUrl } from '../../middlewares/upload'
import { sendOk } from '../../utils/response'
import { AppError } from '../../utils/errors'
import * as adminProductService from '../../services/adminProductService'
import { toCsv } from '../../utils/csv'
import { toInt } from '../../utils/helpers'

const productSchema = z.object({
  name: z.string().min(1).max(200),
  subtitle: z.string().max(255).optional(),
  categoryId: z.number().int().positive(),
  brandId: z.number().int().positive().nullable().optional(),
  mainImage: z.string().max(255).optional(),
  detailHtml: z.string().optional(),
  unit: z.string().max(20).optional(),
  weight: z.number().nonnegative().optional(),
  isRecommend: z.boolean().optional(),
  sort: z.number().int().optional(),
  status: z.number().int().min(0).max(1).optional(),
  images: z.array(z.string()).optional(),
  attributes: z
    .array(z.object({ name: z.string().min(1), value: z.string().min(1), sort: z.number().int().optional() }))
    .optional(),
})

const skuSchema = z.object({
  specJson: z.record(z.string()),
  specText: z.string().max(200).optional(),
  image: z.string().max(255).optional(),
  price: z.number().nonnegative(),
  marketPrice: z.number().nonnegative().optional(),
  costPrice: z.number().nonnegative().optional(),
  stock: z.number().int().nonnegative().optional(),
  warnStock: z.number().int().nonnegative().optional(),
  weight: z.number().nonnegative().optional(),
  status: z.number().int().min(0).max(1).optional(),
})

const generateSchema = z.object({
  groups: z
    .array(z.object({ name: z.string().min(1), values: z.array(z.string().min(1)) }))
    .min(1),
  defaults: skuSchema.partial().omit({ specJson: true }).optional(),
})

export const list = asyncHandler(async (req: Request, res: Response) => {
  sendOk(
    res,
    await adminProductService.listProducts({
      keyword: req.query.keyword ? String(req.query.keyword) : undefined,
      categoryId: req.query.categoryId ? toInt(req.query.categoryId, 0) : undefined,
      status: req.query.status !== undefined ? toInt(req.query.status, 0) : undefined,
      page: toInt(req.query.page, 1),
      pageSize: toInt(req.query.pageSize, 10),
    }),
  )
})

export const detail = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await adminProductService.getProduct(toInt(req.params.id, 0)))
})

export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = productSchema.parse(req.body)
  sendOk(res, await adminProductService.createProduct(input), '商品已创建')
})

export const update = asyncHandler(async (req: Request, res: Response) => {
  const input = productSchema.partial().parse(req.body)
  sendOk(res, await adminProductService.updateProduct(toInt(req.params.id, 0), input), '商品已更新')
})

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await adminProductService.deleteProduct(toInt(req.params.id, 0))
  sendOk(res, null, '商品已删除')
})

export const setStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = z.object({ status: z.number().int().min(0).max(1) }).parse(req.body)
  sendOk(res, await adminProductService.setProductStatus(toInt(req.params.id, 0), status as 0 | 1), '状态已更新')
})

/* -------------------------------- 批量操作 -------------------------------- */

export const batchStatus = asyncHandler(async (req: Request, res: Response) => {
  const input = z
    .object({
      ids: z.array(z.number().int().positive()).min(1, '请先选择商品'),
      status: z.number().int().min(0).max(1),
    })
    .parse(req.body)
  sendOk(
    res,
    await adminProductService.batchSetStatus(input.ids, input.status as 0 | 1),
    input.status === 1 ? '批量上架完成' : '批量下架完成',
  )
})

export const batchRemove = asyncHandler(async (req: Request, res: Response) => {
  const { ids } = z.object({ ids: z.array(z.number().int().positive()).min(1, '请先选择商品') }).parse(req.body)
  sendOk(res, await adminProductService.batchDelete(ids), '批量删除完成')
})

export const skus = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await adminProductService.listSkus(toInt(req.params.id, 0)))
})

export const createSku = asyncHandler(async (req: Request, res: Response) => {
  const input = skuSchema.parse(req.body)
  sendOk(res, await adminProductService.createSku(toInt(req.params.id, 0), input), 'SKU 已创建')
})

export const updateSku = asyncHandler(async (req: Request, res: Response) => {
  const input = skuSchema.partial().parse(req.body)
  sendOk(res, await adminProductService.updateSku(toInt(req.params.id, 0), input), 'SKU 已更新')
})

export const removeSku = asyncHandler(async (req: Request, res: Response) => {
  await adminProductService.deleteSku(toInt(req.params.id, 0))
  sendOk(res, null, 'SKU 已删除')
})

export const generateSkus = asyncHandler(async (req: Request, res: Response) => {
  const input = generateSchema.parse(req.body)
  sendOk(
    res,
    await adminProductService.generateSkus(toInt(req.params.id, 0), input.groups, input.defaults ?? {}),
    'SKU 已生成',
  )
})

export const adjustStock = asyncHandler(async (req: Request, res: Response) => {
  const input = z
    .object({ change: z.number().int(), remark: z.string().max(255).optional() })
    .parse(req.body)
  sendOk(
    res,
    await adminProductService.adjustStock(toInt(req.params.id, 0), input, `admin:${req.auth!.uid}`),
    '库存已调整',
  )
})

export const upload = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new AppError('请选择要上传的图片')
  sendOk(res, { url: toUploadUrl('products', req.file.filename) }, '上传成功')
})

/* ------------------------------ 导入 / 导出 ------------------------------- */

/** 下载商品导入模板（CSV，含示例行） */
export const importTemplate = asyncHandler(async (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="product-import-template.csv"')
  res.send(adminProductService.productImportTemplate())
})

/** 导入商品：请求体传 CSV 文本，逐行容错 */
export const importCsv = asyncHandler(async (req: Request, res: Response) => {
  const { csv } = z.object({ csv: z.string().min(1, '缺少 CSV 内容') }).parse(req.body)
  sendOk(res, await adminProductService.importProducts(csv, `admin:${req.auth!.uid}`), '导入完成')
})

/** 导出商品清单（CSV，带 BOM） */
export const exportCsv = asyncHandler(async (req: Request, res: Response) => {
  const list = await adminProductService.exportProducts({
    keyword: req.query.keyword ? String(req.query.keyword) : undefined,
    categoryId: req.query.categoryId ? toInt(req.query.categoryId, 0) : undefined,
    status: req.query.status !== undefined ? toInt(req.query.status, 0) : undefined,
  })

  const csv = toCsv(
    adminProductService.PRODUCT_EXPORT_HEADER,
    list.map((p) => [
      p.id,
      p.name,
      p.categoryName,
      p.brandName,
      p.price.toFixed(2),
      p.stock,
      p.salesCount,
      p.status === 1 ? '上架' : '下架',
      p.createdAt,
    ]),
  )

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="products-${Date.now()}.csv"`)
  res.send(csv)
})
