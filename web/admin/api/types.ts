import type { Order } from '@/api/types'

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
  orderCount: number
  gmv: number
  userCount: number
  productCount: number
  avgOrderAmount: number
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
  startTime?: string
  endTime?: string
  page?: number
  pageSize?: number
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
  status: number
  lastLoginAt: string | null
  createdAt: string
}

export interface AdminUserDetail extends AdminCustomer {
  orderCount: number
  paidCount: number
  orderAmount: number
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
  createdAt: string
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

export interface AdminPromotion {
  id: number
  name: string
  type: number
  thresholds: { amount: number; reduce: number }[]
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

export type { Order }
