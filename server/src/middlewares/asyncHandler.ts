import type { NextFunction, Request, RequestHandler, Response } from 'express'

/** 包装 async handler，把 reject 交给全局错误中间件（Express 4 不自动捕获） */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next)
  }
}
