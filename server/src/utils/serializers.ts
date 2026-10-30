import type {
  Brand,
  Category,
  Product,
  ProductAttribute,
  ProductImage,
  ProductSku,
  ProductComment,
} from '../models/product'
import type { Order, OrderItem, OrderLog, OrderLogistics, Invoice, PaymentRecord } from '../models/trade'
import type { Cart } from '../models/trade'
import type { Coupon, UserCoupon, SeckillProduct, Banner } from '../models/marketing'
import type { User, UserAddress } from '../models/user'
import { maskPhone } from './helpers'
import { ORDER_ACTION_TEXT } from './orderLog'

export type ProductWithRelations = Product & {
  category?: (Category & { parent?: Category | null }) | null
  brand?: Brand | null
  skus?: ProductSku[]
  imageList?: ProductImage[]
  /** 商品参数（产地/保质期等），后台维护、客户端详情页展示 */
  attributes?: ProductAttribute[]
}

function num(value: unknown): number {
  return Number(value ?? 0)
}

export function toSkuDto(sku: ProductSku) {
  return {
    id: num(sku.id),
    productId: num(sku.productId),
    skuCode: sku.skuCode,
    spec: sku.specJson,
    specText: sku.specText ?? '',
    image: sku.image ?? '',
    price: num(sku.price),
    marketPrice: num(sku.marketPrice),
    stock: sku.stock,
    warnStock: sku.warnStock,
    status: sku.status,
  }
}

function deriveTags(product: Product): string[] {
  const tags: string[] = []
  if (product.isRecommend) tags.push('精选')
  if (product.salesCount > 2000) tags.push('热销')
  if (num(product.priceMax) < 100) tags.push('平价')
  return tags
}

export function toProductDto(product: ProductWithRelations) {
  const category = product.category
  const topCategory = category?.level === 2 ? category.parent : category
  return {
    id: num(product.id),
    name: product.name,
    subtitle: product.subtitle ?? '',
    categoryId: num(product.categoryId),
    brandId: product.brandId ? num(product.brandId) : null,
    mainImage: product.mainImage ?? '',
    images: (product.imageList ?? []).map((i) => i.image),
    detailHtml: product.detailHtml ?? '',
    unit: product.unit,
    priceMin: num(product.priceMin),
    priceMax: num(product.priceMax),
    totalStock: product.totalStock,
    salesCount: product.salesCount,
    commentCount: product.commentCount,
    avgScore: num(product.avgScore),
    isRecommend: Boolean(product.isRecommend),
    tags: deriveTags(product),
    attributes: (product.attributes ?? []).map((a) => ({
      name: a.name,
      value: a.value,
    })),
    categoryName: category?.name ?? '',
    brandName: product.brand?.name ?? '',
    topCategoryId: topCategory ? num(topCategory.id) : num(product.categoryId),
    topCategoryName: topCategory?.name ?? '',
    skus: (product.skus ?? []).map(toSkuDto).filter((s) => s.status === 1),
  }
}

export function toCommentDto(comment: ProductComment & { user?: User | null }) {
  return {
    id: num(comment.id),
    userId: num(comment.userId),
    nickname: comment.isAnonymous ? '匿名用户' : comment.user?.nickname ?? '小兔用户',
    avatar: comment.isAnonymous ? '' : comment.user?.avatar ?? '',
    score: comment.score,
    content: comment.content,
    images: comment.images ?? [],
    specText: '',
    replyContent: comment.replyContent ?? undefined,
    createdAt: formatDate(comment.createdAt),
  }
}

export function toCartDto(cart: Cart & { product?: Product | null; sku?: ProductSku | null }) {
  const product = cart.product
  const sku = cart.sku
  const available = Boolean(product && product.status === 1 && sku && sku.status === 1 && sku.stock > 0)
  return {
    id: num(cart.id),
    productId: num(cart.productId),
    skuId: num(cart.skuId),
    name: product?.name ?? '商品已下架',
    image: sku?.image ?? product?.mainImage ?? '',
    specText: sku?.specText ?? '',
    price: num(sku?.price),
    quantity: cart.quantity,
    stock: sku?.stock ?? 0,
    selected: Boolean(cart.selected),
    invalid: !available,
  }
}

