import { QueryTypes, type WhereOptions } from 'sequelize'
import { sequelize } from '../config/database'
import { InventoryLog, Product, ProductSku } from '../models'
import { formatDate } from '../utils/serializers'

export interface StockAlertQuery {
  page?: number
  pageSize?: number
}

export interface InventoryLogQuery {
  skuId?: number
  type?: number
  page?: number
  pageSize?: number
}

const ALERT_CONDITION = 's.warn_stock > 0 AND s.stock <= s.warn_stock AND p.deleted_at IS NULL'

/** 库存预警：已低于预警阈值（含 0）的 SKU 列表，按库存升序 */
export async function listStockAlerts(query: StockAlertQuery = {}) {
  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20))

  const rows = (await sequelize.query(
    `SELECT s.id AS skuId, s.sku_code AS skuCode, s.spec_text AS specText,
            s.stock, s.locked_stock AS lockedStock, s.warn_stock AS warnStock,
            p.id AS productId, p.name AS productName, p.main_image AS productImage, p.status AS productStatus
       FROM product_skus s
       JOIN products p ON p.id = s.product_id
      WHERE ${ALERT_CONDITION}
      ORDER BY s.stock ASC, s.id ASC
      LIMIT :limit OFFSET :offset`,
    { replacements: { limit: pageSize, offset: (page - 1) * pageSize }, type: QueryTypes.SELECT },
  )) as unknown as {
    skuId: number
    skuCode: string
    specText: string | null
    stock: number
    lockedStock: number
    warnStock: number
    productId: number
    productName: string
    productImage: string | null
    productStatus: number
  }[]

  const totalRow = (await sequelize.query(
    `SELECT COUNT(*) AS total FROM product_skus s JOIN products p ON p.id = s.product_id WHERE ${ALERT_CONDITION}`,
    { type: QueryTypes.SELECT },
  )) as unknown as { total: number }[]
  const total = Number(totalRow[0]?.total ?? 0)

  return {
    list: rows.map((r) => ({
      skuId: Number(r.skuId),
      skuCode: r.skuCode,
      specText: r.specText ?? '',
      stock: Number(r.stock),
      lockedStock: Number(r.lockedStock),
      warnStock: Number(r.warnStock),
      productId: Number(r.productId),
      productName: r.productName,
      productImage: r.productImage ?? '',
      productStatus: Number(r.productStatus),
    })),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

/** 库存变更流水（可按 SKU / 变更类型筛选） */
export async function listInventoryLogs(query: InventoryLogQuery = {}) {
  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20))

  const where: WhereOptions = {}
  if (query.skuId) (where as Record<string, unknown>).skuId = query.skuId
  if (query.type !== undefined) (where as Record<string, unknown>).type = query.type

  const { rows, count } = await InventoryLog.findAndCountAll({
    where,
    include: [{ model: ProductSku, as: 'sku', include: [{ model: Product, as: 'product' }] }],
    order: [['id', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    distinct: true,
  })

  return {
    list: rows.map((log) => {
      const sku = log.get('sku') as ProductSku | null
      const product = (sku?.get('product') as Product | null) ?? null
      return {
        id: Number(log.id),
        skuId: Number(log.skuId),
        skuCode: sku?.skuCode ?? '',
        specText: sku?.specText ?? '',
        productId: product ? Number(product.id) : null,
        productName: product?.name ?? '',
        type: log.type,
        change: log.change,
        before: log.before,
        after: log.after,
        operator: log.operator ?? '',
        remark: log.remark ?? '',
        createdAt: formatDate(log.createdAt),
      }
    }),
    page,
    pageSize,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  }
}

/** 预警数量（用于后台首页角标） */
export async function countStockAlerts(): Promise<number> {
  const rows = (await sequelize.query(
    `SELECT COUNT(*) AS total FROM product_skus s JOIN products p ON p.id = s.product_id WHERE ${ALERT_CONDITION}`,
    { type: QueryTypes.SELECT },
  )) as unknown as { total: number }[]
  return Number(rows[0]?.total ?? 0)
}
