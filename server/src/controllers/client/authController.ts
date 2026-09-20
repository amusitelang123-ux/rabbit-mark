import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as authService from '../../services/userService'
import { AppError } from '../../utils/errors'

const registerSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  phone: z.string().regex(/^1\d{10}$/, '手机号格式不正确').optional(),
  password: z.string().min(6, '密码至少 6 位'),
  code: z.string().optional(),
})

const loginSchema = z.object({
  account: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(1, '请输入密码'),
})

export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = registerSchema.parse(req.body)
  if (!input.username && !input.phone) throw new AppError('用户名或手机号至少填写一项')
  sendOk(res, await authService.register(input), '注册成功')
})

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body)
  sendOk(res, await authService.login(input), '登录成功')
})

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = String(req.body?.refreshToken ?? '')
  if (!token) throw AppError.unauthorized('缺少 refreshToken')
  sendOk(res, await authService.refresh(token))
})

export const sendSmsCode = asyncHandler(async (req: Request, res: Response) => {
  const phone = String(req.body?.phone ?? '')
  if (!/^1\d{10}$/.test(phone)) throw new AppError('手机号格式不正确')
  // SMS_ADAPTER=console：开发环境把验证码打到控制台
  console.log(`[sms] 向 ${phone} 发送验证码：8888`)
  sendOk(res, { phone, code: '8888' }, '验证码已发送（演示：8888）')
})
