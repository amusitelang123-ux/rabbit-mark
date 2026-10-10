import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as financeService from '../../services/financeService'
import { toInt } from '../../utils/helpers'

export const records = asyncHandler(async (req: Request, res: Response) => {
  sendOk(
    res,
    await financeService.listRecords({
      type: req.query.type !== undefined ? toInt(req.query.type, 0) : undefined,
      startTime: req.query.startTime ? String(req.query.startTime) : undefined,
      endTime: req.query.endTime ? String(req.query.endTime) : undefined,
      page: toInt(req.query.page, 1),
      pageSize: toInt(req.query.pageSize, 10),
    }),
  )
})

export const reconciliation = asyncHandler(async (req: Request, res: Response) => {
  sendOk(
    res,
    await financeService.reconciliation({
      startTime: req.query.startTime ? String(req.query.startTime) : undefined,
      endTime: req.query.endTime ? String(req.query.endTime) : undefined,
    }),
  )
})

export const invoices = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await financeService.listInvoices(toInt(req.query.page, 1), toInt(req.query.pageSize, 10)))
})

export const setInvoiceStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = z.object({ status: z.number().int().min(0).max(1) }).parse(req.body)
  sendOk(res, await financeService.setInvoiceStatus(toInt(req.params.id, 0), status as 0 | 1), '发票状态已更新')
})
