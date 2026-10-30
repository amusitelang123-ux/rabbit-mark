import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize'
import { sequelize } from '../config/database'

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<number>
  declare username: string | null
  declare phone: string | null
  declare password: string
  /** 支付密码（bcrypt），未设置时为 null */
  declare payPassword: string | null
  declare nickname: string | null
  declare avatar: string | null
  declare gender: CreationOptional<number>
  declare birthday: string | null
  declare levelId: number | null
  declare points: CreationOptional<number>
  declare totalSpent: CreationOptional<string>
  /** 账户余额（U-30 余额支付） */
  declare balance: CreationOptional<string>
  declare status: CreationOptional<number>
  declare lastLoginAt: Date | null
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
  declare deletedAt: CreationOptional<Date | null>
}

User.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING(50), allowNull: true },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    password: { type: DataTypes.STRING(255), allowNull: false },
    payPassword: { type: DataTypes.STRING(255), allowNull: true },
    nickname: { type: DataTypes.STRING(50), allowNull: true },
    avatar: { type: DataTypes.STRING(255), allowNull: true },
    gender: { type: DataTypes.TINYINT, defaultValue: 0 },
    birthday: { type: DataTypes.DATEONLY, allowNull: true },
    levelId: { type: DataTypes.INTEGER, allowNull: true },
    points: { type: DataTypes.INTEGER, defaultValue: 0 },
    totalSpent: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    balance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    status: { type: DataTypes.TINYINT, defaultValue: 1 },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    deletedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'users', timestamps: true, paranoid: true },
)

export class UserLevel extends Model<InferAttributes<UserLevel>, InferCreationAttributes<UserLevel>> {
  declare id: CreationOptional<number>
  declare name: string
  declare minSpent: CreationOptional<string>
  declare discountRate: CreationOptional<string>
  declare icon: string | null
  declare sort: CreationOptional<number>
  declare status: CreationOptional<number>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

UserLevel.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50), allowNull: false },
    minSpent: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    discountRate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 1 },
    icon: { type: DataTypes.STRING(255), allowNull: true },
    sort: { type: DataTypes.INTEGER, defaultValue: 0 },
    status: { type: DataTypes.TINYINT, defaultValue: 1 },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'user_levels', timestamps: true },
)

export class UserAddress extends Model<InferAttributes<UserAddress>, InferCreationAttributes<UserAddress>> {
  declare id: CreationOptional<number>
  declare userId: number
  declare receiver: string
  declare phone: string
  declare province: string
  declare city: string
  declare district: string
  declare detail: string
  declare isDefault: CreationOptional<number>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
  declare deletedAt: CreationOptional<Date | null>
}

UserAddress.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    receiver: { type: DataTypes.STRING(50), allowNull: false },
    phone: { type: DataTypes.STRING(20), allowNull: false },
    province: { type: DataTypes.STRING(50), allowNull: false },
    city: { type: DataTypes.STRING(50), allowNull: false },
    district: { type: DataTypes.STRING(50), allowNull: false },
    detail: { type: DataTypes.STRING(255), allowNull: false },
    isDefault: { type: DataTypes.TINYINT, defaultValue: 0 },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    deletedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'user_addresses', timestamps: true, paranoid: true },
)

export class UserFavorite extends Model<InferAttributes<UserFavorite>, InferCreationAttributes<UserFavorite>> {
  declare id: CreationOptional<number>
  declare userId: number
  declare productId: number
  declare createdAt: CreationOptional<Date>
}

UserFavorite.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    productId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    createdAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'user_favorites', timestamps: true, updatedAt: false },
)

export class UserFootprint extends Model<InferAttributes<UserFootprint>, InferCreationAttributes<UserFootprint>> {
  declare id: CreationOptional<number>
  declare userId: number
  declare productId: number
  declare viewedAt: CreationOptional<Date>
}

UserFootprint.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    productId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    viewedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'user_footprints', timestamps: false },
)

/** 积分流水：1签到 2消费获得 3积分抵扣 4后台调整 */
export class UserPointsLog extends Model<
  InferAttributes<UserPointsLog>,
  InferCreationAttributes<UserPointsLog>
> {
  declare id: CreationOptional<number>
  declare userId: number
  declare type: number
  declare change: number
  declare balance: number
  declare remark: string | null
  declare createdAt: CreationOptional<Date>
}

UserPointsLog.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    type: { type: DataTypes.TINYINT, allowNull: false },
    change: { type: DataTypes.INTEGER, allowNull: false },
    balance: { type: DataTypes.INTEGER, allowNull: false },
    remark: { type: DataTypes.STRING(255), allowNull: true },
    createdAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'user_points_log', timestamps: true, updatedAt: false },
)

/** 登录设备记录（U-45）：1密码 2短信 3注册 */
export class UserLoginLog extends Model<
  InferAttributes<UserLoginLog>,
  InferCreationAttributes<UserLoginLog>
> {
  declare id: CreationOptional<number>
  declare userId: number
  declare loginType: CreationOptional<number>
  declare ip: string | null
  declare userAgent: string | null
  declare loginAt: CreationOptional<Date>
}

UserLoginLog.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    loginType: { type: DataTypes.TINYINT, defaultValue: 1 },
    ip: { type: DataTypes.STRING(64), allowNull: true },
    userAgent: { type: DataTypes.STRING(255), allowNull: true },
    loginAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'user_login_logs', timestamps: false },
)

/** 用户标签（A-35）：后台打标/分群 */
export class UserTag extends Model<InferAttributes<UserTag>, InferCreationAttributes<UserTag>> {
  declare id: CreationOptional<number>
  declare name: string
  declare createdAt: CreationOptional<Date>
}

UserTag.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(30), allowNull: false },
    createdAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'user_tags', timestamps: true, updatedAt: false },
)

export class UserTagRelation extends Model<
  InferAttributes<UserTagRelation>,
  InferCreationAttributes<UserTagRelation>
> {
  declare id: CreationOptional<number>
  declare userId: number
  declare tagId: number
  declare createdAt: CreationOptional<Date>
}

UserTagRelation.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    tagId: { type: DataTypes.INTEGER, allowNull: false },
    createdAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'user_tag_relations', timestamps: true, updatedAt: false },
)
