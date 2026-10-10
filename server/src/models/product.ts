import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize'
import { sequelize } from '../config/database'

export interface SpecJson {
  [key: string]: string
}

export class Category extends Model<InferAttributes<Category>, InferCreationAttributes<Category>> {
  declare id: CreationOptional<number>
  declare parentId: CreationOptional<number>
  declare name: string
  declare level: CreationOptional<number>
  declare icon: string | null
  declare sort: CreationOptional<number>
  declare status: CreationOptional<number>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

Category.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    parentId: { type: DataTypes.INTEGER, defaultValue: 0 },
    name: { type: DataTypes.STRING(50), allowNull: false },
    level: { type: DataTypes.TINYINT, defaultValue: 1 },
    icon: { type: DataTypes.STRING(255), allowNull: true },
    sort: { type: DataTypes.INTEGER, defaultValue: 0 },
    status: { type: DataTypes.TINYINT, defaultValue: 1 },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'categories', timestamps: true },
)

export class Brand extends Model<InferAttributes<Brand>, InferCreationAttributes<Brand>> {
  declare id: CreationOptional<number>
  declare name: string
  declare logo: string | null
  declare sort: CreationOptional<number>
  declare status: CreationOptional<number>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

Brand.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50), allowNull: false },
    logo: { type: DataTypes.STRING(255), allowNull: true },
    sort: { type: DataTypes.INTEGER, defaultValue: 0 },
    status: { type: DataTypes.TINYINT, defaultValue: 1 },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'brands', timestamps: true },
)

export class Product extends Model<InferAttributes<Product>, InferCreationAttributes<Product>> {
  declare id: CreationOptional<number>
  declare name: string
  declare subtitle: string | null
  declare categoryId: number
  declare brandId: number | null
  declare mainImage: string | null
  declare detailHtml: string | null
  declare unit: CreationOptional<string>
  declare weight: CreationOptional<string>
  declare priceMin: CreationOptional<string>
  declare priceMax: CreationOptional<string>
  declare totalStock: CreationOptional<number>
  declare salesCount: CreationOptional<number>
  declare commentCount: CreationOptional<number>
  declare avgScore: CreationOptional<string>
  declare isRecommend: CreationOptional<number>
  declare sort: CreationOptional<number>
  declare status: CreationOptional<number>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
  declare deletedAt: CreationOptional<Date | null>
}

Product.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(200), allowNull: false },
    subtitle: { type: DataTypes.STRING(255), allowNull: true },
    categoryId: { type: DataTypes.INTEGER, allowNull: false },
    brandId: { type: DataTypes.INTEGER, allowNull: true },
    mainImage: { type: DataTypes.STRING(255), allowNull: true },
    detailHtml: { type: DataTypes.TEXT('medium'), allowNull: true },
    unit: { type: DataTypes.STRING(20), defaultValue: '件' },
    weight: { type: DataTypes.DECIMAL(8, 2), defaultValue: 0 },
    priceMin: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    priceMax: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    totalStock: { type: DataTypes.INTEGER, defaultValue: 0 },
    salesCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    commentCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    avgScore: { type: DataTypes.DECIMAL(3, 2), defaultValue: 5 },
    isRecommend: { type: DataTypes.TINYINT, defaultValue: 0 },
    sort: { type: DataTypes.INTEGER, defaultValue: 0 },
    status: { type: DataTypes.TINYINT, defaultValue: 0 },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    deletedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'products', timestamps: true, paranoid: true },
)

export class ProductSku extends Model<InferAttributes<ProductSku>, InferCreationAttributes<ProductSku>> {
  declare id: CreationOptional<number>
  declare productId: number
  declare skuCode: string
  declare specJson: SpecJson
  declare specText: string | null
  declare image: string | null
  declare price: string
  declare marketPrice: string | null
  declare costPrice: string | null
  declare stock: CreationOptional<number>
  declare lockedStock: CreationOptional<number>
  declare warnStock: CreationOptional<number>
  declare weight: CreationOptional<string>
  declare status: CreationOptional<number>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

ProductSku.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    productId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    skuCode: { type: DataTypes.STRING(64), allowNull: false },
    specJson: { type: DataTypes.JSON, allowNull: false },
    specText: { type: DataTypes.STRING(200), allowNull: true },
    image: { type: DataTypes.STRING(255), allowNull: true },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    marketPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    costPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    stock: { type: DataTypes.INTEGER, defaultValue: 0 },
    lockedStock: { type: DataTypes.INTEGER, defaultValue: 0 },
    warnStock: { type: DataTypes.INTEGER, defaultValue: 10 },
    weight: { type: DataTypes.DECIMAL(8, 2), defaultValue: 0 },
    status: { type: DataTypes.TINYINT, defaultValue: 1 },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'product_skus', timestamps: true },
)

