import { Op, fn, col, type WhereOptions } from 'sequelize'
import { sequelize } from '../config/database'
import {
  Order,
  User,
  UserAddress,
  UserCoupon,
  UserLevel,
  UserTag,
  UserTagRelation,
} from '../models'
import { AppError } from '../utils/errors'
import { BALANCE_LOG_TYPE, ERR } from '../constants'
import { maskPhone } from '../utils/helpers'
import { formatDate } from '../utils/serializers'
import { applyBalance } from './walletService'

export interface AdminUserQuery {
  keyword?: string
  status?: number
  /** 按标签筛选（A-35） */
  tagId?: number
  page?: number
  pageSize?: number
}

interface TagDto {
  id: number
  name: string
}

/** 批量取用户标签，避免列表 N+1 */
async function loadTagsByUser(userIds: number[]): Promise<Map<number, TagDto[]>> {
  const map = new Map<number, TagDto[]>()
  if (!userIds.length) return map
  const relations = await UserTagRelation.findAll({
    where: { userId: { [Op.in]: userIds } },
    include: [{ model: UserTag, as: 'tag' }],
  })
  for (const relation of relations) {
    const tag = relation.get('tag') as UserTag | null
    if (!tag) continue
    const uid = Number(relation.userId)
    const list = map.get(uid) ?? []
    list.push({ id: Number(tag.id), name: tag.name })
    map.set(uid, list)
  }
  return map
}

function toAdminUserDto(user: User & { level?: UserLevel | null }) {
  return {
    id: Number(user.id),
    username: user.username ?? '',
    nickname: user.nickname ?? user.username ?? '小兔用户',
    avatar: user.avatar ?? '',
    phone: user.phone ?? '',
    maskedPhone: maskPhone(user.phone),
    gender: user.gender,
    birthday: user.birthday ?? '',
    levelId: user.levelId,
    levelName: user.level?.name ?? '普通会员',
    points: user.points,
    totalSpent: Number(user.totalSpent),
    balance: Number(user.balance),
    status: user.status,
    lastLoginAt: user.lastLoginAt ? formatDate(user.lastLoginAt) : null,
    createdAt: formatDate(user.createdAt),
  }
}

