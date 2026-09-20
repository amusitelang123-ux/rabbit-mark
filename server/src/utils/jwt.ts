import jwt, { type SignOptions } from 'jsonwebtoken'
import { config } from '../config'
import { AppError } from './errors'
import { ERR } from '../constants'

export interface JwtPayload {
  uid: number
  role: 'client' | 'admin'
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.accessExpires } as SignOptions)
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, refresh: true }, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpires,
  } as SignOptions)
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, config.jwt.secret) as JwtPayload
  } catch {
    throw new AppError('登录状态已失效，请重新登录', ERR.UNAUTHORIZED, 401)
  }
}
