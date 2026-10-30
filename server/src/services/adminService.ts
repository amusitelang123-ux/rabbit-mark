import bcrypt from 'bcryptjs'
import { fn, col, Op } from 'sequelize'
import { AdminUser, AdminLog, Order, Permission, Product, Role, RolePermission, User } from '../models'
import { AppError } from '../utils/errors'
import { ERR, ORDER_STATUS } from '../constants'
import { signAccessToken } from '../utils/jwt'

/* --------------------------------- 认证 ----------------------------------- */

export async function login(
  input: { username: string; password: string },
  meta: { ip?: string; userAgent?: string } = {},
) {
  const admin = await AdminUser.findOne({
    where: { username: input.username },
    include: [{ model: Role, as: 'role' }],
  })

  // 登录失败也留痕，便于排查暴力破解（账号不存在时 adminId 为空）
  const ua = meta.userAgent ? ` | UA: ${meta.userAgent.slice(0, 180)}` : ''

  if (!admin) {
    await writeAdminLog({
      adminId: null,
      module: 'auth',
      action: 'login_failed',
      content: `账号不存在：${input.username}${ua}`,
      ip: meta.ip,
    })
    throw new AppError('账号或密码错误', ERR.LOGIN_FAILED)
  }
  if (admin.status !== 1) {
    await writeAdminLog({
      adminId: Number(admin.id),
      module: 'auth',
      action: 'login_failed',
      content: `账号已禁用${ua}`,
      ip: meta.ip,
    })
    throw new AppError('账号已被禁用', ERR.USER_DISABLED)
  }

  const matched = await bcrypt.compare(input.password, admin.password)
  if (!matched) {
    await writeAdminLog({
      adminId: Number(admin.id),
      module: 'auth',
      action: 'login_failed',
      content: `密码错误${ua}`,
      ip: meta.ip,
    })
    throw new AppError('账号或密码错误', ERR.LOGIN_FAILED)
  }

  admin.lastLoginAt = new Date()
  await admin.save()
  await writeAdminLog({
    adminId: Number(admin.id),
    module: 'auth',
    action: 'login_success',
    content: `登录成功${ua}`,
    ip: meta.ip,
  })

  const role = admin.get('role') as Role | null
  return {
    admin: {
      id: Number(admin.id),
      username: admin.username,
      realName: admin.realName,
      roleId: admin.roleId,
      roleCode: role?.code ?? '',
    },
    token: signAccessToken({ uid: Number(admin.id), role: 'admin' }),
  }
}

async function resolvePermissions(role: Role | null): Promise<string[]> {
  if (!role || role.status !== 1) return []
  if (role.code === 'super_admin') return ['*']
  const rows = await RolePermission.findAll({
    where: { roleId: role.id },
    include: [{ model: Permission, as: 'permission' }],
  })
  return rows
    .map((r) => (r.get('permission') as Permission | null)?.code)
    .filter((c): c is string => Boolean(c))
}

export async function me(adminId: number) {
  const admin = await AdminUser.findByPk(adminId, { include: [{ model: Role, as: 'role' }] })
  if (!admin) throw AppError.unauthorized()
  const role = admin.get('role') as Role | null
  return {
    id: Number(admin.id),
    username: admin.username,
    realName: admin.realName,
    roleId: admin.roleId,
    roleCode: role?.code ?? '',
    roleName: role?.name ?? '',
    permissions: await resolvePermissions(role),
  }
}

/* --------------------------------- 概览 ----------------------------------- */

export async function overview() {
  const paidStatuses = [ORDER_STATUS.PAID, ORDER_STATUS.SHIPPED, ORDER_STATUS.FINISHED]
  const [orderCount, paidOrderCount, gmvRow, userCount, productCount, pendingRemindCount] =
    await Promise.all([
      Order.count(),
      Order.count({ where: { status: paidStatuses } }),
      Order.findOne({
        where: { status: paidStatuses },
        attributes: [[fn('SUM', col('pay_amount')), 'gmv']],
        raw: true,
      }),
      User.count(),
      Product.count({ where: { status: 1 } }),
      // 待发货且用户已催发货的订单，后台首页与订单列表用于醒目提醒
      Order.count({
        where: { status: ORDER_STATUS.PAID, remindShipCount: { [Op.gt]: 0 } },
      }),
    ])
  const gmv = Number((gmvRow as unknown as { gmv: string | null } | null)?.gmv ?? 0)
  return {
    orderCount,
    gmv,
    userCount,
    productCount,
    pendingRemindCount,
    // 客单价 = GMV ÷ 已支付口径订单数（20 已付款 / 30 已发货 / 40 已完成）；
    // 分母不再含待付款、已关闭、已退款订单，避免被未成交订单稀释。
    avgOrderAmount: paidOrderCount ? Math.round((gmv / paidOrderCount) * 100) / 100 : 0,
  }
}

/* ------------------------------ 管理员管理 -------------------------------- */

