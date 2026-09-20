import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as adminService from '../../services/adminService'
import * as productService from '../../services/productService'
import * as orderService from '../../services/orderService'
import { toInt } from '../../utils/helpers'

const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) })

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body)
  sendOk(res, await adminService.login(input), '登录成功')
})

export const me = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await adminService.me(req.auth!.uid))
})

export const overview = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await adminService.overview())
})

/** 后台复用商品查询；后续可扩展增删改 */
export const products = asyncHandler(async (req: Request, res: Response) => {
  sendOk(
    res,
    await productService.listProducts({
      keyword: req.query.keyword ? String(req.query.keyword) : undefined,
      page: toInt(req.query.page, 1),
      pageSize: toInt(req.query.pageSize, 10),
    }),
  )
})

export const orders = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status ? toInt(req.query.status, 0) : undefined
  sendOk(res, await orderService.listAllOrders(status, toInt(req.query.page, 1), toInt(req.query.pageSize, 10)))
})
