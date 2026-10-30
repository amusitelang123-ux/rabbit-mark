import { Op, fn, col, literal, QueryTypes, type WhereOptions } from 'sequelize'
import { sequelize } from '../config/database'
import { FinanceRecord, Invoice, Order } from '../models'
import { FINANCE_TYPE } from '../constants'
import { AppError } from '../utils/errors'
import { formatDate } from '../utils/serializers'

export interface FinanceQuery {
  type?: number
  startTime?: string
  endTime?: string
  page?: number
  pageSize?: number
}

function occurredRange(startTime?: string, endTime?: string) {
  if (!startTime && !endTime) return {}
  const range: { [Op.gte]?: Date; [Op.lte]?: Date } = {}
  if (startTime) range[Op.gte] = new Date(startTime)
  if (endTime) range[Op.lte] = new Date(endTime)
  return { occurredAt: range }
}

export async function listRecords(query: FinanceQuery = {}) {
  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10))
  const where: WhereOptions = { ...occurredRange(query.startTime, query.endTime) }
  if (query.type !== undefined) (where as Record<string, unknown>).type = query.type

  const { rows, count } = await FinanceRecord.findAndCountAll({
    where,
    include: [{ model: Order, as: 'order', attributes: ['orderNo'] }],
    order: [['id', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    distinct: true,
  })

  return {
    list: rows.map((r) => ({
      id: Number(r.id),
      orderId: r.orderId ? Number(r.orderId) : null,
      orderNo: (r.get('order') as Order | null)?.orderNo ?? '',
      type: r.type,
      amount: Number(r.amount),
      channel: r.channel,
      status: r.status,
      occurredAt: formatDate(r.occurredAt),
    })),
    page,
    pageSize,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  }
}

/** 财务报表（A-64）：按月汇总收入、退款、净收入、成本与毛利 */
export async function monthlyReport(year: number) {
  // 收入口径：已支付订单的实付金额（20/30/40），按支付时间归月
  const incomeRows = (await sequelize.query(
    `SELECT DATE_FORMAT(pay_time, '%Y-%m') AS month,
            COALESCE(SUM(paid_amount), 0) AS income
       FROM orders
      WHERE status IN (20, 30, 40)
        AND pay_time IS NOT NULL
        AND YEAR(pay_time) = :year
      GROUP BY month`,
    { replacements: { year }, type: QueryTypes.SELECT },
  )) as unknown as { month: string; income: string }[]

  // 退款口径：财务退款流水（实际出账）
  const refundRows = (await sequelize.query(
    `SELECT DATE_FORMAT(occurred_at, '%Y-%m') AS month,
            COALESCE(SUM(amount), 0) AS refund
       FROM finance_records
      WHERE type = 2 AND YEAR(occurred_at) = :year
      GROUP BY month`,
    { replacements: { year }, type: QueryTypes.SELECT },
  )) as unknown as { month: string; refund: string }[]

  // 成本按订单明细数量 × SKU 当前成本价估算（未维护成本价的商品按 0 计）
  const costRows = (await sequelize.query(
    `SELECT DATE_FORMAT(o.pay_time, '%Y-%m') AS month,
            COALESCE(SUM(oi.quantity * COALESCE(s.cost_price, 0)), 0) AS cost
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN product_skus s ON s.id = oi.sku_id
      WHERE o.status IN (20, 30, 40)
        AND o.pay_time IS NOT NULL
        AND YEAR(o.pay_time) = :year
      GROUP BY month`,
    { replacements: { year }, type: QueryTypes.SELECT },
  )) as unknown as { month: string; cost: string }[]

  const incomeMap = new Map(incomeRows.map((row) => [row.month, row]))
  const refundMap = new Map(refundRows.map((row) => [row.month, row]))
  const costMap = new Map(costRows.map((row) => [row.month, Number(row.cost)]))

  const months = Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, '0')}`
    const income = Number(incomeMap.get(month)?.income ?? 0)
    const refund = Number(refundMap.get(month)?.refund ?? 0)
    const net = Math.round((income - refund) * 100) / 100
    const cost = Math.round((costMap.get(month) ?? 0) * 100) / 100
    const gross = Math.round((income - cost) * 100) / 100
    return {
      month,
      income,
      refund,
      net,
      cost,
      gross,
      grossRate: income ? Math.round((gross / income) * 1000) / 10 : 0,
    }
  })

  const total = months.reduce(
    (acc, row) => ({
      income: Math.round((acc.income + row.income) * 100) / 100,
      refund: Math.round((acc.refund + row.refund) * 100) / 100,
      net: Math.round((acc.net + row.net) * 100) / 100,
      cost: Math.round((acc.cost + row.cost) * 100) / 100,
      gross: Math.round((acc.gross + row.gross) * 100) / 100,
    }),
    { income: 0, refund: 0, net: 0, cost: 0, gross: 0 },
  )

  return {
    year,
    months,
    total: {
      ...total,
      grossRate: total.income ? Math.round((total.gross / total.income) * 1000) / 10 : 0,
    },
  }
}

/** 对账汇总：应收（已支付订单）、实收（收入流水）、退款、净收入 + 按日明细 */
export async function reconciliation(query: { startTime?: string; endTime?: string } = {}) {
  const where: WhereOptions = { ...occurredRange(query.startTime, query.endTime) }

  const [income, refund] = await Promise.all([
    FinanceRecord.findOne({
      where: { ...where, type: FINANCE_TYPE.INCOME },
      attributes: [
        [fn('SUM', col('amount')), 'total'],
        [fn('COUNT', col('id')), 'cnt'],
      ],
      raw: true,
    }) as unknown as Promise<{ total: string | null; cnt: string } | null>,
    FinanceRecord.findOne({
      where: { ...where, type: FINANCE_TYPE.REFUND },
      attributes: [
        [fn('SUM', col('amount')), 'total'],
        [fn('COUNT', col('id')), 'cnt'],
      ],
      raw: true,
    }) as unknown as Promise<{ total: string | null; cnt: string } | null>,
  ])

  const incomeTotal = Number(income?.total ?? 0)
  const refundTotal = Number(refund?.total ?? 0)

  const daily = (await FinanceRecord.findAll({
    where,
    attributes: [
      [fn('DATE', col('occurred_at')), 'date'],
      [fn('SUM', literal('CASE WHEN type = 1 THEN amount ELSE 0 END')), 'income'],
      [fn('SUM', literal('CASE WHEN type = 2 THEN amount ELSE 0 END')), 'refund'],
    ],
    group: [fn('DATE', col('occurred_at'))],
    order: [[fn('DATE', col('occurred_at')), 'DESC']],
    limit: 60,
    raw: true,
  })) as unknown as { date: string; income: string | null; refund: string | null }[]

  return {
    incomeTotal: Math.round(incomeTotal * 100) / 100,
    incomeCount: Number(income?.cnt ?? 0),
    refundTotal: Math.round(refundTotal * 100) / 100,
    refundCount: Number(refund?.cnt ?? 0),
    netIncome: Math.round((incomeTotal - refundTotal) * 100) / 100,
    daily: daily.map((d) => ({
      date: String(d.date),
      income: Number(d.income ?? 0),
      refund: Number(d.refund ?? 0),
      net: Math.round((Number(d.income ?? 0) - Number(d.refund ?? 0)) * 100) / 100,
    })),
  }
}

export async function listInvoices(page = 1, pageSize = 10) {
  const { rows, count } = await Invoice.findAndCountAll({
    include: [{ model: Order, as: 'order', attributes: ['orderNo'] }],
    order: [['id', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    distinct: true,
  })
  return {
    list: rows.map((i) => ({
      id: Number(i.id),
      orderId: Number(i.orderId),
      orderNo: (i.get('order') as Order | null)?.orderNo ?? '',
      type: i.type,
      title: i.title,
      taxNo: i.taxNo ?? '',
      content: i.content ?? '',
      email: i.email ?? '',
      status: i.status,
      createdAt: formatDate(i.createdAt),
    })),
    page,
    pageSize,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  }
}

export async function setInvoiceStatus(id: number, status: 0 | 1) {
  const invoice = await Invoice.findByPk(id)
  if (!invoice) throw AppError.notFound('发票不存在')
  invoice.status = status
  await invoice.save()
  return { id: Number(invoice.id), status: invoice.status }
}
