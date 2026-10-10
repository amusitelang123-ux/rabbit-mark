import bcrypt from 'bcryptjs'
import { Op } from 'sequelize'
import {
  Brand,
  Category,
  Product,
  ProductImage,
  ProductSku,
  User,
  UserAddress,
  UserFavorite,
  UserFootprint,
  UserLevel,
} from '../models'
import { AppError } from '../utils/errors'
import { ERR, SMS_MOCK_CODE } from '../constants'
import { signAccessToken, signRefreshToken, verifyToken } from '../utils/jwt'
import { maskPhone } from '../utils/helpers'
import { toAddressDto, toProductDto, toUserDto, type ProductWithRelations } from '../utils/serializers'

const productInclude = [
  { model: ProductSku, as: 'skus' },
  { model: ProductImage, as: 'imageList' },
  { model: Category, as: 'category', include: [{ model: Category, as: 'parent' }] },
  { model: Brand, as: 'brand' },
]

async function loadUser(id: number) {
  const user = await User.findByPk(id, { include: [{ model: UserLevel, as: 'level' }] })
  if (!user) throw AppError.notFound('用户不存在')
  return user
}

export async function register(input: { username?: string; phone?: string; password: string }) {
  if (input.phone) {
    const exists = await User.findOne({ where: { phone: input.phone } })
    if (exists) throw new AppError('该手机号已注册', ERR.USER_EXISTS)
  }
  if (input.username) {
    const exists = await User.findOne({ where: { username: input.username } })
    if (exists) throw new AppError('该用户名已被占用', ERR.USER_EXISTS)
  }
  const hash = await bcrypt.hash(input.password, 10)
  const user = await User.create({
    username: input.username ?? null,
    phone: input.phone ?? null,
    password: hash,
    nickname: input.username ?? (input.phone ? `兔友${input.phone.slice(-4)}` : '兔友'),
    avatar: '',
    points: 0,
  })
  return issueTokens(user)
}

export async function login(input: { account?: string; phone?: string; password: string }) {
  const key = input.phone || input.account || ''
  const user = await User.findOne({
    where: { [Op.or]: [{ username: key }, { phone: key }] },
  })
  if (!user) throw new AppError('账号或密码错误', ERR.LOGIN_FAILED)
  if (user.status !== 1) throw new AppError('账号已被禁用', ERR.USER_DISABLED)
  const matched = await bcrypt.compare(input.password, user.password)
  if (!matched) throw new AppError('账号或密码错误', ERR.LOGIN_FAILED)
  user.lastLoginAt = new Date()
  await user.save()
  return issueTokens(user)
}

export async function refresh(refreshToken: string) {
  const payload = verifyToken(refreshToken)
  const user = await User.findByPk(payload.uid)
  if (!user || user.status !== 1) throw AppError.unauthorized()
  return issueTokens(user)
}

async function issueTokens(user: User) {
  const payload = { uid: Number(user.id), role: 'client' as const }
  const full = await loadUser(Number(user.id))
  return {
    user: toUserDto(full as unknown as Parameters<typeof toUserDto>[0]),
    token: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  }
}

export async function getProfile(userId: number) {
  const user = await loadUser(userId)
  return toUserDto(user as unknown as Parameters<typeof toUserDto>[0])
}

export async function updateProfile(
  userId: number,
  input: { nickname?: string; avatar?: string; gender?: number; birthday?: string },
) {
  const user = await loadUser(userId)
  if (input.nickname !== undefined) user.nickname = input.nickname
  if (input.avatar !== undefined) user.avatar = input.avatar
  if (input.gender !== undefined) user.gender = input.gender
  if (input.birthday !== undefined) user.birthday = input.birthday
  await user.save()
  return toUserDto(user as unknown as Parameters<typeof toUserDto>[0])
}

export async function updateAvatar(userId: number, avatarUrl: string) {
  const user = await loadUser(userId)
  user.avatar = avatarUrl
  await user.save()
  return toUserDto(user as unknown as Parameters<typeof toUserDto>[0])
}

