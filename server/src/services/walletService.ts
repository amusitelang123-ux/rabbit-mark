import type { Transaction } from 'sequelize'
import { sequelize } from '../config/database'
import { BalanceLog, BalanceRecharge, User } from '../models'
import { AppError } from '../utils/errors'
import {
  BALANCE_LOG_TYPE,
  BALANCE_RECHARGE,
  ERR,
  PAY_CHANNEL,
  PAY_STATUS,
} from '../constants'
import { generateNo, round2 } from '../utils/helpers'
import { formatDate } from '../utils/serializers'
import { getPaymentAdapter } from '../adapters/payment'
import type { PayChannel } from '../adapters/payment'

export interface RechargeInput {
  amount: number
  channel: PayChannel
}

function toBalanceLogDto(log: BalanceLog) {
  return {
    id: Number(log.id),
    type: log.type,
    change: Number(log.change),
    balance: Number(log.balance),
    relatedNo: log.relatedNo ?? '',
    remark: log.remark ?? '',
    createdAt: formatDate(log.createdAt),
  }
}

function toRechargeDto(record: BalanceRecharge) {
  return {
    payNo: record.payNo,
    amount: Number(record.amount),
    channel: record.channel,
    status: record.status,
    paidAt: record.paidAt ? formatDate(record.paidAt) : '',
    createdAt: formatDate(record.createdAt),
  }
}

/**
 * 统一余额变动入口（U-30）：锁定用户行 → 更新余额 → 写资金流水，必须与业务在同一事务内。
 * 余额支付、售后退款、后台调账、充值入账全部走这里，保证「余额 = 流水汇总」可对账。
 */
export async function applyBalance(
  userId: number,
  type: number,
  change: number,
  remark: string,
  relatedNo: string | null,
  transaction: Transaction,
): Promise<{ balance: number; change: number }> {
  if (!Number.isFinite(change)) {
    throw new AppError('余额变动值必须是非 0 数字', ERR.PARAM)
  }
  const delta = round2(change)
  if (delta === 0) {
    throw new AppError('余额变动值必须是非 0 数字', ERR.PARAM)
  }

  const user = await User.findByPk(userId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  })
  if (!user) throw AppError.notFound('用户不存在')

  const next = round2(Number(user.balance) + delta)
  if (next < 0) throw new AppError('余额不足', ERR.BALANCE_NOT_ENOUGH)

  user.balance = next.toFixed(2)
  await user.save({ transaction })

  await BalanceLog.create(
    {
      userId,
      type,
      change: delta.toFixed(2),
      balance: next.toFixed(2),
      relatedNo,
      remark,
    },
    { transaction },
  )

  return { balance: next, change: delta }
}

/** 我的钱包：余额、最近资金流水、最近充值单 */
export async function getWallet(userId: number) {
  const user = await User.findByPk(userId)
  if (!user) throw AppError.notFound('用户不存在')

  const [logs, recharges, totalRecharged] = await Promise.all([
    BalanceLog.findAll({ where: { userId }, order: [['id', 'DESC']], limit: 50 }),
    BalanceRecharge.findAll({ where: { userId }, order: [['id', 'DESC']], limit: 10 }),
    BalanceLog.sum('change', {
      where: { userId, type: BALANCE_LOG_TYPE.RECHARGE },
    }),
  ])

  return {
    balance: Number(user.balance),
    /** 累计充值金额（仅统计成功入账流水，不受明细分页限制） */
    totalRecharged: Number(totalRecharged ?? 0),
    logs: logs.map(toBalanceLogDto),
    recharges: recharges.map(toRechargeDto),
  }
}

/**
 * 创建充值单：校验金额与渠道 → 落充值单 → 调支付适配器拿收银台参数。
 * 充值不能使用余额渠道（3），否则会形成无需真实支付的余额自增。
 */
