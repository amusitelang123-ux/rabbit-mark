import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize'
import { sequelize } from '../config/database'

/** 每日经营统计（预聚合，stat_daily） */
export class StatDaily extends Model<InferAttributes<StatDaily>, InferCreationAttributes<StatDaily>> {
  declare id: CreationOptional<number>
  declare statDate: string
  declare gmv: CreationOptional<string>
  declare orderCount: CreationOptional<number>
  declare paidCount: CreationOptional<number>
  declare newUsers: CreationOptional<number>
  declare refundAmount: CreationOptional<string>
  declare avgOrderAmount: CreationOptional<string>
  declare createdAt: CreationOptional<Date>
}

StatDaily.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    statDate: { type: DataTypes.DATEONLY, allowNull: false },
    gmv: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    orderCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    paidCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    newUsers: { type: DataTypes.INTEGER, defaultValue: 0 },
    refundAmount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    avgOrderAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    createdAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'stat_daily', timestamps: true, updatedAt: false },
)
