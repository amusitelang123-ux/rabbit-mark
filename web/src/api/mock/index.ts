import type { Address, CommentItem, Coupon, CouponPreviewResult, MyComment, MyComments, MyPoints, ActivePromotion, FaqGroup, LogisticsCompanyItem, ActiveSeckill, FeedbackItem, PublicConfig, Order, PageResult, PayStatusResult, PrepayResult, Refund } from '../types'
import type {
  AddressPayload,
  ApplyRefundPayload,
  CartAddPayload,
  ClientApi,
  CreateCommentPayload,
  CreateFeedbackPayload,
  CreateOrderPayload,
  HomeData,
  LoginResult,
  PrepayPayload,
  ProfilePatch,
  ProductQuery,
  RegisterPayload,
  SandboxPayPayload,
} from '../contract'
import {
  addresses as mockAddresses,
  banners as mockBanners,
  brands as mockBrands,
  categories as mockCategories,
  commentsFor,
  coupons as mockCoupons,
  demoUser,
  notices as mockNotices,
  orders as mockOrders,
  products as mockProducts,
  seckills as mockSeckills,
  topCategoryId,
} from '@/mock/data'

/**
 * Mock 实现：在接口契约（ClientApi）下模拟全部 `/api/client/v1/*` 行为，
 * 与真实后端可无缝切换（见 src/api/index.ts）。
 */

const LATENCY = 200

function delay<T>(data: T, ms = LATENCY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

/** 模拟接口失败：与 request.ts 保持一致，抛出 Error(message) */
function rejectWith<T>(message: string, ms = LATENCY): Promise<T> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
}

