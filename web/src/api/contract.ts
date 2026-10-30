import type {
  Address,
  Banner,
  Brand,
  CartItem,
  Category,
  CommentItem,
  Coupon,
  CouponPreviewResult,
  DeleteOrderResult,
  LoginLogItem,
  Order,
  OrderLogisticsDetail,
  PageResult,
  PayChannel,
  PayStatusResult,
  PrepayResult,
  Product,
  RebuyResult,
  RemindShipResult,
  MyComment,
  MyComments,
  MyPoints,
  MyWallet,
  RechargePayload,
  RechargeStatusResult,
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
  AiChatMessage,
  AiChatPayload,
  AiChatResult,
  AiConfig,
  AiConversationItem,
  AiStreamHandlers,
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
  floors: { title: string; subtitle: string; categoryId: number | null; products: Product[] }[]
}

export interface LoginResult {
  user: UserInfo
  token: string
  refreshToken: string
  /** 注册时自动发放的新人券数量（U-63） */
  newUserCoupons?: number
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

export interface CreateOrderInvoice {
  /** 1 电子普通发票 2 增值税专用发票 */
  type: 1 | 2
  title: string
  taxNo?: string
  email?: string
  content?: string
}

export interface CreateOrderPayload {
  addressId?: number
  couponId?: number
  remark?: string
  /** 使用积分抵现（100 积分 = 1 元，最多抵扣应付金额 50%） */
  usePoints?: boolean
  invoice?: CreateOrderInvoice
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
  /** 支付渠道：决定回调路由（余额支付=3） */
  channel?: number
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
    list(status?: number, page?: number, pageSize?: number): Promise<PageResult<Order>>
    detail(orderNo: string): Promise<Order | undefined>
    create(payload?: CreateOrderPayload): Promise<Order>
    cancel(orderNo: string): Promise<Order>
    confirm(orderNo: string): Promise<Order>
    /** 再次购买：把订单明细重新加入购物车 */
    rebuy(orderNo: string): Promise<RebuyResult>
    /** 删除订单：用户侧逻辑隐藏，后台与财务记录保留 */
    remove(orderNo: string): Promise<DeleteOrderResult>
    /** 提醒发货：仅待发货订单可提醒，10 分钟内重复提醒返回 duplicated */
    remindShip(orderNo: string): Promise<RemindShipResult>
    /** 查看物流：公司、运单号与轨迹时间轴 */
    logistics(orderNo: string): Promise<OrderLogisticsDetail>
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
    /** 手机验证码登录（演示环境固定验证码 8888） */
    loginBySms(phone: string, code: string): Promise<LoginResult>
    captcha(): Promise<{ captchaId: string; image: string; expireIn: number }>
    register(payload: RegisterPayload): Promise<LoginResult>
    profile(): Promise<UserInfo>
    updateProfile(patch: ProfilePatch): Promise<UserInfo>
    uploadAvatar(file: File): Promise<UserInfo>
    changePassword(payload: { oldPassword: string; newPassword: string }): Promise<{ changed: boolean }>
    /** 设置/修改支付密码（U-45） */
    setPayPassword(payload: { password: string; oldPassword?: string }): Promise<{ hasPayPassword: boolean }>
    /** 登录设备记录（U-45） */
    loginLogs(): Promise<LoginLogItem[]>
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
  walletApi: {
    /** 我的钱包：余额 + 最近资金流水 + 充值记录 */
    mine(): Promise<MyWallet>
    /** 创建充值单，返回收银台参数 */
    create(payload: RechargePayload): Promise<PrepayResult>
    /** 充值结果查询（同步回跳后轮询） */
    status(payNo: string): Promise<RechargeStatusResult>
    /** 沙箱充值回调：模拟网关异步通知并即时入账 */
    sandboxPay(payload: SandboxPayPayload): Promise<void>
  }
  refundApi: {
    apply(payload: ApplyRefundPayload): Promise<Refund>
    mine(): Promise<Refund[]>
    /** 售后凭证上传（单张，最大 5MB） */
    uploadImage(file: File): Promise<{ url: string }>
  }
  commentApi: {
    mine(): Promise<MyComments>
    create(payload: CreateCommentPayload): Promise<MyComment>
    /** 评价晒单图片上传（单张，最大 5MB），返回可访问 URL */
    uploadImage(file: File): Promise<{ url: string }>
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
    /** 我的留言；传 orderNo 时只返回该订单相关的留言 */
    mine(orderNo?: string): Promise<FeedbackItem[]>
    /** 留言凭证上传（单张，最大 5MB） */
    uploadImage(file: File): Promise<{ url: string }>
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
  aiApi: {
    /** AI 能力开关、模式与欢迎语（公开） */
    config(): Promise<AiConfig>
    /** 对话：默认 SSE 流式，逐段回调；返回最终完整结果 */
    chat(payload: AiChatPayload, handlers?: AiStreamHandlers): Promise<AiChatResult>
    /** 我的会话列表；传 orderNo 时只返回该订单的会话 */
    conversations(orderNo?: string): Promise<AiConversationItem[]>
    /** 历史消息，用于弹窗重开时恢复上下文 */
    messages(conversationId: number): Promise<AiChatMessage[]>
    /** 转人工：把最近对话摘要写成留言工单 */
    transfer(conversationId: number, note?: string): Promise<{ feedbackId: number; conversationId: number }>
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
