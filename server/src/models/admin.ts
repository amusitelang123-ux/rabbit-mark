import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize'
import { sequelize } from '../config/database'

export class AdminUser extends Model<InferAttributes<AdminUser>, InferCreationAttributes<AdminUser>> {
  declare id: CreationOptional<number>
  declare username: string
  declare password: string
  declare realName: string | null
  declare phone: string | null
  declare avatar: string | null
  declare roleId: number | null
  declare status: CreationOptional<number>
  declare lastLoginAt: Date | null
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
  declare deletedAt: CreationOptional<Date | null>
}

AdminUser.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING(50), allowNull: false },
    password: { type: DataTypes.STRING(255), allowNull: false },
    realName: { type: DataTypes.STRING(50), allowNull: true },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    avatar: { type: DataTypes.STRING(255), allowNull: true },
    roleId: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.TINYINT, defaultValue: 1 },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    deletedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'admin_users', timestamps: true, paranoid: true },
)

export class Role extends Model<InferAttributes<Role>, InferCreationAttributes<Role>> {
  declare id: CreationOptional<number>
  declare name: string
  declare code: string
  declare description: string | null
  declare status: CreationOptional<number>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

Role.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50), allowNull: false },
    code: { type: DataTypes.STRING(50), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
    status: { type: DataTypes.TINYINT, defaultValue: 1 },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'roles', timestamps: true },
)

export class Permission extends Model<InferAttributes<Permission>, InferCreationAttributes<Permission>> {
  declare id: CreationOptional<number>
  declare parentId: CreationOptional<number>
  declare name: string
  declare code: string
  declare type: CreationOptional<number>
  declare path: string | null
  declare component: string | null
  declare icon: string | null
  declare sort: CreationOptional<number>
}

Permission.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    parentId: { type: DataTypes.INTEGER, defaultValue: 0 },
    name: { type: DataTypes.STRING(50), allowNull: false },
    code: { type: DataTypes.STRING(80), allowNull: false },
    type: { type: DataTypes.TINYINT, defaultValue: 1 },
    path: { type: DataTypes.STRING(120), allowNull: true },
    component: { type: DataTypes.STRING(120), allowNull: true },
    icon: { type: DataTypes.STRING(50), allowNull: true },
    sort: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  { sequelize, tableName: 'permissions', timestamps: false },
)

/** 角色-权限关联 */
export class RolePermission extends Model<
  InferAttributes<RolePermission>,
  InferCreationAttributes<RolePermission>
> {
  declare id: CreationOptional<number>
  declare roleId: number
  declare permissionId: number
}

RolePermission.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    roleId: { type: DataTypes.INTEGER, allowNull: false },
    permissionId: { type: DataTypes.INTEGER, allowNull: false },
  },
  { sequelize, tableName: 'role_permissions', timestamps: false },
)

/** 后台操作日志 */
export class AdminLog extends Model<InferAttributes<AdminLog>, InferCreationAttributes<AdminLog>> {
  declare id: CreationOptional<number>
  declare adminId: number | null
  declare module: string | null
  declare action: string | null
  declare targetId: number | null
  declare content: string | null
  declare ip: string | null
  declare createdAt: CreationOptional<Date>
}

AdminLog.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    adminId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    module: { type: DataTypes.STRING(50), allowNull: true },
    action: { type: DataTypes.STRING(50), allowNull: true },
    targetId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    content: { type: DataTypes.STRING(1000), allowNull: true },
    ip: { type: DataTypes.STRING(64), allowNull: true },
    createdAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'admin_logs', timestamps: true, updatedAt: false },
)
