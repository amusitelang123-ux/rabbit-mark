import type { Request, Response } from 'express'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import { listActiveSeckills } from '../../services/seckillService'

/** 进行中的秒杀活动（含商品、剩余库存、结束时间戳） */
export const active = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await listActiveSeckills())
})
