import { config } from '../../config'
import { deepseekAdapter } from './deepseek'
import { mockAiAdapter } from './mock'
import type { AiAdapter } from './types'

let warned = false

/**
 * 选择 AI 适配器：
 * - AI_ENABLED=false          → 关闭（由调用方抛错）
 * - AI_ADAPTER=mock           → 演示模式
 * - AI_ADAPTER=deepseek + Key → 真实调用
 * - Key 缺失                  → 自动降级为 mock，保证演示不中断
 */
export function getAiAdapter(): AiAdapter {
  if (!config.ai.enabled) return mockAiAdapter
  if (config.ai.adapter === 'mock') return mockAiAdapter
  if (config.ai.adapter === 'deepseek') {
    if (deepseekAdapter.configured) return deepseekAdapter
    if (!warned) {
      warned = true
      console.warn('[ai] 未配置 DEEPSEEK_API_KEY，已降级为演示模式（mock 适配器）')
    }
    return mockAiAdapter
  }
  return mockAiAdapter
}

/** 当前实际生效的模式，用于前端标识与后台展示 */
export function aiMode(): { mode: 'deepseek' | 'mock'; model: string; usingFallback: boolean } {
  const adapter = getAiAdapter()
  return {
    mode: adapter.name === 'deepseek' ? 'deepseek' : 'mock',
    model: adapter.model,
    usingFallback: config.ai.adapter !== 'mock' && adapter.name === 'mock',
  }
}

export * from './types'
