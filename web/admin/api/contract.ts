import type { PageResult } from '@/api/types'
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
  AdminOrderQuery,
  AdminOverview,
  AdminPermissionItem,
  AdminPointsLog,
  AdminProduct,
  AdminProductPayload,
  AdminProductQuery,
  AdminProfile,
  AdminPromotion,
  AdminRefund,
  AdminRoleItem,
  AdminSeckill,
  AdminSetting,
  AdminSku,
  AdminSkuPayload,
  AdminTag,
  AdminUserDetail,
  AdminUserItem,
  CategorySalesItem,
  DailyStatItem,
  FinanceRecordItem,
  FinanceReport,
  HomeFloorPayload,
  InventoryLogItem,
  MarketingActivityStats,
  Order,
  OrderStatusStat,
  ProductRankItem,
  PromotionThreshold,
  ProductImportResult,
  Reconciliation,
  SalesTrendPoint,
  SpecGroupItem,
  StockAlertItem,
  UserAnalysis,
} from './types'

export interface SeckillPayload {
  name: string
  startTime: string
  endTime: string
  status?: number
  products?: {
    productId: number
    skuId: number
    seckillPrice: number
    seckillStock: number
    limitPerUser?: number
    sort?: number
  }[]
}

export interface PromotionPayload {
  name: string
  type?: number
  thresholds: PromotionThreshold[]
  startTime: string
  endTime: string
  status?: number
}

export interface FaqPayload {
  category: string
  question: string
  answer?: string
  sort?: number
  status?: number
}

export interface CompanyPayload {
  name: string
  code: string
  phone?: string
  sort?: number
  status?: number
}

export interface TemplatePayload {
  name: string
  freeAmount?: number
  baseFreight?: number
  isDefault?: number
  status?: number
}

