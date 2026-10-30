import { Op, type Transaction } from 'sequelize'
import { sequelize } from '../config/database'
import { Cart, Category, Coupon, Product, ProductSku, UserCoupon } from '../models'
import { AppError } from '../utils/errors'
import { ERR } from '../constants'
import { generateNo, round2 } from '../utils/helpers'
import { toCouponDto, toUserCouponDto } from '../utils/serializers'
import { findActiveSeckill } from './seckillService'

/**
 * 优惠券参与计价的最小明细：金额为「秒杀后」的成交小计，
 * 与企划 3.1.5 的优惠叠加顺序保持一致。
 */
export interface CouponLine {
  productId: number
  categoryId: number
  amount: number
}

export interface CouponSelection {
  userCoupon: UserCoupon
  coupon: Coupon
  discount: number
  eligibleAmount: number
}

interface CouponEvaluation {
  discount: number
  eligibleAmount: number
  reason: string
}

const DAY_MS = 24 * 60 * 60 * 1000

/** 分类祖先链，用于判断「指定分类券」是否覆盖子分类商品 */
async function loadCategoryParents(
  transaction?: Transaction,
): Promise<Map<number, number | null>> {
  const rows = await Category.findAll({ attributes: ['id', 'parentId'], transaction })
  return new Map(
    rows.map((row) => [Number(row.id), row.parentId ? Number(row.parentId) : null]),
  )
}