export async function createRecharge(userId: number, input: RechargeInput) {
  if (input.channel === PAY_CHANNEL.BALANCE) {
    throw new AppError('余额不能用于充值，请选择其它支付方式', ERR.PARAM)
  }

  const amount = round2(input.amount)
  if (!Number.isFinite(amount) || amount < BALANCE_RECHARGE.MIN || amount > BALANCE_RECHARGE.MAX) {
    throw new AppError(
      `充值金额需在 ¥${BALANCE_RECHARGE.MIN} ~ ¥${BALANCE_RECHARGE.MAX} 之间`,
      ERR.PARAM,
    )
  }

  const user = await User.findByPk(userId)
  if (!user) throw AppError.notFound('用户不存在')
  if (user.status !== 1) throw new AppError('账号已被禁用', ERR.USER_DISABLED)

  const payNo = generateNo('RCP')
  const record = await BalanceRecharge.create({
    payNo,
    userId,
    amount: amount.toFixed(2),
    channel: input.channel,
    status: PAY_STATUS.PENDING,
  })

  try {
    const result = await getPaymentAdapter(input.channel).prepay({
      payNo,
      orderNo: payNo,
      amount: record.amount,
      subject: `小兔鲜余额充值 ${payNo}`,
      channel: input.channel,
    })
    record.requestBody = JSON.stringify(result)
    await record.save()
    return {
      payNo: record.payNo,
      amount: Number(record.amount),
      payParams: result.payParams,
      payUrl: result.payUrl ?? null,
    }
  } catch (err) {
    // 适配器创建失败时关闭充值单，避免留下无法继续支付的脏单
    record.status = PAY_STATUS.CLOSED
    await record.save()
    throw err
  }
}

/** 充值回调：验签、幂等校验、金额校验后在同一事务内入账并写流水 */
export async function handleRechargeCallback(channel: PayChannel, raw: unknown) {
  const payload = getPaymentAdapter(channel).parseCallback(channel, raw)

  return sequelize.transaction(async (transaction) => {
    const record = await BalanceRecharge.findOne({
      where: { payNo: payload.payNo },
      transaction,
      lock: transaction.LOCK.UPDATE,
    })
    if (!record) throw new AppError('充值单不存在', ERR.RECHARGE_NOT_FOUND)

    // 幂等：重复到达的成功回调直接返回当前余额
    if (record.status === PAY_STATUS.SUCCESS) {
      const user = await User.findByPk(record.userId, { transaction })
      return {
        payNo: record.payNo,
        duplicated: true,
        balance: Number(user?.balance ?? 0),
      }
    }

    if (record.status === PAY_STATUS.CLOSED) {
      throw new AppError('充值单已关闭', ERR.PAY_STATUS_INVALID)
    }
    if (Number(record.channel) !== channel) {
      throw new AppError('支付渠道与充值单不一致', ERR.PAY_FAILED)
    }

    record.callbackBody = payload.raw
    if (!payload.success) {
      record.status = PAY_STATUS.FAILED
      await record.save({ transaction })
      const user = await User.findByPk(record.userId, { transaction })
      return {
        payNo: record.payNo,
        duplicated: false,
        balance: Number(user?.balance ?? 0),
      }
    }

    if (Math.round(Number(record.amount) * 100) !== Math.round(Number(payload.amount) * 100)) {
      throw new AppError('充值金额与支付金额不一致', ERR.PAY_AMOUNT_MISMATCH)
    }

    const credited = await applyBalance(
      record.userId,
      BALANCE_LOG_TYPE.RECHARGE,
      Number(record.amount),
      '账户余额充值',
      record.payNo,
      transaction,
    )

    record.status = PAY_STATUS.SUCCESS
    record.thirdPartyNo = payload.thirdPartyNo
    record.paidAt = payload.paidAt
    await record.save({ transaction })

    return { payNo: record.payNo, duplicated: false, balance: credited.balance }
  })
}

/** 充值状态查询：供收银台同步回跳后轮询，返回最新余额 */
export async function queryRechargeStatus(userId: number, payNo: string) {
  const record = await BalanceRecharge.findOne({ where: { payNo, userId } })
  if (!record) throw new AppError('充值单不存在', ERR.RECHARGE_NOT_FOUND)

  const user = await User.findByPk(userId)
  return {
    payNo: record.payNo,
    payStatus: record.status,
    amount: Number(record.amount),
    balance: Number(user?.balance ?? 0),
    paidAt: record.paidAt ? formatDate(record.paidAt) : '',
  }
}
