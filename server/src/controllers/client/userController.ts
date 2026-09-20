import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { toUploadUrl } from '../../middlewares/upload'
import { sendOk } from '../../utils/response'
import { AppError } from '../../utils/errors'
import * as userService from '../../services/userService'
import { toInt } from '../../utils/helpers'

const profileSchema = z.object({
  nickname: z.string().max(50).optional(),
  avatar: z.string().max(255).optional(),
  gender: z.number().int().min(0).max(2).optional(),
  birthday: z.string().optional(),
})

const addressSchema = z.object({
  receiver: z.string().min(1).max(50),
  phone: z.string().min(1).max(20),
  province: z.string().min(1),
  city: z.string().min(1),
  district: z.string().min(1),
  detail: z.string().min(1).max(255),
  isDefault: z.boolean().optional(),
})

export const profile = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await userService.getProfile(req.auth!.uid))
})

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const input = profileSchema.parse(req.body)
  sendOk(res, await userService.updateProfile(req.auth!.uid, input), '资料已更新')
})

export const uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new AppError('请选择要上传的图片')
  const url = toUploadUrl('avatars', req.file.filename)
  sendOk(res, await userService.updateAvatar(req.auth!.uid, url), '头像已更新')
})

export const addresses = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await userService.listAddresses(req.auth!.uid))
})

export const createAddress = asyncHandler(async (req: Request, res: Response) => {
  const input = addressSchema.parse(req.body)
  sendOk(res, await userService.createAddress(req.auth!.uid, input), '地址已添加')
})

export const updateAddress = asyncHandler(async (req: Request, res: Response) => {
  const input = addressSchema.partial().parse(req.body)
  sendOk(res, await userService.updateAddress(req.auth!.uid, toInt(req.params.id, 0), input), '地址已更新')
})

export const deleteAddress = asyncHandler(async (req: Request, res: Response) => {
  await userService.deleteAddress(req.auth!.uid, toInt(req.params.id, 0))
  sendOk(res, null, '地址已删除')
})

export const favorites = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await userService.listFavorites(req.auth!.uid))
})

export const toggleFavorite = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await userService.toggleFavorite(req.auth!.uid, toInt(req.params.productId, 0)))
})

export const footprints = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await userService.listFootprints(req.auth!.uid))
})
