import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize'
import { sequelize } from '../config/database'

export class Cart extends Model<InferAttributes<Cart>, InferCreationAttributes<Cart>> {
  declare id: CreationOptional<number>
  declare userId: number
  declare productId: number
  declare skuId: number
  declare quantity: CreationOptional<number>
  declare selected: CreationOptional<number>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

Cart.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    productId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    skuId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
    selected: { type: DataTypes.TINYINT, defaultValue: 1 },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'carts', timestamps: true },
)

export class Order extends Model<InferAttributes<Order>, InferCreationAttributes<Order>> {
  declare id: CreationOptional<number>
  declare orderNo: string
  declare userId: number
  declare status: CreationOptional<number>
  declare totalAmount: CreationOptional<string>
  declare discountAmount: CreationOptional<string>
  declare seckillAmount: CreationOptional<string>
  declare promotionAmount: CreationOptional<string>
  declare couponAmount: CreationOptional<string>
  /** 积分抵现：本单消耗积分与抵扣金额（U-64） */
  declare pointsUsed: CreationOptional<number>
  declare pointsAmount: CreationOptional<string>
  declare freightAmount: CreationOptional<string>
  declare payAmount: CreationOptional<string>
  declare paidAmount: CreationOptional<string>
  declare couponId: number | null
  declare payType: number | null
  declare payTime: Date | null
  declare shipTime: Date | null
  declare receiveTime: Date | null
  declare finishTime: Date | null
  declare closeTime: Date | null
  declare receiverName: string | null
  declare receiverPhone: string | null
  declare receiverAddress: string | null
  declare remark: string | null
  declare adminRemark: string | null
  /** 后台异常标记：运营标识，不改变订单状态机 */
  declare isAbnormal: CreationOptional<number>
  declare abnormalReason: string | null
  /** 用户侧逻辑删除（仅隐藏，不做物理删除） */
  declare userDeleted: CreationOptional<number>
  declare userDeletedAt: Date | null
  /** 用户催发货提醒：次数与最近时间，供后台列表/详情直接展示 */
  declare remindShipCount: CreationOptional<number>
  declare lastRemindShipAt: Date | null
  declare source: CreationOptional<number>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

Order.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    orderNo: { type: DataTypes.STRING(32), allowNull: false },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    status: { type: DataTypes.TINYINT, defaultValue: 10 },
    totalAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    discountAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    seckillAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    promotionAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    couponAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    pointsUsed: { type: DataTypes.INTEGER, defaultValue: 0 },
    pointsAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    freightAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    payAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    paidAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    couponId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    payType: { type: DataTypes.TINYINT, allowNull: true },
    payTime: { type: DataTypes.DATE, allowNull: true },
    shipTime: { type: DataTypes.DATE, allowNull: true },
    receiveTime: { type: DataTypes.DATE, allowNull: true },
    finishTime: { type: DataTypes.DATE, allowNull: true },
    closeTime: { type: DataTypes.DATE, allowNull: true },
    receiverName: { type: DataTypes.STRING(50), allowNull: true },
    receiverPhone: { type: DataTypes.STRING(20), allowNull: true },
    receiverAddress: { type: DataTypes.STRING(255), allowNull: true },
    remark: { type: DataTypes.STRING(255), allowNull: true },
    adminRemark: { type: DataTypes.STRING(255), allowNull: true },
    isAbnormal: { type: DataTypes.TINYINT, defaultValue: 0 },
    abnormalReason: { type: DataTypes.STRING(255), allowNull: true },
    userDeleted: { type: DataTypes.TINYINT, defaultValue: 0 },
    userDeletedAt: { type: DataTypes.DATE, allowNull: true },
    remindShipCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    lastRemindShipAt: { type: DataTypes.DATE, allowNull: true },
    source: { type: DataTypes.TINYINT, defaultValue: 1 },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'orders', timestamps: true },
)

export class OrderItem extends Model<InferAttributes<OrderItem>, InferCreationAttributes<OrderItem>> {
  declare id: CreationOptional<number>
  declare orderId: number
  declare productId: number
  declare skuId: number
  declare productName: string
  declare skuSpecText: string | null
  declare productImage: string | null
  declare price: string
  declare originalPrice: CreationOptional<string>
  declare seckillProductId: number | null
  declare quantity: number
  declare subtotal: string
  declare discountAmount: CreationOptional<string>
  /** 满赠赠品标记（U-62） */
  declare isGift: CreationOptional<number>
  declare isCommented: CreationOptional<number>
  declare refundStatus: CreationOptional<number>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

OrderItem.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    orderId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    productId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    skuId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    productName: { type: DataTypes.STRING(200), allowNull: false },
    skuSpecText: { type: DataTypes.STRING(200), allowNull: true },
    productImage: { type: DataTypes.STRING(255), allowNull: true },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    originalPrice: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    seckillProductId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    discountAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    isGift: { type: DataTypes.TINYINT, defaultValue: 0 },
    isCommented: { type: DataTypes.TINYINT, defaultValue: 0 },
    refundStatus: { type: DataTypes.TINYINT, defaultValue: 0 },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'order_items', timestamps: true },
)

