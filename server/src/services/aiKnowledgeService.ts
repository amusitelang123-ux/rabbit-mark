import { Op } from 'sequelize'
import { AiKbChunk, Faq, FreightTemplate, LogisticsCompany, Notice } from '../models'
import { AI_POLICIES } from './aiPolicies'

/**
 * 知识库与检索。
 *
 * DeepSeek 目前不提供 embedding 接口，因此这里用「中文二元组 + BM25」做词法检索：
 * - 对 FAQ / 公告 / 物流 / 运费模板 / 平台规则 建立切片
 * - 检索完全在 Node 内存中完成（语料百级，耗时 < 5ms），不引入向量库
 * - 后续接入 embedding 服务时，只需替换 searchKnowledge 的召回实现
 */

const CACHE_TTL_MS = 60_000
const K1 = 1.2
const B = 0.75
/** 低于该分数视为未命中，交给模型说明「没有查到」并建议转人工 */
const MIN_SCORE = 1.6

const STOPWORDS = new Set([
  '什么',
  '怎么',
  '可以',
  '我的',
  '请问',
  '一下',
  '这个',
  '那个',
  '是否',
  '如何',
  '多久',
  '哪里',
  '为什',
  '么样',
  '能不',
  '帮我',
  '你们',
  '咱们',
  '还有',
])

export interface KnowledgeHit {
  chunkId: number
  sourceType: string
  sourceId: number | null
  title: string
  content: string
  score: number
  snippet: string
}

interface KnowledgeDoc {
  chunkId: number
  sourceType: string
  sourceId: number | null
  title: string
  content: string
  tf: Map<string, number>
  length: number
}

interface KnowledgeIndex {
  docs: KnowledgeDoc[]
  idf: Map<string, number>
  avgdl: number
  at: number
}

let index: KnowledgeIndex | null = null
let syncing: Promise<SyncResult> | null = null

export interface SyncResult {
  total: number
  byType: Record<string, number>
  syncedAt: string
}

/** 中文二元组 + 英文/数字词；过滤无意义二元组 */
export function tokenize(text: string): string[] {
  const tokens: string[] = []
  const normalized = text.toLowerCase()

  for (const match of normalized.matchAll(/[a-z][a-z0-9]{1,}/g)) tokens.push(match[0])
  for (const run of normalized.match(/[\u4e00-\u9fa5]+/g) ?? []) {
    if (run.length === 1) continue
    for (let i = 0; i < run.length - 1; i += 1) {
      const bigram = run.slice(i, i + 2)
      if (!STOPWORDS.has(bigram)) tokens.push(bigram)
    }
  }
  return tokens
}

