import type { NextFunction, Request, Response } from 'express'
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
