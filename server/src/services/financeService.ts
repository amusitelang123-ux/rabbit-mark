import { Op, fn, col, literal, type WhereOptions } from 'sequelize'
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