function topKeywords(tf: Map<string, number>, limit = 8): string {
  return [...tf.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([token]) => token)
    .join(' ')
    .slice(0, 500)
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildDocs(rows: AiKbChunk[]): KnowledgeDoc[] {
  return rows.map((row) => {
    const titleTokens = tokenize(row.title)
    const contentTokens = tokenize(`${row.title} ${row.content}`)
    const tf = new Map<string, number>()
    // 标题命中权重加倍，避免正文里的长句淹没关键主题
    for (const token of titleTokens) tf.set(token, (tf.get(token) ?? 0) + 2)
    for (const token of contentTokens) tf.set(token, (tf.get(token) ?? 0) + 1)

    let length = 0
    tf.forEach((value) => {
      length += value
    })

    return {
      chunkId: Number(row.id),
      sourceType: row.sourceType,
      sourceId: row.sourceId === null || row.sourceId === undefined ? null : Number(row.sourceId),
      title: row.title,
      content: row.content,
      tf,
      length: Math.max(1, length),
    }
  })
}

function buildIndex(docs: KnowledgeDoc[]): KnowledgeIndex {
  const df = new Map<string, number>()
  let totalLength = 0
  for (const doc of docs) {
    totalLength += doc.length
    for (const token of doc.tf.keys()) df.set(token, (df.get(token) ?? 0) + 1)
  }

  const idf = new Map<string, number>()
  const total = docs.length
  df.forEach((count, token) => {
    idf.set(token, Math.log(1 + (total - count + 0.5) / (count + 0.5)))
  })

  return {
    docs,
    idf,
    avgdl: total ? totalLength / total : 1,
    at: Date.now(),
  }
}

async function ensureIndex(): Promise<KnowledgeIndex> {
  if (index && Date.now() - index.at < CACHE_TTL_MS) return index

  let rows = await AiKbChunk.findAll({ where: { status: 1 } })
  if (!rows.length) {
    await syncKnowledgeBase()
    rows = await AiKbChunk.findAll({ where: { status: 1 } })
  }
  index = buildIndex(buildDocs(rows))
  return index
}

/** 知识库同步：把 FAQ / 公告 / 物流 / 运费模板与平台规则写入切片表（幂等） */
export async function syncKnowledgeBase(): Promise<SyncResult> {
  if (syncing) return syncing

  syncing = (async () => {
    const [faqs, notices, companies, templates] = await Promise.all([
      Faq.findAll({ where: { status: 1 } }),
      Notice.findAll({ where: { status: 1 } }),
      LogisticsCompany.findAll({ where: { status: 1 } }),
      FreightTemplate.findAll({ where: { status: 1 } }),
    ])

    const groups: Record<string, { sourceId: number; title: string; content: string }[]> = {
      faq: faqs.map((faq) => ({
        sourceId: Number(faq.id),
        title: `常见问题 · ${faq.category}：${faq.question}`,
        content: `问：${faq.question}\n答：${faq.answer ?? '暂未填写答案'}`,
      })),
      notice: notices.map((notice) => {
        const body = stripHtml(notice.content ?? '')
        return {
          sourceId: Number(notice.id),
          title: `公告：${notice.title}`,
          content: `${notice.title}\n${body}`.slice(0, 2000),
        }
      }),
      logistics: companies.map((company) => ({
        sourceId: Number(company.id),
        title: `物流公司：${company.name}`,
        content: `编码：${company.code}；客服电话：${company.phone ?? '未提供'}`,
      })),
      freight: templates.map((template) => ({
        sourceId: Number(template.id),
        title: `运费模板：${template.name}${template.isDefault ? '（默认）' : ''}`,
        content: `满 ${Number(template.freeAmount)} 元包邮；未达门槛收取 ${Number(template.baseFreight)} 元运费。`,
      })),
      policy: AI_POLICIES.map((policy, itemIndex) => ({
        sourceId: itemIndex + 1,
        title: `平台规则：${policy.title}`,
        content: policy.content,
      })),
    }

    const byType: Record<string, number> = {}
    for (const [sourceType, items] of Object.entries(groups)) {
      byType[sourceType] = items.length
      if (!items.length) {
        await AiKbChunk.destroy({ where: { sourceType } })
        continue
      }

      const rows = items.map((item) => {
        const tf = new Map<string, number>()
        for (const token of tokenize(`${item.title} ${item.content}`)) {
          tf.set(token, (tf.get(token) ?? 0) + 1)
        }
        return {
          sourceType,
          sourceId: item.sourceId,
          title: item.title.slice(0, 255),
          content: item.content,
          keywords: topKeywords(tf),
          status: 1,
        }
      })

      await AiKbChunk.bulkCreate(rows, {
        updateOnDuplicate: ['title', 'content', 'keywords', 'status'],
      })
      await AiKbChunk.destroy({
        where: {
          sourceType,
          sourceId: { [Op.notIn]: items.map((item) => item.sourceId) },
        },
      })
    }

    const total = await AiKbChunk.count({ where: { status: 1 } })
    index = null
    return { total, byType, syncedAt: new Date().toISOString() }
  })()

  try {
    return await syncing
  } finally {
    syncing = null
  }
}

/** BM25 检索；无命中返回空数组，由调用方决定「转人工」话术 */
export async function searchKnowledge(question: string, limit = 4): Promise<KnowledgeHit[]> {
  const queryTokens = [...new Set(tokenize(question))]
  if (!queryTokens.length) return []

  const current = await ensureIndex()
  if (!current.docs.length) return []

  const scored = current.docs.map((doc) => {
    let score = 0
    for (const token of queryTokens) {
      const tf = doc.tf.get(token)
      if (!tf) continue
      const idf = current.idf.get(token) ?? 0
      const denom = tf + K1 * (1 - B + (B * doc.length) / current.avgdl)
      score += idf * ((tf * (K1 + 1)) / denom)
    }
    return { doc, score }
  })

  return scored
    .filter((item) => item.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ doc, score }) => ({
      chunkId: doc.chunkId,
      sourceType: doc.sourceType,
      sourceId: doc.sourceId,
      title: doc.title,
      content: doc.content,
      score: Math.round(score * 100) / 100,
      snippet: doc.content.slice(0, 160),
    }))
}

/** 仅供测试/后台观察：当前索引规模 */
export async function knowledgeStats(): Promise<{ chunks: number; indexedAt: string | null }> {
  const chunks = await AiKbChunk.count({ where: { status: 1 } })
  return { chunks, indexedAt: index ? new Date(index.at).toISOString() : null }
}
