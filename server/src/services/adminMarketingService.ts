import { Op, type Transaction, type WhereOptions } from 'sequelize'
import { sequelize } from '../config/database'
import { Banner, Coupon, Notice, Product, Promotion, SeckillActivity, SeckillProduct, UserCoupon } from '../models'
import { AppError } from '../utils/errors'
import { ERR } from '../constants'
import { formatDate } from '../utils/serializers'

/* --------------------------------- 优惠券 --------------------------------- */

export interface CouponInput {
  name: string
  type: number
  amount?: number
  discountRate?: number
  minAmount?: number
  totalCount?: number
  perUserLimit?: number
  validType?: number
  validStart?: string
  validEnd?: string
  validDays?: number
  scope?: number
  scopeIds?: number[]
  status?: number
}

function toCouponDto(c: Coupon) {
  return {
    id: Number(c.id),
    name: c.name,
    type: c.type,
    amount: Number(c.amount),
    discountRate: Number(c.discountRate),
    minAmount: Number(c.minAmount),
    totalCount: c.totalCount,
    receivedCount: c.receivedCount,
    usedCount: c.usedCount,
    perUserLimit: c.perUserLimit,
    validType: c.validType,
    validStart: c.validStart ? formatDate(c.validStart) : '',
    validEnd: c.validEnd ? formatDate(c.validEnd) : '',
    validDays: c.validDays,
    scope: c.scope,
    scopeIds: c.scopeIds ?? [],
    status: c.status,
    createdAt: formatDate(c.createdAt),
  }
}

