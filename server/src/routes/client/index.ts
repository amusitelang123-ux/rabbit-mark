import { Router } from 'express'
import { optionalAuth, requireAuth } from '../../middlewares/auth'
import * as auth from '../../controllers/client/authController'
import * as catalog from '../../controllers/client/catalogController'
import * as user from '../../controllers/client/userController'
import * as cart from '../../controllers/client/cartController'
import * as order from '../../controllers/client/orderController'
import * as coupon from '../../controllers/client/couponController'

const router = Router()

/* 认证 */
router.post('/auth/register', auth.register)
router.post('/auth/login', auth.login)
router.post('/auth/sms-code', auth.sendSmsCode)
router.post('/auth/refresh', auth.refresh)

/* 首页与商品 */
router.get('/home', catalog.home)
router.get('/categories', catalog.categories)
router.get('/brands', catalog.brands)
router.get('/products', catalog.products)
router.get('/products/:id', optionalAuth, catalog.productDetail)
router.get('/products/:id/comments', catalog.productComments)
router.get('/products/:id/recommend', catalog.recommend)

/* 用户中心 */
router.get('/user/profile', requireAuth, user.profile)
router.put('/user/profile', requireAuth, user.updateProfile)
router.get('/user/addresses', requireAuth, user.addresses)
router.post('/user/addresses', requireAuth, user.createAddress)
router.put('/user/addresses/:id', requireAuth, user.updateAddress)
router.delete('/user/addresses/:id', requireAuth, user.deleteAddress)
router.get('/user/favorites', requireAuth, user.favorites)
router.post('/user/favorites/toggle', requireAuth, user.toggleFavorite)
router.get('/user/footprints', requireAuth, user.footprints)

/* 购物车 */
router.get('/cart', requireAuth, cart.list)
router.post('/cart', requireAuth, cart.add)
router.put('/cart/select-all', requireAuth, cart.selectAll)
router.put('/cart/:id', requireAuth, cart.update)
router.delete('/cart', requireAuth, cart.remove)

/* 订单 */
router.post('/orders', requireAuth, order.create)
router.get('/orders', requireAuth, order.list)
router.get('/orders/:orderNo', requireAuth, order.detail)
router.put('/orders/:orderNo/cancel', requireAuth, order.cancel)
router.put('/orders/:orderNo/confirm', requireAuth, order.confirm)

/* 优惠券 */
router.get('/coupons/center', coupon.center)
router.post('/coupons/:id/receive', requireAuth, coupon.receive)
router.get('/user/coupons', requireAuth, coupon.mine)

export default router
