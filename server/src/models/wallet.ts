import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize'
import { sequelize } from '../config/database'

/**
 * 余额充值单：用户端充值入口创建，支付回调成功后入账。
 * 与订单支付单（payment_records）分开，避免充值单必须绑定订单。
 */
export class BalanceRecharge extends Model<
  InferAttributes<BalanceRecharge>,
  InferCreationAttributes<BalanceRecharge>
> {
  declare id: CreationOptional<number>
  /** 充值单号，同时作为支付适配器 payNo（回调幂等键） */
  declare payNo: string
  declare userId: number
  declare amount: string
  /** 支付渠道：1微信 2支付宝 4沙箱（余额不可用于充值自身） */
  declare channel: number
  /** 状态沿用支付单枚举：0待支付 1成功 2失败 4已关闭 */
  declare status: CreationOptional<number>
  declare thirdPartyNo: string | null
  declare requestBody: string | null
  declare callbackBody: string | null
  declare paidAt: Date | null
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

BalanceRecharge.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    payNo: { type: DataTypes.STRING(32), allowNull: false },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    channel: { type: DataTypes.TINYINT, allowNull: false },
    status: { type: DataTypes.TINYINT, defaultValue: 0 },
    thirdPartyNo: { type: DataTypes.STRING(64), allowNull: true },
    requestBody: { type: DataTypes.TEXT, allowNull: true },
    callbackBody: { type: DataTypes.TEXT, allowNull: true },
    paidAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'balance_recharges', timestamps: true },
)

/** 余额流水：1充值 2余额支付 3退款入账 4后台调整 */
export class BalanceLog extends Model<InferAttributes<BalanceLog>, InferCreationAttributes<BalanceLog>> {
  declare id: CreationOptional<number>
  declare userId: number
  declare type: number
  /** 变动金额（正数入账、负数扣减） */
  declare change: string
  /** 变动后余额 */
  declare balance: string
  /** 关联单号：充值单号 / 订单号 / 售后单号 */
  declare relatedNo: string | null
  declare remark: string | null
  declare createdAt: CreationOptional<Date>
}

BalanceLog.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    type: { type: DataTypes.TINYINT, allowNull: false },
    change: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    balance: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    relatedNo: { type: DataTypes.STRING(32), allowNull: true },
    remark: { type: DataTypes.STRING(255), allowNull: true },
    createdAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'balance_logs', timestamps: true, updatedAt: false },
)