function paginate<T>(list: T[], page: number, pageSize: number): PageResult<T> {
  const total = list.length
  const start = (page - 1) * pageSize
  return {
    list: list.slice(start, start + pageSize),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

let addresses: Address[] = [...mockAddresses]
let orders: Order[] = [...mockOrders]
let cart: { id: number; productId: number; skuId: number; quantity: number; selected: boolean }[] = []
const payRecords = new Map<string, string>()
let refunds: Refund[] = []

function cartView() {
  return cart
    .map((it) => {
      const product = mockProducts.find((p) => p.id === it.productId)
      const sku = product?.skus.find((s) => s.id === it.skuId)
      return {
        id: it.id,
        productId: it.productId,
        skuId: it.skuId,
        name: product?.name ?? '',
        image: sku?.image ?? product?.mainImage ?? '',
        specText: sku?.specText ?? '',
        price: sku?.price ?? 0,
        quantity: it.quantity,
        stock: sku?.stock ?? 0,
        selected: it.selected,
        invalid: !product,
      }
    })
}

export const mockApi: ClientApi = {
  categoryApi: {
    tree: () => delay(mockCategories),
    top: () => delay(mockCategories.filter((c) => c.level === 1)),
    children: (parentId) => delay(mockCategories.filter((c) => c.parentId === parentId)),
  },

  brandApi: {
    list: () => delay(mockBrands),
  },

  productApi: {
    list(query: ProductQuery = {}) {
      const { categoryId, keyword, brandId, minPrice, maxPrice, sortBy = 'default', page = 1, pageSize = 12 } = query
      let list = [...mockProducts]
      if (categoryId) {
        const childIds = mockCategories.filter((c) => c.parentId === categoryId).map((c) => c.id)
        list = list.filter((p) => p.categoryId === categoryId || childIds.includes(p.categoryId))
      }
      if (brandId) list = list.filter((p) => p.brandId === brandId)
      if (keyword) {
        const kw = keyword.toLowerCase()
        list = list.filter((p) => p.name.toLowerCase().includes(kw) || p.subtitle.toLowerCase().includes(kw))
      }
      if (minPrice !== undefined) list = list.filter((p) => p.priceMin >= minPrice)
      if (maxPrice !== undefined) list = list.filter((p) => p.priceMin <= maxPrice)
      switch (sortBy) {
        case 'sales':
          list.sort((a, b) => b.salesCount - a.salesCount)
          break
        case 'priceAsc':
          list.sort((a, b) => a.priceMin - b.priceMin)
          break
        case 'priceDesc':
          list.sort((a, b) => b.priceMin - a.priceMin)
          break
        case 'new':
          list.sort((a, b) => b.id - a.id)
          break
        default:
          list.sort((a, b) => b.salesCount * 0.4 + b.avgScore * 100 - (a.salesCount * 0.4 + a.avgScore * 100))
      }
      return delay(paginate(list, page, pageSize))
    },
    detail: (id) => delay(mockProducts.find((p) => p.id === id)),
    recommend: (id, size = 8) =>
      delay(mockProducts.filter((p) => p.id !== id).sort((a, b) => b.salesCount - a.salesCount).slice(0, size)),
    comments: (id): Promise<CommentItem[]> => delay(commentsFor(id)),
  },

  homeApi: {
    get(): Promise<HomeData> {
      const top = mockCategories.filter((c) => c.level === 1)
      const floors = top.slice(0, 4).map((c) => ({
        title: c.name,
        subtitle: '精选好物 品质保障',
        categoryId: c.id,
        products: mockProducts.filter((p) => topCategoryId(p.categoryId) === c.id).slice(0, 8),
      }))
      return delay({
        banners: mockBanners,
        seckills: mockSeckills,
        categories: top,
        recommend: mockProducts.filter((p) => p.isRecommend).slice(0, 10),
        floors,
      })
    },
  },

  couponApi: {
    center: (): Promise<Coupon[]> => delay(mockCoupons.filter((c) => c.status === 0)),
    preview: (): Promise<CouponPreviewResult> => {
      const list = mockCoupons
        .filter((c) => c.status === 0)
        .map((c) => ({
          ...c,
          discount:
            c.type === 1
              ? c.amount
              : Math.round(c.minAmount * (1 - c.discountRate) * 100) / 100,
          eligibleAmount: c.minAmount,
        }))
        .sort((a, b) => b.discount - a.discount)
      return delay({ list, bestCouponId: list[0]?.id ?? null })
    },
    mine: (): Promise<Coupon[]> => delay(mockCoupons),
    receive: (id: number) => delay({ id: Date.now(), couponId: id }),
  },

  orderApi: {
    list: (status) => delay(status ? orders.filter((o) => o.status === status) : orders),
    detail: (orderNo) => delay(orders.find((o) => o.orderNo === orderNo)),
    create: (_payload?: CreateOrderPayload): Promise<Order> => delay(orders[0]),
    cancel: (orderNo) => {
      const order = orders.find((o) => o.orderNo === orderNo)
      if (order) order.status = 70
      return delay(order as Order)
    },
    confirm: (orderNo) => {
      const order = orders.find((o) => o.orderNo === orderNo)
      if (order) order.status = 40
      return delay(order as Order)
    },
  },

  addressApi: {
    list: () => delay(addresses),
    create: (payload: AddressPayload) => {
      const created: Address = { id: Date.now(), ...payload, isDefault: payload.isDefault ?? false }
      if (created.isDefault) addresses = addresses.map((a) => ({ ...a, isDefault: false }))
      addresses = [created, ...addresses]
      return delay(created)
    },
    update: (id, payload) => {
      const idx = addresses.findIndex((a) => a.id === id)
      if (idx < 0) return delay(undefined as unknown as Address)
      const merged: Address = { ...addresses[idx], ...payload }
      if (merged.isDefault) addresses = addresses.map((a) => (a.id === id ? a : { ...a, isDefault: false }))
      addresses[idx] = merged
      return delay(addresses[idx])
    },
    remove: (id) => {
      const wasDefault = addresses.find((a) => a.id === id)?.isDefault
      addresses = addresses.filter((a) => a.id !== id)
      if (wasDefault && addresses.length) addresses[0] = { ...addresses[0], isDefault: true }
      return delay(undefined as void)
    },
  },

  userApi: {
    login: (): Promise<LoginResult> => delay({ user: demoUser, token: 'mock-token', refreshToken: 'mock-refresh' }),
    captcha: () =>
      delay({
        captchaId: 'mock-captcha',
        image: `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><rect width="120" height="40" fill="#f2f4f7" rx="6"/><text x="60" y="27" font-family="monospace" font-size="22" font-weight="700" fill="#2d3a4d" text-anchor="middle">AB3D</text></svg>')}`,
        expireIn: 300,
      }),
    register: (_payload: RegisterPayload): Promise<LoginResult> =>
      delay({ user: demoUser, token: 'mock-token', refreshToken: 'mock-refresh' }),
    profile: () => delay(demoUser),
    updateProfile: (patch: ProfilePatch) => delay({ ...demoUser, ...patch }),
    uploadAvatar: (file: File) => {
      demoUser.avatar = URL.createObjectURL(file)
      return delay({ ...demoUser })
    },
    changePassword: () => delay({ changed: true }),
    sendSmsCode: (phone: string) => delay({ phone, code: '8888' }),
    resetPassword: () => delay({ reset: true }),
    favorites: () => delay(mockProducts.slice(0, 4)),
    toggleFavorite: () => delay({ favorited: true }),
    footprints: () => delay(mockProducts.slice(4, 8)),
  },

  cartApi: {
    list: () => delay(cartView()),
    add: (payload: CartAddPayload) => {
      const existing = cart.find((c) => c.skuId === payload.skuId)
      if (existing) existing.quantity += payload.quantity
      else
        cart = [
          { id: Date.now(), productId: payload.productId, skuId: payload.skuId, quantity: payload.quantity, selected: true },
          ...cart,
        ]
      return delay(cartView())
    },
    update: (id, patch) => {
      const it = cart.find((c) => c.id === id)
      if (it) {
        if (patch.quantity !== undefined) it.quantity = patch.quantity
        if (patch.selected !== undefined) it.selected = patch.selected
      }
      return delay(cartView())
    },
    selectAll: (selected) => {
      cart.forEach((c) => (c.selected = selected))
      return delay(cartView())
    },
    remove: (ids) => {
      cart = cart.filter((c) => !ids.includes(c.id))
      return delay(cartView())
    },
  },

  paymentApi: {
    prepay: (payload: PrepayPayload): Promise<PrepayResult> => {
      const payNo = `PAY${Date.now()}`
      payRecords.set(payNo, payload.orderNo)
      const order = orders.find((o) => o.orderNo === payload.orderNo)
      return delay({
        payNo,
        amount: order?.payAmount ?? 0,
        payParams: { sandboxToken: 'mock-token', channel: String(payload.channel) },
        payUrl: null,
      })
    },
    status: (payNo: string): Promise<PayStatusResult> => {
      const orderNo = payRecords.get(payNo) ?? ''
      const order = orders.find((o) => o.orderNo === orderNo)
      return delay({
        payNo,
        payStatus: order && order.status !== 10 ? 1 : 0,
        orderNo,
        orderStatus: order?.status ?? null,
      })
    },
    sandboxPay: (payload: SandboxPayPayload): Promise<void> => {
      const orderNo = payRecords.get(payload.payNo)
      const order = orders.find((o) => o.orderNo === orderNo)
      if (order) order.status = 20
      return delay(undefined as void)
    },
  },

  refundApi: {
    apply: (payload: ApplyRefundPayload): Promise<Refund> => {
      const order = orders.find((o) => o.orderNo === payload.orderNo)
      if (order) order.status = 50
      const refund: Refund = {
        id: Date.now(),
        refundNo: `RF${Date.now()}`,
        orderId: 0,
        orderNo: payload.orderNo,
        orderItemId: payload.orderItemId ?? null,
        productName: '',
        productImage: '',
        type: payload.type,
        reason: payload.reason,
        amount: payload.amount ?? order?.payAmount ?? 0,
        images: payload.images ?? [],
        status: 0,
        auditRemark: '',
        auditAt: null,
        createdAt: '',
      }
      refunds = [refund, ...refunds]
      return delay(refund)
    },
    mine: () => delay(refunds),
  },

  commentApi: {
    mine: (): Promise<MyComments> => delay({ pending: [], done: [] }),
    create: (payload: CreateCommentPayload): Promise<MyComment> =>
      delay({
        id: Date.now(),
        productId: 0,
        productName: '',
        productImage: '',
        score: payload.score,
        content: payload.content,
        images: payload.images ?? [],
        isAnonymous: Boolean(payload.isAnonymous),
        replyContent: '',
        status: 1,
        createdAt: '',
      }),
  },

  pointsApi: {
    mine: (): Promise<MyPoints> => delay({ balance: 1280, todaySigned: false, logs: [] }),
    signIn: () => delay({ balance: 1290, change: 10, gain: 10, streak: 1 }),
  },

  promotionApi: {
    active: (): Promise<ActivePromotion[]> =>
      delay([
        {
          id: 1,
          name: '满 199 减 20',
          type: 1,
          endTime: '',
          thresholds: [
            { amount: 199, reduce: 20 },
            { amount: 499, reduce: 60 },
          ],
        },
      ]),
  },

  contentApi: {
    faqGroups: (): Promise<FaqGroup[]> =>
      delay([
        {
          category: '购物指南',
          items: [
            {
              id: 1,
              category: '购物指南',
              question: '如何搜索商品？',
              answer: '在顶部搜索框输入关键词即可。',
              sort: 1,
              status: 1,
              createdAt: '',
            },
          ],
        },
      ]),
    logisticsCompanies: (): Promise<LogisticsCompanyItem[]> =>
      delay([
        { id: 1, name: '顺丰速运', code: 'SF', phone: '95338', sort: 1, status: 1 },
        { id: 2, name: '中通快递', code: 'ZTO', phone: '95311', sort: 2, status: 1 },
      ]),
  },

  seckillApi: {
    active: (): Promise<ActiveSeckill[]> =>
      delay([
        {
          id: 1,
          name: '限时秒杀',
          startTime: '',
          endTime: '',
          endTimestamp: Date.now() + 2 * 60 * 60 * 1000,
          products: mockProducts.slice(0, 4).map((p, i) => ({
            id: i + 1,
            productId: p.id,
            skuId: p.skus[0]?.id ?? 0,
            productName: p.name,
            productImage: p.mainImage,
            skuSpecText: p.skus[0]?.specText ?? '',
            originalPrice: p.priceMin,
            seckillPrice: Math.round(p.priceMin * 0.6 * 100) / 100,
            remaining: 20,
            limitPerUser: 2,
          })),
        },
      ]),
  },

  feedbackApi: {
    create: (payload: CreateFeedbackPayload): Promise<FeedbackItem> =>
      delay({
        id: Date.now(),
        userId: 1,
        nickname: '小兔用户',
        avatar: '',
        type: payload.type,
        content: payload.content,
        images: payload.images ?? [],
        contact: payload.contact ?? '',
        orderNo: payload.orderNo ?? '',
        status: 0,
        replyContent: '',
        replyAt: null,
        replier: '',
        createdAt: '',
      }),
    mine: (): Promise<FeedbackItem[]> => delay([]),
  },

  configApi: {
    public: (): Promise<PublicConfig> =>
      delay({
        siteName: '小兔鲜',
        logo: '',
        slogan: '正品好物 极速送达',
        servicePhone: '400-000-0000',
        serviceEmail: 'service@xtx-mall.demo',
        serviceHours: '每日 9:00 - 22:00',
      }),
  },

  noticeApi: {
    list: (limit = 20) => {
      const n = Math.min(Math.max(limit, 1), 50)
      const sorted = [...mockNotices].sort((a, b) =>
        a.publishAt === b.publishAt ? b.id - a.id : a.publishAt < b.publishAt ? 1 : -1,
      )
      return delay(sorted.slice(0, n))
    },
    detail: (id) => {
      const found = mockNotices.find((n) => n.id === id)
      return found ? delay(found) : rejectWith('公告不存在')
    },
  },
}
