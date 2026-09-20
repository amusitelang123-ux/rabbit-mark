import type { NextFunction, Request, Response } from 'express'
import { MulterError } from 'multer'
import { ZodError } from 'zod'
import { AppError } from '../utils/errors'
import { fail } from '../utils/response'
import { ERR } from '../constants'

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json(fail(ERR.NOT_FOUND, '接口不存在'))
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.httpStatus).json(fail(err.code, err.message))
    return
  }

  if (err instanceof ZodError) {
    const first = err.errors[0]
    res.status(400).json(fail(ERR.PARAM, first?.message ?? '参数校验失败'))
    return
  }

  if (err instanceof MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? '图片大小不能超过 2MB' : '文件上传失败'
    res.status(400).json(fail(ERR.PARAM, message))
    return
  }

  const name = (err as { name?: string })?.name
  if (name === 'SequelizeUniqueConstraintError') {
    res.status(400).json(fail(ERR.PARAM, '数据已存在，请勿重复提交'))
    return
  }
  if (name === 'SequelizeValidationError') {
    res.status(400).json(fail(ERR.PARAM, '数据校验失败'))
    return
  }

  console.error('[error]', err)
  res.status(500).json(fail(ERR.PARAM, '服务器内部错误'))
}
