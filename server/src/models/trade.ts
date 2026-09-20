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
  declare couponAmount: CreationOptional<string>
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
    couponAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
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
  declare quantity: number
  declare subtotal: string
  declare discountAmount: CreationOptional<string>
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
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    discountAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
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
