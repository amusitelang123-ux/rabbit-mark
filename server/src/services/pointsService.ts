import { Op, type Transaction } from 'sequelize'
import { sequelize } from '../config/database'
import { User, UserPointsLog } from '../models'
import { AppError } from '../utils/errors'
import { ERR, POINTS_RULE, POINTS_TYPE } from '../constants'
import { formatDate } from '../utils/serializers'

function startOfDay(date = new Date()): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function toPointsLogDto(log: UserPointsLog) {
  return {
    id: Number(log.id),
    type: log.type,
    change: log.change,
    balance: log.balance,
    remark: log.remark ?? '',
    createdAt: formatDate(log.createdAt),
  }
}

/** 统一积分变动入口：写流水 + 同步用户余额（同一事务） */
export async function applyPoints(
  userId: number,
  type: number,
  change: number,
  remark: string | undefined,
  transaction?: Transaction,
) {
  const user = await User.findByPk(userId, {
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  })
  if (!user) throw AppError.notFound('用户不存在')

  const balance = user.points + change
  if (balance < 0) throw new AppError('积分不足', ERR.PARAM)

  user.points = balance
  await user.save({ transaction })
  await UserPointsLog.create(
    { userId, type, change, balance, remark: remark ?? null },
    { transaction },
  )
  return { balance, change }
}

/** 连续签到天数（截至昨天，用于计算今日加成） */
async function consecutiveDaysBeforeToday(userId: number): Promise<number> {
  const rows = await UserPointsLog.findAll({
    where: { userId, type: POINTS_TYPE.SIGN_IN },
    attributes: ['createdAt'],
    order: [['id', 'DESC']],
    limit: 90,
  })
  const days = new Set(rows.map((r) => startOfDay(r.createdAt).getTime()))
  let count = 0
  const cursor = new Date()
  cursor.setDate(cursor.getDate() - 1)
  while (days.has(startOfDay(cursor).getTime())) {
    count += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return count
}

export async function listMyPoints(userId: number) {
  const user = await User.findByPk(userId)
  if (!user) throw AppError.notFound('用户不存在')

  const [logs, signedToday] = await Promise.all([
    UserPointsLog.findAll({ where: { userId }, order: [['id', 'DESC']], limit: 50 }),
    UserPointsLog.count({
      where: { userId, type: POINTS_TYPE.SIGN_IN, createdAt: { [Op.gte]: startOfDay() } },
    }),
  ])

  return {
    balance: user.points,
    todaySigned: signedToday > 0,
    logs: logs.map(toPointsLogDto),
  }
}

/** 每日签到：基础分 + 连续签到加成，每日一次 */
export async function signIn(userId: number) {
  return sequelize.transaction(async (transaction) => {
    const signedToday = await UserPointsLog.count({
      where: { userId, type: POINTS_TYPE.SIGN_IN, createdAt: { [Op.gte]: startOfDay() } },
      transaction,
    })
    if (signedToday > 0) throw new AppError('今日已签到，明天再来', ERR.PARAM)

    const streakBefore = await consecutiveDaysBeforeToday(userId)
    const bonus = Math.min(streakBefore * POINTS_RULE.SIGN_IN_STEP, POINTS_RULE.SIGN_IN_MAX_BONUS)
    const gain = POINTS_RULE.SIGN_IN_BASE + bonus
    const streak = streakBefore + 1

    const result = await applyPoints(
      userId,
      POINTS_TYPE.SIGN_IN,
      gain,
      `每日签到（连续 ${streak} 天）`,
      transaction,
    )
    return { ...result, gain, streak }
  })
}

/** 订单完成赠送积分：1 元 = 1 积分 */
export async function awardForOrder(
  userId: number,
  orderNo: string,
  paidAmount: number,
  transaction: Transaction,
) {
  const gain = Math.floor(Number(paidAmount) * POINTS_RULE.PER_YUAN)
  if (gain <= 0) return { balance: 0, change: 0 }
  return applyPoints(userId, POINTS_TYPE.ORDER_REWARD, gain, `订单 ${orderNo} 消费获得`, transaction)
}

/** 后台手动调整积分 */
export async function adminAdjust(userId: number, change: number, remark?: string) {
  if (!change) throw new AppError('变动值不能为 0', ERR.PARAM)
  return applyPoints(userId, POINTS_TYPE.ADMIN_ADJUST, change, remark || '后台调整')
}

/** 后台查看某用户积分流水 */
export async function listUserPoints(userId: number, page = 1, pageSize = 20) {
  const user = await User.findByPk(userId)
  if (!user) throw AppError.notFound('用户不存在')

  const { rows, count } = await UserPointsLog.findAndCountAll({
    where: { userId },
    order: [['id', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  })

  return {
    balance: user.points,
    list: rows.map(toPointsLogDto),
    page,
    pageSize,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  }
}
