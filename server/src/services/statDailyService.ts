import { Op, QueryTypes } from 'sequelize'
import { sequelize } from '../config/database'
import { StatDaily } from '../models'

/** 本地时区的 YYYY-MM-DD */
export function dateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export interface DailyStatRow {
  statDate: string
  gmv: number
  orderCount: number
  paidCount: number
  newUsers: number
  refundAmount: number
  avgOrderAmount: number
}

/**
 * 聚合单日经营数据并写入 stat_daily（幂等 upsert）。
 * 口径：GMV/支付笔数按支付时间；订单数/新增用户按下单/注册时间；退款按财务流水发生时间。
 */
export async function aggregateDate(date: string): Promise<DailyStatRow> {
  const paid = (await sequelize.query(
    `SELECT COUNT(*) AS paidCount, COALESCE(SUM(pay_amount), 0) AS gmv
       FROM orders
      WHERE status IN (20, 30, 40) AND DATE(pay_time) = :date`,
    { replacements: { date }, type: QueryTypes.SELECT },
  )) as unknown as { paidCount: number; gmv: string }[]
  const created = (await sequelize.query(
    `SELECT COUNT(*) AS orderCount FROM orders WHERE DATE(created_at) = :date`,
    { replacements: { date }, type: QueryTypes.SELECT },
  )) as unknown as { orderCount: number }[]
  const users = (await sequelize.query(
    `SELECT COUNT(*) AS newUsers FROM users WHERE DATE(created_at) = :date`,
    { replacements: { date }, type: QueryTypes.SELECT },
  )) as unknown as { newUsers: number }[]
  const refund = (await sequelize.query(
    `SELECT COALESCE(SUM(amount), 0) AS refundAmount
       FROM finance_records
      WHERE type = 2 AND DATE(occurred_at) = :date`,
    { replacements: { date }, type: QueryTypes.SELECT },
  )) as unknown as { refundAmount: string }[]

  const gmv = Number(paid[0]?.gmv ?? 0)
  const paidCount = Number(paid[0]?.paidCount ?? 0)
  const row: DailyStatRow = {
    statDate: date,
    gmv,
    orderCount: Number(created[0]?.orderCount ?? 0),
    paidCount,
    newUsers: Number(users[0]?.newUsers ?? 0),
    refundAmount: Number(refund[0]?.refundAmount ?? 0),
    avgOrderAmount: paidCount ? Math.round((gmv / paidCount) * 100) / 100 : 0,
  }

  await StatDaily.upsert({
    statDate: date,
    gmv: row.gmv.toFixed(2),
    orderCount: row.orderCount,
    paidCount: row.paidCount,
    newUsers: row.newUsers,
    refundAmount: row.refundAmount.toFixed(2),
    avgOrderAmount: row.avgOrderAmount.toFixed(2),
  })
  return row
}

/** 回填最近 N 天（含今天），按日期从旧到新串行聚合，避免瞬时压库 */
export async function aggregateRecent(days = 30): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dates: string[] = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    dates.push(dateKey(date))
  }
  for (const date of dates) {
    await aggregateDate(date)
  }
  return dates.length
}

/** 读取最近 N 天预聚合数据（无数据的日期不补零，由调用方决定回退策略） */
export async function listDaily(days = 30): Promise<DailyStatRow[]> {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))
  const rows = await StatDaily.findAll({
    where: { statDate: { [Op.gte]: dateKey(start) } },
    order: [['statDate', 'ASC']],
  })
  return rows.map((row) => ({
    statDate: String(row.statDate),
    gmv: Number(row.gmv),
    orderCount: row.orderCount,
    paidCount: row.paidCount,
    newUsers: row.newUsers,
    refundAmount: Number(row.refundAmount),
    avgOrderAmount: Number(row.avgOrderAmount),
  }))
}
