import type {
  Address,
  Banner,
  Brand,
  CartItem,
  Category,
  CommentItem,
  Coupon,
  Order,
  PageResult,
  Product,
  SeckillProduct,
  UserInfo,
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
    mine(): Promise<Coupon[]>
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
    login(account: string, password: string): Promise<LoginResult>
    register(payload: RegisterPayload): Promise<LoginResult>
    profile(): Promise<UserInfo>
    updateProfile(patch: ProfilePatch): Promise<UserInfo>
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
}
