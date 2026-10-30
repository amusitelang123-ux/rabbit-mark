import { Op, type WhereOptions } from 'sequelize'
import { Feedback, Order, User } from '../models'
import { AppError } from '../utils/errors'
import { formatDate } from '../utils/serializers'

export interface CreateFeedbackInput {
  type: number
  content: string
  images?: string[]
  contact?: string
  orderNo?: string
}

function toFeedbackDto(f: Feedback & { user?: User | null }) {
  return {
    id: Number(f.id),
    userId: Number(f.userId),
    nickname: f.user?.nickname ?? f.user?.username ?? '小兔用户',
    avatar: f.user?.avatar ?? '',
    type: f.type,
    content: f.content,
    images: f.images ?? [],
    contact: f.contact ?? '',
    orderNo: f.orderNo ?? '',
    status: f.status,
    replyContent: f.replyContent ?? '',
    replyAt: f.replyAt ? formatDate(f.replyAt) : null,
    replier: f.replier ?? '',
    createdAt: formatDate(f.createdAt),
  }
}

/** 客户端提交工单 */
export async function createFeedback(userId: number, input: CreateFeedbackInput) {
  // 关联订单必须是当前用户的订单，避免留言挂到他人订单上
  if (input.orderNo) {
    const order = await Order.findOne({ where: { orderNo: input.orderNo, userId } })
    if (!order) throw AppError.notFound('订单不存在')
  }

  const feedback = await Feedback.create({
    userId,
    type: input.type,
    content: input.content,
    images: input.images?.length ? input.images : null,
    contact: input.contact ?? null,
    orderNo: input.orderNo ?? null,
    status: 0,
  })
  return toFeedbackDto(feedback as unknown as Feedback & { user?: User | null })
}

/** 客户端：我的工单；传 orderNo 时只返回该订单相关的留言 */
export async function listMyFeedbacks(userId: number, orderNo?: string) {
  const where: WhereOptions = orderNo ? { userId, orderNo } : { userId }
  const rows = await Feedback.findAll({ where, order: [['id', 'DESC']], limit: 50 })
  return rows.map((r) => toFeedbackDto(r as unknown as Feedback & { user?: User | null }))
}

export interface AdminFeedbackQuery {
  status?: number
  type?: number
  keyword?: string
  page?: number
  pageSize?: number
}

/** 后台：工单列表 */
export async function listFeedbacks(query: AdminFeedbackQuery = {}) {
  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10))

  const conditions: WhereOptions[] = []
  if (query.status !== undefined) conditions.push({ status: query.status })
  if (query.type !== undefined) conditions.push({ type: query.type })
  if (query.keyword) {
    const kw = `%${query.keyword}%`
    conditions.push({
      [Op.or]: [{ content: { [Op.like]: kw } }, { orderNo: { [Op.like]: kw } }],
    } as WhereOptions)
  }
  const where: WhereOptions = conditions.length ? { [Op.and]: conditions } : {}

  const { rows, count } = await Feedback.findAndCountAll({
    where,
    include: [{ model: User, as: 'user' }],
    order: [
      ['status', 'ASC'],
      ['id', 'DESC'],
    ],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    distinct: true,
  })

  return {
    list: rows.map((r) => toFeedbackDto(r as unknown as Feedback & { user?: User | null })),
    page,
    pageSize,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  }
}

/** 后台：回复工单（同时置为已回复） */
export async function replyFeedback(id: number, content: string, operator: string) {
  const feedback = await Feedback.findByPk(id)
  if (!feedback) throw AppError.notFound('工单不存在')
  if (feedback.status === 2) throw new AppError('工单已关闭，无法回复', 10000)

  feedback.replyContent = content
  feedback.replyAt = new Date()
  feedback.replier = operator
  feedback.status = 1
  await feedback.save()
  return toFeedbackDto(feedback as unknown as Feedback & { user?: User | null })
}

/** 后台：关闭工单 */
export async function closeFeedback(id: number) {
  const feedback = await Feedback.findByPk(id)
  if (!feedback) throw AppError.notFound('工单不存在')
  feedback.status = 2
  await feedback.save()
  return { id: Number(feedback.id), status: feedback.status }
}
