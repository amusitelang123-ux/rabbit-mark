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
  // 积分抵现（U-64）：由服务端按积分余额与 50% 上限计算实际抵扣
  usePoints: z.boolean().optional(),
  // 发票：1 电子普票 / 2 增值税专票；不传表示不开票
  invoice: z
    .object({
      type: z.union([z.literal(1), z.literal(2)]),
      title: z.string().trim().min(1, '请填写发票抬头').max(100),
      taxNo: z.string().trim().max(50).optional(),
      email: z.union([z.string().trim().email('邮箱格式不正确'), z.literal('')]).optional(),
      content: z.string().trim().max(255).optional(),
    })
    .refine((v) => v.type !== 2 || Boolean(v.taxNo), { message: '专票必须填写税号', path: ['taxNo'] })
    .optional(),
})

export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = createSchema.parse(req.body ?? {})
  sendOk(res, await orderService.createOrder(req.auth!.uid, input), '下单成功')
})

export const list = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status ? toInt(req.query.status, 0) : undefined
  sendOk(
    res,
    await orderService.listOrders(
      req.auth!.uid,
      status,
      toInt(req.query.page, 1),
      toInt(req.query.pageSize, 10),
    ),
  )
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

export const rebuy = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await orderService.rebuyOrder(req.auth!.uid, req.params.orderNo), '商品已加入购物车')
})

export const remindShip = asyncHandler(async (req: Request, res: Response) => {
  const result = await orderService.remindShip(req.auth!.uid, req.params.orderNo)
  sendOk(res, result, result.reminded ? '已提醒商家尽快发货' : '已提醒过啦，请耐心等待')
})

export const logistics = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await orderService.getOrderLogistics(req.auth!.uid, req.params.orderNo))
})

export const remove = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await orderService.deleteOrder(req.auth!.uid, req.params.orderNo), '订单已删除')
})
