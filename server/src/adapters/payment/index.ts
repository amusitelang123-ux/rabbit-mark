import { config } from '../../config'
import { sandboxAdapter } from './sandbox'
import type { PayChannel, PaymentAdapter } from './types'

const registry: Record<string, PaymentAdapter> = {
  sandbox: sandboxAdapter,
}

/**
 * 按配置返回支付适配器。首批所有渠道统一路由到 sandbox 实现，
 * channel 仅用于记录与展示；接入真实网关时在 registry 中注册即可。
 */
export function getPaymentAdapter(_channel: PayChannel): PaymentAdapter {
  return registry[config.adapter.pay] ?? sandboxAdapter
}

export * from './types'
