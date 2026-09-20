import type { Address, CommentItem, Coupon, Order, PageResult } from '../types'
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
import {
  addresses as mockAddresses,
  banners as mockBanners,
  brands as mockBrands,
  categories as mockCategories,
  commentsFor,
  coupons as mockCoupons,
  demoUser,
  orders as mockOrders,
  products as mockProducts,
  seckills as mockSeckills,
  topCategoryId,
} from '@/mock/data'

/**
 * Mock 实现：在接口契约（ClientApi）下模拟全部 `/api/client/v1/*` 行为，
 * 与真实后端可无缝切换（见 src/api/index.ts）。
 */

const LATENCY = 200

function delay<T>(data: T, ms = LATENCY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

function paginate<T>(list: T[], page: number, pageSize: number): PageResult<T> {
  const total = list.length
  const start = (page - 1) * pageSize
  return {
    list: list.slice(start, start + pageSize),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

let addresses: Address[] = [...mockAddresses]
let orders: Order[] = [...mockOrders]
let cart: { id: number; productId: number; skuId: number; quantity: number; selected: boolean }[] = []

function cartView() {
  return cart
    .map((it) => {
      const product = mockProducts.find((p) => p.id === it.productId)
      const sku = product?.skus.find((s) => s.id === it.skuId)
      return {
        id: it.id,
        productId: it.productId,
        skuId: it.skuId,
        name: product?.name ?? '',
        image: sku?.image ?? product?.mainImage ?? '',
        specText: sku?.specText ?? '',
        price: sku?.price ?? 0,
        quantity: it.quantity,
        stock: sku?.stock ?? 0,
        selected: it.selected,
        invalid: !product,
      }
    })
}

export const mockApi: ClientApi = {
  categoryApi: {
    tree: () => delay(mockCategories),
    top: () => delay(mockCategories.filter((c) => c.level === 1)),
    children: (parentId) => delay(mockCategories.filter((c) => c.parentId === parentId)),
  },

  brandApi: {
    list: () => delay(mockBrands),
  },

  productApi: {
    list(query: ProductQuery = {}) {
      const { categoryId, keyword, brandId, minPrice, maxPrice, sortBy = 'default', page = 1, pageSize = 12 } = query
      let list = [...mockProducts]
      if (categoryId) {
        const childIds = mockCategories.filter((c) => c.parentId === categoryId).map((c) => c.id)
        list = list.filter((p) => p.categoryId === categoryId || childIds.includes(p.categoryId))
      }
      if (brandId) list = list.filter((p) => p.brandId === brandId)
      if (keyword) {
        const kw = keyword.toLowerCase()
        list = list.filter((p) => p.name.toLowerCase().includes(kw) || p.subtitle.toLowerCase().includes(kw))
      }
      if (minPrice !== undefined) list = list.filter((p) => p.priceMin >= minPrice)
      if (maxPrice !== undefined) list = list.filter((p) => p.priceMin <= maxPrice)
      switch (sortBy) {
        case 'sales':
          list.sort((a, b) => b.salesCount - a.salesCount)
          break
        case 'priceAsc':
          list.sort((a, b) => a.priceMin - b.priceMin)
          break
        case 'priceDesc':
          list.sort((a, b) => b.priceMin - a.priceMin)
          break
        case 'new':
          list.sort((a, b) => b.id - a.id)
          break
        default:
          list.sort((a, b) => b.salesCount * 0.4 + b.avgScore * 100 - (a.salesCount * 0.4 + a.avgScore * 100))
      }
      return delay(paginate(list, page, pageSize))
    },
    detail: (id) => delay(mockProducts.find((p) => p.id === id)),
    recommend: (id, size = 8) =>
      delay(mockProducts.filter((p) => p.id !== id).sort((a, b) => b.salesCount - a.salesCount).slice(0, size)),
    comments: (id): Promise<CommentItem[]> => delay(commentsFor(id)),
  },

  homeApi: {
    get(): Promise<HomeData> {
      const top = mockCategories.filter((c) => c.level === 1)
      const floors = top.slice(0, 4).map((c) => ({
        title: c.name,
        subtitle: '精选好物 品质保障',
        categoryId: c.id,
        products: mockProducts.filter((p) => topCategoryId(p.categoryId) === c.id).slice(0, 8),
      }))
      return delay({
        banners: mockBanners,
        seckills: mockSeckills,
        categories: top,
        recommend: mockProducts.filter((p) => p.isRecommend).slice(0, 10),
        floors,
      })
    },
  },

  couponApi: {
    center: (): Promise<Coupon[]> => delay(mockCoupons.filter((c) => c.status === 0)),
    mine: (): Promise<Coupon[]> => delay(mockCoupons),
  },

  orderApi: {
    list: (status) => delay(status ? orders.filter((o) => o.status === status) : orders),
    detail: (orderNo) => delay(orders.find((o) => o.orderNo === orderNo)),
    create: (_payload?: CreateOrderPayload): Promise<Order> => delay(orders[0]),
    cancel: (orderNo) => {
      const order = orders.find((o) => o.orderNo === orderNo)
      if (order) order.status = 70
      return delay(order as Order)
    },
    confirm: (orderNo) => {
      const order = orders.find((o) => o.orderNo === orderNo)
      if (order) order.status = 40
      return delay(order as Order)
    },
  },

  addressApi: {
    list: () => delay(addresses),
    create: (payload: AddressPayload) => {
      const created: Address = { id: Date.now(), ...payload, isDefault: payload.isDefault ?? false }
      addresses = [created, ...addresses]
      return delay(created)
    },
    update: (id, payload) => {
      const idx = addresses.findIndex((a) => a.id === id)
      if (idx >= 0) addresses[idx] = { ...addresses[idx], ...payload }
      return delay(addresses[idx])
    },
    remove: (id) => {
      addresses = addresses.filter((a) => a.id !== id)
      return delay(undefined as void)
    },
  },

  userApi: {
    login: (): Promise<LoginResult> => delay({ user: demoUser, token: 'mock-token', refreshToken: 'mock-refresh' }),
    register: (_payload: RegisterPayload): Promise<LoginResult> =>
      delay({ user: demoUser, token: 'mock-token', refreshToken: 'mock-refresh' }),
    profile: () => delay(demoUser),
    updateProfile: (patch: ProfilePatch) => delay({ ...demoUser, ...patch }),
    uploadAvatar: (file: File) => {
      demoUser.avatar = URL.createObjectURL(file)
      return delay({ ...demoUser })
    },
    favorites: () => delay(mockProducts.slice(0, 4)),
    toggleFavorite: () => delay({ favorited: true }),
    footprints: () => delay(mockProducts.slice(4, 8)),
  },

  cartApi: {
    list: () => delay(cartView()),
    add: (payload: CartAddPayload) => {
      const existing = cart.find((c) => c.skuId === payload.skuId)
      if (existing) existing.quantity += payload.quantity
      else
        cart = [
          { id: Date.now(), productId: payload.productId, skuId: payload.skuId, quantity: payload.quantity, selected: true },
          ...cart,
        ]
      return delay(cartView())
    },
    update: (id, patch) => {
      const it = cart.find((c) => c.id === id)
      if (it) {
        if (patch.quantity !== undefined) it.quantity = patch.quantity
        if (patch.selected !== undefined) it.selected = patch.selected
      }
      return delay(cartView())
    },
    selectAll: (selected) => {
      cart.forEach((c) => (c.selected = selected))
      return delay(cartView())
    },
    remove: (ids) => {
      cart = cart.filter((c) => !ids.includes(c.id))
      return delay(cartView())
    },
  },
}