/** 归一化券范围 ID：去重、过滤非正整数；scope=1 时无范围概念 */
function couponScopeIds(coupon: Coupon): number[] {
  const raw = Array.isArray(coupon.scopeIds) ? coupon.scopeIds : []
  return [
    ...new Set(
      raw
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ]
}

/**
 * 券范围配置是否完整。
 * scope=2/3 必须有非空范围，不能按“全场”兜底，否则分类券/商品券会越权抵扣。
 */
function hasValidScopeConfig(coupon: Coupon): boolean {
  if (coupon.scope === 1) return true
  if (coupon.scope !== 2 && coupon.scope !== 3) return false
  return couponScopeIds(coupon).length > 0
}

function matchesScope(
  coupon: Coupon,
  line: CouponLine,
  parents: Map<number, number | null>,
): boolean {
  if (coupon.scope === 1) return true
  if (coupon.scope !== 2 && coupon.scope !== 3) return false

  const scopeIds = couponScopeIds(coupon)
  if (!scopeIds.length) return false

  if (coupon.scope === 3) return scopeIds.includes(line.productId)
  // scope=2：从商品所属分类向上找，命中任意祖先分类即视为适用
  let current: number | null = line.categoryId
  const seen = new Set<number>()
  while (current && !seen.has(current)) {
    if (scopeIds.includes(current)) return true
    seen.add(current)
    current = parents.get(current) ?? null
  }
  return false
}

/** 领券中心：启用中、在领取期内且未领完 */
function isCouponClaimable(coupon: Coupon, now: Date): boolean {
  if (coupon.status !== 1) return false
  if (!hasValidScopeConfig(coupon)) return false
  if (coupon.totalCount > 0 && coupon.receivedCount >= coupon.totalCount) return false
  if (coupon.validType === 1) {
    if (coupon.validStart && coupon.validStart.getTime() > now.getTime()) return false
    if (!coupon.validEnd || coupon.validEnd.getTime() < now.getTime()) return false
    return true
  }
  if (coupon.validType === 2) {
    return Boolean(coupon.validDays && coupon.validDays > 0)
  }
  return false
}

/**
 * 计算一张券对当前商品明细的可用性。
 * 返回 discount=0 时 reason 说明不可用原因，便于下单接口给出明确提示。
 */
function evaluateCoupon(
  coupon: Coupon,
  userCoupon: UserCoupon,
  lines: CouponLine[],
  parents: Map<number, number | null>,
  now: Date,
): CouponEvaluation {
  const invalid = (reason: string): CouponEvaluation => ({
    discount: 0,
    eligibleAmount: 0,
    reason,
  })

  if (userCoupon.status === 1) return invalid('优惠券已使用')
  if (userCoupon.status === 2) return invalid('优惠券已过期')
  if (userCoupon.status !== 0) return invalid('优惠券不可用')

  if (coupon.status !== 1) return invalid('优惠券已停用')

  if (coupon.validType === 1) {
    if (coupon.validStart && coupon.validStart.getTime() > now.getTime()) {
      return invalid('优惠券未到使用时间')
    }
    if (!coupon.validEnd || coupon.validEnd.getTime() < now.getTime()) {
      return invalid('优惠券已过期')
    }
  } else if (coupon.validType === 2) {
    if (!coupon.validDays || coupon.validDays <= 0) return invalid('优惠券有效期配置异常')
  } else {
    return invalid('优惠券有效期配置异常')
  }

  if (userCoupon.expireAt && userCoupon.expireAt.getTime() < now.getTime()) {
    return invalid('优惠券已过期')
  }

  if (!hasValidScopeConfig(coupon)) {
    return invalid('优惠券适用范围配置异常')
  }

  let eligibleAmount = 0
  for (const line of lines) {
    if (matchesScope(coupon, line, parents)) eligibleAmount += line.amount
  }
  eligibleAmount = round2(eligibleAmount)

  if (eligibleAmount <= 0) return invalid('优惠券不适用于当前商品')
  if (eligibleAmount < Number(coupon.minAmount)) {
    return invalid(`未达到优惠券使用门槛（还差 ¥${(Number(coupon.minAmount) - eligibleAmount).toFixed(2)}）`)
  }

  let discount = 0
  if (coupon.type === 1) {
    discount = Math.min(Number(coupon.amount), eligibleAmount)
  } else if (coupon.type === 2) {
    discount = eligibleAmount * (1 - Number(coupon.discountRate))
  } else {
    return invalid('优惠券类型配置异常')
  }
  discount = round2(discount)
  if (discount <= 0) return invalid('优惠券不可用')

  return { discount, eligibleAmount, reason: '' }
}

function expiryValue(selection: CouponSelection): number {
  return selection.userCoupon.expireAt?.getTime() ?? Number.MAX_SAFE_INTEGER
}

/** 用户当前所有可用的券，按「抵扣金额从高到低、先到期优先」排序 */
async function listUsableCoupons(
  userId: number,
  lines: CouponLine[],
  now: Date,
  transaction?: Transaction,
): Promise<CouponSelection[]> {
  // 同一事务内串行查询，避免并发复用同一连接
  const parents = await loadCategoryParents(transaction)
  const rows = await UserCoupon.findAll({
    where: { userId, status: 0 },
    include: [{ model: Coupon, as: 'coupon' }],
    transaction,
  })

  const selections: CouponSelection[] = []
  for (const userCoupon of rows) {
    const coupon = userCoupon.get('coupon') as Coupon | null
    if (!coupon) continue
    const evaluation = evaluateCoupon(coupon, userCoupon, lines, parents, now)
    if (evaluation.discount <= 0) continue
    selections.push({
      userCoupon,
      coupon,
      discount: evaluation.discount,
      eligibleAmount: evaluation.eligibleAmount,
    })
  }

  selections.sort(
    (a, b) =>
      b.discount - a.discount ||
      expiryValue(a) - expiryValue(b) ||
      Number(a.userCoupon.id) - Number(b.userCoupon.id),
  )
  return selections
}

/** 指定用户券：校验归属、有效期、范围、门槛，并返回抵扣金额（行锁防并发复用） */
export async function findUsableCoupon(
  userId: number,
  userCouponId: number,
  lines: CouponLine[],
  transaction: Transaction,
): Promise<CouponSelection> {
  const userCoupon = await UserCoupon.findOne({
    where: { id: userCouponId, userId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  })
  if (!userCoupon) throw new AppError('优惠券不可用', ERR.COUPON_INVALID)

  const coupon = await Coupon.findByPk(userCoupon.couponId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  })
  if (!coupon) throw new AppError('优惠券不可用', ERR.COUPON_INVALID)

  const parents = await loadCategoryParents(transaction)
  const evaluation = evaluateCoupon(coupon, userCoupon, lines, parents, new Date())
  if (evaluation.discount <= 0) {
    throw new AppError(evaluation.reason || '优惠券不可用', ERR.COUPON_INVALID)
  }

  return {
    userCoupon,
    coupon,
    discount: evaluation.discount,
    eligibleAmount: evaluation.eligibleAmount,
  }
}

/** 自动匹配最优券：先按金额/到期时间排序，再锁定首选券二次校验 */
export async function findBestCoupon(
  userId: number,
  lines: CouponLine[],
  transaction: Transaction,
): Promise<CouponSelection | null> {
  const selections = await listUsableCoupons(userId, lines, new Date(), transaction)
  if (!selections.length) return null
  return findUsableCoupon(userId, Number(selections[0].userCoupon.id), lines, transaction)
}

/** 下单成功时核销：用户券置为已使用，券模板 used_count + 1 */
export async function consumeCoupon(
  selection: CouponSelection,
  orderId: number,
  transaction: Transaction,
): Promise<void> {
  const { userCoupon, coupon } = selection
  userCoupon.status = 1
  userCoupon.orderId = orderId
  userCoupon.usedAt = new Date()
  await userCoupon.save({ transaction })
  await Coupon.increment('usedCount', {
    by: 1,
    where: { id: coupon.id },
    transaction,
  })
}

/** 取消/超时关单时退还优惠券，并回退券模板的核销数 */
export async function restoreCoupon(
  orderId: number,
  userCouponId: number | null,
  transaction: Transaction,
): Promise<void> {
  if (!userCouponId) return
  const userCoupon = await UserCoupon.findByPk(userCouponId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  })
  if (!userCoupon || Number(userCoupon.orderId) !== orderId || userCoupon.status !== 1) return

  userCoupon.status = 0
  userCoupon.orderId = null
  userCoupon.usedAt = null
  await userCoupon.save({ transaction })
  await Coupon.decrement('usedCount', {
    by: 1,
    where: { id: userCoupon.couponId, usedCount: { [Op.gt]: 0 } },
    transaction,
  })
}

