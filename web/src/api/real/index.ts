import { http } from '../request'
import type { Brand, Category, CommentItem, Coupon, Order, PageResult, Product, Address, CartItem, UserInfo } from '../types'
import type {
  AddressPayload,
  CartAddPayload,
  ClientApi,
  CreateOrderPayload,
  HomeData,
  LoginResult,
  ProfilePatch,
  ProductQuery,
  RegisterPayload,
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
    login: (account, password) => http.post<LoginResult>('/auth/login', { account, password }),
    register: (payload: RegisterPayload) => http.post<LoginResult>('/auth/register', payload),
    profile: () => http.get<UserInfo>('/user/profile'),
    updateProfile: (patch: ProfilePatch) => http.put<UserInfo>('/user/profile', patch),
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
}