export async function listUsers(query: AdminUserQuery) {
  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10))
  const conditions: WhereOptions[] = []
  if (query.status !== undefined) conditions.push({ status: query.status })
  if (query.tagId) {
    const relations = await UserTagRelation.findAll({
      where: { tagId: query.tagId },
      attributes: ['userId'],
    })
    const ids = [...new Set(relations.map((r) => Number(r.userId)))]
    conditions.push({ id: { [Op.in]: ids } })
  }
  if (query.keyword) {
    const kw = `%${query.keyword}%`
    conditions.push({
      [Op.or]: [
        { phone: { [Op.like]: kw } },
        { nickname: { [Op.like]: kw } },
        { username: { [Op.like]: kw } },
      ],
    } as WhereOptions)
  }
  const where: WhereOptions = conditions.length ? { [Op.and]: conditions } : {}

  const { rows, count } = await User.findAndCountAll({
    where,
    include: [{ model: UserLevel, as: 'level' }],
    order: [['id', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    distinct: true,
  })

  const tagMap = await loadTagsByUser(rows.map((u) => Number(u.id)))

  return {
    list: rows.map((u) => ({
      ...toAdminUserDto(u as unknown as User & { level?: UserLevel | null }),
      tags: tagMap.get(Number(u.id)) ?? [],
    })),
    page,
    pageSize,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  }
}

export async function getUser(id: number) {
  const user = await User.findByPk(id, { include: [{ model: UserLevel, as: 'level' }] })
  if (!user) throw AppError.notFound('用户不存在')

  const [orderStats, paidCount, addresses, coupons] = await Promise.all([
    Order.findOne({
      where: { userId: id },
      attributes: [
        [fn('COUNT', col('id')), 'total'],
        [fn('SUM', col('pay_amount')), 'amount'],
      ],
      raw: true,
    }) as unknown as Promise<{ total: string; amount: string | null } | null>,
    Order.count({ where: { userId: id, status: [20, 30, 40] } }),
    UserAddress.findAll({ where: { userId: id }, order: [['isDefault', 'DESC'], ['id', 'DESC']] }),
    UserCoupon.findAll({ where: { userId: id }, order: [['id', 'DESC']], limit: 50 }),
  ])
  const tags = (await loadTagsByUser([id])).get(id) ?? []

  return {
    ...toAdminUserDto(user as unknown as User & { level?: UserLevel | null }),
    orderCount: Number(orderStats?.total ?? 0),
    paidCount,
    orderAmount: Number(orderStats?.amount ?? 0),
    tags,
    addresses: addresses.map((a) => ({
      id: Number(a.id),
      receiver: a.receiver,
      phone: a.phone,
      province: a.province,
      city: a.city,
      district: a.district,
      detail: a.detail,
      isDefault: Boolean(a.isDefault),
    })),
    coupons: coupons.map((c) => ({
      id: Number(c.id),
      couponId: Number(c.couponId),
      couponCode: c.couponCode,
      status: c.status,
      expireAt: c.expireAt ? formatDate(c.expireAt) : '',
    })),
  }
}

export async function setUserStatus(id: number, status: 0 | 1) {
  const user = await User.findByPk(id)
  if (!user) throw AppError.notFound('用户不存在')
  user.status = status
  await user.save()
  return { id: Number(user.id), status: user.status }
}

/** 后台调整余额（U-30）：正数充值、负数扣减，余额不能为负；同步写余额流水 */
export async function adjustBalance(id: number, change: number) {
  if (!Number.isFinite(change) || change === 0) {
    throw new AppError('余额变动值必须是非 0 数字', ERR.PARAM)
  }
  return sequelize.transaction(async (transaction) => {
    const result = await applyBalance(
      id,
      BALANCE_LOG_TYPE.ADMIN_ADJUST,
      change,
      '后台调整余额',
      null,
      transaction,
    )
    return { id, balance: result.balance }
  })
}

/* -------------------------------- 用户标签 -------------------------------- */

export async function listTags() {
  const tags = await UserTag.findAll({ order: [['id', 'ASC']] })
  const counts = (await UserTagRelation.findAll({
    attributes: ['tagId', [fn('COUNT', col('id')), 'cnt']],
    group: ['tagId'],
    raw: true,
  })) as unknown as { tagId: number; cnt: string }[]
  const countMap = new Map(counts.map((row) => [Number(row.tagId), Number(row.cnt)]))
  return tags.map((tag) => ({
    id: Number(tag.id),
    name: tag.name,
    userCount: countMap.get(Number(tag.id)) ?? 0,
  }))
}

export async function createTag(name: string) {
  const trimmed = name.trim()
  if (!trimmed) throw new AppError('标签名称不能为空', ERR.PARAM)
  const exists = await UserTag.findOne({ where: { name: trimmed } })
  if (exists) throw new AppError('标签名称已存在', ERR.PARAM)
  const tag = await UserTag.create({ name: trimmed })
  return { id: Number(tag.id), name: tag.name, userCount: 0 }
}

export async function updateTag(id: number, name: string) {
  const trimmed = name.trim()
  if (!trimmed) throw new AppError('标签名称不能为空', ERR.PARAM)
  const tag = await UserTag.findByPk(id)
  if (!tag) throw AppError.notFound('标签不存在')
  const exists = await UserTag.findOne({ where: { name: trimmed, id: { [Op.ne]: id } } })
  if (exists) throw new AppError('标签名称已存在', ERR.PARAM)
  tag.name = trimmed
  await tag.save()
  return { id: Number(tag.id), name: tag.name }
}

export async function deleteTag(id: number) {
  await sequelize.transaction(async (transaction) => {
    const tag = await UserTag.findByPk(id, { transaction })
    if (!tag) throw AppError.notFound('标签不存在')
    await UserTagRelation.destroy({ where: { tagId: id }, transaction })
    await tag.destroy({ transaction })
  })
}

/** 覆盖式设置用户标签 */
export async function setUserTags(userId: number, tagIds: number[]) {
  const user = await User.findByPk(userId)
  if (!user) throw AppError.notFound('用户不存在')
  const unique = [...new Set(tagIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))]
  if (unique.length) {
    const count = await UserTag.count({ where: { id: { [Op.in]: unique } } })
    if (count !== unique.length) throw new AppError('包含不存在的标签', ERR.PARAM)
  }
  await sequelize.transaction(async (transaction) => {
    await UserTagRelation.destroy({ where: { userId }, transaction })
    if (unique.length) {
      await UserTagRelation.bulkCreate(
        unique.map((tagId) => ({ userId, tagId })),
        { transaction },
      )
    }
  })
  return { userId, tagIds: unique }
}
