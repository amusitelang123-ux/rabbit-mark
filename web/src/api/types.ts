export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  timestamp: number
}

export interface PageResult<T> {
  list: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface Category {
  id: number
  parentId: number
  name: string
  level: 1 | 2
  icon: string
  sort: number
}

export interface Brand {
  id: number
  name: string
  logo: string
}

export interface SkuSpec {
  [key: string]: string
}

export interface ProductSku {
  id: number
  productId: number
  skuCode: string
  spec: SkuSpec
  specText: string
  image: string
  price: number
  marketPrice: number
  stock: number
  warnStock: number
  status: number
}

export interface Product {
  id: number
  name: string
  subtitle: string
  categoryId: number
  brandId: number
  mainImage: string
  images: string[]
  detailHtml: string
  unit: string
  priceMin: number
  priceMax: number
  totalStock: number
  salesCount: number
  commentCount: number
  avgScore: number
  isRecommend: boolean
  tags: string[]
  /** 商品参数（后台维护，详情页“规格参数”展示） */
  attributes?: { name: string; value: string }[]
  categoryName: string
  brandName: string
  topCategoryId: number
  topCategoryName: string
  skus: ProductSku[]
}

export interface CommentItem {
  id: number
  userId: number
  nickname: string
  avatar: string
  score: number
  content: string
  images: string[]
  specText: string
  replyContent?: string
  createdAt: string
}

export interface Banner {
  id: number
  title: string
  subtitle: string
  image: string
  link: string
  bg: string
}

export interface CartItem {
  id: number
  productId: number
  skuId: number
  name: string
  image: string
  specText: string
  price: number
  quantity: number
  stock: number
  selected: boolean
  invalid?: boolean
}

export interface Address {
  id: number
  receiver: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  isDefault: boolean
}

export type OrderStatus = 10 | 20 | 30 | 40 | 50 | 60 | 70

export interface OrderItem {
  id: number
  productId: number
  skuId: number
  productName: string
  skuSpecText: string
  productImage: string
  price: number
  /** 原价（未参与秒杀时与 price 相同） */
  originalPrice: number
  /** 是否参与秒杀 */
  seckill: boolean
  quantity: number
  subtotal: number
  /** 满赠赠品（U-62） */
  isGift?: boolean
  isCommented: boolean
}

/** 订单操作日志项 */
export interface OrderLogItem {
  id: number
  action: string
  actionText: string
  operator: string
  remark: string
  createdAt: string
}

/** 订单支付流水（后台订单详情） */
export interface OrderPaymentInfo {
  payNo: string
  channel: number
  /** 0待支付 1成功 2失败 3已退款 4已关闭 */
  status: number
  amount: number
  thirdPartyNo: string
  paidAt: string | null
}

/** 订单发票信息（下单时用户选择） */
export interface OrderInvoice {
  /** 1 电子普票 2 增值税专票 */
  type: number
  title: string
  taxNo: string
  email: string
  content: string
  /** 0 待开票 1 已开票 */
  status: number
}

export interface Order {
  orderNo: string
  status: OrderStatus
  items: OrderItem[]
  totalAmount: number
  discountAmount: number
  /** 秒杀优惠快照 */
  seckillAmount: number
  /** 满减活动抵扣 */
  promotionAmount: number
  couponAmount: number
  /** 积分抵现消耗的积分（U-64） */
  pointsUsed?: number
  /** 积分抵现抵扣金额 */
  pointsAmount?: number
  freightAmount: number
  payAmount: number
  receiverName: string
  receiverPhone: string
  receiverAddress: string
  payType: number | null
  payTime: string | null
  shipTime: string | null
  receiveTime: string | null
  /** 用户催发货提醒次数（后台订单列表/详情展示） */
  remindShipCount: number
  /** 最近一次催发货时间 */
  lastRemindShipAt: string | null
  remark: string
  /** 后台异常标记（仅后台使用） */
  isAbnormal?: boolean
  abnormalReason?: string
  /** 发票信息，未开票为 null */
  invoice?: OrderInvoice | null
  /** 支付流水（仅后台详情接口返回） */
  payment?: OrderPaymentInfo | null
  createdAt: string
  /** 订单操作日志时间轴（仅详情接口返回） */
  logs: OrderLogItem[]
  logistics?: { company: string; trackingNo: string; traces: LogisticsTrace[] }
}

export interface LogisticsTrace {
  time: string
  text: string
}

/** 再次购买时被跳过的明细 */
export interface RebuySkippedItem {
  productName: string
  reason: string
}

/** 再次购买结果：已加入购物车数量 + 失效明细 */
export interface RebuyResult {
  orderNo: string
  addedCount: number
  skippedCount: number
  skipped: RebuySkippedItem[]
  cartCount: number
}

/** 删除订单结果（用户侧逻辑隐藏） */
export interface DeleteOrderResult {
  orderNo: string
  deleted: boolean
}

/** 提醒发货结果；冷却期内重复提醒返回 duplicated=true */
export interface RemindShipResult {
  reminded: boolean
  duplicated: boolean
  remindCount: number
  lastRemindAt: string
  cooldownSeconds: number
  nextRemindAt: string | null
}

/** 订单物流详情（未发货时各字段为空） */
export interface OrderLogisticsDetail {
  orderNo: string
  status: OrderStatus
  statusText: string
  company: string
  trackingNo: string
  shipTime: string | null
  traces: LogisticsTrace[]
  hasLogistics: boolean
}

export interface Coupon {
  id: number
  name: string
  type: 1 | 2
  amount: number
  discountRate: number
  minAmount: number
  scope?: number
  scopeIds?: number[]
  scopeText: string
  validType?: number
  validStart?: string
  validEnd?: string
  validDays?: number | null
  validText: string
  totalCount?: number
  receivedCount?: number
  usedCount?: number
  remainCount?: number | null
  expireAt?: string
  status: 0 | 1 | 2
}

/** 结算页预览券：discount 由后端按当前购物车真实计算 */
export interface CouponPreview extends Coupon {
  discount: number
  eligibleAmount: number
}

export interface CouponPreviewResult {
  list: CouponPreview[]
  bestCouponId: number | null
}

export interface SeckillProduct {
  id: number
  productId: number
  name: string
  image: string
  price: number
  originPrice: number
  stock: number
  soldCount: number
}

export interface UserInfo {
  id: number
  username: string
  nickname: string
  avatar: string
  phone: string
  gender: number
  birthday: string
  levelName: string
  points: number
  totalSpent: number
  /** 账户余额（U-30） */
  balance?: number
  /** 是否已设置支付密码（U-45） */
  hasPayPassword?: boolean
}

/** 登录设备记录（U-45） */
export interface LoginLogItem {
  id: number
  /** 1 密码 2 短信 3 注册 */
  loginType: number
  ip: string
  userAgent: string
  loginAt: string
}

/** 支付渠道：1微信 2支付宝 3余额 4沙箱 */
export type PayChannel = 1 | 2 | 3 | 4

/** 充值渠道：余额不能充值自身，因此排除 3 */
export type RechargeChannel = 1 | 2 | 4

/** 余额流水类型：1充值 2余额支付 3退款入账 4后台调整 */
export interface BalanceLog {
  id: number
  type: number
  change: number
  balance: number
  relatedNo: string
  remark: string
  createdAt: string
}

/** 充值记录（钱包页展示，含未支付/失败单） */
export interface BalanceRecharge {
  payNo: string
  amount: number
  channel: number
  status: number
  paidAt: string
  createdAt: string
}

export interface MyWallet {
  balance: number
  /** 累计充值金额（成功入账流水汇总） */
  totalRecharged: number
  logs: BalanceLog[]
  recharges: BalanceRecharge[]
}

export interface RechargePayload {
  amount: number
  channel: RechargeChannel
}

export interface RechargeStatusResult {
  payNo: string
  payStatus: number
  amount: number
  balance: number
  paidAt: string
}

export interface PrepayResult {
  payNo: string
  amount: number
  payParams: Record<string, string>
  payUrl: string | null
}

export interface PayStatusResult {
  payNo: string
  payStatus: number
  orderNo: string
  orderStatus: OrderStatus | null
}

/** 售后单 */
export interface Refund {
  id: number
  refundNo: string
  orderId: number
  orderNo: string
  orderItemId: number | null
  productName: string
  productImage: string
  type: number
  reason: string
  amount: number
  images: string[]
  status: number
  auditRemark: string
  auditAt: string | null
  createdAt: string
}

/** 我的评价（已评价） */
export interface MyComment {
  id: number
  productId: number
  productName: string
  productImage: string
  score: number
  content: string
  images: string[]
  isAnonymous: boolean
  replyContent: string
  status: number
  createdAt: string
  /** 发布评价获得的积分（评价有礼） */
  rewardPoints?: number
}

/** 待评价明细 */
export interface PendingComment {
  orderItemId: number
  orderNo: string
  productId: number
  productName: string
  productImage: string
  skuSpecText: string
  createdAt: string
}

export interface MyComments {
  pending: PendingComment[]
  done: MyComment[]
}

/** 积分流水 */
export interface PointsLog {
  id: number
  type: number
  change: number
  balance: number
  remark: string
  createdAt: string
}

export interface MyPoints {
  balance: number
  todaySigned: boolean
  logs: PointsLog[]
}

/** 生效中的满减/满赠活动 */
export interface ActivePromotion {
  id: number
  name: string
  type: number
  endTime: string
  thresholds: {
    amount: number
    reduce: number
    /** 满赠档位：赠品信息（服务端已反查名称/图片） */
    giftProductId?: number
    giftSkuId?: number
    giftQuantity?: number
    giftName?: string
    giftImage?: string
  }[]
}

/** 帮助中心 FAQ */
export interface FaqItem {
  id: number
  category: string
  question: string
  answer: string
  sort: number
  status: number
  createdAt: string
}

export interface FaqGroup {
  category: string
  items: FaqItem[]
}

export interface LogisticsCompanyItem {
  id: number
  name: string
  code: string
  phone: string
  sort: number
  status: number
}

/** 秒杀商品项 */
export interface SeckillItem {
  id: number
  productId: number
  skuId: number
  productName: string
  productImage: string
  skuSpecText: string
  originalPrice: number
  seckillPrice: number
  remaining: number
  limitPerUser: number
}

/** 进行中的秒杀活动 */
export interface ActiveSeckill {
  id: number
  name: string
  startTime: string
  endTime: string
  endTimestamp: number
  products: SeckillItem[]
}

/** 留言工单 */
export interface FeedbackItem {
  id: number
  userId: number
  nickname: string
  avatar: string
  type: number
  content: string
  images: string[]
  contact: string
  orderNo: string
  status: number
  replyContent: string
  replyAt: string | null
  replier: string
  createdAt: string
}

/** 公开系统配置 */
export interface PublicConfig {
  siteName: string
  logo: string
  slogan: string
  servicePhone: string
  serviceEmail: string
  serviceHours: string
}

/** 站内公告（用户端） */
export interface Notice {
  id: number
  title: string
  /** 正文；后端 content 为 null 时已归一为 '' */
  content: string
  /** 公告类型（后端默认 1，暂无公开枚举定义） */
  type: number
  /** 发布时间，格式 YYYY-MM-DD HH:mm:ss；后端在 publishAt 为空时回退为 createdAt */
  publishAt: string
  createdAt: string
}

/* ------------------------------ AI 智能客服 ------------------------------ */

/** AI 客服能力配置（公开接口） */
export interface AiConfig {
  enabled: boolean
  mode: 'deepseek' | 'mock'
  model: string
  /** 配置了 deepseek 但缺少 Key，自动降级为 mock */
  usingFallback: boolean
  welcome: string
  quickQuestions: string[]
  disclaimer: string
}

/** 知识引用：回答里 [1]、[2] 指向的 FAQ / 规则 */
export interface AiCitation {
  sourceType: string
  sourceId: number | null
  title: string
  snippet: string
}

/** AI 客服对话可选的关联订单（帮助中心订单选择器） */
export interface AiOrderOption {
  orderNo: string
  statusText: string
  payAmount: number
  itemCount: number
}

export interface AiUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface AiToolTrace {
  name: string
  arguments: string
  result?: unknown
}

/** 历史消息（后端 ai_messages） */
export interface AiChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  citations: AiCitation[]
  toolCalls?: AiToolTrace[]
  createdAt: string
}

export interface AiConversationItem {
  id: number
  orderNo: string
  title: string
  /** 1 进行中 2 已转人工 3 已关闭 */
  status: number
  messageCount: number
  lastMessage: string
  lastMessageAt: string | null
  createdAt: string
}

export interface AiChatPayload {
  message: string
  conversationId?: number
  orderNo?: string
  /** 仅前端使用，不会序列化到请求体 */
  signal?: AbortSignal
}

export interface AiChatDonePayload {
  conversationId: number
  messageId: number
  content: string
  citations: AiCitation[]
  usage: AiUsage
  grounded: boolean
  mode: 'deepseek' | 'mock'
}

export interface AiChatResult {
  conversationId: number
  messageId: number
  content: string
  citations: AiCitation[]
  usage: AiUsage
  mode: 'deepseek' | 'mock'
}

/** 流式回调：与后端 SSE 事件一一对应 */
export interface AiStreamHandlers {
  onMeta?: (meta: { conversationId: number }) => void
  onThinking?: (text: string) => void
  onDelta?: (text: string) => void
  onTool?: (tool: { name: string; label: string }) => void
  onDone?: (payload: AiChatDonePayload) => void
  onError?: (message: string) => void
}