export function toAddressDto(address: UserAddress) {
  return {
    id: num(address.id),
    receiver: address.receiver,
    phone: address.phone,
    province: address.province,
    city: address.city,
    district: address.district,
    detail: address.detail,
    isDefault: Boolean(address.isDefault),
  }
}

export function toUserDto(user: User & { level?: { name: string } | null }) {
  return {
    id: num(user.id),
    username: user.username ?? '',
    nickname: user.nickname ?? user.username ?? '小兔用户',
    avatar: user.avatar ?? '',
    phone: maskPhone(user.phone),
    gender: user.gender ?? 0,
    birthday: user.birthday ?? '',
    levelName: user.level?.name ?? '普通会员',
    points: user.points,
    totalSpent: num(user.totalSpent),
    /** 账户余额（U-30） */
    balance: num(user.balance),
    /** 是否已设置支付密码（U-45） */
    hasPayPassword: Boolean(user.payPassword),
  }
}

export function toCouponDto(coupon: Coupon) {
  const scopeText = coupon.scope === 1 ? '全场通用' : coupon.scope === 2 ? '指定分类可用' : '指定商品可用'
  const validText =
    coupon.validType === 1
      ? `${formatDate(coupon.validStart)} ~ ${formatDate(coupon.validEnd)}`
      : `领取后 ${coupon.validDays ?? 0} 天内有效`
  return {
    id: num(coupon.id),
    name: coupon.name,
    type: coupon.type as 1 | 2,
    amount: num(coupon.amount),
    discountRate: num(coupon.discountRate),
    minAmount: num(coupon.minAmount),
    scope: coupon.scope,
    scopeIds: Array.isArray(coupon.scopeIds)
      ? coupon.scopeIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)
      : [],
    scopeText,
    validType: coupon.validType,
    validStart: coupon.validStart ? formatDate(coupon.validStart) : '',
    validEnd: coupon.validEnd ? formatDate(coupon.validEnd) : '',
    validDays: coupon.validDays ?? null,
    validText,
    totalCount: coupon.totalCount,
    receivedCount: coupon.receivedCount,
    usedCount: coupon.usedCount,
    remainCount:
      coupon.totalCount > 0 ? Math.max(0, coupon.totalCount - coupon.receivedCount) : null,
    status: 0 as 0 | 1 | 2,
  }
}

export function toUserCouponDto(userCoupon: UserCoupon & { coupon?: Coupon | null }) {
  const base = userCoupon.coupon
    ? toCouponDto(userCoupon.coupon)
    : {
        id: 0,
        name: '未知券',
        type: 1 as const,
        amount: 0,
        discountRate: 1,
        minAmount: 0,
        scopeText: '',
        validText: '',
        status: 0 as const,
      }
  const now = Date.now()
  const expired =
    userCoupon.status === 0 &&
    ((userCoupon.expireAt != null && userCoupon.expireAt.getTime() < now) ||
      (userCoupon.coupon?.validType === 1 &&
        userCoupon.coupon.validEnd != null &&
        userCoupon.coupon.validEnd.getTime() < now))

  return {
    ...base,
    id: num(userCoupon.id),
    status: (expired ? 2 : userCoupon.status) as 0 | 1 | 2,
    expireAt: formatDate(userCoupon.expireAt),
    receivedAt: formatDate(userCoupon.receivedAt),
    usedAt: formatDate(userCoupon.usedAt),
    orderId: userCoupon.orderId ? num(userCoupon.orderId) : null,
  }
}

export function toBannerDto(banner: Banner) {
  return {
    id: num(banner.id),
    title: banner.title,
    subtitle: banner.subtitle ?? '',
    image: banner.image,
    link: banner.link ?? '/',
    bg: banner.bg ?? '#232f3e',
  }
}

export function toSeckillDto(item: SeckillProduct & { product?: Product | null }) {
  const product = item.product
  return {
    id: num(item.id),
    productId: num(item.productId),
    name: product?.name ?? '',
    image: product?.mainImage ?? '',
    price: num(item.seckillPrice),
    originPrice: num(product?.priceMin ?? item.seckillPrice),
    // 剩余名额按 0 兜底，避免脏数据（sold_count > seckill_stock）算出负库存
    stock: Math.max(0, item.seckillStock - item.soldCount),
    soldCount: item.soldCount,
  }
}

