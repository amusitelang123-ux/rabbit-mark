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
  freightAmount: number
  payAmount: number
  receiverName: string
  receiverPhone: string
  receiverAddress: string
  payType: number | null
  payTime: string | null
  shipTime: string | null
  receiveTime: string | null
  remark: string
  createdAt: string
  /** 订单操作日志时间轴（仅详情接口返回） */
  logs: OrderLogItem[]
  logistics?: { company: string; trackingNo: string; traces: LogisticsTrace[] }
}

export interface LogisticsTrace {
  time: string
  text: string
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
}

/** 支付渠道：1微信 2支付宝 3余额 4沙箱 */
export type PayChannel = 1 | 2 | 3 | 4

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

/** 生效中的满减活动 */
export interface ActivePromotion {
  id: number
  name: string
  type: number
  endTime: string
  thresholds: { amount: number; reduce: number }[]
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
