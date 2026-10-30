import type { Address, CartItem, CommentItem, Coupon, CouponPreviewResult, DeleteOrderResult, LoginLogItem, MyComment, MyComments, MyPoints, MyWallet, RechargePayload, RechargeStatusResult, BalanceLog, BalanceRecharge, ActivePromotion, FaqGroup, LogisticsCompanyItem, ActiveSeckill, FeedbackItem, PublicConfig, Order, OrderLogisticsDetail, PageResult, PayStatusResult, PrepayResult, RebuyResult, Refund, RebuySkippedItem, RemindShipResult, AiChatDonePayload, AiChatMessage, AiCitation, AiConfig, AiConversationItem } from '../types'
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
  orderStatusText,
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
const payRecords = new Map<string, { orderNo: string; channel: number }>()
const rechargePrepay = new Map<string, { amount: number; channel: number }>()
const remindRecords = new Map<string, number>()
let refunds: Refund[] = []
let feedbacks: FeedbackItem[] = []
let walletBalance = demoUser.balance ?? 0

/* ------------------------------ AI 客服（演示） ------------------------------ */

let aiConversationSeq = 0
let aiMessages: AiChatMessage[] = []
const aiConversations: AiConversationItem[] = []

function citation(title: string, snippet: string): AiCitation {
  return { sourceType: 'policy', sourceId: null, title, snippet }
}

function mockAiAnswer(question: string): { text: string; citations: AiCitation[] } {
  if (/物流|快递|到哪|签收/.test(question)) {
    return {
      text: '（演示模式）物流信息以订单详情的「查看物流」为准。已发货订单一般 24 小时内更新轨迹；超过 48 小时没有揽收记录，可以在订单详情点「提醒发货」，或转人工催件。',
      citations: [citation('平台规则：发货时效', '发货后物流轨迹通常在 24 小时内更新；超过 48 小时没有揽收记录，可提醒发货或联系人工客服。')],
    }
  }
  if (/退|售后|换货/.test(question)) {
    return {
      text: '（演示模式）在订单详情点「申请售后」，选择仅退款 / 退货退款 / 换货，填写原因并上传凭证。签收后 7 天内支持无理由退货，商品需完好；质量问题由平台承担运费。退款结果以客服审核为准。',
      citations: [citation('平台规则：退换货政策', '签收后 7 天内支持无理由退货，商品需保持完好、配件齐全、不影响二次销售。')],
    }
  }
  if (/发票/.test(question)) {
    return {
      text: '（演示模式）订单完成后可在订单详情申请电子发票，填写抬头、税号与邮箱，一般 1-3 个工作日开具；专票请联系人工客服。',
      citations: [citation('平台规则：发票开具', '订单完成后可申请电子普通发票，一般 1-3 个工作日开具；专票需联系人工客服。')],
    }
  }
  if (/券|满减|秒杀|积分/.test(question)) {
    return {
      text: '（演示模式）优惠券在「个人中心 → 我的优惠券」查看，结算页会自动推荐可用券；秒杀商品不参与满减。100 积分可抵 1 元，单笔最多抵扣应付金额的 50%。',
      citations: [citation('平台规则：积分与优惠券', '100 积分抵 1 元，单笔订单最多抵扣应付金额的 50%；秒杀商品不参与满减。')],
    }
  }
  if (/发货|多久|什么时候/.test(question)) {
    return {
      text: '（演示模式）现货商品付款后 48 小时内发出，大促期间可能顺延 1-2 天；发货后物流轨迹约 24 小时内更新。',
      citations: [citation('平台规则：发货时效', '现货商品在付款成功后 48 小时内发出，大促与预售商品以商品页标注为准。')],
    }
  }
  return {
    text: '（演示模式）这个问题我暂时没有查到准确信息。你可以补充订单号或具体商品，我再帮你查；也可以点「转人工」由客服跟进。',
    citations: [],
  }
}
let balanceLogs: BalanceLog[] = []
let rechargeRecords: BalanceRecharge[] = []

