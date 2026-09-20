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
  quantity: number
  subtotal: number
  isCommented: boolean
}

export interface Order {
  orderNo: string
  status: OrderStatus
  items: OrderItem[]
  totalAmount: number
  discountAmount: number
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
  scopeText: string
  validText: string
  status: 0 | 1 | 2
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
  levelName: string
  points: number
  totalSpent: number
}