/** 修改密码：校验旧密码后重新加盐哈希 */
export async function changePassword(
  userId: number,
  input: { oldPassword: string; newPassword: string },
) {
  const user = await loadUser(userId)
  const matched = await bcrypt.compare(input.oldPassword, user.password)
  if (!matched) throw new AppError('原密码不正确', ERR.PARAM)
  if (input.oldPassword === input.newPassword) {
    throw new AppError('新密码不能与原密码相同', ERR.PARAM)
  }
  user.password = await bcrypt.hash(input.newPassword, 10)
  await user.save()
  return { changed: true }
}

/** 找回密码：手机号 + 短信验证码重置（演示环境验证码固定为 SMS_MOCK_CODE） */
export async function resetPassword(input: { phone: string; code: string; newPassword: string }) {
  if (input.code !== SMS_MOCK_CODE) {
    throw new AppError('验证码不正确', ERR.SMS_CODE_INVALID)
  }
  const user = await User.findOne({ where: { phone: input.phone } })
  if (!user) throw AppError.notFound('该手机号尚未注册')
  if (user.status !== 1) throw new AppError('账号已被禁用', ERR.USER_DISABLED)

  user.password = await bcrypt.hash(input.newPassword, 10)
  await user.save()
  return { reset: true }
}

/* --------------------------------- Address -------------------------------- */

export async function listAddresses(userId: number) {
  const rows = await UserAddress.findAll({
    where: { userId },
    order: [
      ['isDefault', 'DESC'],
      ['id', 'DESC'],
    ],
  })
  return rows.map(toAddressDto)
}

export async function createAddress(
  userId: number,
  input: {
    receiver: string
    phone: string
    province: string
    city: string
    district: string
    detail: string
    isDefault?: boolean
  },
) {
  if (input.isDefault) {
    await UserAddress.update({ isDefault: 0 }, { where: { userId } })
  }
  const row = await UserAddress.create({ ...input, userId, isDefault: input.isDefault ? 1 : 0 })
  return toAddressDto(row)
}

export async function updateAddress(
  userId: number,
  id: number,
  input: Partial<{
    receiver: string
    phone: string
    province: string
    city: string
    district: string
    detail: string
    isDefault: boolean
  }>,
) {
  const row = await UserAddress.findOne({ where: { id, userId } })
  if (!row) throw AppError.notFound('地址不存在')
  if (input.isDefault) await UserAddress.update({ isDefault: 0 }, { where: { userId } })
  const patch: Record<string, unknown> = { ...input }
  if (input.isDefault !== undefined) patch.isDefault = input.isDefault ? 1 : 0
  await row.update(patch)
  return toAddressDto(row)
}

export async function deleteAddress(userId: number, id: number) {
  const row = await UserAddress.findOne({ where: { id, userId } })
  if (!row) throw AppError.notFound('地址不存在')
  await row.destroy()
}

/* ------------------------------ Favorites / footprint --------------------- */

export async function listFavorites(userId: number) {
  const rows = await UserFavorite.findAll({ where: { userId }, order: [['id', 'DESC']] })
  const ids = rows.map((r) => r.productId)
  if (!ids.length) return []
  const products = await Product.findAll({ where: { id: { [Op.in]: ids }, status: 1 }, include: productInclude })
  return products.map((p) => toProductDto(p as unknown as ProductWithRelations))
}

export async function toggleFavorite(userId: number, productId: number) {
  const existing = await UserFavorite.findOne({ where: { userId, productId } })
  if (existing) {
    await existing.destroy()
    return { favorited: false }
  }
  await UserFavorite.create({ userId, productId })
  return { favorited: true }
}

export async function listFootprints(userId: number) {
  const rows = await UserFootprint.findAll({
    where: { userId },
    order: [['viewedAt', 'DESC']],
    limit: 20,
  })
  const ids = [...new Set(rows.map((r) => r.productId))]
  if (!ids.length) return []
  const products = await Product.findAll({ where: { id: { [Op.in]: ids }, status: 1 }, include: productInclude })
  return products.map((p) => toProductDto(p as unknown as ProductWithRelations))
}

export async function addFootprint(userId: number, productId: number) {
  await UserFootprint.create({ userId, productId, viewedAt: new Date() })
}

export { maskPhone }
