import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as settingsService from '../../services/settingsService'

export const list = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await settingsService.listSettings())
})

export const update = asyncHandler(async (req: Request, res: Response) => {
  const { entries } = z
    .object({
      entries: z
        .array(z.object({ key: z.string().min(1), value: z.string().max(2000) }))
        .min(1, '没有需要保存的配置项'),
    })
    .parse(req.body)
  sendOk(res, await settingsService.updateSettings(entries), '配置已保存')
})
