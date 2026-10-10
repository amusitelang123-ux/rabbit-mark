import { Setting } from '../models'
import { AppError } from '../utils/errors'
import { formatDate } from '../utils/serializers'

/** 配置读取带 30s 缓存，避免每次请求都查库 */
const TTL_MS = 30_000
let cache: { map: Record<string, string>; at: number } | null = null

export async function loadSettingMap(force = false): Promise<Record<string, string>> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.map

  const rows = await Setting.findAll()
  const map: Record<string, string> = {}
  for (const row of rows) map[row.configKey] = row.configValue ?? ''
  cache = { map, at: Date.now() }
  return map
}

function invalidate() {
  cache = null
}

/** 后台：全部配置项 */
export async function listSettings() {
  const rows = await Setting.findAll({
    order: [
      ['configGroup', 'ASC'],
      ['id', 'ASC'],
    ],
  })
  return rows.map((row) => ({
    id: Number(row.id),
    group: row.configGroup,
    key: row.configKey,
    value: row.configValue ?? '',
    remark: row.remark ?? '',
    updatedAt: formatDate(row.updatedAt),
  }))
}

/** 后台：按 key 批量保存 */
export async function updateSettings(entries: { key: string; value: string }[]) {
  if (!entries.length) throw new AppError('没有需要保存的配置项')

  for (const entry of entries) {
    const row = await Setting.findOne({ where: { configKey: entry.key } })
    if (!row) throw AppError.notFound(`配置项「${entry.key}」不存在`)
    row.configValue = entry.value
    await row.save()
  }
  invalidate()
  return listSettings()
}

export interface PublicSettings {
  siteName: string
  logo: string
  slogan: string
  servicePhone: string
  serviceEmail: string
  serviceHours: string
}

/** 客户端：仅暴露公开配置（站点与客服信息） */
export async function publicSettings(): Promise<PublicSettings> {
  const map = await loadSettingMap()
  return {
    siteName: map['site.name'] || '小兔鲜',
    logo: map['site.logo'] || '',
    slogan: map['site.slogan'] || '',
    servicePhone: map['service.phone'] || '',
    serviceEmail: map['service.email'] || '',
    serviceHours: map['service.hours'] || '',
  }
}
