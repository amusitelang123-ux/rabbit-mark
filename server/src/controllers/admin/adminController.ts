import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as adminService from '../../services/adminService'

const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) })

/** 取客户端真实 IP（兼容反向代理） */
function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim()
  return req.ip ?? ''
}

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body)
  sendOk(
    res,
    await adminService.login(input, {
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
    }),
    '登录成功',
  )
})

export const me = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await adminService.me(req.auth!.uid))
})

export const overview = asyncHandler(async (req: Request, res: Response) => {
  const allowed = ['today', 'yesterday', '7d', '30d', 'all']
  const raw = String(req.query.range ?? 'all')
  const range = (allowed.includes(raw) ? raw : 'all') as adminService.StatsRange
  sendOk(res, await adminService.overview(range))
})
