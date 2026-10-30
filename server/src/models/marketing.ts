import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize'
import { sequelize } from '../config/database'

export class Coupon extends Model<InferAttributes<Coupon>, InferCreationAttributes<Coupon>> {
  declare id: CreationOptional<number>
  declare name: string
  declare type: number
  declare amount: CreationOptional<string>
  declare discountRate: CreationOptional<string>
  declare minAmount: CreationOptional<string>
  declare totalCount: CreationOptional<number>
  declare receivedCount: CreationOptional<number>
  declare usedCount: CreationOptional<number>
  declare perUserLimit: CreationOptional<number>
  declare validType: CreationOptional<number>
  declare validStart: Date | null
  declare validEnd: Date | null
  declare validDays: number | null
  declare scope: CreationOptional<number>
  declare scopeIds: number[] | null
  declare status: CreationOptional<number>
  /** 新人券：注册成功后自动发放 */
  declare isNewUser: CreationOptional<number>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

Coupon.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    type: { type: DataTypes.TINYINT, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    discountRate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 1 },
    minAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    totalCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    receivedCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    usedCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    perUserLimit: { type: DataTypes.INTEGER, defaultValue: 1 },
    validType: { type: DataTypes.TINYINT, defaultValue: 1 },
    validStart: { type: DataTypes.DATE, allowNull: true },
    validEnd: { type: DataTypes.DATE, allowNull: true },
    validDays: { type: DataTypes.INTEGER, allowNull: true },
    scope: { type: DataTypes.TINYINT, defaultValue: 1 },
    scopeIds: { type: DataTypes.JSON, allowNull: true },
    status: { type: DataTypes.TINYINT, defaultValue: 1 },
    isNewUser: { type: DataTypes.TINYINT, defaultValue: 0 },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'coupons', timestamps: true },
)

export class UserCoupon extends Model<InferAttributes<UserCoupon>, InferCreationAttributes<UserCoupon>> {
  declare id: CreationOptional<number>
  declare userId: number
  declare couponId: number
  declare couponCode: string
  declare status: CreationOptional<number>
  declare orderId: number | null
  declare receivedAt: CreationOptional<Date>
  declare usedAt: Date | null
  declare expireAt: Date | null
}

UserCoupon.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    couponId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    couponCode: { type: DataTypes.STRING(32), allowNull: false },
    status: { type: DataTypes.TINYINT, defaultValue: 0 },
    orderId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    receivedAt: DataTypes.DATE,
    usedAt: { type: DataTypes.DATE, allowNull: true },
    expireAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: 'user_coupons', timestamps: false },
)

export class Banner extends Model<InferAttributes<Banner>, InferCreationAttributes<Banner>> {
  declare id: CreationOptional<number>
  declare title: string
  declare subtitle: string | null
  declare image: string
  declare link: string | null
  declare bg: string | null
  declare position: CreationOptional<string>
  declare sort: CreationOptional<number>
  declare startTime: Date | null
  declare endTime: Date | null
  declare status: CreationOptional<number>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

Banner.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING(100), allowNull: false },
    subtitle: { type: DataTypes.STRING(200), allowNull: true },
    image: { type: DataTypes.STRING(255), allowNull: false },
    link: { type: DataTypes.STRING(255), allowNull: true },
    bg: { type: DataTypes.STRING(50), allowNull: true },
    position: { type: DataTypes.STRING(30), defaultValue: 'home_top' },
    sort: { type: DataTypes.INTEGER, defaultValue: 0 },
    startTime: { type: DataTypes.DATE, allowNull: true },
    endTime: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.TINYINT, defaultValue: 1 },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'banners', timestamps: true },
)

export class Notice extends Model<InferAttributes<Notice>, InferCreationAttributes<Notice>> {
  declare id: CreationOptional<number>
  declare title: string
  declare content: string | null
  declare type: CreationOptional<number>
  declare status: CreationOptional<number>
  declare publishAt: Date | null
  declare createdAt: CreationOptional<Date>
}

Notice.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: true },
    type: { type: DataTypes.TINYINT, defaultValue: 1 },
    status: { type: DataTypes.TINYINT, defaultValue: 1 },
    publishAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'notices', timestamps: true, updatedAt: false },
)

export class Promotion extends Model<InferAttributes<Promotion>, InferCreationAttributes<Promotion>> {
  declare id: CreationOptional<number>
  declare name: string
  declare type: number
  declare ruleJson: {
    thresholds: {
      amount: number
      reduce?: number
      giftProductId?: number
      giftSkuId?: number
      giftQuantity?: number
    }[]
  }
  declare startTime: Date
  declare endTime: Date
  declare status: CreationOptional<number>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

Promotion.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    type: { type: DataTypes.TINYINT, allowNull: false },
    ruleJson: { type: DataTypes.JSON, allowNull: false },
    startTime: { type: DataTypes.DATE, allowNull: false },
    endTime: { type: DataTypes.DATE, allowNull: false },
    status: { type: DataTypes.TINYINT, defaultValue: 1 },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'promotions', timestamps: true },
)

export class SeckillProduct extends Model<
  InferAttributes<SeckillProduct>,
  InferCreationAttributes<SeckillProduct>
> {
  declare id: CreationOptional<number>
  declare activityId: number
  declare productId: number
  declare skuId: number
  declare seckillPrice: string
  declare seckillStock: CreationOptional<number>
  declare soldCount: CreationOptional<number>
  declare limitPerUser: CreationOptional<number>
  declare sort: CreationOptional<number>
}

SeckillProduct.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    activityId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    productId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    skuId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    seckillPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    seckillStock: { type: DataTypes.INTEGER, defaultValue: 0 },
    soldCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    limitPerUser: { type: DataTypes.INTEGER, defaultValue: 1 },
    sort: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  { sequelize, tableName: 'seckill_products', timestamps: false },
)

export class SeckillActivity extends Model<
  InferAttributes<SeckillActivity>,
  InferCreationAttributes<SeckillActivity>
> {
  declare id: CreationOptional<number>
  declare name: string
  declare startTime: Date
  declare endTime: Date
  declare status: CreationOptional<number>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

SeckillActivity.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    startTime: { type: DataTypes.DATE, allowNull: false },
    endTime: { type: DataTypes.DATE, allowNull: false },
    status: { type: DataTypes.TINYINT, defaultValue: 0 },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'seckill_activities', timestamps: true },
)
