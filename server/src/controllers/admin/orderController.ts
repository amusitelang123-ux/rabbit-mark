import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as orderService from '../../services/orderService'
import { ORDER_STATUS_TEXT } from '../../constants'
import { toInt } from '../../utils/helpers'

const shipSchema = z.object({
  company: z.string().min(1).max(50),
  trackingNo: z.string().min(1).max(64),
  traces: z.array(z.object({ time: z.string(), text: z.string() })).optional(),
})

const closeSchema = z.object({ reason: z.string().min(1).max(255) })
const remarkSchema = z.object({ remark: z.string().max(255) })

export const list = asyncHandler(async (req: Request, res: Response) => {
  sendOk(
    res,
    await orderService.listAllOrders({
      orderNo: req.query.orderNo ? String(req.query.orderNo) : undefined,
      userId: req.query.userId ? toInt(req.query.userId, 0) : undefined,
      status: req.query.status ? toInt(req.query.status, 0) : undefined,
      onlyReminded: req.query.onlyReminded === 'true' || req.query.onlyReminded === '1',
      startTime: req.query.startTime ? String(req.query.startTime) : undefined,
      endTime: req.query.endTime ? String(req.query.endTime) : undefined,
      page: toInt(req.query.page, 1),
      pageSize: toInt(req.query.pageSize, 10),
    }),
  )
})

export const detail = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await orderService.getOrderAdmin(req.params.orderNo))
})

export const ship = asyncHandler(async (req: Request, res: Response) => {
  const input = shipSchema.parse(req.body)
  sendOk(
    res,
    await orderService.shipOrder(req.params.orderNo, input, `admin:${req.auth!.uid}`),
    '发货成功',
  )
})

export const close = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = closeSchema.parse(req.body)
  sendOk(res, await orderService.closeOrder(req.params.orderNo, reason, `admin:${req.auth!.uid}`), '订单已关闭')
})

/** 批量发货：请求体传 [{ orderNo, company, trackingNo }] */
export const batchShip = asyncHandler(async (req: Request, res: Response) => {
  const { orders } = z
    .object({
      orders: z
        .array(
          z.object({
            orderNo: z.string().min(1),
            company: z.string().min(1, '请填写物流公司'),
            trackingNo: z.string().min(1, '请填写运单号'),
          }),
        )
        .min(1, '请先选择订单'),
    })
    .parse(req.body)
  sendOk(res, await orderService.batchShip(orders, `admin:${req.auth!.uid}`), '批量发货完成')
})

export const remark = asyncHandler(async (req: Request, res: Response) => {
  const { remark } = remarkSchema.parse(req.body)
  sendOk(
    res,
    await orderService.updateAdminRemark(req.params.orderNo, remark, `admin:${req.auth!.uid}`),
    '备注已更新',
  )
})

const PAY_TYPE_TEXT: Record<number, string> = { 1: '微信支付', 2: '支付宝', 3: '余额', 4: '沙箱支付' }

/** 导出订单 CSV（带 BOM，Excel 可直接打开） */
export const exportCsv = asyncHandler(async (req: Request, res: Response) => {
  const list = await orderService.exportOrders({
    orderNo: req.query.orderNo ? String(req.query.orderNo) : undefined,
    userId: req.query.userId ? toInt(req.query.userId, 0) : undefined,
    status: req.query.status ? toInt(req.query.status, 0) : undefined,
    onlyReminded: req.query.onlyReminded === 'true' || req.query.onlyReminded === '1',
    startTime: req.query.startTime ? String(req.query.startTime) : undefined,
    endTime: req.query.endTime ? String(req.query.endTime) : undefined,
  })

  const header = [
    '订单号',
    '下单时间',
    '状态',
    '收货人',
    '收货电话',
    '收货地址',
    '商品件数',
    '商品总额',
    '优惠抵扣',
    '运费',
    '实付金额',
    '支付方式',
    '支付时间',
    '发货时间',
  ]

  const rows = list.map((o) => [
    o.orderNo,
    o.createdAt,
    ORDER_STATUS_TEXT[o.status] ?? '',
    o.receiverName,
    o.receiverPhone,
    o.receiverAddress,
    String(o.items.reduce((s, i) => s + i.quantity, 0)),
    o.totalAmount.toFixed(2),
    o.couponAmount.toFixed(2),
    o.freightAmount.toFixed(2),
    o.payAmount.toFixed(2),
    o.payType ? PAY_TYPE_TEXT[o.payType] ?? '' : '未支付',
    o.payTime ?? '',
    o.shipTime ?? '',
  ])

  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`
  const csv = '\uFEFF' + [header, ...rows].map((r) => r.map(escape).join(',')).join('\r\n')

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="orders-${Date.now()}.csv"`)
  res.send(csv)
})
