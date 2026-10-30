import type { Order, PageResult } from '@/api/types'

export interface AdminProfile {
  id: number
  username: string
  realName: string | null
  roleId: number | null
  roleCode: string
  roleName: string
  permissions: string[]
}

export interface AdminLoginResult {
  admin: {
    id: number
    username: string
    realName: string | null
    roleId: number | null
    roleCode: string
  }
  token: string
}

export interface AdminOverview {
  /** 统计区间：today / yesterday / 7d / 30d / all */
  range: string
  orderCount: number
  /** 已支付口径订单数（19/20/30/40） */
  paidOrderCount: number
  gmv: number
  /** 累计用户数 */
  userCount: number
  /** 区间新增用户 */
  newUsers: number
  productCount: number
  avgOrderAmount: number
  /** 待发货且用户已催发货的订单数 */
  pendingRemindCount: number
}

export interface AdminSku {
  id: number
  productId: number
  skuCode: string
  spec: Record<string, string>
  specText: string
  image: string
  price: number
  marketPrice: number
  costPrice: number
  stock: number
  lockedStock: number
  warnStock: number
  weight: number
  status: number
}

export interface AdminProductAttribute {
  name: string
  value: string
  sort?: number
}

export interface AdminProduct {
  id: number
  name: string
  subtitle: string
  categoryId: number
  categoryName: string
  brandId: number | null
  brandName: string
  mainImage: string
  images: string[]
  detailHtml: string
  unit: string
  weight: number
  priceMin: number
  priceMax: number
  totalStock: number
  salesCount: number
  commentCount: number
  avgScore: number
  isRecommend: boolean
  sort: number
  status: number
  createdAt: string
  skus: AdminSku[]
  attributes: AdminProductAttribute[]
}

export interface AdminCategoryNode {
  id: number
  parentId: number
  name: string
  level: number
  icon: string
  sort: number
  status: number
  children: AdminCategoryNode[]
}

export interface AdminBrand {
  id: number
  name: string
  logo: string
  sort: number
  status: number
}

export interface SpecGroupItem {
  id: number
  name: string
  sort: number
  values: string[]
}

export interface AdminUserItem {
  id: number
  username: string
  realName: string
  phone: string
  roleId: number | null
  roleName: string
  status: number
  lastLoginAt: string | null
  createdAt: string
}

export interface AdminRoleItem {
  id: number
  name: string
  code: string
  description: string
  status: number
  permissionIds: number[]
}

export interface AdminPermissionItem {
  id: number
  parentId: number
  name: string
  code: string
  type: number
  path: string
  component: string
  icon: string
  sort: number
}

export interface AdminLogItem {
  id: number
  adminId: number | null
  adminName: string
  module: string
  action: string
  targetId: number | null
  content: string
  ip: string
  createdAt: string
}

export interface AdminProductQuery {
  keyword?: string
  categoryId?: number
  status?: number
  page?: number
  pageSize?: number
}

export interface AdminOrderQuery {
  orderNo?: string
  userId?: number
  status?: number
  /** 仅看用户已催发货的待发货订单 */
  onlyReminded?: boolean
  /** 仅看后台标记的异常订单 */
  onlyAbnormal?: boolean
  startTime?: string
  endTime?: string
  page?: number
  pageSize?: number
}

/** 后台订单分页：额外返回待处理催发货订单数，用于列表顶部告警 */
export interface AdminOrderPage extends PageResult<Order> {
  pendingRemindCount: number
}

export interface AdminProductPayload {
  name: string
  subtitle?: string
  categoryId: number
  brandId?: number | null
  mainImage?: string
  detailHtml?: string
  unit?: string
  weight?: number
  isRecommend?: boolean
  sort?: number
  status?: number
  images?: string[]
  attributes?: AdminProductAttribute[]
}

export interface AdminSkuPayload {
  specJson?: Record<string, string>
  specText?: string
  image?: string
  price?: number
  marketPrice?: number
  costPrice?: number
  stock?: number
  warnStock?: number
  weight?: number
  status?: number
}

export interface AdminCustomer {
  id: number
  username: string
  nickname: string
  avatar: string
  phone: string
  maskedPhone: string
  gender: number
  birthday: string
  levelId: number | null
  levelName: string
  points: number
  totalSpent: number
  /** 账户余额（U-30） */
  balance: number
  status: number
  lastLoginAt: string | null
  createdAt: string
  /** 用户标签（A-35） */
  tags?: { id: number; name: string }[]
}

