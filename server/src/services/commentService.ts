import { Op, fn, col, type WhereOptions } from 'sequelize'
import { sequelize } from '../config/database'
import { Order, OrderItem, Product, ProductComment, User } from '../models'
import { AppError } from '../utils/errors'
import { ERR, ORDER_STATUS } from '../constants'
import { formatDate } from '../utils/serializers'

function toClientCommentDto(c: ProductComment & { product?: Product | null }) {
  return {
    id: Number(c.id),
    productId: Number(c.productId),
    productName: c.product?.name ?? '',
    productImage: c.product?.mainImage ?? '',
    score: c.score,
    content: c.content,
    images: c.images ?? [],
    isAnonymous: Boolean(c.isAnonymous),
    replyContent: c.replyContent ?? '',
    status: c.status,
    createdAt: formatDate(c.createdAt),
  }
}

function toAdminCommentDto(c: ProductComment & { product?: Product | null; user?: User | null }) {
  return {
    id: Number(c.id),
    userId: Number(c.userId),
    nickname: c.user?.nickname ?? c.user?.username ?? '小兔用户',
    avatar: c.user?.avatar ?? '',
    productId: Number(c.productId),
    productName: c.product?.name ?? '',
    productImage: c.product?.mainImage ?? '',
    score: c.score,
    content: c.content,
    images: c.images ?? [],
    isAnonymous: Boolean(c.isAnonymous),
    replyContent: c.replyContent ?? '',
    replyAt: c.replyAt ? formatDate(c.replyAt) : null,
    status: c.status,
    createdAt: formatDate(c.createdAt),
  }
}

/** 重新计算商品评价数与平均分 */
async function refreshProductCommentStats(
  productId: number,
  transaction: import('sequelize').Transaction,
) {
  const row = (await ProductComment.findOne({
    where: { productId, status: 1 },
    attributes: [
      [fn('COUNT', col('id')), 'count'],
      [fn('AVG', col('score')), 'avg'],
    ],
    raw: true,
    transaction,
  })) as unknown as { count: string; avg: string | null } | null

  const product = await Product.findByPk(productId, { transaction })
  if (!product) return
  product.commentCount = Number(row?.count ?? 0)
  product.avgScore = (row?.avg != null ? Number(row.avg) : 5).toFixed(2)
  await product.save({ transaction })
}

export interface CreateCommentInput {
  orderItemId: number
  score: number
  content: string
  images?: string[]
  isAnonymous?: boolean
}

/** 发布评价：仅已完成订单、每个明细一次 */
export async function createComment(userId: number, input: CreateCommentInput) {
  return sequelize.transaction(async (transaction) => {
    const item = await OrderItem.findByPk(input.orderItemId, { transaction })
    if (!item) throw AppError.notFound('订单商品不存在')
    const order = await Order.findByPk(item.orderId, { transaction })
    if (!order) throw AppError.notFound('订单不存在')
    if (Number(order.userId) !== userId) throw AppError.forbidden('无权评价该订单')
    if (order.status !== ORDER_STATUS.FINISHED) {
      throw new AppError('订单完成后才能评价', ERR.ORDER_STATUS_INVALID)
    }
    if (item.isCommented) throw new AppError('该商品已评价', ERR.PARAM)

    const comment = await ProductComment.create(
      {
        userId,
        productId: Number(item.productId),
        skuId: Number(item.skuId),
        orderId: Number(item.orderId),
        orderItemId: Number(item.id),
        score: input.score,
        content: input.content,
        images: input.images ?? null,
        isAnonymous: input.isAnonymous ? 1 : 0,
        status: 1,
      },
      { transaction },
    )

    item.isCommented = 1
    await item.save({ transaction })
    await refreshProductCommentStats(Number(item.productId), transaction)

    const full = await ProductComment.findByPk(comment.id, {
      include: [{ model: Product, as: 'product' }],
      transaction,
    })
    return toClientCommentDto(full as unknown as ProductComment & { product?: Product | null })
  })
}

/** 我的评价：待评价（已完成订单未评价的明细）+ 已评价 */
export async function myComments(userId: number) {
  const [pendingItems, comments] = await Promise.all([
    OrderItem.findAll({
      where: { isCommented: 0 },
      include: [
        { model: Order, as: 'order', where: { userId, status: ORDER_STATUS.FINISHED }, required: true },
      ],
      order: [['id', 'DESC']],
      limit: 50,
    }),
    ProductComment.findAll({
      where: { userId },
      include: [{ model: Product, as: 'product' }],
      order: [['id', 'DESC']],
      limit: 50,
    }),
  ])

  const productIds = [...new Set(pendingItems.map((i) => Number(i.productId)))]
  const products = productIds.length
    ? await Product.findAll({ where: { id: { [Op.in]: productIds } }, attributes: ['id', 'name', 'mainImage'] })
    : []
  const productMap = new Map(products.map((p) => [Number(p.id), p]))

  return {
    pending: pendingItems.map((i) => {
      const p = productMap.get(Number(i.productId))
      return {
        orderItemId: Number(i.id),
        orderNo: (i.get('order') as Order | null)?.orderNo ?? '',
        productId: Number(i.productId),
        productName: i.productName,
        productImage: i.productImage ?? p?.mainImage ?? '',
        skuSpecText: i.skuSpecText ?? '',
        createdAt: formatDate((i.get('order') as Order | null)?.finishTime ?? i.createdAt),
      }
    }),
    done: comments.map((c) => toClientCommentDto(c as unknown as ProductComment & { product?: Product | null })),
  }
}

/* --------------------------------- 后台 ----------------------------------- */

export interface AdminCommentQuery {
  status?: number
  score?: number
  keyword?: string
  page?: number
  pageSize?: number
}

export async function listComments(query: AdminCommentQuery = {}) {
  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10))
  const conditions: WhereOptions[] = []
  if (query.status !== undefined) conditions.push({ status: query.status })
  if (query.score !== undefined) conditions.push({ score: query.score })
  if (query.keyword) conditions.push({ content: { [Op.like]: `%${query.keyword}%` } } as WhereOptions)
  const where: WhereOptions = conditions.length ? { [Op.and]: conditions } : {}

  const { rows, count } = await ProductComment.findAndCountAll({
    where,
    include: [
      { model: Product, as: 'product' },
      { model: User, as: 'user' },
    ],
    order: [['id', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    distinct: true,
  })

  return {
    list: rows.map((c) =>
      toAdminCommentDto(c as unknown as ProductComment & { product?: Product | null; user?: User | null }),
    ),
    page,
    pageSize,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  }
}

export async function setCommentStatus(id: number, status: 0 | 1) {
  return sequelize.transaction(async (transaction) => {
    const comment = await ProductComment.findByPk(id, { transaction })
    if (!comment) throw AppError.notFound('评价不存在')
    comment.status = status
    await comment.save({ transaction })
    await refreshProductCommentStats(Number(comment.productId), transaction)
    return { id: Number(comment.id), status: comment.status }
  })
}

export async function replyComment(id: number, content: string) {
  const comment = await ProductComment.findByPk(id)
  if (!comment) throw AppError.notFound('评价不存在')
  comment.replyContent = content
  comment.replyAt = new Date()
  await comment.save()
  return { id: Number(comment.id), replyContent: comment.replyContent }
}