export function toOrderItemDto(item: OrderItem) {
  return {
    id: num(item.id),
    productId: num(item.productId),
    skuId: num(item.skuId),
    productName: item.productName,
    skuSpecText: item.skuSpecText ?? '',
    productImage: item.productImage ?? '',
    price: num(item.price),
    /** 原价（未参与秒杀时与 price 相同） */
    originalPrice: num(item.originalPrice) || num(item.price),
    seckill: Boolean(item.seckillProductId),
    quantity: item.quantity,
    subtotal: num(item.subtotal),
    /** 满赠赠品（U-62） */
    isGift: Boolean(item.isGift),
    isCommented: Boolean(item.isCommented),
  }
}

export function toOrderDto(
  order: Order & {
    items?: OrderItem[]
    logistics?: OrderLogistics | null
    logs?: OrderLog[]
    invoice?: Invoice | null
    payments?: PaymentRecord[]
  },
) {
  return {
    orderNo: order.orderNo,
    status: order.status as 10 | 20 | 30 | 40 | 50 | 60 | 70,
    items: (order.items ?? []).map(toOrderItemDto),
    totalAmount: num(order.totalAmount),
    discountAmount: num(order.discountAmount),
    /** 分档优惠快照：秒杀 → 满减 → 优惠券 */
    seckillAmount: num(order.seckillAmount),
    promotionAmount: num(order.promotionAmount),
    couponAmount: num(order.couponAmount),
    /** 积分抵现快照（U-64） */
    pointsUsed: order.pointsUsed ?? 0,
    pointsAmount: num(order.pointsAmount),
    freightAmount: num(order.freightAmount),
    payAmount: num(order.payAmount),
    receiverName: order.receiverName ?? '',
    receiverPhone: order.receiverPhone ?? '',
    receiverAddress: order.receiverAddress ?? '',
    payType: order.payType,
    payTime: order.payTime ? formatDate(order.payTime) : null,
    shipTime: order.shipTime ? formatDate(order.shipTime) : null,
    receiveTime: order.receiveTime ? formatDate(order.receiveTime) : null,
    /** 用户催发货提醒，后台订单列表/详情用于醒目标记 */
    remindShipCount: order.remindShipCount ?? 0,
    lastRemindShipAt: order.lastRemindShipAt ? formatDate(order.lastRemindShipAt) : null,
    remark: order.remark ?? '',
    /** 后台异常标记（A-23） */
    isAbnormal: Boolean(order.isAbnormal),
    abnormalReason: order.abnormalReason ?? '',
    /** 发票信息（下单时用户选择，未选择则为 null） */
    invoice: order.invoice
      ? {
          type: order.invoice.type,
          title: order.invoice.title,
          taxNo: order.invoice.taxNo ?? '',
          email: order.invoice.email ?? '',
          content: order.invoice.content ?? '',
          status: order.invoice.status,
        }
      : null,
    /** 支付流水（A-21：后台订单详情展示，取最新一笔） */
    payment: (() => {
      const list = order.payments ?? []
      if (!list.length) return null
      const latest = [...list].sort((a, b) => Number(b.id) - Number(a.id))[0]
      return {
        payNo: latest.payNo,
        channel: latest.channel,
        status: latest.status,
        amount: num(latest.amount),
        thirdPartyNo: latest.thirdPartyNo ?? '',
        paidAt: latest.paidAt ? formatDate(latest.paidAt) : null,
      }
    })(),
    createdAt: formatDate(order.createdAt),
    /** 订单操作日志时间轴（仅详情查询返回） */
    logs: (order.logs ?? []).map((log) => ({
      id: num(log.id),
      action: log.action,
      actionText: ORDER_ACTION_TEXT[log.action] ?? log.action,
      operator: log.operator,
      remark: log.remark ?? '',
      createdAt: formatDate(log.createdAt),
    })),
    logistics: order.logistics
      ? {
          company: order.logistics.company ?? '',
          trackingNo: order.logistics.trackingNo ?? '',
          traces: order.logistics.traces ?? [],
        }
      : undefined,
  }
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}:${pad(d.getSeconds())}`
}