export interface AdminApi {
  authApi: {
    login(username: string, password: string): Promise<AdminLoginResult>
    me(): Promise<AdminProfile>
  }
  productApi: {
    list(query?: AdminProductQuery): Promise<PageResult<AdminProduct>>
    detail(id: number): Promise<AdminProduct>
    create(payload: AdminProductPayload): Promise<AdminProduct>
    update(id: number, payload: Partial<AdminProductPayload>): Promise<AdminProduct>
    remove(id: number): Promise<void>
    setStatus(id: number, status: 0 | 1): Promise<{ id: number; status: number }>
    skus(productId: number): Promise<AdminSku[]>
    createSku(productId: number, payload: AdminSkuPayload): Promise<AdminSku>
    updateSku(id: number, payload: AdminSkuPayload): Promise<AdminSku>
    removeSku(id: number): Promise<void>
    generateSkus(
      productId: number,
      payload: { groups: { name: string; values: string[] }[]; defaults?: AdminSkuPayload },
    ): Promise<AdminSku[]>
    adjustStock(id: number, payload: { change: number; remark?: string }): Promise<AdminSku>
    batchStatus(ids: number[], status: 0 | 1): Promise<{ affected: number; status: number }>
    batchRemove(ids: number[]): Promise<{ deleted: number; failed: { id: number; reason: string }[] }>
    exportCsv(query?: AdminProductQuery): Promise<void>
    downloadImportTemplate(): Promise<void>
    importCsv(csv: string): Promise<ProductImportResult>
  }
  categoryApi: {
    tree(): Promise<AdminCategoryNode[]>
    create(payload: {
      name: string
      parentId?: number
      icon?: string
      sort?: number
      status?: number
    }): Promise<{ id: number }>
    update(
      id: number,
      payload: Partial<{ name: string; icon: string; sort: number; status: number }>,
    ): Promise<{ id: number }>
    remove(id: number): Promise<void>
  }
  brandApi: {
    list(): Promise<AdminBrand[]>
    create(payload: { name: string; logo?: string; sort?: number; status?: number }): Promise<{ id: number }>
    update(
      id: number,
      payload: Partial<{ name: string; logo: string; sort: number; status: number }>,
    ): Promise<{ id: number }>
    remove(id: number): Promise<void>
  }
  specApi: {
    groups(): Promise<SpecGroupItem[]>
    create(payload: { name: string; sort?: number; values?: string[] }): Promise<{ id: number }>
    update(id: number, payload: Partial<{ name: string; sort: number; values: string[] }>): Promise<{ id: number }>
    remove(id: number): Promise<void>
  }
  orderApi: {
    list(query?: AdminOrderQuery): Promise<AdminOrderPage>
    detail(orderNo: string): Promise<Order>
    ship(
      orderNo: string,
      payload: { company: string; trackingNo: string; traces?: { time: string; text: string }[] },
    ): Promise<Order>
    close(orderNo: string, reason: string): Promise<Order>
    remark(orderNo: string, remark: string): Promise<{ orderNo: string; adminRemark: string }>
    /** 修改运单号（A-22） */
    updateShipping(orderNo: string, payload: { company: string; trackingNo: string }): Promise<Order>
    /** 异常标记（A-23） */
    markAbnormal(
      orderNo: string,
      payload: { abnormal: boolean; reason?: string },
    ): Promise<{ orderNo: string; isAbnormal: boolean; abnormalReason: string }>
    export(query?: AdminOrderQuery): Promise<void>
    batchShip(
      orders: { orderNo: string; company: string; trackingNo: string }[],
    ): Promise<{ succeeded: number; failed: { orderNo: string; reason: string }[] }>
  }
  inventoryApi: {
    alerts(page?: number, pageSize?: number): Promise<PageResult<StockAlertItem>>
    logs(query?: { skuId?: number; type?: number; page?: number; pageSize?: number }): Promise<PageResult<InventoryLogItem>>
  }
  systemApi: {
    admins(page?: number, pageSize?: number): Promise<PageResult<AdminUserItem>>
    createAdmin(payload: {
      username: string
      password: string
      realName?: string
      phone?: string
      roleId?: number
      status?: number
    }): Promise<{ id: number }>
    updateAdmin(
      id: number,
      payload: Partial<{ realName: string; phone: string; roleId: number; status: number }>,
    ): Promise<{ id: number }>
    resetPassword(id: number, password: string): Promise<{ id: number }>
    removeAdmin(id: number): Promise<void>
    roles(): Promise<AdminRoleItem[]>
    createRole(payload: {
      name: string
      code: string
      description?: string
      status?: number
    }): Promise<{ id: number }>
    updateRole(
      id: number,
      payload: Partial<{ name: string; description: string; status: number }>,
    ): Promise<{ id: number }>
    removeRole(id: number): Promise<void>
    setRolePermissions(id: number, permissionIds: number[]): Promise<{ roleId: number; permissionIds: number[] }>
    permissions(): Promise<AdminPermissionItem[]>
    logs(query?: { module?: string; page?: number; pageSize?: number }): Promise<PageResult<AdminLogItem>>
  }
  feedbackApi: {
    list(query?: {
      status?: number
      type?: number
      keyword?: string
      page?: number
      pageSize?: number
    }): Promise<PageResult<AdminFeedback>>
    reply(id: number, content: string): Promise<AdminFeedback>
    close(id: number): Promise<{ id: number; status: number }>
  }
  aiApi: {
    conversations(query?: {
      keyword?: string
      status?: number
      page?: number
      pageSize?: number
    }): Promise<PageResult<AdminAiConversation>>
    messages(id: number): Promise<AdminAiMessage[]>
    usage(): Promise<AdminAiUsage>
    /** 重建知识库（FAQ / 公告 / 物流 / 运费 / 平台规则） */
    rebuild(): Promise<AdminAiKnowledgeSync>
  }
  settingApi: {
    list(): Promise<AdminSetting[]>
    update(entries: { key: string; value: string }[]): Promise<AdminSetting[]>
  }
  uploadApi: {
    image(file: File): Promise<{ url: string }>
  }
  userApi: {
    list(query?: {
      keyword?: string
      status?: number
      tagId?: number
      page?: number
      pageSize?: number
    }): Promise<PageResult<AdminCustomer>>
    detail(id: number): Promise<AdminUserDetail>
    setStatus(id: number, status: 0 | 1): Promise<{ id: number; status: number }>
    points(id: number, page?: number, pageSize?: number): Promise<PageResult<AdminPointsLog> & { balance: number }>
    adjustPoints(id: number, change: number, remark?: string): Promise<{ balance: number; change: number }>
    /** 覆盖式设置用户标签（A-35） */
    setTags(id: number, tagIds: number[]): Promise<{ userId: number; tagIds: number[] }>
    /** 调整余额（U-30） */
    adjustBalance(id: number, change: number): Promise<{ id: number; balance: number }>
  }
  tagApi: {
    list(): Promise<AdminTag[]>
    create(name: string): Promise<AdminTag>
    update(id: number, name: string): Promise<{ id: number; name: string }>
    remove(id: number): Promise<void>
  }
  refundApi: {
    list(query?: { status?: number; orderNo?: string; page?: number; pageSize?: number }): Promise<PageResult<AdminRefund>>
    audit(id: number, payload: { approve: boolean; remark?: string }): Promise<AdminRefund>
    /** 确认收到退货：退货退款执行退款，换货完成换货 */
    receive(id: number, remark?: string): Promise<AdminRefund>
  }
  marketingApi: {
    coupons(query?: { keyword?: string; status?: number; page?: number; pageSize?: number }): Promise<PageResult<AdminCoupon>>
    createCoupon(payload: Partial<AdminCoupon> & { name: string; type: number }): Promise<AdminCoupon>
    updateCoupon(id: number, payload: Partial<AdminCoupon>): Promise<AdminCoupon>
    removeCoupon(id: number): Promise<void>
    banners(): Promise<AdminBanner[]>
    createBanner(payload: Partial<AdminBanner> & { title: string; image: string }): Promise<AdminBanner>
    updateBanner(id: number, payload: Partial<AdminBanner>): Promise<AdminBanner>
    removeBanner(id: number): Promise<void>
    notices(): Promise<AdminNotice[]>
    createNotice(payload: Partial<AdminNotice> & { title: string }): Promise<AdminNotice>
    updateNotice(id: number, payload: Partial<AdminNotice>): Promise<AdminNotice>
    removeNotice(id: number): Promise<void>
    seckills(): Promise<AdminSeckill[]>
    createSeckill(payload: SeckillPayload): Promise<{ id: number }>
    updateSeckill(id: number, payload: Partial<SeckillPayload>): Promise<{ id: number }>
    setSeckillStatus(id: number, status: number): Promise<{ id: number; status: number }>
    removeSeckill(id: number): Promise<void>
    promotions(): Promise<AdminPromotion[]>
    createPromotion(payload: PromotionPayload): Promise<AdminPromotion>
    updatePromotion(id: number, payload: Partial<PromotionPayload>): Promise<AdminPromotion>
    removePromotion(id: number): Promise<void>
  }
  homeFloorApi: {
    list(): Promise<AdminHomeFloor[]>
    create(payload: HomeFloorPayload): Promise<{ id: number }>
    update(id: number, payload: Partial<HomeFloorPayload>): Promise<{ id: number }>
    remove(id: number): Promise<void>
  }
  commentApi: {
    list(query?: {
      status?: number
      score?: number
      keyword?: string
      page?: number
      pageSize?: number
    }): Promise<PageResult<AdminComment>>
    setStatus(id: number, status: 0 | 1): Promise<{ id: number; status: number }>
    reply(id: number, content: string): Promise<{ id: number; replyContent: string }>
  }
  levelApi: {
    list(): Promise<AdminLevel[]>
    create(payload: Partial<AdminLevel> & { name: string }): Promise<{ id: number }>
    update(id: number, payload: Partial<AdminLevel>): Promise<{ id: number }>
    remove(id: number): Promise<void>
  }
  faqApi: {
    list(): Promise<AdminFaq[]>
    create(payload: FaqPayload): Promise<AdminFaq>
    update(id: number, payload: Partial<FaqPayload>): Promise<AdminFaq>
    remove(id: number): Promise<void>
  }
  logisticsApi: {
    companies(): Promise<AdminLogisticsCompany[]>
    createCompany(payload: CompanyPayload): Promise<AdminLogisticsCompany>
    updateCompany(id: number, payload: Partial<CompanyPayload>): Promise<AdminLogisticsCompany>
    removeCompany(id: number): Promise<void>
    templates(): Promise<AdminFreightTemplate[]>
    createTemplate(payload: TemplatePayload): Promise<AdminFreightTemplate>
    updateTemplate(id: number, payload: Partial<TemplatePayload>): Promise<AdminFreightTemplate>
    removeTemplate(id: number): Promise<void>
  }
  statsApi: {
    overview(range?: 'today' | 'yesterday' | '7d' | '30d' | 'all'): Promise<AdminOverview>
    salesTrend(days?: number): Promise<SalesTrendPoint[]>
    daily(days?: number): Promise<DailyStatItem[]>
    productRank(sortBy?: 'sales' | 'amount' | 'cart', limit?: number): Promise<ProductRankItem[]>
    categorySales(): Promise<CategorySalesItem[]>
    userAnalysis(days?: number): Promise<UserAnalysis>
    orderStatus(): Promise<OrderStatusStat[]>
    marketing(): Promise<MarketingActivityStats>
    export(type: 'sales' | 'rank' | 'category' | 'status'): Promise<void>
  }
  financeApi: {
    records(query?: {
      type?: number
      startTime?: string
      endTime?: string
      page?: number
      pageSize?: number
    }): Promise<PageResult<FinanceRecordItem>>
    reconciliation(query?: { startTime?: string; endTime?: string }): Promise<Reconciliation>
    invoices(page?: number, pageSize?: number): Promise<PageResult<AdminInvoice>>
    setInvoiceStatus(id: number, status: 0 | 1): Promise<{ id: number; status: number }>
    /** 财务报表（A-64） */
    report(year: number): Promise<FinanceReport>
  }
}