/** 用户标签字典（A-35） */
export interface AdminTag {
  id: number
  name: string
  userCount: number
}

export interface AdminUserDetail extends AdminCustomer {
  orderCount: number
  paidCount: number
  orderAmount: number
  tags: { id: number; name: string }[]
  addresses: {
    id: number
    receiver: string
    phone: string
    province: string
    city: string
    district: string
    detail: string
    isDefault: boolean
  }[]
  coupons: { id: number; couponId: number; couponCode: string; status: number; expireAt: string }[]
}

export interface AdminRefund {
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

export interface AdminCoupon {
  id: number
  name: string
  type: number
  amount: number
  discountRate: number
  minAmount: number
  totalCount: number
  receivedCount: number
  usedCount: number
  perUserLimit: number
  validType: number
  validStart: string
  validEnd: string
  validDays: number | null
  scope: number
  scopeIds: number[]
  status: number
  /** 新人券：注册自动发放 */
  isNewUser?: boolean
  createdAt: string
}

/** 首页推荐楼层（A-44） */
export interface AdminHomeFloorProduct {
  id: number
  name: string
  image: string
}

export interface AdminHomeFloor {
  id: number
  title: string
  subtitle: string
  categoryId: number | null
  sort: number
  status: number
  products: AdminHomeFloorProduct[]
}

export interface HomeFloorPayload {
  title: string
  subtitle?: string
  categoryId?: number | null
  sort?: number
  status?: number
  productIds?: number[]
}

/** 每日经营预聚合（stat_daily） */
export interface DailyStatItem {
  statDate: string
  gmv: number
  orderCount: number
  paidCount: number
  newUsers: number
  refundAmount: number
  avgOrderAmount: number
}

/** 活动数据（A-45） */
export interface MarketingCouponStat {
  id: number
  name: string
  type: number
  amount: number
  totalCount: number
  receivedCount: number
  usedCount: number
  orderCount: number
  gmv: number
}

export interface MarketingSeckillStat {
  id: number
  name: string
  startTime: string
  endTime: string
  status: number
  productCount: number
  soldCount: number
  gmv: number
  discountAmount: number
}

export interface MarketingPromotionStat {
  id: number
  name: string
  type: number
  startTime: string
  endTime: string
  status: number
}

export interface MarketingActivityStats {
  coupons: MarketingCouponStat[]
  seckills: MarketingSeckillStat[]
  promotions: MarketingPromotionStat[]
  promotionSummary: { orderCount: number; discountTotal: number }
}

/** 财务报表（A-64） */
export interface FinanceReportMonth {
  month: string
  income: number
  refund: number
  net: number
  cost: number
  gross: number
  grossRate: number
}

export interface FinanceReport {
  year: number
  months: FinanceReportMonth[]
  total: {
    income: number
    refund: number
    net: number
    cost: number
    gross: number
    grossRate: number
  }
}

export interface AdminBanner {
  id: number
  title: string
  subtitle: string
  image: string
  link: string
  bg: string
  position: string
  sort: number
  startTime: string
  endTime: string
  status: number
  createdAt: string
}

export interface AdminNotice {
  id: number
  title: string
  content: string
  type: number
  status: number
  publishAt: string
  createdAt: string
}

export interface SalesTrendPoint {
  date: string
  orderCount: number
  amount: number
}

export interface ProductRankItem {
  productId: number
  name: string
  image: string
  sales: string
  amount: string
  /** 累计加购件数（A-52） */
  cartCount: number
}

/** 订单状态分布（A-55） */
export interface OrderStatusStat {
  status: number
  statusText: string
  count: number
  amount: number
}

export interface CategorySalesItem {
  name: string
  value: string
}

export interface UserAnalysis {
  trend: { date: string; newUsers: number }[]
  repeatUsers: number
  buyers: number
  repeatRate: number
}

export interface FinanceRecordItem {
  id: number
  orderId: number | null
  orderNo: string
  type: number
  amount: number
  channel: number | null
  status: number
  occurredAt: string
}

export interface ReconciliationDaily {
  date: string
  income: number
  refund: number
  net: number
}

export interface Reconciliation {
  incomeTotal: number
  incomeCount: number
  refundTotal: number
  refundCount: number
  netIncome: number
  daily: ReconciliationDaily[]
}

export interface AdminInvoice {
  id: number
  orderId: number
  orderNo: string
  type: number
  title: string
  taxNo: string
  content: string
  email: string
  status: number
  createdAt: string
}

export interface AdminComment {
  id: number
  userId: number
  nickname: string
  avatar: string
  productId: number
  productName: string
  productImage: string
  score: number
  content: string
  images: string[]
  isAnonymous: boolean
  replyContent: string
  replyAt: string | null
  status: number
  createdAt: string
}

export interface AdminLevel {
  id: number
  name: string
  minSpent: number
  discountRate: number
  icon: string
  sort: number
  status: number
  userCount: number
}

export interface AdminSeckillProduct {
  id: number
  productId: number
  productName: string
  productImage: string
  skuId: number
  seckillPrice: number
  seckillStock: number
  soldCount: number
  limitPerUser: number
  sort: number
}

export interface AdminSeckill {
  id: number
  name: string
  startTime: string
  endTime: string
  status: number
  products: AdminSeckillProduct[]
}

/** 促销档位：满减用 reduce，满赠用 giftSkuId + giftQuantity */
export interface PromotionThreshold {
  amount: number
  reduce?: number
  giftProductId?: number
  giftSkuId?: number
  giftQuantity?: number
}

export interface AdminPromotion {
  id: number
  name: string
  type: number
  thresholds: PromotionThreshold[]
  startTime: string
  endTime: string
  status: number
  createdAt: string
}

export interface AdminPointsLog {
  id: number
  type: number
  change: number
  balance: number
  remark: string
  createdAt: string
}

export interface AdminFaq {
  id: number
  category: string
  question: string
  answer: string
  sort: number
  status: number
  createdAt: string
}

export interface AdminLogisticsCompany {
  id: number
  name: string
  code: string
  phone: string
  sort: number
  status: number
}

export interface AdminFreightTemplate {
  id: number
  name: string
  freeAmount: number
  baseFreight: number
  isDefault: number
  status: number
}

export interface ProductImportResult {
  total: number
  created: number
  updated: number
  failed: { row: number; reason: string }[]
}

export interface StockAlertItem {
  skuId: number
  skuCode: string
  specText: string
  stock: number
  lockedStock: number
  warnStock: number
  productId: number
  productName: string
  productImage: string
  productStatus: number
}

export interface InventoryLogItem {
  id: number
  skuId: number
  skuCode: string
  specText: string
  productId: number | null
  productName: string
  type: number
  change: number
  before: number
  after: number
  operator: string
  remark: string
  createdAt: string
}

export interface AdminFeedback {
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

export interface AdminSetting {
  id: number
  group: string
  key: string
  value: string
  remark: string
  updatedAt: string
}

/* ------------------------------ AI 客服 ------------------------------ */

export interface AdminAiConversation {
  id: number
  userId: number | null
  nickname: string
  phone: string
  orderNo: string
  title: string
  status: number
  messageCount: number
  lastMessage: string
  lastMessageAt: string | null
  createdAt: string
}

export interface AdminAiCitation {
  sourceType: string
  sourceId: number | null
  title: string
  snippet: string
}

export interface AdminAiMessage {
  id: number
  role: string
  content: string
  citations: AdminAiCitation[]
  toolCalls: { name: string; arguments: string; result?: unknown }[]
  tokens: number
  model: string
  latencyMs: number
  createdAt: string
}

export interface AdminAiUsageBucket {
  calls: number
  tokens: number
  cost: number
  avgLatency: number
  failures: number
}

export interface AdminAiUsage {
  mode: 'deepseek' | 'mock'
  model: string
  usingFallback: boolean
  today: AdminAiUsageBucket
  week: AdminAiUsageBucket
  totals: { conversations: number; messages: number; knowledgeChunks: number }
  knowledgeIndexedAt: string | null
  daily: { date: string; calls: number; tokens: number; cost: number }[]
}

export interface AdminAiKnowledgeSync {
  total: number
  byType: Record<string, number>
  syncedAt: string
}

export type { Order }
