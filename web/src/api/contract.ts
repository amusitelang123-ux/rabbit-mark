import type {
  Address,
  Banner,
  Brand,
  CartItem,
  Category,
  CommentItem,
  Coupon,
  CouponPreviewResult,
  Order,
  PageResult,
  PayChannel,
  PayStatusResult,
  PrepayResult,
  Product,
  MyComment,
  MyComments,
  MyPoints,
  ActivePromotion,
  FaqGroup,
  LogisticsCompanyItem,
  ActiveSeckill,
  FeedbackItem,
  PublicConfig,
  Refund,
  SeckillProduct,
  UserInfo,
  Notice,
} from './types'

export interface ProductQuery {
  categoryId?: number
  keyword?: string
  brandId?: number
  minPrice?: number
  maxPrice?: number
  sortBy?: 'default' | 'sales' | 'priceAsc' | 'priceDesc' | 'new'
  page?: number
  pageSize?: number
}

export interface HomeData {
  banners: Banner[]
  seckills: SeckillProduct[]
  categories: Category[]
  recommend: Product[]
  floors: { title: string; subtitle: string; categoryId: number; products: Product[] }[]
}

export interface LoginResult {
  user: UserInfo
  token: string
  refreshToken: string
}

export interface RegisterPayload {
  username?: string
  phone?: string
  password: string
  code?: string
}

export interface ProfilePatch {
  nickname?: string
  avatar?: string
  gender?: number
  birthday?: string
}

export interface CreateOrderPayload {
  addressId?: number
  couponId?: number
  remark?: string
}

export interface AddressPayload {
  receiver: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  isDefault?: boolean
}

export interface CartAddPayload {
  productId: number
  skuId: number
  quantity: number
}

export interface PrepayPayload {
  orderNo: string
  channel: PayChannel
}

export interface SandboxPayPayload {
  payNo: string
  amount: number
  sandboxToken: string
}

/** 用户端 API 契约：Mock 与真实后端都实现该接口 */
export interface ClientApi {
  categoryApi: {
    tree(): Promise<Category[]>
    top(): Promise<Category[]>
    children(parentId: number): Promise<Category[]>
  }
  brandApi: {
    list(): Promise<Brand[]>
  }
  productApi: {
    list(query?: ProductQuery): Promise<PageResult<Product>>
    detail(id: number): Promise<Product | undefined>
    recommend(id: number, size?: number): Promise<Product[]>
    comments(id: number): Promise<CommentItem[]>
  }
  homeApi: {
    get(): Promise<HomeData>
  }
  couponApi: {
    center(): Promise<Coupon[]>
    /** 按当前选中购物车计算可用券、真实抵扣额与最优券 */
    preview(): Promise<CouponPreviewResult>
    mine(): Promise<Coupon[]>
    receive(id: number): Promise<{ id: number; couponId: number }>
  }
  orderApi: {
    list(status?: number): Promise<Order[]>
    detail(orderNo: string): Promise<Order | undefined>
    create(payload?: CreateOrderPayload): Promise<Order>
    cancel(orderNo: string): Promise<Order>
    confirm(orderNo: string): Promise<Order>
  }
  addressApi: {
    list(): Promise<Address[]>
    create(payload: AddressPayload): Promise<Address>
    update(id: number, payload: Partial<AddressPayload>): Promise<Address>
    remove(id: number): Promise<void>
  }
  userApi: {
    login(
      account: string,
      password: string,
      captcha?: { captchaId: string; captchaCode: string },
    ): Promise<LoginResult>
    captcha(): Promise<{ captchaId: string; image: string; expireIn: number }>
    register(payload: RegisterPayload): Promise<LoginResult>
    profile(): Promise<UserInfo>
    updateProfile(patch: ProfilePatch): Promise<UserInfo>
    uploadAvatar(file: File): Promise<UserInfo>
    changePassword(payload: { oldPassword: string; newPassword: string }): Promise<{ changed: boolean }>
    sendSmsCode(phone: string): Promise<{ phone: string; code: string }>
    resetPassword(payload: { phone: string; code: string; newPassword: string }): Promise<{ reset: boolean }>
    favorites(): Promise<Product[]>
    toggleFavorite(productId: number): Promise<{ favorited: boolean }>
    footprints(): Promise<Product[]>
  }
  cartApi: {
    list(): Promise<CartItem[]>
    add(payload: CartAddPayload): Promise<CartItem[]>
    update(id: number, patch: { quantity?: number; selected?: boolean }): Promise<CartItem[]>
    selectAll(selected: boolean): Promise<CartItem[]>
    remove(ids: number[]): Promise<CartItem[]>
  }
  paymentApi: {
    prepay(payload: PrepayPayload): Promise<PrepayResult>
    status(payNo: string): Promise<PayStatusResult>
    /** 沙箱支付：直接向回调地址提交支付结果，模拟网关异步通知 */
    sandboxPay(payload: SandboxPayPayload): Promise<void>
  }
  refundApi: {
    apply(payload: ApplyRefundPayload): Promise<Refund>
    mine(): Promise<Refund[]>
  }
  commentApi: {
    mine(): Promise<MyComments>
    create(payload: CreateCommentPayload): Promise<MyComment>
  }
  pointsApi: {
    mine(): Promise<MyPoints>
    signIn(): Promise<{ balance: number; change: number; gain: number; streak: number }>
  }
  promotionApi: {
    active(): Promise<ActivePromotion[]>
  }
  contentApi: {
    faqGroups(): Promise<FaqGroup[]>
    logisticsCompanies(): Promise<LogisticsCompanyItem[]>
  }
  seckillApi: {
    active(): Promise<ActiveSeckill[]>
  }
  feedbackApi: {
    create(payload: CreateFeedbackPayload): Promise<FeedbackItem>
    mine(): Promise<FeedbackItem[]>
  }
  configApi: {
    public(): Promise<PublicConfig>
  }
  noticeApi: {
    /** 已发布公告列表，按发布时间倒序；limit 省略时后端取默认 20 */
    list(limit?: number): Promise<Notice[]>
    /** 公告详情；不存在或未启用时后端返回 404，前端表现为 reject */
    detail(id: number): Promise<Notice>
  }
}

export interface CreateFeedbackPayload {
  type: number
  content: string
  images?: string[]
  contact?: string
  orderNo?: string
}

export interface CreateCommentPayload {
  orderItemId: number
  score: number
  content: string
  images?: string[]
  isAnonymous?: boolean
}

export interface ApplyRefundPayload {
  orderNo: string
  orderItemId?: number
  type: number
  reason: string
  amount?: number
  images?: string[]
}
