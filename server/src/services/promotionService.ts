import { Op, type Transaction } from 'sequelize'
import { Promotion } from '../models'
import { PROMOTION_TYPE } from '../constants'

export interface PromotionThreshold {
  amount: number
  reduce: number
}

export interface PromotionRule {
  thresholds: PromotionThreshold[]
}

/** 安全解析 rule_json，兼容满赠等其它结构 */
export function parseRule(promotion: Promotion): PromotionRule {
  const rule = promotion.ruleJson as Partial<PromotionRule> | null
  const thresholds = Array.isArray(rule?.thresholds) ? rule!.thresholds : []
  return {
    thresholds: thresholds
      .map((t) => ({ amount: Number(t?.amount ?? 0), reduce: Number(t?.reduce ?? 0) }))
      .filter((t) => t.amount > 0 && t.reduce > 0)
      .sort((a, b) => a.amount - b.amount),
  }
}

/** 当前生效的满减/促销活动 */
export async function listActivePromotions(transaction?: Transaction) {
  const now = new Date()
  const rows = await Promotion.findAll({
    where: { status: 1, startTime: { [Op.lte]: now }, endTime: { [Op.gte]: now } },
    order: [['id', 'DESC']],
    transaction,
  })
  return rows.map((p) => ({
    id: Number(p.id),
    name: p.name,
    type: p.type,
    endTime: p.endTime,
    ...parseRule(p),
  }))
}

export interface PromotionMatch {
  discount: number
  promotionId: number | null
  promotionName: string
  threshold: number
}

/**
 * 计算满减最优抵扣：在满足门槛的档位中取「减免最大」的一档。
 * 多个活动并存时跨活动取全局最优，不做叠加。
 */
export async function calcPromotionDiscount(
  goodsTotal: number,
  transaction?: Transaction,
): Promise<PromotionMatch> {
  const promotions = await listActivePromotions(transaction)
  let best: PromotionMatch = { discount: 0, promotionId: null, promotionName: '', threshold: 0 }

  for (const p of promotions) {
    if (p.type !== PROMOTION_TYPE.FULL_REDUCE) continue
    for (const t of p.thresholds) {
      if (goodsTotal >= t.amount && t.reduce > best.discount) {
        best = { discount: t.reduce, promotionId: p.id, promotionName: p.name, threshold: t.amount }
      }
    }
  }
  return best
}