export class ProductImage extends Model<InferAttributes<ProductImage>, InferCreationAttributes<ProductImage>> {
  declare id: CreationOptional<number>
  declare productId: number
  declare image: string
  declare sort: CreationOptional<number>
  declare createdAt: CreationOptional<Date>
}

ProductImage.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    productId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    image: { type: DataTypes.STRING(255), allowNull: false },
    sort: { type: DataTypes.INTEGER, defaultValue: 0 },
    createdAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'product_images', timestamps: true, updatedAt: false },
)

export class ProductComment extends Model<
  InferAttributes<ProductComment>,
  InferCreationAttributes<ProductComment>
> {
  declare id: CreationOptional<number>
  declare userId: number
  declare productId: number
  declare skuId: number | null
  declare orderId: number | null
  declare orderItemId: number | null
  declare score: CreationOptional<number>
  declare content: string
  declare images: string[] | null
  declare isAnonymous: CreationOptional<number>
  declare replyContent: string | null
  declare replyAt: Date | null
  declare status: CreationOptional<number>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

ProductComment.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    productId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    skuId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    orderId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    orderItemId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    score: { type: DataTypes.TINYINT, defaultValue: 5 },
    content: { type: DataTypes.STRING(1000), allowNull: false },
    images: { type: DataTypes.JSON, allowNull: true },
    isAnonymous: { type: DataTypes.TINYINT, defaultValue: 0 },
    replyContent: { type: DataTypes.STRING(500), allowNull: true },
    replyAt: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.TINYINT, defaultValue: 1 },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'product_comments', timestamps: true },
)

export class InventoryLog extends Model<InferAttributes<InventoryLog>, InferCreationAttributes<InventoryLog>> {
  declare id: CreationOptional<number>
  declare skuId: number
  declare type: number
  declare change: number
  declare before: number
  declare after: number
  declare operator: string | null
  declare remark: string | null
  declare createdAt: CreationOptional<Date>
}

InventoryLog.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    skuId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    type: { type: DataTypes.TINYINT, allowNull: false },
    change: { type: DataTypes.INTEGER, allowNull: false },
    before: { type: DataTypes.INTEGER, allowNull: false },
    after: { type: DataTypes.INTEGER, allowNull: false },
    operator: { type: DataTypes.STRING(50), allowNull: true },
    remark: { type: DataTypes.STRING(255), allowNull: true },
    createdAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'inventory_logs', timestamps: true, updatedAt: false },
)

/** 规格组（如 颜色 / 尺码），可复用的规格模板 */
export class SpecGroup extends Model<InferAttributes<SpecGroup>, InferCreationAttributes<SpecGroup>> {
  declare id: CreationOptional<number>
  declare name: string
  declare sort: CreationOptional<number>
  declare createdAt: CreationOptional<Date>
}

SpecGroup.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50), allowNull: false },
    sort: { type: DataTypes.INTEGER, defaultValue: 0 },
    createdAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'spec_groups', timestamps: true, updatedAt: false },
)

/** 规格值 */
export class SpecValue extends Model<InferAttributes<SpecValue>, InferCreationAttributes<SpecValue>> {
  declare id: CreationOptional<number>
  declare groupId: number
  declare value: string
  declare sort: CreationOptional<number>
}

SpecValue.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    groupId: { type: DataTypes.INTEGER, allowNull: false },
    value: { type: DataTypes.STRING(50), allowNull: false },
    sort: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  { sequelize, tableName: 'spec_values', timestamps: false },
)

/** 商品参数（如 产地 / 材质） */
export class ProductAttribute extends Model<
  InferAttributes<ProductAttribute>,
  InferCreationAttributes<ProductAttribute>
> {
  declare id: CreationOptional<number>
  declare productId: number
  declare name: string
  declare value: string
  declare sort: CreationOptional<number>
}

ProductAttribute.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    productId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(50), allowNull: false },
    value: { type: DataTypes.STRING(255), allowNull: false },
    sort: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  { sequelize, tableName: 'product_attributes', timestamps: false },
)
