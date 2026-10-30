import type { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/asyncHandler'
import { sendOk } from '../../utils/response'
import * as aiChatService from '../../services/aiChatService'

/** 客户端 AI 智能客服接口 */

const chatSchema = z.object({
  message: z.string().trim().min(1, '请输入要咨询的问题').max(500, '单条消息不能超过 500 字'),
  conversationId: z.number().int().positive().optional(),
  orderNo: z.string().trim().max(32).optional(),
  stream: z.boolean().optional().default(true),
})

const listQuerySchema = z.object({
  orderNo: z.string().trim().max(32).optional(),
})

const transferSchema = z.object({
  note: z.string().trim().max(500).optional(),
})

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
})

/** AI 能力开关与欢迎语（公开，未登录也能拿到展示配置） */
export const config = asyncHandler(async (_req: Request, res: Response) => {
  sendOk(res, aiChatService.publicConfig())
})

/**
 * 对话接口：
 * - stream=true（默认）走 SSE，事件名即 type：meta / thinking / delta / tool / done / error
 * - stream=false 走普通 JSON，便于 curl 与自动化测试
 */
export async function chat(req: Request, res: Response, next: NextFunction): Promise<void> {
  let body: z.infer<typeof chatSchema>
  try {
    body = chatSchema.parse(req.body)
  } catch (error) {
    next(error)
    return
  }

  const controller = new AbortController()
  // 注意：不能监听 req 的 close —— 请求体读完后它就会触发，会把正常请求误判为断开。
  // 只有响应未正常结束时的 close 才是客户端断开，需要中止上游模型调用。
  res.on('close', () => {
    if (!res.writableEnded) controller.abort()
  })

  const payload = {
    userId: req.auth!.uid,
    message: body.message,
    conversationId: body.conversationId,
    orderNo: body.orderNo,
    signal: controller.signal,
  }

  if (!body.stream) {
    try {
      const outcome = await aiChatService.chat({ ...payload, emit: () => undefined })
      sendOk(res, outcome)
    } catch (error) {
      next(error)
    }
    return
  }

  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()

  let connected = true
  let emittedError = false

  const send = (event: string, data: unknown): void => {
    if (!connected || res.writableEnded) return
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  res.on('close', () => {
    connected = false
  })

  try {
    await aiChatService.chat({
      ...payload,
      emit: (event) => {
        if (event.type === 'error') emittedError = true
        send(event.type, event)
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI 客服暂时不可用'
    if (!emittedError) send('error', { type: 'error', message })
    if (!res.writableEnded) {
      // 头部已发送，无法再走全局错误中间件；直接结束连接
      res.end()
    }
    console.error('[ai] chat failed', message)
    return
  }

  if (!res.writableEnded) res.end()
}

/** 我的 AI 会话（可按订单过滤），用于弹窗重开时恢复上下文 */
export const conversations = asyncHandler(async (req: Request, res: Response) => {
  const query = listQuerySchema.parse(req.query)
  sendOk(res, await aiChatService.listConversations(req.auth!.uid, query.orderNo))
})

export const messages = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idSchema.parse(req.params)
  sendOk(res, await aiChatService.getMessages(req.auth!.uid, id))
})

/** 转人工：把最近对话摘要写成留言工单，进入现有客服处理流 */
export const transfer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = idSchema.parse(req.params)
  const body = transferSchema.parse(req.body)
  const result = await aiChatService.transferToHuman(req.auth!.uid, id, body.note)
  sendOk(res, result, '已转人工，客服会尽快回复')
})
