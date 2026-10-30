import { QueryTypes } from 'sequelize'
import { sequelize } from '../config/database'
import { ORDER_STATUS_TEXT } from '../constants'
import { toCsv } from '../utils/csv'
import { formatDate } from '../utils/serializers'
import { listDaily } from './statDailyService'

/** 计入 GMV 的订单状态：已付款 / 已发货 / 已完成 */
const PAID_STATUSES = '20, 30, 40'

function daysAgo(days: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - (days - 1))
  return d
}

/** 把 SQL 返回的日期（字符串或 Date）统一成 YYYY-MM-DD，作为按天补零的键 */
function dateKey(value: unknown): string {
  if (value instanceof Date) {
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${value.getFullYear()}-${m}-${d}`
  }
  return String(value).slice(0, 10)
}

/** 生成 [N-1 天前 … 今天] 的连续日期键，用于把没有数据的日期补 0 */
function dayKeys(days: number): string[] {
  const keys: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    keys.push(dateKey(d))
  }
  return keys
}

/** 每日经营预聚合列表（供后台明细表使用） */
export async function listDailyStats(days = 30) {
  return listDaily(days)
}

/** 销售趋势：优先读 stat_daily 预聚合；覆盖不足时回退实时聚合 */
export async function salesTrend(days = 30) {
  const cached = await listDaily(days)
  if (cached.length >= days) {
    return cached.map((row) => ({
      date: row.statDate,
      orderCount: row.paidCount,
      amount: row.gmv,
    }))
  }

  const rows = (await sequelize.query(
    `SELECT DATE(created_at) AS date,
            COUNT(*) AS orderCount,
            COALESCE(SUM(pay_amount), 0) AS amount
       FROM orders
      WHERE status IN (${PAID_STATUSES}) AND created_at >= :from
      GROUP BY DATE(created_at)
      ORDER BY date ASC`,
    { replacements: { from: daysAgo(days) }, type: QueryTypes.SELECT },
  )) as unknown as { date: unknown; orderCount: number; amount: string }[]

  const map = new Map(rows.map((r) => [dateKey(r.date), r]))
  return dayKeys(days).map((date) => {
    const row = map.get(date)
    return { date, orderCount: Number(row?.orderCount ?? 0), amount: Number(row?.amount ?? 0) }
  })
}

/**
 * 商品排行：销量 / 销售额 TOP。
 *
 * 只按 product_id 聚合：订单明细会记录下单当时的名称与主图快照，同一个商品
 * 换过图就存在多份快照，早期按「商品 + 图片」分组会把同一商品拆成多行、销量被摊薄。
 * 名称与图片优先取商品当前值（便于运营识别），商品已被删除时回退到订单快照。
 */
export async function productRank(sortBy: 'sales' | 'amount' | 'cart' = 'sales', limit = 10) {
  // 加购榜取自商品冗余的累计加购件数（A-52），与成交口径区分开
  if (sortBy === 'cart') {
    return (await sequelize.query(
      `SELECT id AS productId,
              name,
              main_image AS image,
              0 AS sales,
              0 AS amount,
              cart_add_count AS cartCount
         FROM products
        WHERE status = 1
        ORDER BY cart_add_count DESC, id DESC
        LIMIT :limit`,
      { replacements: { limit }, type: QueryTypes.SELECT },
    )) as unknown as {
      productId: number
      name: string
      image: string
      sales: string
      amount: string
      cartCount: number
    }[]
  }

  const orderCol = sortBy === 'amount' ? 'amount' : 'sales'
  return (await sequelize.query(
    `SELECT oi.product_id AS productId,
            COALESCE(p.name, MAX(oi.product_name)) AS name,
            COALESCE(p.main_image, MAX(oi.product_image)) AS image,
            SUM(oi.quantity) AS sales,
            COALESCE(SUM(oi.subtotal), 0) AS amount,
            COALESCE(p.cart_add_count, 0) AS cartCount
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       LEFT JOIN products p ON p.id = oi.product_id
      WHERE o.status IN (${PAID_STATUSES})
      GROUP BY oi.product_id, p.name, p.main_image, p.cart_add_count
      ORDER BY ${orderCol} DESC
      LIMIT :limit`,
    { replacements: { limit }, type: QueryTypes.SELECT },
  )) as unknown as {
    productId: number
    name: string
    image: string
    sales: string
    amount: string
    cartCount: number
  }[]
}

/** 分类销售占比（按一级分类聚合） */
export async function categorySales() {
  return (await sequelize.query(
    `SELECT COALESCE(pc.name, '未分类') AS name,
            COALESCE(SUM(oi.subtotal), 0) AS value
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN categories pc ON pc.id = IF(c.parent_id = 0, c.id, c.parent_id)
      WHERE o.status IN (${PAID_STATUSES})
      GROUP BY pc.name
      ORDER BY value DESC`,
    { type: QueryTypes.SELECT },
  )) as unknown as { name: string; value: string }[]
}

/** 用户分析：新增用户趋势（按天补 0，与销售趋势口径一致）与复购率 */
export async function userAnalysis(days = 30) {
  const rows = (await sequelize.query(
    `SELECT DATE(created_at) AS date, COUNT(*) AS newUsers
       FROM users
      WHERE created_at >= :from
      GROUP BY DATE(created_at)
      ORDER BY date ASC`,
    { replacements: { from: daysAgo(days) }, type: QueryTypes.SELECT },
  )) as unknown as { date: unknown; newUsers: number }[]

  const map = new Map(rows.map((r) => [dateKey(r.date), r]))

  const repeatRow = (await sequelize.query(
    `SELECT COUNT(*) AS repeatUsers FROM (
       SELECT user_id FROM orders WHERE status IN (${PAID_STATUSES})
       GROUP BY user_id HAVING COUNT(*) > 1
     ) t`,
    { type: QueryTypes.SELECT },
  )) as unknown as { repeatUsers: number }[]

  const buyerRow = (await sequelize.query(
    `SELECT COUNT(DISTINCT user_id) AS buyers FROM orders WHERE status IN (${PAID_STATUSES})`,
    { type: QueryTypes.SELECT },
  )) as unknown as { buyers: number }[]

  const buyers = Number(buyerRow[0]?.buyers ?? 0)
  const repeatUsers = Number(repeatRow[0]?.repeatUsers ?? 0)

  return {
    trend: dayKeys(days).map((date) => ({ date, newUsers: Number(map.get(date)?.newUsers ?? 0) })),
    repeatUsers,
    buyers,
    repeatRate: buyers ? Math.round((repeatUsers / buyers) * 1000) / 10 : 0,
  }
}

/** 订单状态分布（A-55）：按状态统计订单量与金额，前端做漏斗/柱状图 */
export async function orderStatusDistribution() {
  const rows = (await sequelize.query(
    `SELECT status, COUNT(*) AS count, COALESCE(SUM(pay_amount), 0) AS amount
       FROM orders
      GROUP BY status
      ORDER BY status ASC`,
    { type: QueryTypes.SELECT },
  )) as unknown as { status: number; count: number; amount: string }[]

  return rows.map((row) => ({
    status: Number(row.status),
    statusText: ORDER_STATUS_TEXT[Number(row.status)] ?? '未知',
    count: Number(row.count),
    amount: Number(row.amount),
  }))
}

/** 活动数据（A-45）：优惠券领取/核销带动 GMV、秒杀销量与让利、促销让利汇总 */
export async function marketingActivityStats() {
  const coupons = (await sequelize.query(
    `SELECT c.id,
            c.name,
            c.type,
            c.amount,
            c.total_count AS totalCount,
            c.received_count AS receivedCount,
            c.used_count AS usedCount,
            COUNT(DISTINCT CASE WHEN o.status IN (${PAID_STATUSES}) THEN o.id END) AS orderCount,
            COALESCE(SUM(CASE WHEN o.status IN (${PAID_STATUSES}) THEN o.pay_amount ELSE 0 END), 0) AS gmv
       FROM coupons c
       LEFT JOIN user_coupons uc ON uc.coupon_id = c.id
       LEFT JOIN orders o ON o.coupon_id = uc.id
      GROUP BY c.id
      ORDER BY c.id DESC`,
    { type: QueryTypes.SELECT },
  )) as unknown as {
    id: number
    name: string
    type: number
    amount: string
    totalCount: number
    receivedCount: number
    usedCount: number
    orderCount: number
    gmv: string
  }[]

  const seckills = (await sequelize.query(
    `SELECT a.id,
            a.name,
            a.start_time AS startTime,
            a.end_time AS endTime,
            a.status,
            COUNT(sp.id) AS productCount,
            COALESCE(SUM(sp.sold_count), 0) AS soldCount,
            COALESCE(SUM(sp.seckill_price * sp.sold_count), 0) AS gmv,
            COALESCE(SUM((s.price - sp.seckill_price) * sp.sold_count), 0) AS discountAmount
       FROM seckill_activities a
       LEFT JOIN seckill_products sp ON sp.activity_id = a.id
       LEFT JOIN product_skus s ON s.id = sp.sku_id
      GROUP BY a.id
      ORDER BY a.id DESC`,
    { type: QueryTypes.SELECT },
  )) as unknown as {
    id: number
    name: string
    startTime: Date | string
    endTime: Date | string
    status: number
    productCount: number
    soldCount: number
    gmv: string
    discountAmount: string
  }[]

  const promotions = (await sequelize.query(
    `SELECT id, name, type, start_time AS startTime, end_time AS endTime, status
       FROM promotions
      ORDER BY id DESC`,
    { type: QueryTypes.SELECT },
  )) as unknown as {
    id: number
    name: string
    type: number
    startTime: Date | string
    endTime: Date | string
    status: number
  }[]

  const summary = (await sequelize.query(
    `SELECT COUNT(*) AS orderCount, COALESCE(SUM(promotion_amount), 0) AS discountTotal
       FROM orders
      WHERE promotion_amount > 0 AND status IN (${PAID_STATUSES})`,
    { type: QueryTypes.SELECT },
  )) as unknown as { orderCount: number; discountTotal: string }[]

  return {
    coupons: coupons.map((row) => ({
      id: Number(row.id),
      name: row.name,
      type: Number(row.type),
      amount: Number(row.amount),
      totalCount: Number(row.totalCount),
      receivedCount: Number(row.receivedCount),
      usedCount: Number(row.usedCount),
      orderCount: Number(row.orderCount),
      gmv: Number(row.gmv),
    })),
    seckills: seckills.map((row) => ({
      id: Number(row.id),
      name: row.name,
      startTime: formatDate(row.startTime),
      endTime: formatDate(row.endTime),
      status: Number(row.status),
      productCount: Number(row.productCount),
      soldCount: Number(row.soldCount),
      gmv: Number(row.gmv),
      discountAmount: Number(row.discountAmount),
    })),
    promotions: promotions.map((row) => ({
      id: Number(row.id),
      name: row.name,
      type: Number(row.type),
      startTime: formatDate(row.startTime),
      endTime: formatDate(row.endTime),
      status: Number(row.status),
    })),
    promotionSummary: {
      orderCount: Number(summary[0]?.orderCount ?? 0),
      discountTotal: Number(summary[0]?.discountTotal ?? 0),
    },
  }
}

export type StatsExportType = 'sales' | 'rank' | 'category' | 'status'
/** 统计报表导出（A-56）：返回带 BOM 的 CSV 文本 */
export async function exportStatsCsv(type: StatsExportType): Promise<string> {
  if (type === 'rank') {
    const rows = await productRank('sales', 10)
    return toCsv(
      ['排名', '商品', '销量', '销售额', '累计加购'],
      rows.map((row, index) => [
        index + 1,
        row.name,
        Number(row.sales),
        Number(row.amount),
        Number(row.cartCount ?? 0),
      ]),
    )
  }

  if (type === 'category') {
    const rows = await categorySales()
    return toCsv(['分类', '销售额'], rows.map((row) => [row.name, Number(row.value)]))
  }

  if (type === 'status') {
    const rows = await orderStatusDistribution()
    return toCsv(
      ['订单状态', '订单数', '订单金额'],
      rows.map((row) => [row.statusText, row.count, row.amount]),
    )
  }

  const rows = await salesTrend(30)
  return toCsv(
    ['日期', '订单量', '销售额'],
    rows.map((row) => [row.date, row.orderCount, row.amount]),
  )
}
