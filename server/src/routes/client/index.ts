import { Router } from 'express'
import { optionalAuth, requireAuth } from '../../middlewares/auth'
import { avatarUpload } from '../../middlewares/upload'
import * as auth from '../../controllers/client/authController'
import * as catalog from '../../controllers/client/catalogController'
import * as user from '../../controllers/client/userController'
import * as cart from '../../controllers/client/cartController'
import * as order from '../../controllers/client/orderController'
import * as payment from '../../controllers/client/paymentController'
import * as refund from '../../controllers/client/refundController'
import * as comment from '../../controllers/client/commentController'
import * as points from '../../controllers/client/pointsController'
import * as content from '../../controllers/client/contentController'
import * as seckill from '../../controllers/client/seckillController'
import * as feedback from '../../controllers/client/feedbackController'
import * as coupon from '../../controllers/client/couponController'
import * as notice from '../../controllers/client/noticeController'

const router = Router()

/* 认证 */
router.post('/auth/register', auth.register)
router.get('/auth/captcha', auth.captcha)
router.post('/auth/login', auth.login)
router.post('/auth/sms-code', auth.sendSmsCode)
router.post('/auth/reset-password', auth.resetPassword)
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
router.put('/user/password', requireAuth, user.changePassword)
router.post('/user/avatar', requireAuth, avatarUpload.single('file'), user.uploadAvatar)
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

/* 支付 */
router.post('/payments/prepay', requireAuth, payment.prepay)
router.post('/payments/callback/:channel', payment.callback)
router.get('/payments/:payNo/status', requireAuth, payment.status)

/* 售后 */
router.post('/refunds', requireAuth, refund.apply)
router.get('/refunds', requireAuth, refund.mine)

/* 评价 */
router.get('/user/comments', requireAuth, comment.mine)
router.post('/comments', requireAuth, comment.create)

/* 积分 */
router.get('/user/points', requireAuth, points.myPoints)
router.post('/user/points/sign-in', requireAuth, points.signIn)

/* 满减活动 */
router.get('/promotions/active', points.activePromotions)

/* 秒杀 */
router.get('/seckills/active', seckill.active)

/* 帮助中心 */
router.get('/faqs', content.faqGroups)
router.get('/logistics-companies', content.logisticsCompanies)

/* 留言工单 */
router.post('/feedbacks', requireAuth, feedback.create)
router.get('/feedbacks', requireAuth, feedback.mine)

/* 公开配置 */
router.get('/config', feedback.publicConfig)

/* 优惠券 */
router.get('/coupons/center', coupon.center)
router.get('/coupons/preview', requireAuth, coupon.preview)
router.post('/coupons/:id/receive', requireAuth, coupon.receive)
router.get('/user/coupons', requireAuth, coupon.mine)

/* 公告（只读） */
router.get('/notices', notice.list)
router.get('/notices/:id', notice.detail)

export default router
