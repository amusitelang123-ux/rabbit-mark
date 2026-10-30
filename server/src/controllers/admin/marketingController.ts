import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as marketing from '../../services/adminMarketingService'
import { toInt } from '../../utils/helpers'

const couponSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.number().int().min(1).max(2),
  amount: z.number().nonnegative().optional(),
  discountRate: z.number().positive().max(1).optional(),
  minAmount: z.number().nonnegative().optional(),
  totalCount: z.number().int().nonnegative().optional(),
  perUserLimit: z.number().int().positive().optional(),
  validType: z.number().int().min(1).max(2).optional(),
  validStart: z.string().optional(),
  validEnd: z.string().optional(),
  validDays: z.number().int().positive().optional(),
  scope: z.number().int().min(1).max(3).optional(),
  scopeIds: z.array(z.number().int().positive()).optional(),
  status: z.number().int().min(0).max(1).optional(),
  isNewUser: z.boolean().optional(),
})

const bannerSchema = z.object({
  title: z.string().min(1).max(100),
  subtitle: z.string().max(200).optional(),
  image: z.string().min(1).max(255),
  link: z.string().max(255).optional(),
  bg: z.string().max(50).optional(),
  position: z.string().max(30).optional(),
  sort: z.number().int().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  status: z.number().int().min(0).max(1).optional(),
})

const noticeSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().optional(),
  type: z.number().int().optional(),
  status: z.number().int().min(0).max(1).optional(),
  publishAt: z.string().optional(),
})

/* 优惠券 */
export const coupons = asyncHandler(async (req: Request, res: Response) => {
  sendOk(
    res,
    await marketing.listCoupons({
      keyword: req.query.keyword ? String(req.query.keyword) : undefined,
      status: req.query.status !== undefined ? toInt(req.query.status, 0) : undefined,
      page: toInt(req.query.page, 1),
      pageSize: toInt(req.query.pageSize, 10),
    }),
  )
})

export const createCoupon = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await marketing.createCoupon(couponSchema.parse(req.body)), '优惠券已创建')
})

export const updateCoupon = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await marketing.updateCoupon(toInt(req.params.id, 0), couponSchema.partial().parse(req.body)), '优惠券已更新')
})

export const removeCoupon = asyncHandler(async (req: Request, res: Response) => {
  await marketing.deleteCoupon(toInt(req.params.id, 0))
  sendOk(res, null, '优惠券已删除')
})

/* 运营位 */
export const banners = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await marketing.listBanners())
})

export const createBanner = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await marketing.createBanner(bannerSchema.parse(req.body)), '运营位已创建')
})

export const updateBanner = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await marketing.updateBanner(toInt(req.params.id, 0), bannerSchema.partial().parse(req.body)), '运营位已更新')
})

export const removeBanner = asyncHandler(async (req: Request, res: Response) => {
  await marketing.deleteBanner(toInt(req.params.id, 0))
  sendOk(res, null, '运营位已删除')
})

/* 公告 */
export const notices = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await marketing.listNotices())
})

export const createNotice = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await marketing.createNotice(noticeSchema.parse(req.body)), '公告已创建')
})

export const updateNotice = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await marketing.updateNotice(toInt(req.params.id, 0), noticeSchema.partial().parse(req.body)), '公告已更新')
})

export const removeNotice = asyncHandler(async (req: Request, res: Response) => {
  await marketing.deleteNotice(toInt(req.params.id, 0))
  sendOk(res, null, '公告已删除')
})

/* 秒杀 */
const seckillSchema = z.object({
  name: z.string().min(1).max(100),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  status: z.number().int().min(0).max(1).optional(),
  products: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        skuId: z.number().int().positive(),
        seckillPrice: z.number().nonnegative(),
        seckillStock: z.number().int().nonnegative(),
        limitPerUser: z.number().int().positive().optional(),
        sort: z.number().int().optional(),
      }),
    )
    .optional(),
})

export const seckills = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await marketing.listSeckills())
})

export const createSeckill = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await marketing.createSeckill(seckillSchema.parse(req.body)), '秒杀活动已创建')
})

export const updateSeckill = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await marketing.updateSeckill(toInt(req.params.id, 0), seckillSchema.partial().parse(req.body)), '秒杀活动已更新')
})

export const setSeckillStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = z.object({ status: z.number().int().min(0).max(1) }).parse(req.body)
  sendOk(res, await marketing.setSeckillStatus(toInt(req.params.id, 0), status), '状态已更新')
})

export const removeSeckill = asyncHandler(async (req: Request, res: Response) => {
  await marketing.deleteSeckill(toInt(req.params.id, 0))
  sendOk(res, null, '秒杀活动已删除')
})

/* 满减 / 满赠活动 */
const promotionSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.number().int().min(1).max(2).optional(),
  thresholds: z
    .array(
      z.object({
        amount: z.number().positive(),
        reduce: z.number().nonnegative().optional(),
        giftProductId: z.number().int().positive().optional(),
        giftSkuId: z.number().int().positive().optional(),
        giftQuantity: z.number().int().positive().optional(),
      }),
    )
    .min(1, '至少配置一个活动档位'),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  status: z.number().int().min(0).max(1).optional(),
})

export const promotions = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await marketing.listPromotions())
})

export const createPromotion = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await marketing.createPromotion(promotionSchema.parse(req.body)), '促销活动已创建')
})

export const updatePromotion = asyncHandler(async (req: Request, res: Response) => {
  sendOk(
    res,
    await marketing.updatePromotion(toInt(req.params.id, 0), promotionSchema.partial().parse(req.body)),
    '促销活动已更新',
  )
})

export const removePromotion = asyncHandler(async (req: Request, res: Response) => {
  await marketing.deletePromotion(toInt(req.params.id, 0))
  sendOk(res, null, '满减活动已删除')
})