/** 与后端 formatDate 保持一致的展示格式 */
function formatMockTime(value: number | Date): string {
  const d = value instanceof Date ? value : new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 与后端 applyBalance 对齐：同步余额并追加一条资金流水 */
function appendBalanceLog(type: number, change: number, relatedNo: string, remark: string) {
  walletBalance = Math.round((walletBalance + change) * 100) / 100
  demoUser.balance = walletBalance
  balanceLogs = [
    {
      id: Date.now(),
      type,
      change,
      balance: walletBalance,
      relatedNo,
      remark,
      createdAt: formatMockTime(Date.now()),
    },
    ...balanceLogs,
  ]
}

/**
 * Mock 模式下购物车 Store 以 localStorage 为数据源（见 stores/cart.ts），
 * 「再次购买」走的是 orderApi，需要把结果同步进本地购物车，否则跳转后仍是旧数据。
 */
const LOCAL_CART_KEY = 'xtx_cart'

function mergeLocalCart(items: CartItem[]) {
  if (typeof localStorage === 'undefined' || !items.length) return
  let current: CartItem[] = []
  try {
    const raw = localStorage.getItem(LOCAL_CART_KEY)
    current = raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    current = []
  }
  for (const item of items) {
    const existing = current.find((c) => c.skuId === item.skuId)
    if (existing) {
      existing.quantity += item.quantity
      existing.selected = true
    } else {
      current.unshift(item)
    }
  }
  localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(current))
}

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
    list: (status, page = 1, pageSize = 10) => {
      const filtered = status ? orders.filter((o) => o.status === status) : orders
      const start = (page - 1) * pageSize
      return delay({
        list: filtered.slice(start, start + pageSize),
        page,
        pageSize,
        total: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      })
    },
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
    rebuy: (orderNo): Promise<RebuyResult> => {
      const order = orders.find((o) => o.orderNo === orderNo)
      if (!order) return rejectWith('订单不存在')
      const skipped: RebuySkippedItem[] = []
      const localItems: CartItem[] = []
      let addedCount = 0
      for (const item of order.items) {
        const product = mockProducts.find((p) => p.id === item.productId)
        const sku = product?.skus.find((s) => s.id === item.skuId)
        if (!product || !sku) {
          skipped.push({ productName: item.productName, reason: '商品已下架' })
          continue
        }
        if (sku.stock < item.quantity) {
          skipped.push({ productName: item.productName, reason: '库存不足' })
          continue
        }
        const existing = cart.find((c) => c.skuId === item.skuId)
        if (existing) {
          existing.quantity += item.quantity
          existing.selected = true
        } else {
          cart = [
            {
              id: Date.now() + addedCount,
              productId: item.productId,
              skuId: item.skuId,
              quantity: item.quantity,
              selected: true,
            },
            ...cart,
          ]
        }
        localItems.push({
          id: Date.now() + addedCount,
          productId: product.id,
          skuId: sku.id,
          name: product.name,
          image: sku.image || product.mainImage,
          specText: sku.specText,
          price: sku.price,
          quantity: item.quantity,
          stock: sku.stock,
          selected: true,
        })
        addedCount += 1
      }
      if (!addedCount) return rejectWith('商品已失效，无法再次购买')
      mergeLocalCart(localItems)
      return delay({
        orderNo,
        addedCount,
        skippedCount: skipped.length,
        skipped,
        cartCount: cart.length,
      })
    },
    remove: (orderNo): Promise<DeleteOrderResult> => {
      const order = orders.find((o) => o.orderNo === orderNo)
      if (!order) return rejectWith('订单不存在')
      if (![40, 60, 70].includes(order.status)) return rejectWith('当前订单状态不可删除')
      orders = orders.filter((o) => o.orderNo !== orderNo)
      return delay({ orderNo, deleted: true })
    },
    remindShip: (orderNo): Promise<RemindShipResult> => {
      const order = orders.find((o) => o.orderNo === orderNo)
      if (!order) return rejectWith('订单不存在')
      if (order.status !== 20) return rejectWith('当前订单状态不可提醒发货')
      const now = Date.now()
      const cooldownMs = 10 * 60 * 1000
      const last = remindRecords.get(orderNo)
      if (last && now - last < cooldownMs) {
        return delay({
          reminded: false,
          duplicated: true,
          remindCount: 1,
          lastRemindAt: formatMockTime(last),
          cooldownSeconds: Math.ceil((last + cooldownMs - now) / 1000),
          nextRemindAt: formatMockTime(last + cooldownMs),
        })
      }
      remindRecords.set(orderNo, now)
      return delay({
        reminded: true,
        duplicated: false,
        remindCount: 1,
        lastRemindAt: formatMockTime(now),
        cooldownSeconds: cooldownMs / 1000,
        nextRemindAt: formatMockTime(now + cooldownMs),
      })
    },
    logistics: (orderNo): Promise<OrderLogisticsDetail> => {
      const order = orders.find((o) => o.orderNo === orderNo)
      if (!order) return rejectWith('订单不存在')
      const traces = order.logistics?.traces ?? []
      return delay({
        orderNo,
        status: order.status,
        statusText: orderStatusText[order.status],
        company: order.logistics?.company ?? '',
        trackingNo: order.logistics?.trackingNo ?? '',
        shipTime: order.shipTime,
        traces,
        hasLogistics: Boolean(order.logistics),
      })
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
    loginBySms: (): Promise<LoginResult> =>
      delay({ user: demoUser, token: 'mock-token', refreshToken: 'mock-refresh' }),
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
    setPayPassword: () => delay({ hasPayPassword: true }),
    loginLogs: (): Promise<LoginLogItem[]> =>
      delay([
        {
          id: 1,
          loginType: 1,
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120',
          loginAt: '2026-10-30 10:00:00',
        },
      ]),
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
      const order = orders.find((o) => o.orderNo === payload.orderNo)
      if (!order) return rejectWith<PrepayResult>('订单不存在')
      if (payload.channel === 3 && walletBalance < order.payAmount) {
        return rejectWith<PrepayResult>('余额不足，请选择其它支付方式')
      }
      const payNo = `PAY${Date.now()}`
      payRecords.set(payNo, { orderNo: payload.orderNo, channel: payload.channel })
      return delay({
        payNo,
        amount: order.payAmount,
        payParams: { sandboxToken: 'mock-token', channel: String(payload.channel) },
        payUrl: null,
      })
    },
    status: (payNo: string): Promise<PayStatusResult> => {
      const rec = payRecords.get(payNo)
      const order = orders.find((o) => o.orderNo === rec?.orderNo)
      return delay({
        payNo,
        payStatus: order && order.status !== 10 ? 1 : 0,
        orderNo: rec?.orderNo ?? '',
        orderStatus: order?.status ?? null,
      })
    },
    sandboxPay: (payload: SandboxPayPayload): Promise<void> => {
      const rec = payRecords.get(payload.payNo)
      const order = orders.find((o) => o.orderNo === rec?.orderNo)
      if (!rec || !order) return rejectWith<void>('支付单不存在')
      if (rec.channel === 3) {
        if (walletBalance < order.payAmount) return rejectWith<void>('余额不足，支付失败')
        appendBalanceLog(2, -order.payAmount, order.orderNo, `订单 ${order.orderNo} 余额支付`)
      }
      order.status = 20
      return delay(undefined as void)
    },
  },

  walletApi: {
    mine: (): Promise<MyWallet> =>
      delay({
        balance: walletBalance,
        totalRecharged: balanceLogs
          .filter((l) => l.type === 1)
          .reduce((sum, l) => sum + l.change, 0),
        logs: [...balanceLogs],
        recharges: [...rechargeRecords],
      }),
    create: (payload: RechargePayload): Promise<PrepayResult> => {
      const amount = Math.round(payload.amount * 100) / 100
      if (!Number.isFinite(amount) || amount < 0.01 || amount > 50000) {
        return rejectWith<PrepayResult>('充值金额需在 ¥0.01 ~ ¥50000 之间')
      }
      const payNo = `RCP${Date.now()}`
      rechargePrepay.set(payNo, { amount, channel: payload.channel })
      rechargeRecords = [
        {
          payNo,
          amount,
          channel: payload.channel,
          status: 0,
          paidAt: '',
          createdAt: formatMockTime(Date.now()),
        },
        ...rechargeRecords,
      ]
      return delay({
        payNo,
        amount,
        payParams: { sandboxToken: 'mock-token', channel: String(payload.channel) },
        payUrl: null,
      })
    },
    status: (payNo: string): Promise<RechargeStatusResult> => {
      const record = rechargeRecords.find((r) => r.payNo === payNo)
      return delay({
        payNo,
        payStatus: record?.status ?? 0,
        amount: record?.amount ?? 0,
        balance: walletBalance,
        paidAt: record?.paidAt ?? '',
      })
    },
    sandboxPay: (payload: SandboxPayPayload): Promise<void> => {
      const ready = rechargePrepay.get(payload.payNo)
      const record = rechargeRecords.find((r) => r.payNo === payload.payNo)
      if (!ready || !record) return rejectWith<void>('充值单不存在')
      if ((payload.channel ?? 4) !== ready.channel) return rejectWith<void>('支付渠道与充值单不一致')
      if (record.status === 1) return delay(undefined as void)
      if (Math.abs(ready.amount - payload.amount) > 0.001) {
        return rejectWith<void>('充值金额与支付金额不一致')
      }
      record.status = 1
      record.paidAt = formatMockTime(Date.now())
      appendBalanceLog(1, ready.amount, record.payNo, '账户余额充值')
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
    uploadImage: (file: File) => delay({ url: URL.createObjectURL(file) }),
  },

  commentApi: {
    mine: (): Promise<MyComments> => delay({ pending: [], done: [] }),
    create: (payload: CreateCommentPayload): Promise<MyComment> => {
      const order = orders.find((o) => o.items.some((i) => i.id === payload.orderItemId))
      const item = order?.items.find((i) => i.id === payload.orderItemId)
      if (item) item.isCommented = true
      return delay({
        id: Date.now(),
        productId: item?.productId ?? 0,
        productName: item?.productName ?? '',
        productImage: item?.productImage ?? '',
        score: payload.score,
        content: payload.content,
        images: payload.images ?? [],
        isAnonymous: Boolean(payload.isAnonymous),
        replyContent: '',
        status: 1,
        createdAt: formatMockTime(Date.now()),
        rewardPoints: 5,
      })
    },
    uploadImage: (file: File) => delay({ url: URL.createObjectURL(file) }),
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
    create: async (payload: CreateFeedbackPayload): Promise<FeedbackItem> => {
      await delay(null)
      const item: FeedbackItem = {
        id: Date.now(),
        userId: 1,
        nickname: '小兔用户',
        avatar: '',
        type: payload.type,
        content: payload.content,
        images: [...(payload.images ?? [])],
        contact: payload.contact ?? '',
        orderNo: payload.orderNo ?? '',
        status: 0,
        replyContent: '',
        replyAt: null,
        replier: '',
        createdAt: formatMockTime(Date.now()),
      }
      feedbacks = [item, ...feedbacks]
      return item
    },
    mine: (orderNo?: string) =>
      delay(orderNo ? feedbacks.filter((f) => f.orderNo === orderNo) : [...feedbacks]),
    uploadImage: (file: File) => delay({ url: URL.createObjectURL(file) }),
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

  aiApi: {
    config: (): Promise<AiConfig> =>
      delay({
        enabled: true,
        mode: 'mock',
        model: 'mock-customer-service',
        usingFallback: false,
        welcome: '你好，我是小兔鲜 AI 客服（演示模式）。订单、物流、退换货、发票都可以问我。',
        quickQuestions: ['我的订单什么时候发货？', '帮我查一下物流到哪了', '想退货，流程是怎样的？', '怎么开发票？'],
        disclaimer: '演示模式回答为内置话术；配置 DEEPSEEK_API_KEY 后由 DeepSeek 生成。',
      }),

    async chat(payload, handlers) {
      const conversationId = payload.conversationId ?? (aiConversationSeq += 1)
      handlers?.onMeta?.({ conversationId })

      if (/订单|物流|快递/.test(payload.message)) {
        handlers?.onThinking?.('正在查询你的订单信息…')
        await delay(null, 120)
        handlers?.onTool?.({ name: 'get_order_detail', label: '已查询订单（演示数据）' })
      }

      const { text, citations } = mockAiAnswer(payload.message)
      for (const chunk of text.match(/[\s\S]{1,16}/g) ?? [text]) {
        await delay(null, 25)
        handlers?.onDelta?.(chunk)
      }

      const done: AiChatDonePayload = {
        conversationId,
        messageId: Date.now(),
        content: text,
        citations,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        grounded: citations.length > 0,
        mode: 'mock',
      }
      handlers?.onDone?.(done)

      aiMessages.push(
        { id: Date.now(), role: 'user', content: payload.message, citations: [], createdAt: '' },
        { id: Date.now() + 1, role: 'assistant', content: text, citations, createdAt: '' },
      )
      const existing = aiConversations.find((item) => item.id === conversationId)
      if (existing) {
        existing.messageCount += 2
        existing.lastMessage = text.slice(0, 120)
        existing.lastMessageAt = '刚刚'
      } else {
        aiConversations.unshift({
          id: conversationId,
          orderNo: payload.orderNo ?? '',
          title: payload.message.slice(0, 30),
          status: 1,
          messageCount: 2,
          lastMessage: text.slice(0, 120),
          lastMessageAt: '刚刚',
          createdAt: '刚刚',
        })
      }

      return {
        conversationId,
        messageId: done.messageId,
        content: text,
        citations,
        usage: done.usage,
        mode: 'mock' as const,
      }
    },

    conversations: (orderNo?: string) =>
      delay(orderNo ? aiConversations.filter((item) => item.orderNo === orderNo) : [...aiConversations]),

    messages: () => delay([...aiMessages]),

    transfer: (conversationId: number) =>
      delay({ feedbackId: Date.now(), conversationId }),
  },
}
