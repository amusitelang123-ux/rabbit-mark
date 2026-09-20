import { sequelize } from '../config/database'
import { User, UserAddress, UserFavorite, UserFootprint, UserLevel } from './user'
import {
  Brand,
  Category,
  InventoryLog,
  Product,
  ProductComment,
  ProductImage,
  ProductSku,
} from './product'
import { Cart, Order, OrderItem, OrderLogistics, PaymentRecord } from './trade'
import {
  Banner,
  Coupon,
  Notice,
  SeckillActivity,
  SeckillProduct,
  UserCoupon,
} from './marketing'
import { AdminUser, Permission, Role } from './admin'

/* ------------------------------ Associations ------------------------------ */

UserLevel.hasMany(User, { foreignKey: 'levelId', as: 'users' })
User.belongsTo(UserLevel, { foreignKey: 'levelId', as: 'level' })

User.hasMany(UserAddress, { foreignKey: 'userId', as: 'addresses' })
UserAddress.belongsTo(User, { foreignKey: 'userId', as: 'user' })

User.hasMany(UserFavorite, { foreignKey: 'userId', as: 'favorites' })
UserFavorite.belongsTo(User, { foreignKey: 'userId', as: 'user' })

User.hasMany(UserFootprint, { foreignKey: 'userId', as: 'footprints' })
UserFootprint.belongsTo(User, { foreignKey: 'userId', as: 'user' })

Category.hasMany(Category, { foreignKey: 'parentId', as: 'children' })
Category.belongsTo(Category, { foreignKey: 'parentId', as: 'parent' })
Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' })
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' })

Brand.hasMany(Product, { foreignKey: 'brandId', as: 'products' })
Product.belongsTo(Brand, { foreignKey: 'brandId', as: 'brand' })

Product.hasMany(ProductSku, { foreignKey: 'productId', as: 'skus' })
ProductSku.belongsTo(Product, { foreignKey: 'productId', as: 'product' })

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
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' })
Order.hasOne(OrderLogistics, { foreignKey: 'orderId', as: 'logistics' })
OrderLogistics.belongsTo(Order, { foreignKey: 'orderId', as: 'order' })
Order.hasMany(PaymentRecord, { foreignKey: 'orderId', as: 'payments' })
PaymentRecord.belongsTo(Order, { foreignKey: 'orderId', as: 'order' })

Coupon.hasMany(UserCoupon, { foreignKey: 'couponId', as: 'userCoupons' })
UserCoupon.belongsTo(Coupon, { foreignKey: 'couponId', as: 'coupon' })
User.hasMany(UserCoupon, { foreignKey: 'userId', as: 'coupons' })
UserCoupon.belongsTo(User, { foreignKey: 'userId', as: 'user' })

SeckillActivity.hasMany(SeckillProduct, { foreignKey: 'activityId', as: 'products' })
SeckillProduct.belongsTo(SeckillActivity, { foreignKey: 'activityId', as: 'activity' })
SeckillProduct.belongsTo(Product, { foreignKey: 'productId', as: 'product' })

export {
  sequelize,
  User,
  UserLevel,
  UserAddress,
  UserFavorite,
  UserFootprint,
  Category,
  Brand,
  Product,
  ProductSku,
  ProductImage,
  ProductComment,
  InventoryLog,
  Cart,
  Order,
  OrderItem,
  OrderLogistics,
  PaymentRecord,
  Coupon,
  UserCoupon,
  Banner,
  Notice,
  SeckillActivity,
  SeckillProduct,
  AdminUser,
  Role,
  Permission,
}
