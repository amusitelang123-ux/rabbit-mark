import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize'
import { sequelize } from '../config/database'

/** 常见问题 FAQ */
export class Faq extends Model<InferAttributes<Faq>, InferCreationAttributes<Faq>> {
  declare id: CreationOptional<number>
  declare category: string
  declare question: string
  declare answer: string | null
  declare sort: CreationOptional<number>
  declare status: CreationOptional<number>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

Faq.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    category: { type: DataTypes.STRING(50), allowNull: false },
    question: { type: DataTypes.STRING(255), allowNull: false },
    answer: { type: DataTypes.TEXT, allowNull: true },
    sort: { type: DataTypes.INTEGER, defaultValue: 0 },
    status: { type: DataTypes.TINYINT, defaultValue: 1 },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'faqs', timestamps: true },
)

/** 物流公司字典 */
export class LogisticsCompany extends Model<
  InferAttributes<LogisticsCompany>,
  InferCreationAttributes<LogisticsCompany>
> {
  declare id: CreationOptional<number>
  declare name: string
  declare code: string
  declare phone: string | null
  declare sort: CreationOptional<number>
  declare status: CreationOptional<number>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

LogisticsCompany.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50), allowNull: false },
    code: { type: DataTypes.STRING(30), allowNull: false },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    sort: { type: DataTypes.INTEGER, defaultValue: 0 },
    status: { type: DataTypes.TINYINT, defaultValue: 1 },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'logistics_companies', timestamps: true },
)

/** 运费模板 */
export class FreightTemplate extends Model<
  InferAttributes<FreightTemplate>,
  InferCreationAttributes<FreightTemplate>
> {
  declare id: CreationOptional<number>
  declare name: string
  declare freeAmount: CreationOptional<string>
  declare baseFreight: CreationOptional<string>
  declare isDefault: CreationOptional<number>
  declare status: CreationOptional<number>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

FreightTemplate.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50), allowNull: false },
    freeAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    baseFreight: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    isDefault: { type: DataTypes.TINYINT, defaultValue: 0 },
    status: { type: DataTypes.TINYINT, defaultValue: 1 },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'freight_templates', timestamps: true },
)

/** 系统配置（A-75）：键值对形式，按分组归类 */
export class Setting extends Model<InferAttributes<Setting>, InferCreationAttributes<Setting>> {
  declare id: CreationOptional<number>
  declare configGroup: CreationOptional<string>
  declare configKey: string
  declare configValue: string | null
  declare remark: string | null
  declare updatedAt: CreationOptional<Date>
}

Setting.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    configGroup: { type: DataTypes.STRING(30), defaultValue: 'site' },
    configKey: { type: DataTypes.STRING(50), allowNull: false },
    configValue: { type: DataTypes.TEXT, allowNull: true },
    remark: { type: DataTypes.STRING(255), allowNull: true },
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'settings', timestamps: true, updatedAt: true, createdAt: false },
)

/** 留言工单（U-70/U-74）：咨询 / 投诉 / 建议 */
export class Feedback extends Model<InferAttributes<Feedback>, InferCreationAttributes<Feedback>> {
  declare id: CreationOptional<number>
  declare userId: number
  declare type: CreationOptional<number>
  declare content: string
  declare images: string[] | null
  declare contact: string | null
  declare orderNo: string | null
  declare status: CreationOptional<number>
  declare replyContent: string | null
  declare replyAt: Date | null
  declare replier: string | null
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

Feedback.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    type: { type: DataTypes.TINYINT, defaultValue: 1 },
    content: { type: DataTypes.TEXT, allowNull: false },
    images: { type: DataTypes.JSON, allowNull: true },
    contact: { type: DataTypes.STRING(100), allowNull: true },
    orderNo: { type: DataTypes.STRING(32), allowNull: true },
    status: { type: DataTypes.TINYINT, defaultValue: 0 },
    replyContent: { type: DataTypes.TEXT, allowNull: true },
    replyAt: { type: DataTypes.DATE, allowNull: true },
    replier: { type: DataTypes.STRING(50), allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'feedbacks', timestamps: true },
)

/** 首页推荐楼层（A-44）：人工编排标题、入口分类与选品 */
export class HomeFloor extends Model<InferAttributes<HomeFloor>, InferCreationAttributes<HomeFloor>> {
  declare id: CreationOptional<number>
  declare title: string
  declare subtitle: string | null
  declare categoryId: number | null
  declare sort: CreationOptional<number>
  declare status: CreationOptional<number>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

HomeFloor.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING(50), allowNull: false },
    subtitle: { type: DataTypes.STRING(100), allowNull: true },
    categoryId: { type: DataTypes.INTEGER, allowNull: true },
    sort: { type: DataTypes.INTEGER, defaultValue: 0 },
    status: { type: DataTypes.TINYINT, defaultValue: 1 },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'home_floors', timestamps: true },
)

/** 楼层选品：sort 决定楼层内商品顺序 */
export class HomeFloorProduct extends Model<
  InferAttributes<HomeFloorProduct>,
  InferCreationAttributes<HomeFloorProduct>
> {
  declare id: CreationOptional<number>
  declare floorId: number
  declare productId: number
  declare sort: CreationOptional<number>
}

HomeFloorProduct.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    floorId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    productId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    sort: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  { sequelize, tableName: 'home_floor_products', timestamps: false },
)
