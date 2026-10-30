import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as refundService from '../../services/refundService'
import { toInt } from '../../utils/helpers'

export const list = asyncHandler(async (req: Request, res: Response) => {
  sendOk(
    res,
    await refundService.listRefunds({
      status: req.query.status !== undefined ? toInt(req.query.status, 0) : undefined,
      orderNo: req.query.orderNo ? String(req.query.orderNo) : undefined,
      page: toInt(req.query.page, 1),
      pageSize: toInt(req.query.pageSize, 10),
    }),
  )
})

export const audit = asyncHandler(async (req: Request, res: Response) => {
  const input = z
    .object({ approve: z.boolean(), remark: z.string().max(255).optional() })
    .parse(req.body)
  sendOk(
    res,
    await refundService.auditRefund(toInt(req.params.id, 0), input, `admin:${req.auth!.uid}`),
    input.approve ? '已同意' : '已拒绝',
  )
})

export const receive = asyncHandler(async (req: Request, res: Response) => {
  const input = z.object({ remark: z.string().max(255).optional() }).parse(req.body ?? {})
  sendOk(
    res,
    await refundService.receiveReturn(toInt(req.params.id, 0), `admin:${req.auth!.uid}`, input.remark),
    '已确认收到退货，售后完成',
  )
})