export class OrderLogistics extends Model<
  InferAttributes<OrderLogistics>,
  InferCreationAttributes<OrderLogistics>
> {
  declare id: CreationOptional<number>
  declare orderId: number
  declare company: string | null
  declare trackingNo: string | null
  declare status: CreationOptional<number>
  declare traces: { time: string; text: string }[] | null
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

OrderLogistics.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    orderId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    company: { type: DataTypes.STRING(50), allowNull: true },
    trackingNo: { type: DataTypes.STRING(64), allowNull: true },
    status: { type: DataTypes.TINYINT, defaultValue: 0 },
    traces: { type: DataTypes.JSON, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'order_logistics', timestamps: true },
)

export class PaymentRecord extends Model<
  InferAttributes<PaymentRecord>,
  InferCreationAttributes<PaymentRecord>
> {
  declare id: CreationOptional<number>
  declare payNo: string
  declare orderId: number
  declare orderNo: string
  declare userId: number
  declare amount: string
  declare channel: number
  declare status: CreationOptional<number>
  declare thirdPartyNo: string | null
  declare requestBody: string | null
  declare callbackBody: string | null
  declare paidAt: Date | null
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

PaymentRecord.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    payNo: { type: DataTypes.STRING(32), allowNull: false },
    orderId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    orderNo: { type: DataTypes.STRING(32), allowNull: false },
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
  { sequelize, tableName: 'payment_records', timestamps: true },
)

/** 售后 / 退款单 */
export class OrderRefund extends Model<InferAttributes<OrderRefund>, InferCreationAttributes<OrderRefund>> {
  declare id: CreationOptional<number>
  declare refundNo: string
  declare orderId: number
  declare orderItemId: number | null
  declare userId: number
  declare type: number
  declare reason: string | null
  declare amount: string
  declare images: string[] | null
  declare status: CreationOptional<number>
  declare auditRemark: string | null
  declare auditAt: Date | null
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

OrderRefund.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    refundNo: { type: DataTypes.STRING(32), allowNull: false },
    orderId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    orderItemId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    type: { type: DataTypes.TINYINT, allowNull: false },
    reason: { type: DataTypes.STRING(255), allowNull: true },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    images: { type: DataTypes.JSON, allowNull: true },
    status: { type: DataTypes.TINYINT, defaultValue: 0 },
    auditRemark: { type: DataTypes.STRING(255), allowNull: true },
    auditAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'order_refunds', timestamps: true },
)

/** 财务流水 */
export class FinanceRecord extends Model<
  InferAttributes<FinanceRecord>,
  InferCreationAttributes<FinanceRecord>
> {
  declare id: CreationOptional<number>
  declare orderId: number | null
  declare type: number
  declare amount: string
  declare channel: number | null
  declare status: CreationOptional<number>
  declare occurredAt: Date
  declare createdAt: CreationOptional<Date>
}

FinanceRecord.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    orderId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    type: { type: DataTypes.TINYINT, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    channel: { type: DataTypes.TINYINT, allowNull: true },
    status: { type: DataTypes.TINYINT, defaultValue: 1 },
    occurredAt: { type: DataTypes.DATE, allowNull: false },
    createdAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'finance_records', timestamps: true, updatedAt: false },
)

/** 发票 */
export class Invoice extends Model<InferAttributes<Invoice>, InferCreationAttributes<Invoice>> {
  declare id: CreationOptional<number>
  declare orderId: number
  declare type: number
  declare title: string
  declare taxNo: string | null
  declare content: string | null
  declare email: string | null
  declare status: CreationOptional<number>
  declare createdAt: CreationOptional<Date>
}

Invoice.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    orderId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    type: { type: DataTypes.TINYINT, allowNull: false },
    title: { type: DataTypes.STRING(100), allowNull: false },
    taxNo: { type: DataTypes.STRING(50), allowNull: true },
    content: { type: DataTypes.STRING(255), allowNull: true },
    email: { type: DataTypes.STRING(100), allowNull: true },
    status: { type: DataTypes.TINYINT, defaultValue: 0 },
    createdAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'invoices', timestamps: true, updatedAt: false },
)

/** 订单操作日志（A-25）：记录状态变更的操作人、时间、原因 */
export class OrderLog extends Model<InferAttributes<OrderLog>, InferCreationAttributes<OrderLog>> {
  declare id: CreationOptional<number>
  declare orderId: number
  declare action: string
  declare operator: string
  declare remark: string | null
  declare createdAt: CreationOptional<Date>
}

OrderLog.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    orderId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    action: { type: DataTypes.STRING(50), allowNull: false },
    operator: { type: DataTypes.STRING(50), allowNull: false },
    remark: { type: DataTypes.STRING(255), allowNull: true },
    createdAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'order_logs', timestamps: true, updatedAt: false },
)
