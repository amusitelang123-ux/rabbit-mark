import type { NextFunction, Request, Response } from 'express'
import { AdminUser, Permission, Role, RolePermission } from '../models'
import { ERR } from '../constants'
import { AppError } from '../utils/errors'
import { verifyToken } from '../utils/jwt'

function extractToken(req: Request): string | null {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7)
  return null
}

/** 必须登录 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req)
  if (!token) return next(AppError.unauthorized())
  try {
    const payload = verifyToken(token)
    req.auth = { uid: payload.uid, role: payload.role }
    next()
  } catch (err) {
    next(err)
  }
}

/** 必须管理员登录 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, (err?: unknown) => {
    if (err) return next(err)
    if (req.auth?.role !== 'admin') return next(AppError.forbidden('需要管理员权限'))
    next()
  })
}

/** 可选登录：有 token 则解析，无也放行 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req)
  if (!token) return next()
  try {
    const payload = verifyToken(token)
    req.auth = { uid: payload.uid, role: payload.role }
  } catch {
    // 忽略无效 token，按未登录处理
  }
  next()
}

/** 校验管理员是否拥有指定权限点；支持 `*` 与 `模块:*` 通配 */
export async function adminHasPermission(adminId: number, code: string): Promise<boolean> {
  const admin = await AdminUser.findByPk(adminId, { include: [{ model: Role, as: 'role' }] })
  if (!admin) return false
  const role = admin.get('role') as Role | null
  if (!role || role.status !== 1) return false
  if (role.code === 'super_admin') return true

  const rows = await RolePermission.findAll({
    where: { roleId: role.id },
    include: [{ model: Permission, as: 'permission' }],
  })
  const codes = rows
    .map((r) => (r.get('permission') as Permission | null)?.code)
    .filter((c): c is string => Boolean(c))
  if (codes.includes('*') || codes.includes(code)) return true
  return codes.includes(`${code.split(':')[0]}:*`)
}

/** 接口级权限校验：需管理员登录且拥有指定权限点 */
export function requirePermission(code: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    requireAdmin(req, res, (err?: unknown) => {
      if (err) return next(err)
      adminHasPermission(req.auth!.uid, code)
        .then((allowed) => {
          if (!allowed) return next(new AppError('无权限执行该操作', ERR.ADMIN_PERMISSION_DENIED, 403))
          next()
        })
        .catch(next)
    })
  }
}