/** 领券中心：只返回当前可领取的券 */
export async function couponCenter() {
  const rows = await Coupon.findAll({ where: { status: 1 }, order: [['id', 'ASC']] })
  const now = new Date()
  return rows.filter((coupon) => isCouponClaimable(coupon, now)).map(toCouponDto)
}

/** 领取优惠券：行锁串行化，避免并发超发/超领 */
export async function receiveCoupon(userId: number, couponId: number) {
  return sequelize.transaction(async (transaction) => {
    const coupon = await Coupon.findByPk(couponId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    })
    if (!coupon || !isCouponClaimable(coupon, new Date())) {
      throw new AppError('优惠券不存在、已过期或已领完', ERR.COUPON_INVALID)
    }

    const received = await UserCoupon.count({
      where: { userId, couponId },
      transaction,
    })
    if (received >= coupon.perUserLimit) throw new AppError('已达领取上限', ERR.COUPON_INVALID)

    const expireAt =
      coupon.validType === 2
        ? new Date(Date.now() + (coupon.validDays ?? 0) * DAY_MS)
        : coupon.validEnd
    if (!expireAt) throw new AppError('优惠券有效期配置异常', ERR.COUPON_INVALID)

    const row = await UserCoupon.create(
      {
        userId,
        couponId: Number(coupon.id),
        couponCode: generateNo('CP'),
        status: 0,
        receivedAt: new Date(),
        expireAt,
      },
      { transaction },
    )
    coupon.receivedCount += 1
    await coupon.save({ transaction })
    return { id: Number(row.id), couponId: Number(coupon.id) }
  })
}

/**
 * 新人券包（U-63）：注册成功后自动发放启用中的新人券。
 * 单张券已领完或配置异常时跳过，不影响注册主流程。
 */
export async function grantNewUserCoupons(userId: number): Promise<number> {
  const coupons = await Coupon.findAll({ where: { status: 1, isNewUser: 1 } })
  let granted = 0
  for (const coupon of coupons) {
    try {
      await receiveCoupon(userId, Number(coupon.id))
      granted += 1
    } catch {
      // 忽略单张券的发放失败（已领完/有效期未开始等）
    }
  }
  return granted
}

/** 我的优惠券：先把已过期未使用券落库为状态 2，再返回三态列表 */export async function myCoupons(userId: number) {
  const now = new Date()
  await UserCoupon.update(
    { status: 2 },
    { where: { userId, status: 0, expireAt: { [Op.lt]: now } } },
  )
  const rows = await UserCoupon.findAll({
    where: { userId },
    include: [{ model: Coupon, as: 'coupon' }],
    order: [['id', 'DESC']],
  })
  return rows.map((row) => toUserCouponDto(row as unknown as Parameters<typeof toUserCouponDto>[0]))
}

/**
 * 结算页优惠券预览：按当前选中购物车计算每张券的真实抵扣额，并给出最优券。
 * 秒杀价与下单时保持同一口径（第 2 环先算秒杀价，再算券）。
 */
export async function previewCoupons(userId: number) {
  const rows = await Cart.findAll({
    where: { userId, selected: 1 },
    include: [
      { model: Product, as: 'product' },
      { model: ProductSku, as: 'sku' },
    ],
  })

  const lines: CouponLine[] = []
  for (const row of rows) {
    const product = row.get('product') as Product | null
    const sku = row.get('sku') as ProductSku | null
    if (!product || !sku || product.status !== 1 || sku.status !== 1) continue
    const seckill = await findActiveSeckill(Number(product.id), Number(sku.id))
    const unitPrice = seckill ? Number(seckill.seckillPrice) : Number(sku.price)
    lines.push({
      productId: Number(product.id),
      categoryId: Number(product.categoryId),
      amount: round2(unitPrice * row.quantity),
    })
  }

  if (!lines.length) return { list: [], bestCouponId: null }

  const now = new Date()
  const selections = await listUsableCoupons(userId, lines, now)
  const list = selections.map((selection) => ({
    ...toUserCouponDto(
      selection.userCoupon as unknown as Parameters<typeof toUserCouponDto>[0],
    ),
    discount: selection.discount,
    eligibleAmount: selection.eligibleAmount,
  }))

  return {
    list,
    bestCouponId: list[0]?.id ?? null,
  }
}
