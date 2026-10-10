import { QueryTypes } from 'sequelize'
import { sequelize } from '../config/database'

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

/** 销售趋势：按日统计订单量与销售额（无数据的日期补 0，固定返回 days 个点） */
export async function salesTrend(days = 30) {
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
export async function productRank(sortBy: 'sales' | 'amount' = 'sales', limit = 10) {
  const orderCol = sortBy === 'amount' ? 'amount' : 'sales'
  return (await sequelize.query(
    `SELECT oi.product_id AS productId,
            COALESCE(p.name, MAX(oi.product_name)) AS name,
            COALESCE(p.main_image, MAX(oi.product_image)) AS image,
            SUM(oi.quantity) AS sales,
            COALESCE(SUM(oi.subtotal), 0) AS amount
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       LEFT JOIN products p ON p.id = oi.product_id
      WHERE o.status IN (${PAID_STATUSES})
      GROUP BY oi.product_id, p.name, p.main_image
      ORDER BY ${orderCol} DESC
      LIMIT :limit`,
    { replacements: { limit }, type: QueryTypes.SELECT },
  )) as unknown as { productId: number; name: string; image: string; sales: string; amount: string }[]
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
