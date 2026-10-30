import { sequelize } from '../config/database'
import {
  User,
  UserAddress,
  UserFavorite,
  UserFootprint,
  UserLevel,
  UserLoginLog,
  UserPointsLog,
  UserTag,
  UserTagRelation,
} from './user'
import {
  Brand,
  Category,
  InventoryLog,
  Product,
  ProductAttribute,
  ProductComment,
  ProductImage,
  ProductSku,
  SpecGroup,
  SpecValue,
} from './product'
import {
  Cart,
  FinanceRecord,
  Invoice,
  Order,
  OrderItem,
  OrderLog,
  OrderLogistics,
  OrderRefund,
  PaymentRecord,
} from './trade'
import {
  Banner,
  Coupon,
  Notice,
  Promotion,
  SeckillActivity,
  SeckillProduct,
  UserCoupon,
} from './marketing'
import { AdminUser, AdminLog, Permission, Role, RolePermission } from './admin'
import {
  Faq,
  Feedback,
  FreightTemplate,
  HomeFloor,
  HomeFloorProduct,
  LogisticsCompany,
  Setting,
} from './content'
import { StatDaily } from './stat'
import { BalanceLog, BalanceRecharge } from './wallet'

/* ------------------------------ Associations ------------------------------ */

UserLevel.hasMany(User, { foreignKey: 'levelId', as: 'users' })
User.belongsTo(UserLevel, { foreignKey: 'levelId', as: 'level' })

User.hasMany(UserAddress, { foreignKey: 'userId', as: 'addresses' })
UserAddress.belongsTo(User, { foreignKey: 'userId', as: 'user' })

User.hasMany(UserFavorite, { foreignKey: 'userId', as: 'favorites' })
UserFavorite.belongsTo(User, { foreignKey: 'userId', as: 'user' })

User.hasMany(UserFootprint, { foreignKey: 'userId', as: 'footprints' })
UserFootprint.belongsTo(User, { foreignKey: 'userId', as: 'user' })

User.hasMany(UserLoginLog, { foreignKey: 'userId', as: 'loginLogs' })
UserLoginLog.belongsTo(User, { foreignKey: 'userId', as: 'user' })

User.hasMany(BalanceRecharge, { foreignKey: 'userId', as: 'recharges' })
BalanceRecharge.belongsTo(User, { foreignKey: 'userId', as: 'user' })
User.hasMany(BalanceLog, { foreignKey: 'userId', as: 'balanceLogs' })
BalanceLog.belongsTo(User, { foreignKey: 'userId', as: 'user' })

User.hasMany(UserTagRelation, { foreignKey: 'userId', as: 'tagRelations' })
UserTagRelation.belongsTo(User, { foreignKey: 'userId', as: 'user' })
UserTagRelation.belongsTo(UserTag, { foreignKey: 'tagId', as: 'tag' })
UserTag.hasMany(UserTagRelation, { foreignKey: 'tagId', as: 'relations' })

Category.hasMany(Category, { foreignKey: 'parentId', as: 'children' })
Category.belongsTo(Category, { foreignKey: 'parentId', as: 'parent' })
Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' })
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' })

Brand.hasMany(Product, { foreignKey: 'brandId', as: 'products' })
Product.belongsTo(Brand, { foreignKey: 'brandId', as: 'brand' })

Product.hasMany(ProductSku, { foreignKey: 'productId', as: 'skus' })
ProductSku.belongsTo(Product, { foreignKey: 'productId', as: 'product' })
InventoryLog.belongsTo(ProductSku, { foreignKey: 'skuId', as: 'sku' })

Product.hasMany(ProductImage, { foreignKey: 'productId', as: 'imageList' })
ProductImage.belongsTo(Product, { foreignKey: 'productId', as: 'product' })

Product.hasMany(ProductComment, { foreignKey: 'productId', as: 'comments' })
ProductComment.belongsTo(Product, { foreignKey: 'productId', as: 'product' })
ProductComment.belongsTo(User, { foreignKey: 'userId', as: 'user' })
User.hasMany(ProductComment, { foreignKey: 'userId', as: 'comments' })

Cart.belongsTo(Product, { foreignKey: 'productId', as: 'product' })
Cart.belongsTo(ProductSku, { foreignKey: 'skuId', as: 'sku' })
User.hasMany(Cart, { foreignKey: 'userId', as: 'carts' })
Cart.belongsTo(User, { foreignKey: 'userId', as: 'user' })

