import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as adminService from '../../services/adminService'
import { toInt } from '../../utils/helpers'

const adminSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(50),
  realName: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
  roleId: z.number().int().positive().optional(),
  status: z.number().int().min(0).max(1).optional(),
})

const roleSchema = z.object({
  name: z.string().min(1).max(50),
  code: z.string().min(2).max(50),
  description: z.string().max(255).optional(),
  status: z.number().int().min(0).max(1).optional(),
})

export const admins = asyncHandler(async (req: Request, res: Response) => {
  sendOk(res, await adminService.listAdmins(toInt(req.query.page, 1), toInt(req.query.pageSize, 10)))
})

export const createAdmin = asyncHandler(async (req: Request, res: Response) => {
  const input = adminSchema.parse(req.body)
  sendOk(res, await adminService.createAdmin(input), '管理员已创建')
})

export const updateAdmin = asyncHandler(async (req: Request, res: Response) => {
  const input = adminSchema.omit({ username: true, password: true }).partial().parse(req.body)
  sendOk(res, await adminService.updateAdmin(toInt(req.params.id, 0), input), '管理员已更新')
})

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { password } = z.object({ password: z.string().min(6).max(50) }).parse(req.body)
  sendOk(res, await adminService.resetAdminPassword(toInt(req.params.id, 0), password), '密码已重置')
})

export const removeAdmin = asyncHandler(async (req: Request, res: Response) => {
  await adminService.deleteAdmin(toInt(req.params.id, 0), req.auth!.uid)
  sendOk(res, null, '管理员已删除')
})

export const roles = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await adminService.listRoles())
})

export const createRole = asyncHandler(async (req: Request, res: Response) => {
  const input = roleSchema.parse(req.body)
  sendOk(res, await adminService.createRole(input), '角色已创建')
})

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const input = roleSchema.omit({ code: true }).partial().parse(req.body)
  sendOk(res, await adminService.updateRole(toInt(req.params.id, 0), input), '角色已更新')
})

export const removeRole = asyncHandler(async (req: Request, res: Response) => {
  await adminService.deleteRole(toInt(req.params.id, 0))
  sendOk(res, null, '角色已删除')
})

export const setRolePermissions = asyncHandler(async (req: Request, res: Response) => {
  const { permissionIds } = z.object({ permissionIds: z.array(z.number().int().positive()) }).parse(req.body)
  sendOk(res, await adminService.setRolePermissions(toInt(req.params.id, 0), permissionIds), '权限已分配')
})

export const permissions = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, await adminService.listPermissions())
})

export const logs = asyncHandler(async (req: Request, res: Response) => {
  sendOk(
    res,
    await adminService.listAdminLogs(
      toInt(req.query.page, 1),
      toInt(req.query.pageSize, 20),
      req.query.module ? String(req.query.module) : undefined,
    ),
  )
})
