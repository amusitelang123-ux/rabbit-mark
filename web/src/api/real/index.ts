import { http } from '../request'
import type { Brand, Category, CommentItem, Coupon, CouponPreviewResult, DeleteOrderResult, LoginLogItem, MyComment, MyComments, MyPoints, MyWallet, RechargeStatusResult, ActivePromotion, FaqGroup, LogisticsCompanyItem, ActiveSeckill, FeedbackItem, PublicConfig, Order, OrderLogisticsDetail, PageResult, PayStatusResult, PrepayResult, Product, Address, CartItem, Refund, RebuyResult, RemindShipResult, UserInfo, Notice, AiChatDonePayload, AiChatMessage, AiConfig, AiConversationItem, AiUsage } from '../types'
import type {
  AddressPayload,
  CartAddPayload,
  ClientApi,
  CreateOrderPayload,
  HomeData,
  LoginResult,
  PrepayPayload,
  ProfilePatch,
  ProductQuery,
  RegisterPayload,
  SandboxPayPayload,
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
    preview: () => http.get<CouponPreviewResult>('/coupons/preview'),
    mine: () => http.get<Coupon[]>('/user/coupons'),
    receive: (id) => http.post<{ id: number; couponId: number }>(`/coupons/${id}/receive`),
  },

  orderApi: {
    list: (status, page = 1, pageSize = 10) =>
      http.get<PageResult<Order>>('/orders', { status, page, pageSize }),
    detail: (orderNo) => http.get<Order | undefined>(`/orders/${orderNo}`),
    create: (payload: CreateOrderPayload = {}) => http.post<Order>('/orders', payload),
    cancel: (orderNo) => http.put<Order>(`/orders/${orderNo}/cancel`),
    confirm: (orderNo) => http.put<Order>(`/orders/${orderNo}/confirm`),
    rebuy: (orderNo) => http.post<RebuyResult>(`/orders/${orderNo}/rebuy`),
    remove: (orderNo) => http.delete<DeleteOrderResult>(`/orders/${orderNo}`),
    remindShip: (orderNo) => http.post<RemindShipResult>(`/orders/${orderNo}/remind-ship`),
    logistics: (orderNo) => http.get<OrderLogisticsDetail>(`/orders/${orderNo}/logistics`),
  },

  addressApi: {
    list: () => http.get<Address[]>('/user/addresses'),
    create: (payload: AddressPayload) => http.post<Address>('/user/addresses', payload),
    update: (id, payload) => http.put<Address>(`/user/addresses/${id}`, payload),
    remove: (id) => http.delete<void>(`/user/addresses/${id}`),
  },

  userApi: {
    login: (account, password, captcha) =>
      http.post<LoginResult>('/auth/login', {
        account,
        password,
        captchaId: captcha?.captchaId,
        captchaCode: captcha?.captchaCode,
      }),
    captcha: () =>
      http.get<{ captchaId: string; image: string; expireIn: number }>('/auth/captcha'),
    loginBySms: (phone, code) => http.post<LoginResult>('/auth/login', { phone, code }),
    register: (payload: RegisterPayload) => http.post<LoginResult>('/auth/register', payload),
    profile: () => http.get<UserInfo>('/user/profile'),
    updateProfile: (patch: ProfilePatch) => http.put<UserInfo>('/user/profile', patch),
    uploadAvatar: (file: File) => http.upload<UserInfo>('/user/avatar', file),
    changePassword: (payload) => http.put<{ changed: boolean }>('/user/password', payload),
    setPayPassword: (payload) => http.put<{ hasPayPassword: boolean }>('/user/pay-password', payload),
    loginLogs: () => http.get<LoginLogItem[]>('/user/login-logs'),
    sendSmsCode: (phone) => http.post<{ phone: string; code: string }>('/auth/sms-code', { phone }),
    resetPassword: (payload) => http.post<{ reset: boolean }>('/auth/reset-password', payload),
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

  paymentApi: {
    prepay: (payload: PrepayPayload) => http.post<PrepayResult>('/payments/prepay', payload),
    status: (payNo) => http.get<PayStatusResult>(`/payments/${payNo}/status`),
    sandboxPay: (payload: SandboxPayPayload) =>
      http.post<void>(`/payments/callback/${payload.channel ?? 4}`, payload),
  },

  walletApi: {
    mine: () => http.get<MyWallet>('/user/wallet'),
    create: (payload) => http.post<PrepayResult>('/user/wallet/recharges', payload),
    status: (payNo) => http.get<RechargeStatusResult>(`/user/wallet/recharges/${payNo}`),
    sandboxPay: (payload: SandboxPayPayload) =>
      http.post<void>(`/payments/recharge/callback/${payload.channel ?? 4}`, payload),
  },

  refundApi: {
    apply: (payload) => http.post<Refund>('/refunds', payload),
    mine: () => http.get<Refund[]>('/refunds'),
    uploadImage: (file) => http.upload<{ url: string }>('/refunds/images', file),
  },

  commentApi: {
    mine: () => http.get<MyComments>('/user/comments'),
    create: (payload) => http.post<MyComment>('/comments', payload),
    uploadImage: (file) => http.upload<{ url: string }>('/comments/images', file),
  },

  pointsApi: {
    mine: () => http.get<MyPoints>('/user/points'),
    signIn: () => http.post<{ balance: number; change: number; gain: number; streak: number }>('/user/points/sign-in'),
  },

  promotionApi: {
    active: () => http.get<ActivePromotion[]>('/promotions/active'),
  },

  contentApi: {
    faqGroups: () => http.get<FaqGroup[]>('/faqs'),
    logisticsCompanies: () => http.get<LogisticsCompanyItem[]>('/logistics-companies'),
  },

  seckillApi: {
    active: () => http.get<ActiveSeckill[]>('/seckills/active'),
  },

  feedbackApi: {
    create: (payload) => http.post<FeedbackItem>('/feedbacks', payload),
    mine: (orderNo) => http.get<FeedbackItem[]>('/feedbacks', orderNo ? { orderNo } : undefined),
    uploadImage: (file) => http.upload<{ url: string }>('/feedbacks/images', file),
  },

  configApi: {
    public: () => http.get<PublicConfig>('/config'),
  },

  noticeApi: {
    list: (limit) => http.get<Notice[]>('/notices', { limit }),
    detail: (id) => http.get<Notice>(`/notices/${id}`),
  },

  aiApi: {
    config: () => http.get<AiConfig>('/ai/config'),

    async chat(payload, handlers) {
      // 用对象承接回调里的状态，避免 TS 把闭包赋值当成 null 收窄
      const state: {
        done: AiChatDonePayload | null
        error: string | null
        content: string
        conversationId: number
      } = {
        done: null,
        error: null,
        content: '',
        conversationId: payload.conversationId ?? 0,
      }

      await http.stream(
        '/ai/chat',
        {
          message: payload.message,
          conversationId: payload.conversationId,
          orderNo: payload.orderNo,
        },
        {
          signal: payload.signal,
          onEvent: (event, data) => {
            const record = (data ?? {}) as Record<string, unknown>
            switch (event) {
              case 'meta': {
                const id = Number(record.conversationId ?? 0)
                if (id) {
                  state.conversationId = id
                  handlers?.onMeta?.({ conversationId: id })
                }
                break
              }
              case 'thinking':
                handlers?.onThinking?.(String(record.text ?? ''))
                break
              case 'delta': {
                const text = String(record.text ?? '')
                state.content += text
                handlers?.onDelta?.(text)
                break
              }
              case 'tool':
                handlers?.onTool?.({
                  name: String(record.name ?? ''),
                  label: String(record.label ?? ''),
                })
                break
              case 'done': {
                const done = data as AiChatDonePayload
                state.done = done
                state.conversationId = done.conversationId
                handlers?.onDone?.(done)
                break
              }
              case 'error': {
                const message = String(record.message ?? 'AI 客服暂时不可用')
                state.error = message
                handlers?.onError?.(message)
                break
              }
              default:
                break
            }
          },
        },
      )

      if (state.error) throw new Error(state.error)

      const usage: AiUsage = state.done?.usage ?? {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      }
      return {
        conversationId: state.done?.conversationId ?? state.conversationId,
        messageId: state.done?.messageId ?? 0,
        content: state.done?.content ?? state.content,
        citations: state.done?.citations ?? [],
        usage,
        mode: state.done?.mode ?? 'mock',
      }
    },

    conversations: (orderNo) =>
      http.get<AiConversationItem[]>('/ai/conversations', orderNo ? { orderNo } : undefined),

    messages: (conversationId) =>
      http.get<AiChatMessage[]>(`/ai/conversations/${conversationId}/messages`),

    transfer: (conversationId, note) =>
      http.post<{ feedbackId: number; conversationId: number }>(
        `/ai/conversations/${conversationId}/transfer`,
        { note },
      ),
  },
}
