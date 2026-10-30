import { Op, type Transaction } from 'sequelize'
import { Product, ProductSku, Promotion } from '../models'
import { PROMOTION_TYPE } from '../constants'

export interface PromotionThreshold {
  amount: number
  reduce: number
  /** 满赠：赠品 SPU/SKU 与数量 */
  giftProductId?: number
  giftSkuId?: number
  giftQuantity?: number
}

/** 客户端展示用：赠品名称与图片（由服务端按 SKU 反查） */
export interface PromotionThresholdDto extends PromotionThreshold {
  giftName?: string
  giftImage?: string
}

export interface PromotionRule {
  thresholds: PromotionThreshold[]
}

/** 安全解析 rule_json：满减 reduce>0；满赠以 giftSkuId + giftQuantity 为准 */
export function parseRule(promotion: Promotion): PromotionRule {
  const rule = promotion.ruleJson as Partial<PromotionRule> | null
  const thresholds = Array.isArray(rule?.thresholds) ? rule!.thresholds : []
  return {
    thresholds: thresholds
      .map((t) => ({
        amount: Number(t?.amount ?? 0),
        reduce: Number(t?.reduce ?? 0),
        ...(t?.giftProductId ? { giftProductId: Number(t.giftProductId) } : {}),
        ...(t?.giftSkuId ? { giftSkuId: Number(t.giftSkuId) } : {}),
        ...(t?.giftQuantity ? { giftQuantity: Number(t.giftQuantity) } : {}),
      }))
      .filter((t) => t.amount > 0 && (t.reduce > 0 || (t.giftSkuId && t.giftQuantity)))
      .sort((a, b) => a.amount - b.amount),
  }
}

/** 当前生效的满减/满赠活动 */
export async function listActivePromotions(transaction?: Transaction) {
  const now = new Date()
  const rows = await Promotion.findAll({
    where: { status: 1, startTime: { [Op.lte]: now }, endTime: { [Op.gte]: now } },
    order: [['id', 'DESC']],
    transaction,
  })

  const giftSkuIds = [
    ...new Set(
      rows
        .filter((p) => p.type === PROMOTION_TYPE.FULL_GIFT)
        .flatMap((p) => parseRule(p).thresholds.map((t) => t.giftSkuId))
        .filter((id): id is number => Boolean(id)),
    ),
  ]
  const skuMap = new Map<number, ProductSku & { product?: Product | null }>()
  if (giftSkuIds.length) {
    const skus = await ProductSku.findAll({
      where: { id: { [Op.in]: giftSkuIds } },
      include: [{ model: Product, as: 'product' }],
      transaction,
    })
    skus.forEach((sku) => skuMap.set(Number(sku.id), sku as ProductSku & { product?: Product | null }))
  }

  return rows.map((p) => {
    const rule = parseRule(p)
    const thresholds: PromotionThresholdDto[] = rule.thresholds.map((t) => {
      if (!t.giftSkuId) return t
      const sku = skuMap.get(t.giftSkuId)
      return {
        ...t,
        giftName: sku?.product?.name ?? '',
        giftImage: sku?.image || sku?.product?.mainImage || '',
      }
    })
    return {
      id: Number(p.id),
      name: p.name,
      type: p.type,
      endTime: p.endTime,
      thresholds,
    }
  })
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

export interface GiftMatch {
  promotionId: number
  promotionName: string
  threshold: number
  productId: number | null
  skuId: number
  quantity: number
}

/**
 * 匹配满赠档位（U-62）：取满足门槛的最高档位；同一时间只送一份。
 * 库存是否充足由调用方在下单事务内校验，缺货时静默放弃赠品，不阻断下单。
 */
export async function calcGiftPromotion(
  goodsTotal: number,
  transaction?: Transaction,
): Promise<GiftMatch | null> {
  const promotions = await listActivePromotions(transaction)
  let best: (GiftMatch & { thresholdAmount: number }) | null = null

  for (const p of promotions) {
    if (p.type !== PROMOTION_TYPE.FULL_GIFT) continue
    for (const t of p.thresholds) {
      if (!t.giftSkuId || !t.giftQuantity) continue
      if (goodsTotal < t.amount) continue
      if (!best || t.amount > best.thresholdAmount) {
        best = {
          promotionId: p.id,
          promotionName: p.name,
          threshold: t.amount,
          productId: t.giftProductId ?? null,
          skuId: t.giftSkuId,
          quantity: t.giftQuantity,
          thresholdAmount: t.amount,
        }
      }
    }
  }

  if (!best) return null
  return {
    promotionId: best.promotionId,
    promotionName: best.promotionName,
    threshold: best.threshold,
    productId: best.productId,
    skuId: best.skuId,
    quantity: best.quantity,
  }
}
