import bcrypt from 'bcryptjs'
import { fn, col } from 'sequelize'
import { AdminUser, Order, Product, User } from '../models'
import { AppError } from '../utils/errors'
import { ERR, ORDER_STATUS } from '../constants'
import { signAccessToken } from '../utils/jwt'

export async function login(input: { username: string; password: string }) {
  const admin = await AdminUser.findOne({ where: { username: input.username } })
  if (!admin) throw new AppError('账号或密码错误', ERR.LOGIN_FAILED)
  if (admin.status !== 1) throw new AppError('账号已被禁用', ERR.USER_DISABLED)
  const matched = await bcrypt.compare(input.password, admin.password)
  if (!matched) throw new AppError('账号或密码错误', ERR.LOGIN_FAILED)
  admin.lastLoginAt = new Date()
  await admin.save()
  return {
    admin: { id: Number(admin.id), username: admin.username, realName: admin.realName, roleId: admin.roleId },
    token: signAccessToken({ uid: Number(admin.id), role: 'admin' }),
  }
}

export async function me(adminId: number) {
  const admin = await AdminUser.findByPk(adminId)
  if (!admin) throw AppError.unauthorized()
  return { id: Number(admin.id), username: admin.username, realName: admin.realName, roleId: admin.roleId }
}

export async function overview() {
  const [orderCount, gmvRow, userCount, productCount] = await Promise.all([
    Order.count(),
    Order.findOne({
      where: { status: [ORDER_STATUS.PAID, ORDER_STATUS.SHIPPED, ORDER_STATUS.FINISHED] },
      attributes: [[fn('SUM', col('pay_amount')), 'gmv']],
      raw: true,
    }),
    User.count(),
    Product.count({ where: { status: 1 } }),
  ])
  const gmv = Number((gmvRow as unknown as { gmv: string | null } | null)?.gmv ?? 0)
  return {
    orderCount,
    gmv,
    userCount,
    productCount,
    avgOrderAmount: orderCount ? Math.round((gmv / orderCount) * 100) / 100 : 0,
  }
}
