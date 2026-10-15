import { Op } from 'sequelize'
import { Notice } from '../models'
import { AppError } from '../utils/errors'
import { formatDate } from '../utils/serializers'

/**
 * 公告只读服务（用户端）。
 *
 * 后台侧（adminMarketingService）已具备公告的增删改查，但用户端此前只能看到
 * 首页聚合里的少量数据，缺少独立的公告读取入口。本服务仅补上「读」这一环，
 * 不写入任何数据，也不影响既有的后台管理逻辑。
 */

function toNoticeDto(n: Notice) {
  return {
    id: Number(n.id),
    title: n.title,
    content: n.content ?? '',
    type: n.type,
    publishAt: n.publishAt ? formatDate(n.publishAt) : formatDate(n.createdAt),
    createdAt: formatDate(n.createdAt),
  }
}

/**
 * 用户端可见的公告列表：仅取启用中（status=1）且已发布（publish_at 为空或已到时间）的记录，
 * 按发布时间倒序，供公告列表 / 首页公告栏使用。
 */
export async function listPublished(limit = 20) {
  const now = new Date()
  const rows = await Notice.findAll({
    where: {
      status: 1,
      [Op.or]: [{ publishAt: null }, { publishAt: { [Op.lte]: now } }],
    },
    order: [
      ['publishAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: Math.min(Math.max(limit, 1), 50),
  })
  return rows.map(toNoticeDto)
}

/** 公告详情：仅允许读取启用中的公告，未启用或不存在时抛出 404 */
export async function getPublished(id: number) {
  if (!id) throw AppError.notFound('公告不存在')
  const notice = await Notice.findOne({ where: { id, status: 1 } })
  if (!notice) throw AppError.notFound('公告不存在')
  return toNoticeDto(notice)
}
