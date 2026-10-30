import fs from 'fs'
import path from 'path'
import { randomBytes } from 'crypto'
import multer from 'multer'
import type { Request } from 'express'
import { config } from '../config'
import { AppError } from '../utils/errors'
import { ERR } from '../constants'

const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const AVATAR_MAX_SIZE = 2 * 1024 * 1024

function ensureDir(dir: string): string {
  const abs = path.resolve(dir)
  fs.mkdirSync(abs, { recursive: true })
  return abs
}

function buildUploader(subDir: string, maxSize: number) {
  const dest = ensureDir(path.join(config.upload.dir, subDir))
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
      cb(null, `${Date.now()}_${randomBytes(6).toString('hex')}${ext}`)
    },
  })
  return multer({
    storage,
    limits: { fileSize: maxSize },
    fileFilter: (_req: Request, file, cb) => {
      if (!IMAGE_MIME.includes(file.mimetype)) {
        return cb(new AppError('仅支持 jpg/png/webp/gif 图片', ERR.PARAM))
      }
      cb(null, true)
    },
  })
}

/** 用户头像上传：字段名 file，单文件，最大 2MB */
export const avatarUpload = buildUploader('avatars', AVATAR_MAX_SIZE)

/** 商品图片上传：字段名 file，单文件，最大 5MB */
export const productUpload = buildUploader('products', 5 * 1024 * 1024)

/** 评价晒单图片上传：字段名 file，单文件，最大 5MB */
export const commentUpload = buildUploader('comments', 5 * 1024 * 1024)

/** 售后凭证上传：字段名 file，单文件，最大 5MB */
export const refundUpload = buildUploader('refunds', 5 * 1024 * 1024)

/** 将上传文件名拼接为可访问 URL */
export function toUploadUrl(subDir: string, filename: string): string {
  return `${config.upload.baseUrl.replace(/\/$/, '')}/${subDir}/${filename}`
}
