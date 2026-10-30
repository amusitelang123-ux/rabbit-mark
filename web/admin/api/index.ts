import type { PageResult } from '@/api/types'
import { adminDownload, adminHttp } from './request'
import type { AdminApi } from './contract'
import type {
  AdminAiConversation,
  AdminAiKnowledgeSync,
  AdminAiMessage,
  AdminAiUsage,
  AdminBanner,
  AdminBrand,
  AdminCategoryNode,
  AdminComment,
  AdminCoupon,
  AdminCustomer,
  AdminFaq,
  AdminFeedback,
  AdminFreightTemplate,
  AdminHomeFloor,
  AdminInvoice,
  AdminLevel,
  AdminLogItem,
  AdminLoginResult,
  AdminLogisticsCompany,
  AdminNotice,
  AdminOrderPage,
  AdminOverview,
  AdminPermissionItem,
  AdminPointsLog,
  AdminProduct,
  AdminProfile,
  AdminPromotion,
  AdminRefund,
  AdminRoleItem,
  AdminSeckill,
  AdminSetting,
  AdminSku,
  AdminTag,
  AdminUserDetail,
  AdminUserItem,
  CategorySalesItem,
  DailyStatItem,
  FinanceRecordItem,
  FinanceReport,
  InventoryLogItem,
  MarketingActivityStats,
  Order,
  OrderStatusStat,
  ProductRankItem,
  ProductImportResult,
  Reconciliation,
  SalesTrendPoint,
  SpecGroupItem,
  StockAlertItem,
  UserAnalysis,
} from './types'

function paramsOf(obj: object): Record<string, string | number | undefined> {
  const out: Record<string, string | number | undefined> = {}
  Object.entries(obj as Record<string, unknown>).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') out[k] = v as string | number
  })
  return out
}

