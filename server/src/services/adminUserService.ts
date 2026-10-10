import { Op, fn, col, type WhereOptions } from 'sequelize'
import { Order, User, UserAddress, UserCoupon, UserLevel } from '../models'
import { AppError } from '../utils/errors'
import { maskPhone } from '../utils/helpers'
import { formatDate } from '../utils/serializers'

export interface AdminUserQuery {
  keyword?: string
  status?: number
  page?: number
  pageSize?: number
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

  return {
    list: rows.map((u) => toAdminUserDto(u as unknown as User & { level?: UserLevel | null })),
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

  return {
    ...toAdminUserDto(user as unknown as User & { level?: UserLevel | null }),
    orderCount: Number(orderStats?.total ?? 0),
    paidCount,
    orderAmount: Number(orderStats?.amount ?? 0),
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
