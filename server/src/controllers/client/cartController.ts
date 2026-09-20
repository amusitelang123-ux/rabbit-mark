import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as cartService from '../../services/cartService'

const addSchema = z.object({
  productId: z.number().int().positive(),
  skuId: z.number().int().positive(),
  quantity: z.number().int().positive().default(1),
})

const updateSchema = z.object({
  quantity: z.number().int().positive().optional(),
  selected: z.boolean().optional(),
})

export const list = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await cartService.getCart(req.auth!.uid))
})

export const add = asyncHandler(async (req: Request, res: Response) => {
  const input = addSchema.parse(req.body)
  sendOk(res, await cartService.addToCart(req.auth!.uid, input), '已加入购物车')
})

export const update = asyncHandler(async (req: Request, res: Response) => {
  const input = updateSchema.parse(req.body)
  sendOk(res, await cartService.updateCartItem(req.auth!.uid, Number(req.params.id), input))
})

export const selectAll = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await cartService.selectAll(req.auth!.uid, Boolean(req.body?.selected)))
})

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const ids = z.array(z.number().int().positive()).parse(req.body?.ids ?? [])
  sendOk(res, await cartService.removeCartItems(req.auth!.uid, ids), '已删除')
})
