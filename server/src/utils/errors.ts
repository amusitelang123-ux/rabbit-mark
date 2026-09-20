import { ERR } from '../constants'

export class AppError extends Error {
  code: number
  httpStatus: number

  constructor(message: string, code: number = ERR.PARAM, httpStatus = 400) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.httpStatus = httpStatus
  }

  static unauthorized(message = '未登录或登录已过期') {
    return new AppError(message, ERR.UNAUTHORIZED, 401)
  }

  static forbidden(message = '无权限访问') {
    return new AppError(message, ERR.FORBIDDEN, 403)
  }

  static notFound(message = '资源不存在') {
    return new AppError(message, ERR.NOT_FOUND, 404)
  }
}
