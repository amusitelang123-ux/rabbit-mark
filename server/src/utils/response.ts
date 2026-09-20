import type { Response } from 'express'
import { ERR } from '../constants'

export interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
  timestamp: number
}

export function ok<T>(data: T, message = 'success'): ApiEnvelope<T> {
  return { code: ERR.SUCCESS, message, data, timestamp: Date.now() }
}

export function fail(code: number, message: string): ApiEnvelope<null> {
  return { code, message, data: null, timestamp: Date.now() }
}

export function sendOk<T>(res: Response, data: T, message = 'success', httpStatus = 200): void {
  res.status(httpStatus).json(ok(data, message))
}

export interface PageData<T> {
  list: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function buildPage<T>(list: T[], page: number, pageSize: number, total: number): PageData<T> {
  return {
    list,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}
