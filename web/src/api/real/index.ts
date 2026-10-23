import { http } from '../request'
import type { Brand, Category, CommentItem, Coupon, MyComment, MyComments, MyPoints, ActivePromotion, FaqGroup, LogisticsCompanyItem, ActiveSeckill, FeedbackItem, PublicConfig, Order, PageResult, PayStatusResult, PrepayResult, Product, Address, CartItem, Refund, UserInfo, Notice } from '../types'
import type {
  AddressPayload,
  CartAddPayload,
  ClientApi,
  CreateOrderPayload,
  HomeData,
  LoginResult,
  PrepayPayload,
  ProfilePatch,
  ProductQuery,
  RegisterPayload,
  SandboxPayPayload,
} from '../contract'

/**
 * 真实后端实现：一一对应 server/src/routes/client/index.ts 中的 `/api/client/v1/*`。
 * 所有请求经 request.ts 统一注入 Token 与错误处理。
 */

function productParams(query: ProductQuery): Record<string, string | number | undefined> {
  return {
    categoryId: query.categoryId,
    keyword: query.keyword,
    brandId: query.brandId,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    sortBy: query.sortBy,
    page: query.page,
    pageSize: query.pageSize,
  }
}

export const realApi: ClientApi = {
  categoryApi: {
    tree: () => http.get<Category[]>('/categories'),
    async top() {
      const all = await http.get<Category[]>('/categories')
      return all.filter((c) => c.level === 1)
    },
    async children(parentId) {
      const all = await http.get<Category[]>('/categories')
      return all.filter((c) => c.parentId === parentId)
    },
  },

  brandApi: {
    list: () => http.get<Brand[]>('/brands'),
  },

  productApi: {
    list: (query = {}) => http.get<PageResult<Product>>('/products', productParams(query)),
    detail: (id) => http.get<Product | undefined>(`/products/${id}`),
    recommend: (id, size = 4) => http.get<Product[]>(`/products/${id}/recommend`, { size }),
    comments: (id) => http.get<CommentItem[]>(`/products/${id}/comments`),
  },

  homeApi: {
    get: () => http.get<HomeData>('/home'),
  },

  couponApi: {
    center: () => http.get<Coupon[]>('/coupons/center'),
    mine: () => http.get<Coupon[]>('/user/coupons'),
    receive: (id) => http.post<{ id: number; couponId: number }>(`/coupons/${id}/receive`),
  },

  orderApi: {
    list: (status) => http.get<Order[]>('/orders', { status }),
    detail: (orderNo) => http.get<Order | undefined>(`/orders/${orderNo}`),
    create: (payload: CreateOrderPayload = {}) => http.post<Order>('/orders', payload),
    cancel: (orderNo) => http.put<Order>(`/orders/${orderNo}/cancel`),
    confirm: (orderNo) => http.put<Order>(`/orders/${orderNo}/confirm`),
  },

  addressApi: {
    list: () => http.get<Address[]>('/user/addresses'),
    create: (payload: AddressPayload) => http.post<Address>('/user/addresses', payload),
    update: (id, payload) => http.put<Address>(`/user/addresses/${id}`, payload),
    remove: (id) => http.delete<void>(`/user/addresses/${id}`),
  },

  userApi: {
    login: (account, password, captcha) =>
      http.post<LoginResult>('/auth/login', {
        account,
        password,
        captchaId: captcha?.captchaId,
        captchaCode: captcha?.captchaCode,
      }),
    captcha: () =>
      http.get<{ captchaId: string; image: string; expireIn: number }>('/auth/captcha'),
    register: (payload: RegisterPayload) => http.post<LoginResult>('/auth/register', payload),
    profile: () => http.get<UserInfo>('/user/profile'),
    updateProfile: (patch: ProfilePatch) => http.put<UserInfo>('/user/profile', patch),
    uploadAvatar: (file: File) => http.upload<UserInfo>('/user/avatar', file),
    changePassword: (payload) => http.put<{ changed: boolean }>('/user/password', payload),
    sendSmsCode: (phone) => http.post<{ phone: string; code: string }>('/auth/sms-code', { phone }),
    resetPassword: (payload) => http.post<{ reset: boolean }>('/auth/reset-password', payload),
    favorites: () => http.get<Product[]>('/user/favorites'),
    toggleFavorite: (productId) => http.post<{ favorited: boolean }>('/user/favorites/toggle', { productId }),
    footprints: () => http.get<Product[]>('/user/footprints'),
  },

  cartApi: {
    list: () => http.get<CartItem[]>('/cart'),
    add: (payload: CartAddPayload) => http.post<CartItem[]>('/cart', payload),
    update: (id, patch) => http.put<CartItem[]>(`/cart/${id}`, patch),
    selectAll: (selected) => http.put<CartItem[]>('/cart/select-all', { selected }),
    remove: (ids) => http.delete<CartItem[]>('/cart', { ids }),
  },

  paymentApi: {
    prepay: (payload: PrepayPayload) => http.post<PrepayResult>('/payments/prepay', payload),
    status: (payNo) => http.get<PayStatusResult>(`/payments/${payNo}/status`),
    sandboxPay: (payload: SandboxPayPayload) => http.post<void>('/payments/callback/4', payload),
  },

  refundApi: {
    apply: (payload) => http.post<Refund>('/refunds', payload),
    mine: () => http.get<Refund[]>('/refunds'),
  },

  commentApi: {
    mine: () => http.get<MyComments>('/user/comments'),
    create: (payload) => http.post<MyComment>('/comments', payload),
  },

  pointsApi: {
    mine: () => http.get<MyPoints>('/user/points'),
    signIn: () => http.post<{ balance: number; change: number; gain: number; streak: number }>('/user/points/sign-in'),
  },

  promotionApi: {
    active: () => http.get<ActivePromotion[]>('/promotions/active'),
  },

  contentApi: {
    faqGroups: () => http.get<FaqGroup[]>('/faqs'),
    logisticsCompanies: () => http.get<LogisticsCompanyItem[]>('/logistics-companies'),
  },

  seckillApi: {
    active: () => http.get<ActiveSeckill[]>('/seckills/active'),
  },

  feedbackApi: {
    create: (payload) => http.post<FeedbackItem>('/feedbacks', payload),
    mine: () => http.get<FeedbackItem[]>('/feedbacks'),
  },

  configApi: {
    public: () => http.get<PublicConfig>('/config'),
  },

  noticeApi: {
    list: (limit) => http.get<Notice[]>('/notices', { limit }),
    detail: (id) => http.get<Notice>(`/notices/${id}`),
  },
}
