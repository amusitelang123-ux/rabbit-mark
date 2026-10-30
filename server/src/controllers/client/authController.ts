import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as authService from '../../services/userService'
import { AppError } from '../../utils/errors'
import { ERR, SMS_MOCK_CODE } from '../../constants'
import { captchaEnabled, createCaptcha, verifyCaptcha } from '../../utils/captcha'

const registerSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  phone: z.string().regex(/^1\d{10}$/, '手机号格式不正确').optional(),
  password: z.string().min(6, '密码至少 6 位'),
  code: z.string().optional(),
})

const loginSchema = z
  .object({
    account: z.string().optional(),
    phone: z.string().optional(),
    password: z.string().optional(),
    /** 短信验证码登录 */
    code: z.string().optional(),
    captchaId: z.string().optional(),
    captchaCode: z.string().optional(),
  })
  .refine((v) => Boolean(v.password) || Boolean(v.code), { message: '请输入密码或短信验证码' })

/** 图形验证码（防爆破）：返回一次性 captchaId 与可直接展示的图片 */
export const captcha = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, createCaptcha())
})

/** 登录设备信息（U-45）：IP + UA，用于账户安全页展示 */
function loginMeta(req: Request) {
  return { ip: req.ip, userAgent: req.headers['user-agent'] }
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = registerSchema.parse(req.body)
  if (!input.username && !input.phone) throw new AppError('用户名或手机号至少填写一项')
  sendOk(res, await authService.register(input, loginMeta(req)), '注册成功')
})

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body)

  // 短信验证码登录：phone/code，不走图形验证码与密码校验
  if (input.code && !input.password) {
    const phone = input.phone || input.account || ''
    if (!/^1\d{10}$/.test(phone)) throw new AppError('手机号格式不正确', ERR.PARAM)
    sendOk(res, await authService.loginBySms({ phone, code: input.code }, loginMeta(req)), '登录成功')
    return
  }

  // 开启验证码时强制校验，校验后立即失效
  if (captchaEnabled()) {
    if (!input.captchaId || !input.captchaCode) {
      throw new AppError('请输入图形验证码', ERR.SMS_CODE_INVALID)
    }
    if (!verifyCaptcha(input.captchaId, input.captchaCode)) {
      throw new AppError('图形验证码错误或已过期', ERR.SMS_CODE_INVALID)
    }
  }

  sendOk(
    res,
    await authService.login(
      { account: input.account, phone: input.phone, password: input.password! },
      loginMeta(req),
    ),
    '登录成功',
  )
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
  console.log(`[sms] 向 ${phone} 发送验证码：${SMS_MOCK_CODE}`)
  sendOk(res, { phone, code: SMS_MOCK_CODE }, `验证码已发送（演示：${SMS_MOCK_CODE}）`)
})

const resetSchema = z.object({
  phone: z.string().regex(/^1\d{10}$/, '手机号格式不正确'),
  code: z.string().min(1, '请输入验证码'),
  newPassword: z.string().min(6, '新密码至少 6 位').max(50),
})

/** 找回密码：手机号 + 短信验证码重置 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const input = resetSchema.parse(req.body)
  sendOk(res, await authService.resetPassword(input), '密码已重置，请使用新密码登录')
})