export async function listCoupons(query: { keyword?: string; status?: number; page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10))
  const conditions: WhereOptions[] = []
  if (query.status !== undefined) conditions.push({ status: query.status })
  if (query.keyword) conditions.push({ name: { [Op.like]: `%${query.keyword}%` } } as WhereOptions)
  const where: WhereOptions = conditions.length ? { [Op.and]: conditions } : {}

  const { rows, count } = await Coupon.findAndCountAll({
    where,
    order: [['id', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  })
  return {
    list: rows.map(toCouponDto),
    page,
    pageSize,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  }
}

export async function createCoupon(input: CouponInput) {
  const coupon = await Coupon.create({
    name: input.name,
    type: input.type,
    amount: (input.amount ?? 0).toFixed(2),
    discountRate: (input.discountRate ?? 1).toFixed(2),
    minAmount: (input.minAmount ?? 0).toFixed(2),
    totalCount: input.totalCount ?? 0,
    perUserLimit: input.perUserLimit ?? 1,
    validType: input.validType ?? 1,
    validStart: input.validStart ? new Date(input.validStart) : null,
    validEnd: input.validEnd ? new Date(input.validEnd) : null,
    validDays: input.validDays ?? null,
    scope: input.scope ?? 1,
    scopeIds: input.scopeIds ?? null,
    status: input.status ?? 1,
  })
  return toCouponDto(coupon)
}

export async function updateCoupon(id: number, input: Partial<CouponInput>) {
  const coupon = await Coupon.findByPk(id)
  if (!coupon) throw AppError.notFound('优惠券不存在')
  if (input.name !== undefined) coupon.name = input.name
  if (input.type !== undefined) coupon.type = input.type
  if (input.amount !== undefined) coupon.amount = input.amount.toFixed(2)
  if (input.discountRate !== undefined) coupon.discountRate = input.discountRate.toFixed(2)
  if (input.minAmount !== undefined) coupon.minAmount = input.minAmount.toFixed(2)
  if (input.totalCount !== undefined) coupon.totalCount = input.totalCount
  if (input.perUserLimit !== undefined) coupon.perUserLimit = input.perUserLimit
  if (input.validType !== undefined) coupon.validType = input.validType
  if (input.validStart !== undefined) coupon.validStart = input.validStart ? new Date(input.validStart) : null
  if (input.validEnd !== undefined) coupon.validEnd = input.validEnd ? new Date(input.validEnd) : null
  if (input.validDays !== undefined) coupon.validDays = input.validDays
  if (input.scope !== undefined) coupon.scope = input.scope
  if (input.scopeIds !== undefined) coupon.scopeIds = input.scopeIds
  if (input.status !== undefined) coupon.status = input.status
  await coupon.save()
  return toCouponDto(coupon)
}

export async function deleteCoupon(id: number) {
  const coupon = await Coupon.findByPk(id)
  if (!coupon) throw AppError.notFound('优惠券不存在')
  const received = await UserCoupon.count({ where: { couponId: id } })
  if (received) throw new AppError('该券已被领取，无法删除，请改为停用', ERR.PARAM)
  await coupon.destroy()
}

/* --------------------------------- 运营位 --------------------------------- */

export interface BannerInput {
  title: string
  subtitle?: string
  image: string
  link?: string
  bg?: string
  position?: string
  sort?: number
  startTime?: string
  endTime?: string
  status?: number
}

function toBannerAdminDto(b: Banner) {
  return {
    id: Number(b.id),
    title: b.title,
    subtitle: b.subtitle ?? '',
    image: b.image,
    link: b.link ?? '',
    bg: b.bg ?? '',
    position: b.position,
    sort: b.sort,
    startTime: b.startTime ? formatDate(b.startTime) : '',
    endTime: b.endTime ? formatDate(b.endTime) : '',
    status: b.status,
    createdAt: formatDate(b.createdAt),
  }
}

export async function listBanners() {
  const rows = await Banner.findAll({
    order: [
      ['position', 'ASC'],
      ['sort', 'ASC'],
      ['id', 'DESC'],
    ],
  })
  return rows.map(toBannerAdminDto)
}

export async function createBanner(input: BannerInput) {
  const banner = await Banner.create({
    title: input.title,
    subtitle: input.subtitle ?? null,
    image: input.image,
    link: input.link ?? null,
    bg: input.bg ?? null,
    position: input.position ?? 'home_top',
    sort: input.sort ?? 0,
    startTime: input.startTime ? new Date(input.startTime) : null,
    endTime: input.endTime ? new Date(input.endTime) : null,
    status: input.status ?? 1,
  })
  return toBannerAdminDto(banner)
}

export async function updateBanner(id: number, input: Partial<BannerInput>) {
  const banner = await Banner.findByPk(id)
  if (!banner) throw AppError.notFound('运营位不存在')
  if (input.title !== undefined) banner.title = input.title
  if (input.subtitle !== undefined) banner.subtitle = input.subtitle
  if (input.image !== undefined) banner.image = input.image
  if (input.link !== undefined) banner.link = input.link
  if (input.bg !== undefined) banner.bg = input.bg
  if (input.position !== undefined) banner.position = input.position
  if (input.sort !== undefined) banner.sort = input.sort
  if (input.startTime !== undefined) banner.startTime = input.startTime ? new Date(input.startTime) : null
  if (input.endTime !== undefined) banner.endTime = input.endTime ? new Date(input.endTime) : null
  if (input.status !== undefined) banner.status = input.status
  await banner.save()
  return toBannerAdminDto(banner)
}

export async function deleteBanner(id: number) {
  const banner = await Banner.findByPk(id)
  if (!banner) throw AppError.notFound('运营位不存在')
  await banner.destroy()
}

/* --------------------------------- 公告 ----------------------------------- */

export interface NoticeInput {
  title: string
  content?: string
  type?: number
  status?: number
  publishAt?: string
}

function toNoticeAdminDto(n: Notice) {
  return {
    id: Number(n.id),
    title: n.title,
    content: n.content ?? '',
    type: n.type,
    status: n.status,
    publishAt: n.publishAt ? formatDate(n.publishAt) : '',
    createdAt: formatDate(n.createdAt),
  }
}

export async function listNotices() {
  const rows = await Notice.findAll({ order: [['id', 'DESC']] })
  return rows.map(toNoticeAdminDto)
}

export async function createNotice(input: NoticeInput) {
  const notice = await Notice.create({
    title: input.title,
    content: input.content ?? null,
    type: input.type ?? 1,
    status: input.status ?? 1,
    publishAt: input.publishAt ? new Date(input.publishAt) : new Date(),
  })
  return toNoticeAdminDto(notice)
}

export async function updateNotice(id: number, input: Partial<NoticeInput>) {
  const notice = await Notice.findByPk(id)
  if (!notice) throw AppError.notFound('公告不存在')
  if (input.title !== undefined) notice.title = input.title
  if (input.content !== undefined) notice.content = input.content
  if (input.type !== undefined) notice.type = input.type
  if (input.status !== undefined) notice.status = input.status
  if (input.publishAt !== undefined) notice.publishAt = input.publishAt ? new Date(input.publishAt) : null
  await notice.save()
  return toNoticeAdminDto(notice)
}

export async function deleteNotice(id: number) {
  const notice = await Notice.findByPk(id)
  if (!notice) throw AppError.notFound('公告不存在')
  await notice.destroy()
}

/* --------------------------------- 秒杀 ----------------------------------- */

export interface SeckillProductInput {
  productId: number
  skuId: number
  seckillPrice: number
  seckillStock: number
  limitPerUser?: number
  sort?: number
}

export interface SeckillInput {
  name: string
  startTime: string
  endTime: string
  status?: number
  products?: SeckillProductInput[]
}

export async function listSeckills() {
  const activities = await SeckillActivity.findAll({ order: [['id', 'DESC']] })
  const result = []
  for (const a of activities) {
    const items = await SeckillProduct.findAll({
      where: { activityId: a.id },
      include: [{ model: Product, as: 'product' }],
      order: [['sort', 'ASC']],
    })
    result.push({
      id: Number(a.id),
      name: a.name,
      startTime: formatDate(a.startTime),
      endTime: formatDate(a.endTime),
      status: a.status,
      products: items.map((i) => ({
        id: Number(i.id),
        productId: Number(i.productId),
        productName: (i.get('product') as Product | null)?.name ?? '',
        productImage: (i.get('product') as Product | null)?.mainImage ?? '',
        skuId: Number(i.skuId),
        seckillPrice: Number(i.seckillPrice),
        seckillStock: i.seckillStock,
        soldCount: i.soldCount,
        limitPerUser: i.limitPerUser,
        sort: i.sort,
      })),
    })
  }
  return result
}

/**
 * 校验秒杀商品是否与其它「启用且时间重叠」的活动冲突。
 * 同一 SKU 在同一时段只允许存在一个秒杀价，否则下单取价不确定。
 */
async function assertNoSeckillConflict(
  products: { skuId: number }[],
  startTime: Date,
  endTime: Date,
  excludeActivityId: number | null,
  transaction: Transaction,
): Promise<void> {
  if (!products.length) return
  const conflicts = await SeckillProduct.findAll({
    where: {
      skuId: { [Op.in]: products.map((p) => p.skuId) },
      ...(excludeActivityId ? { activityId: { [Op.ne]: excludeActivityId } } : {}),
    },
    include: [
      {
        model: SeckillActivity,
        as: 'activity',
        required: true,
        where: {
          status: 1,
          startTime: { [Op.lt]: endTime },
          endTime: { [Op.gt]: startTime },
        },
      },
    ],
    transaction,
  })
  if (conflicts.length) {
    throw new AppError(
      `SKU ${conflicts[0].skuId} 在该时段已存在秒杀活动，请调整商品或时间区间`,
      ERR.PARAM,
    )
  }
}

export async function createSeckill(input: SeckillInput) {
  return sequelize.transaction(async (transaction) => {
    await assertNoSeckillConflict(
      input.products ?? [],
      new Date(input.startTime),
      new Date(input.endTime),
      null,
      transaction,
    )
    const activity = await SeckillActivity.create(
      {
        name: input.name,
        startTime: new Date(input.startTime),
        endTime: new Date(input.endTime),
        status: input.status ?? 0,
      },
      { transaction },
    )
    for (let i = 0; i < (input.products ?? []).length; i++) {
      const p = input.products![i]
      await SeckillProduct.create(
        {
          activityId: Number(activity.id),
          productId: p.productId,
          skuId: p.skuId,
          seckillPrice: p.seckillPrice.toFixed(2),
          seckillStock: p.seckillStock,
          limitPerUser: p.limitPerUser ?? 1,
          sort: p.sort ?? i,
        },
        { transaction },
      )
    }
    return { id: Number(activity.id) }
  })
}

export async function updateSeckill(id: number, input: Partial<SeckillInput>) {
  return sequelize.transaction(async (transaction) => {
    const activity = await SeckillActivity.findByPk(id, { transaction })
    if (!activity) throw AppError.notFound('秒杀活动不存在')

    if (input.products) {
      await assertNoSeckillConflict(
        input.products,
        new Date(input.startTime ?? activity.startTime),
        new Date(input.endTime ?? activity.endTime),
        id,
        transaction,
      )
    }

    if (input.name !== undefined) activity.name = input.name
    if (input.startTime !== undefined) activity.startTime = new Date(input.startTime)
    if (input.endTime !== undefined) activity.endTime = new Date(input.endTime)
    if (input.status !== undefined) activity.status = input.status
    await activity.save({ transaction })

    if (input.products) {
      await SeckillProduct.destroy({ where: { activityId: id }, transaction })
      for (let i = 0; i < input.products.length; i++) {
        const p = input.products[i]
        await SeckillProduct.create(
          {
            activityId: id,
            productId: p.productId,
            skuId: p.skuId,
            seckillPrice: p.seckillPrice.toFixed(2),
            seckillStock: p.seckillStock,
            limitPerUser: p.limitPerUser ?? 1,
            sort: p.sort ?? i,
          },
          { transaction },
        )
      }
    }
    return { id: Number(activity.id) }
  })
}

export async function setSeckillStatus(id: number, status: number) {
  return sequelize.transaction(async (transaction) => {
    const activity = await SeckillActivity.findByPk(id, { transaction })
    if (!activity) throw AppError.notFound('秒杀活动不存在')

    // 启用时同样需要校验与其它启用活动的时间冲突
    if (status === 1) {
      const items = await SeckillProduct.findAll({ where: { activityId: id }, transaction })
      await assertNoSeckillConflict(items, activity.startTime, activity.endTime, id, transaction)
    }

    activity.status = status
    await activity.save({ transaction })
    return { id: Number(activity.id), status: activity.status }
  })
}

export async function deleteSeckill(id: number) {
  return sequelize.transaction(async (transaction) => {
    const activity = await SeckillActivity.findByPk(id, { transaction })
    if (!activity) throw AppError.notFound('秒杀活动不存在')
    await SeckillProduct.destroy({ where: { activityId: id }, transaction })
    await activity.destroy({ transaction })
  })
}

/* -------------------------------- 满减活动 -------------------------------- */

export interface PromotionInput {
  name: string
  type?: number
  thresholds: { amount: number; reduce: number }[]
  startTime: string
  endTime: string
  status?: number
}

function toPromotionDto(p: Promotion) {
  const rule = p.ruleJson as { thresholds?: { amount: number; reduce: number }[] } | null
  return {
    id: Number(p.id),
    name: p.name,
    type: p.type,
    thresholds: (rule?.thresholds ?? []).map((t) => ({ amount: Number(t.amount), reduce: Number(t.reduce) })),
    startTime: formatDate(p.startTime),
    endTime: formatDate(p.endTime),
    status: p.status,
    createdAt: formatDate(p.createdAt),
  }
}

export async function listPromotions() {
  const rows = await Promotion.findAll({ order: [['id', 'DESC']] })
  return rows.map(toPromotionDto)
}

export async function createPromotion(input: PromotionInput) {
  const promotion = await Promotion.create({
    name: input.name,
    type: input.type ?? 1,
    ruleJson: { thresholds: input.thresholds },
    startTime: new Date(input.startTime),
    endTime: new Date(input.endTime),
    status: input.status ?? 1,
  })
  return toPromotionDto(promotion)
}

export async function updatePromotion(id: number, input: Partial<PromotionInput>) {
  const promotion = await Promotion.findByPk(id)
  if (!promotion) throw AppError.notFound('满减活动不存在')
  if (input.name !== undefined) promotion.name = input.name
  if (input.type !== undefined) promotion.type = input.type
  if (input.thresholds !== undefined) promotion.ruleJson = { thresholds: input.thresholds }
  if (input.startTime !== undefined) promotion.startTime = new Date(input.startTime)
  if (input.endTime !== undefined) promotion.endTime = new Date(input.endTime)
  if (input.status !== undefined) promotion.status = input.status
  await promotion.save()
  return toPromotionDto(promotion)
}

export async function deletePromotion(id: number) {
  const promotion = await Promotion.findByPk(id)
  if (!promotion) throw AppError.notFound('满减活动不存在')
  await promotion.destroy()
}
