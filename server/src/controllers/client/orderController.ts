import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as orderService from '../../services/orderService'
import { toInt } from '../../utils/helpers'

const createSchema = z.object({
  addressId: z.number().int().positive().optional(),
  // 0 = 明确不使用优惠券；不传 = 服务端自动匹配最优券
  couponId: z.number().int().min(0).optional(),
  remark: z.string().max(255).optional(),
  source: z.number().int().optional(),
})

export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = createSchema.parse(req.body ?? {})
  sendOk(res, await orderService.createOrder(req.auth!.uid, input), '下单成功')
})

export const list = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status ? toInt(req.query.status, 0) : undefined
  sendOk(res, await orderService.listOrders(req.auth!.uid, status))
})

export const detail = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await orderService.getOrder(req.auth!.uid, req.params.orderNo))
})

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await orderService.cancelOrder(req.auth!.uid, req.params.orderNo), '订单已取消')
})

export const confirm = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await orderService.confirmOrder(req.auth!.uid, req.params.orderNo), '已确认收货')
})
