import type { ClientApi } from './contract'
import { mockApi } from './mock'
import { realApi } from './real'

/**
 * 数据源开关：
 *   VITE_USE_MOCK=true  → 使用内置演示数据（无需后端）
 *   VITE_USE_MOCK=false → 请求真实 Node + MySQL 后端
 * 页面组件只依赖 ClientApi 契约，切换数据源无需改动。
 */
export const useMock = import.meta.env.VITE_USE_MOCK !== 'false'

const api: ClientApi = useMock ? mockApi : realApi

export const { categoryApi, brandApi, productApi, homeApi, couponApi, orderApi, addressApi, userApi, cartApi, paymentApi, refundApi, commentApi, pointsApi, promotionApi, contentApi, seckillApi, feedbackApi, configApi, noticeApi } = api

export type {
  ClientApi,
  ProductQuery,
  HomeData,
  LoginResult,
  RegisterPayload,
  ProfilePatch,
  CreateOrderPayload,
  AddressPayload,
  CartAddPayload,
  PrepayPayload,
  SandboxPayPayload,
  ApplyRefundPayload,
  CreateCommentPayload,
} from './contract'