export const adminApi: AdminApi = {
  authApi: {
    login: (username, password) => adminHttp.post<AdminLoginResult>('/login', { username, password }),
    me: () => adminHttp.get<AdminProfile>('/me'),
  },

  statsApi: {
    overview: (range = 'all') => adminHttp.get<AdminOverview>('/stats/overview', { range }),
    salesTrend: (days = 30) => adminHttp.get<SalesTrendPoint[]>('/stats/sales-trend', { days }),
    daily: (days = 30) => adminHttp.get<DailyStatItem[]>('/stats/daily', { days }),
    productRank: (sortBy = 'sales', limit = 10) =>
      adminHttp.get<ProductRankItem[]>('/stats/product-rank', { sortBy, limit }),
    categorySales: () => adminHttp.get<CategorySalesItem[]>('/stats/category-sales'),
    userAnalysis: (days = 30) => adminHttp.get<UserAnalysis>('/stats/user-analysis', { days }),
    orderStatus: () => adminHttp.get<OrderStatusStat[]>('/stats/order-status'),
    marketing: () => adminHttp.get<MarketingActivityStats>('/stats/marketing'),
    export: (type) => adminDownload('/stats/export', { type }, `stats-${type}-${Date.now()}.csv`),
  },

  productApi: {
    list: (query = {}) => adminHttp.get<PageResult<AdminProduct>>('/products', paramsOf(query)),
    detail: (id) => adminHttp.get<AdminProduct>(`/products/${id}`),
    create: (payload) => adminHttp.post<AdminProduct>('/products', payload),
    update: (id, payload) => adminHttp.put<AdminProduct>(`/products/${id}`, payload),
    remove: (id) => adminHttp.delete<void>(`/products/${id}`),
    setStatus: (id, status) => adminHttp.put<{ id: number; status: number }>(`/products/${id}/status`, { status }),
    skus: (productId) => adminHttp.get<AdminSku[]>(`/products/${productId}/skus`),
    createSku: (productId, payload) => adminHttp.post<AdminSku>(`/products/${productId}/skus`, payload),
    updateSku: (id, payload) => adminHttp.put<AdminSku>(`/skus/${id}`, payload),
    removeSku: (id) => adminHttp.delete<void>(`/skus/${id}`),
    generateSkus: (productId, payload) => adminHttp.post<AdminSku[]>(`/products/${productId}/skus/generate`, payload),
    adjustStock: (id, payload) => adminHttp.put<AdminSku>(`/skus/${id}/stock`, payload),
    batchStatus: (ids, status) =>
      adminHttp.put<{ affected: number; status: number }>('/products/batch/status', { ids, status }),
    batchRemove: (ids) =>
      adminHttp.post<{ deleted: number; failed: { id: number; reason: string }[] }>('/products/batch/delete', {
        ids,
      }),
    exportCsv: (query = {}) => adminDownload('/products/export', paramsOf(query), `products-${Date.now()}.csv`),
    downloadImportTemplate: () => adminDownload('/products/import-template', {}, 'product-import-template.csv'),
    importCsv: (csv) => adminHttp.post<ProductImportResult>('/products/import', { csv }),
  },

  categoryApi: {
    tree: () => adminHttp.get<AdminCategoryNode[]>('/categories'),
    create: (payload) => adminHttp.post<{ id: number }>('/categories', payload),
    update: (id, payload) => adminHttp.put<{ id: number }>(`/categories/${id}`, payload),
    remove: (id) => adminHttp.delete<void>(`/categories/${id}`),
  },

  brandApi: {
    list: () => adminHttp.get<AdminBrand[]>('/brands'),
    create: (payload) => adminHttp.post<{ id: number }>('/brands', payload),
    update: (id, payload) => adminHttp.put<{ id: number }>(`/brands/${id}`, payload),
    remove: (id) => adminHttp.delete<void>(`/brands/${id}`),
  },

  specApi: {
    groups: () => adminHttp.get<SpecGroupItem[]>('/spec-groups'),
    create: (payload) => adminHttp.post<{ id: number }>('/spec-groups', payload),
    update: (id, payload) => adminHttp.put<{ id: number }>(`/spec-groups/${id}`, payload),
    remove: (id) => adminHttp.delete<void>(`/spec-groups/${id}`),
  },

  orderApi: {
    list: (query = {}) => adminHttp.get<AdminOrderPage>('/orders', paramsOf(query)),
    detail: (orderNo) => adminHttp.get<Order>(`/orders/${orderNo}`),
    ship: (orderNo, payload) => adminHttp.post<Order>(`/orders/${orderNo}/ship`, payload),
    close: (orderNo, reason) => adminHttp.put<Order>(`/orders/${orderNo}/close`, { reason }),
    remark: (orderNo, remark) =>
      adminHttp.put<{ orderNo: string; adminRemark: string }>(`/orders/${orderNo}/remark`, { remark }),
    updateShipping: (orderNo, payload) => adminHttp.put<Order>(`/orders/${orderNo}/logistics`, payload),
    markAbnormal: (orderNo, payload) =>
      adminHttp.put<{ orderNo: string; isAbnormal: boolean; abnormalReason: string }>(
        `/orders/${orderNo}/abnormal`,
        payload,
      ),
    export: (query = {}) => adminDownload('/orders/export', paramsOf(query), `orders-${Date.now()}.csv`),
    batchShip: (orders) =>
      adminHttp.post<{ succeeded: number; failed: { orderNo: string; reason: string }[] }>(
        '/orders/batch/ship',
        { orders },
      ),
  },

  inventoryApi: {
    alerts: (page = 1, pageSize = 20) =>
      adminHttp.get<PageResult<StockAlertItem>>('/inventory/alerts', { page, pageSize }),
    logs: (query = {}) => adminHttp.get<PageResult<InventoryLogItem>>('/inventory/logs', paramsOf(query)),
  },

  systemApi: {
    admins: (page = 1, pageSize = 10) => adminHttp.get<PageResult<AdminUserItem>>('/admins', { page, pageSize }),
    createAdmin: (payload) => adminHttp.post<{ id: number }>('/admins', payload),
    updateAdmin: (id, payload) => adminHttp.put<{ id: number }>(`/admins/${id}`, payload),
    resetPassword: (id, password) => adminHttp.put<{ id: number }>(`/admins/${id}/password`, { password }),
    removeAdmin: (id) => adminHttp.delete<void>(`/admins/${id}`),
    roles: () => adminHttp.get<AdminRoleItem[]>('/roles'),
    createRole: (payload) => adminHttp.post<{ id: number }>('/roles', payload),
    updateRole: (id, payload) => adminHttp.put<{ id: number }>(`/roles/${id}`, payload),
    removeRole: (id) => adminHttp.delete<void>(`/roles/${id}`),
    setRolePermissions: (id, permissionIds) =>
      adminHttp.put<{ roleId: number; permissionIds: number[] }>(`/roles/${id}/permissions`, { permissionIds }),
    permissions: () => adminHttp.get<AdminPermissionItem[]>('/permissions'),
    logs: (query = {}) => adminHttp.get<PageResult<AdminLogItem>>('/logs', paramsOf(query)),
  },

  feedbackApi: {
    list: (query = {}) => adminHttp.get<PageResult<AdminFeedback>>('/feedbacks', paramsOf(query)),
    reply: (id, content) => adminHttp.put<AdminFeedback>(`/feedbacks/${id}/reply`, { content }),
    close: (id) => adminHttp.put<{ id: number; status: number }>(`/feedbacks/${id}/close`, {}),
  },

  settingApi: {
    list: () => adminHttp.get<AdminSetting[]>('/settings'),
    update: (entries) => adminHttp.put<AdminSetting[]>('/settings', { entries }),
  },

  uploadApi: {
    image: (file) => adminHttp.upload<{ url: string }>('/upload', file),
  },

  userApi: {
    list: (query = {}) => adminHttp.get<PageResult<AdminCustomer>>('/users', paramsOf(query)),
    detail: (id) => adminHttp.get<AdminUserDetail>(`/users/${id}`),
    setStatus: (id, status) => adminHttp.put<{ id: number; status: number }>(`/users/${id}/status`, { status }),
    points: (id, page = 1, pageSize = 20) =>
      adminHttp.get<PageResult<AdminPointsLog> & { balance: number }>(`/users/${id}/points`, { page, pageSize }),
    adjustPoints: (id, change, remark) =>
      adminHttp.post<{ balance: number; change: number }>(`/users/${id}/points`, { change, remark }),
    setTags: (id, tagIds) =>
      adminHttp.put<{ userId: number; tagIds: number[] }>(`/users/${id}/tags`, { tagIds }),
    adjustBalance: (id, change) =>
      adminHttp.put<{ id: number; balance: number }>(`/users/${id}/balance`, { change }),
  },

  tagApi: {
    list: () => adminHttp.get<AdminTag[]>('/user-tags'),
    create: (name) => adminHttp.post<AdminTag>('/user-tags', { name }),
    update: (id, name) => adminHttp.put<{ id: number; name: string }>(`/user-tags/${id}`, { name }),
    remove: (id) => adminHttp.delete<void>(`/user-tags/${id}`),
  },

  refundApi: {
    list: (query = {}) => adminHttp.get<PageResult<AdminRefund>>('/refunds', paramsOf(query)),
    audit: (id, payload) => adminHttp.put<AdminRefund>(`/refunds/${id}/audit`, payload),
    receive: (id, remark) => adminHttp.put<AdminRefund>(`/refunds/${id}/receive`, { remark }),
  },

  marketingApi: {
    coupons: (query = {}) => adminHttp.get<PageResult<AdminCoupon>>('/coupons', paramsOf(query)),
    createCoupon: (payload) => adminHttp.post<AdminCoupon>('/coupons', payload),
    updateCoupon: (id, payload) => adminHttp.put<AdminCoupon>(`/coupons/${id}`, payload),
    removeCoupon: (id) => adminHttp.delete<void>(`/coupons/${id}`),
    banners: () => adminHttp.get<AdminBanner[]>('/banners'),
    createBanner: (payload) => adminHttp.post<AdminBanner>('/banners', payload),
    updateBanner: (id, payload) => adminHttp.put<AdminBanner>(`/banners/${id}`, payload),
    removeBanner: (id) => adminHttp.delete<void>(`/banners/${id}`),
    notices: () => adminHttp.get<AdminNotice[]>('/notices'),
    createNotice: (payload) => adminHttp.post<AdminNotice>('/notices', payload),
    updateNotice: (id, payload) => adminHttp.put<AdminNotice>(`/notices/${id}`, payload),
    removeNotice: (id) => adminHttp.delete<void>(`/notices/${id}`),
    seckills: () => adminHttp.get<AdminSeckill[]>('/seckills'),
    createSeckill: (payload) => adminHttp.post<{ id: number }>('/seckills', payload),
    updateSeckill: (id, payload) => adminHttp.put<{ id: number }>(`/seckills/${id}`, payload),
    setSeckillStatus: (id, status) => adminHttp.put<{ id: number; status: number }>(`/seckills/${id}/status`, { status }),
    removeSeckill: (id) => adminHttp.delete<void>(`/seckills/${id}`),
    promotions: () => adminHttp.get<AdminPromotion[]>('/promotions'),
    createPromotion: (payload) => adminHttp.post<AdminPromotion>('/promotions', payload),
    updatePromotion: (id, payload) => adminHttp.put<AdminPromotion>(`/promotions/${id}`, payload),
    removePromotion: (id) => adminHttp.delete<void>(`/promotions/${id}`),
  },

  homeFloorApi: {
    list: () => adminHttp.get<AdminHomeFloor[]>('/home-floors'),
    create: (payload) => adminHttp.post<{ id: number }>('/home-floors', payload),
    update: (id, payload) => adminHttp.put<{ id: number }>(`/home-floors/${id}`, payload),
    remove: (id) => adminHttp.delete<void>(`/home-floors/${id}`),
  },

  commentApi: {
    list: (query = {}) => adminHttp.get<PageResult<AdminComment>>('/comments', paramsOf(query)),
    setStatus: (id, status) => adminHttp.put<{ id: number; status: number }>(`/comments/${id}/status`, { status }),
    reply: (id, content) => adminHttp.put<{ id: number; replyContent: string }>(`/comments/${id}/reply`, { content }),
  },

  levelApi: {
    list: () => adminHttp.get<AdminLevel[]>('/levels'),
    create: (payload) => adminHttp.post<{ id: number }>('/levels', payload),
    update: (id, payload) => adminHttp.put<{ id: number }>(`/levels/${id}`, payload),
    remove: (id) => adminHttp.delete<void>(`/levels/${id}`),
  },

  faqApi: {
    list: () => adminHttp.get<AdminFaq[]>('/faqs'),
    create: (payload) => adminHttp.post<AdminFaq>('/faqs', payload),
    update: (id, payload) => adminHttp.put<AdminFaq>(`/faqs/${id}`, payload),
    remove: (id) => adminHttp.delete<void>(`/faqs/${id}`),
  },

  logisticsApi: {
    companies: () => adminHttp.get<AdminLogisticsCompany[]>('/logistics-companies'),
    createCompany: (payload) => adminHttp.post<AdminLogisticsCompany>('/logistics-companies', payload),
    updateCompany: (id, payload) => adminHttp.put<AdminLogisticsCompany>(`/logistics-companies/${id}`, payload),
    removeCompany: (id) => adminHttp.delete<void>(`/logistics-companies/${id}`),
    templates: () => adminHttp.get<AdminFreightTemplate[]>('/freight-templates'),
    createTemplate: (payload) => adminHttp.post<AdminFreightTemplate>('/freight-templates', payload),
    updateTemplate: (id, payload) => adminHttp.put<AdminFreightTemplate>(`/freight-templates/${id}`, payload),
    removeTemplate: (id) => adminHttp.delete<void>(`/freight-templates/${id}`),
  },

  financeApi: {
    records: (query = {}) => adminHttp.get<PageResult<FinanceRecordItem>>('/finance/records', paramsOf(query)),
    reconciliation: (query = {}) => adminHttp.get<Reconciliation>('/finance/reconciliation', paramsOf(query)),
    invoices: (page = 1, pageSize = 10) =>
      adminHttp.get<PageResult<AdminInvoice>>('/finance/invoices', { page, pageSize }),
    setInvoiceStatus: (id, status) =>
      adminHttp.put<{ id: number; status: number }>(`/finance/invoices/${id}`, { status }),
    report: (year) => adminHttp.get<FinanceReport>('/finance/report', { year }),
  },

  aiApi: {
    conversations: (query = {}) =>
      adminHttp.get<PageResult<AdminAiConversation>>('/ai/conversations', paramsOf(query)),
    messages: (id) => adminHttp.get<AdminAiMessage[]>(`/ai/conversations/${id}/messages`),
    usage: () => adminHttp.get<AdminAiUsage>('/ai/usage'),
    rebuild: () => adminHttp.post<AdminAiKnowledgeSync>('/ai/knowledge/rebuild'),
  },
}

export type { AdminApi }
export * from './types'