Order.belongsTo(User, { foreignKey: 'userId', as: 'user' })
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' })
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' })
Order.hasMany(OrderLog, { foreignKey: 'orderId', as: 'logs' })
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' })
Order.hasOne(OrderLogistics, { foreignKey: 'orderId', as: 'logistics' })
OrderLogistics.belongsTo(Order, { foreignKey: 'orderId', as: 'order' })
Order.hasMany(PaymentRecord, { foreignKey: 'orderId', as: 'payments' })
PaymentRecord.belongsTo(Order, { foreignKey: 'orderId', as: 'order' })

Order.hasMany(OrderRefund, { foreignKey: 'orderId', as: 'refunds' })
OrderRefund.belongsTo(Order, { foreignKey: 'orderId', as: 'order' })
OrderRefund.belongsTo(OrderItem, { foreignKey: 'orderItemId', as: 'item' })

Order.hasMany(FinanceRecord, { foreignKey: 'orderId', as: 'financeRecords' })
FinanceRecord.belongsTo(Order, { foreignKey: 'orderId', as: 'order' })

Order.hasOne(Invoice, { foreignKey: 'orderId', as: 'invoice' })
Invoice.belongsTo(Order, { foreignKey: 'orderId', as: 'order' })

Coupon.hasMany(UserCoupon, { foreignKey: 'couponId', as: 'userCoupons' })
UserCoupon.belongsTo(Coupon, { foreignKey: 'couponId', as: 'coupon' })
User.hasMany(UserCoupon, { foreignKey: 'userId', as: 'coupons' })
UserCoupon.belongsTo(User, { foreignKey: 'userId', as: 'user' })

SeckillActivity.hasMany(SeckillProduct, { foreignKey: 'activityId', as: 'products' })
SeckillProduct.belongsTo(SeckillActivity, { foreignKey: 'activityId', as: 'activity' })
SeckillProduct.belongsTo(Product, { foreignKey: 'productId', as: 'product' })
SeckillProduct.belongsTo(ProductSku, { foreignKey: 'skuId', as: 'sku' })

SpecGroup.hasMany(SpecValue, { foreignKey: 'groupId', as: 'values' })
SpecValue.belongsTo(SpecGroup, { foreignKey: 'groupId', as: 'group' })

Product.hasMany(ProductAttribute, { foreignKey: 'productId', as: 'attributes' })
ProductAttribute.belongsTo(Product, { foreignKey: 'productId', as: 'product' })

AdminUser.belongsTo(Role, { foreignKey: 'roleId', as: 'role' })
Role.hasMany(AdminUser, { foreignKey: 'roleId', as: 'admins' })
Role.hasMany(RolePermission, { foreignKey: 'roleId', as: 'rolePermissions' })
RolePermission.belongsTo(Role, { foreignKey: 'roleId', as: 'role' })
RolePermission.belongsTo(Permission, { foreignKey: 'permissionId', as: 'permission' })
AdminUser.hasMany(AdminLog, { foreignKey: 'adminId', as: 'logs' })
AdminLog.belongsTo(AdminUser, { foreignKey: 'adminId', as: 'admin' })
Feedback.belongsTo(User, { foreignKey: 'userId', as: 'user' })

HomeFloor.hasMany(HomeFloorProduct, { foreignKey: 'floorId', as: 'items' })
HomeFloorProduct.belongsTo(HomeFloor, { foreignKey: 'floorId', as: 'floor' })
HomeFloorProduct.belongsTo(Product, { foreignKey: 'productId', as: 'product' })

export {
  sequelize,
  User,
  UserLevel,
  UserAddress,
  UserFavorite,
  UserFootprint,
  UserPointsLog,
  UserLoginLog,
  UserTag,
  UserTagRelation,
  BalanceRecharge,
  BalanceLog,
  Category,
  Brand,
  Product,
  ProductSku,
  ProductImage,
  ProductComment,
  ProductAttribute,
  SpecGroup,
  SpecValue,
  InventoryLog,
  Cart,
  Order,
  OrderItem,
  OrderLogistics,
  OrderLog,
  OrderRefund,
  PaymentRecord,
  FinanceRecord,
  Invoice,
  Coupon,
  UserCoupon,
  Banner,
  Notice,
  Promotion,
  SeckillActivity,
  SeckillProduct,
  AdminUser,
  Role,
  Permission,
  RolePermission,
  AdminLog,
  Faq,
  LogisticsCompany,
  FreightTemplate,
  Setting,
  Feedback,
  HomeFloor,
  HomeFloorProduct,
  StatDaily,
}