export async function listAdmins(page = 1, pageSize = 10) {
  const { rows, count } = await AdminUser.findAndCountAll({
    include: [{ model: Role, as: 'role' }],
    order: [['id', 'ASC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    distinct: true,
  })
  return {
    list: rows.map((a) => ({
      id: Number(a.id),
      username: a.username,
      realName: a.realName ?? '',
      phone: a.phone ?? '',
      roleId: a.roleId,
      roleName: (a.get('role') as Role | null)?.name ?? '',
      status: a.status,
      lastLoginAt: a.lastLoginAt,
      createdAt: a.createdAt,
    })),
    page,
    pageSize,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  }
}

export async function createAdmin(input: {
  username: string
  password: string
  realName?: string
  phone?: string
  roleId?: number
  status?: number
}) {
  const exists = await AdminUser.findOne({ where: { username: input.username } })
  if (exists) throw new AppError('用户名已存在', ERR.USER_EXISTS)
  const admin = await AdminUser.create({
    username: input.username,
    password: bcrypt.hashSync(input.password, 10),
    realName: input.realName ?? null,
    phone: input.phone ?? null,
    roleId: input.roleId ?? null,
    status: input.status ?? 1,
  })
  return { id: Number(admin.id) }
}

export async function updateAdmin(
  id: number,
  input: Partial<{ realName: string; phone: string; roleId: number; status: number }>,
) {
  const admin = await AdminUser.findByPk(id)
  if (!admin) throw AppError.notFound('管理员不存在')
  if (input.realName !== undefined) admin.realName = input.realName
  if (input.phone !== undefined) admin.phone = input.phone
  if (input.roleId !== undefined) admin.roleId = input.roleId
  if (input.status !== undefined) admin.status = input.status
  await admin.save()
  return { id: Number(admin.id) }
}

export async function resetAdminPassword(id: number, password: string) {
  const admin = await AdminUser.findByPk(id)
  if (!admin) throw AppError.notFound('管理员不存在')
  admin.password = bcrypt.hashSync(password, 10)
  await admin.save()
  return { id: Number(admin.id) }
}

export async function deleteAdmin(id: number, operatorId: number) {
  if (id === operatorId) throw new AppError('不能删除当前登录账号', ERR.PARAM)
  const admin = await AdminUser.findByPk(id)
  if (!admin) throw AppError.notFound('管理员不存在')
  await admin.destroy()
}

/* -------------------------------- 角色管理 -------------------------------- */

export async function listRoles() {
  const roles = await Role.findAll({ order: [['id', 'ASC']] })
  const result = []
  for (const role of roles) {
    const rows = await RolePermission.findAll({ where: { roleId: role.id } })
    result.push({
      id: Number(role.id),
      name: role.name,
      code: role.code,
      description: role.description ?? '',
      status: role.status,
      permissionIds: rows.map((r) => r.permissionId),
    })
  }
  return result
}

export async function createRole(input: { name: string; code: string; description?: string; status?: number }) {
  const exists = await Role.findOne({ where: { code: input.code } })
  if (exists) throw new AppError('角色编码已存在', ERR.PARAM)
  const role = await Role.create({
    name: input.name,
    code: input.code,
    description: input.description ?? null,
    status: input.status ?? 1,
  })
  return { id: Number(role.id) }
}

export async function updateRole(
  id: number,
  input: Partial<{ name: string; description: string; status: number }>,
) {
  const role = await Role.findByPk(id)
  if (!role) throw AppError.notFound('角色不存在')
  if (input.name !== undefined) role.name = input.name
  if (input.description !== undefined) role.description = input.description
  if (input.status !== undefined) role.status = input.status
  await role.save()
  return { id: Number(role.id) }
}

export async function deleteRole(id: number) {
  const role = await Role.findByPk(id)
  if (!role) throw AppError.notFound('角色不存在')
  if (role.code === 'super_admin') throw new AppError('超级管理员角色不可删除', ERR.PARAM)
  const used = await AdminUser.count({ where: { roleId: id } })
  if (used) throw new AppError('该角色下仍有管理员，无法删除', ERR.PARAM)
  await RolePermission.destroy({ where: { roleId: id } })
  await role.destroy()
}

export async function setRolePermissions(roleId: number, permissionIds: number[]) {
  const role = await Role.findByPk(roleId)
  if (!role) throw AppError.notFound('角色不存在')
  await RolePermission.destroy({ where: { roleId } })
  for (const permissionId of permissionIds) {
    await RolePermission.create({ roleId, permissionId })
  }
  return { roleId, permissionIds }
}

/* -------------------------------- 权限管理 -------------------------------- */

export async function listPermissions() {
  const rows = await Permission.findAll({
    order: [
      ['sort', 'ASC'],
      ['id', 'ASC'],
    ],
  })
  return rows.map((p) => ({
    id: Number(p.id),
    parentId: p.parentId,
    name: p.name,
    code: p.code,
    type: p.type,
    path: p.path ?? '',
    component: p.component ?? '',
    icon: p.icon ?? '',
    sort: p.sort,
  }))
}

/* -------------------------------- 操作日志 -------------------------------- */

export async function listAdminLogs(page = 1, pageSize = 20, module?: string) {
  const where: Record<string, unknown> = {}
  if (module) where.module = module

  const { rows, count } = await AdminLog.findAndCountAll({
    where,
    include: [{ model: AdminUser, as: 'admin', attributes: ['username', 'realName'] }],
    order: [['id', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    distinct: true,
  })
  return {
    list: rows.map((l) => {
      const adminUser = l.get('admin') as AdminUser | null
      return {
        id: Number(l.id),
        adminId: l.adminId ? Number(l.adminId) : null,
        adminName: adminUser?.realName || adminUser?.username || '未知账号',
        module: l.module ?? '',
        action: l.action ?? '',
        targetId: l.targetId,
        content: l.content ?? '',
        ip: l.ip ?? '',
        createdAt: l.createdAt,
      }
    }),
    page,
    pageSize,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  }
}

export async function writeAdminLog(input: {
  adminId: number | null
  module: string
  action: string
  targetId?: number
  content?: string
  ip?: string
}) {
  await AdminLog.create({
    adminId: input.adminId,
    module: input.module,
    action: input.action,
    targetId: input.targetId ?? null,
    content: input.content ?? null,
    ip: input.ip ?? null,
  })
}
