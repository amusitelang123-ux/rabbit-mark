import { Router } from 'express'
import { requireAdmin, requirePermission } from '../../middlewares/auth'
import { productUpload } from '../../middlewares/upload'
import * as admin from '../../controllers/admin/adminController'
import * as product from '../../controllers/admin/productController'
import * as category from '../../controllers/admin/categoryController'
import * as spec from '../../controllers/admin/specController'
import * as order from '../../controllers/admin/orderController'
import * as system from '../../controllers/admin/systemController'
import * as user from '../../controllers/admin/userController'
import * as refund from '../../controllers/admin/refundController'
import * as marketing from '../../controllers/admin/marketingController'
import * as stats from '../../controllers/admin/statsController'
import * as finance from '../../controllers/admin/financeController'
import * as comment from '../../controllers/admin/commentController'
import * as level from '../../controllers/admin/levelController'
import * as content from '../../controllers/admin/contentController'
import * as inventory from '../../controllers/admin/inventoryController'
import * as setting from '../../controllers/admin/settingController'
import * as feedback from '../../controllers/admin/feedbackController'

const router = Router()

/* 认证与概览 */
router.post('/login', admin.login)
router.get('/me', requireAdmin, admin.me)
router.get('/stats/overview', requirePermission('stats:view'), admin.overview)

/* 商品 SPU */
router.get('/products', requirePermission('product:view'), product.list)
router.get('/products/export', requirePermission('product:view'), product.exportCsv)
router.get('/products/import-template', requirePermission('product:create'), product.importTemplate)
router.post('/products/import', requirePermission('product:create'), product.importCsv)
router.get('/products/:id', requirePermission('product:view'), product.detail)
router.post('/products', requirePermission('product:create'), product.create)
router.put('/products/batch/status', requirePermission('product:update'), product.batchStatus)
router.post('/products/batch/delete', requirePermission('product:delete'), product.batchRemove)
router.put('/products/:id', requirePermission('product:update'), product.update)
router.delete('/products/:id', requirePermission('product:delete'), product.remove)
router.put('/products/:id/status', requirePermission('product:update'), product.setStatus)

/* SKU */
router.get('/products/:id/skus', requirePermission('product:view'), product.skus)
router.post('/products/:id/skus', requirePermission('product:create'), product.createSku)
router.post('/products/:id/skus/generate', requirePermission('product:create'), product.generateSkus)
router.put('/skus/:id', requirePermission('product:update'), product.updateSku)
router.delete('/skus/:id', requirePermission('product:delete'), product.removeSku)
router.put('/skus/:id/stock', requirePermission('product:update'), product.adjustStock)

/* 库存管理 */
router.get('/inventory/alerts', requirePermission('product:view'), inventory.alerts)
router.get('/inventory/logs', requirePermission('product:view'), inventory.logs)

/* 分类 / 品牌 / 规格模板 */
router.get('/categories', requirePermission('product:view'), category.tree)
router.post('/categories', requirePermission('product:create'), category.create)
router.put('/categories/:id', requirePermission('product:update'), category.update)
router.delete('/categories/:id', requirePermission('product:delete'), category.remove)
router.get('/brands', requirePermission('product:view'), category.brands)
router.post('/brands', requirePermission('product:create'), category.createBrand)
router.put('/brands/:id', requirePermission('product:update'), category.updateBrand)
router.delete('/brands/:id', requirePermission('product:delete'), category.removeBrand)
router.get('/spec-groups', requirePermission('product:view'), spec.groups)
router.post('/spec-groups', requirePermission('product:create'), spec.createGroup)
router.put('/spec-groups/:id', requirePermission('product:update'), spec.updateGroup)
router.delete('/spec-groups/:id', requirePermission('product:delete'), spec.removeGroup)

/* 订单 */
router.get('/orders', requirePermission('order:view'), order.list)
router.get('/orders/export', requirePermission('order:view'), order.exportCsv)
router.post('/orders/batch/ship', requirePermission('order:ship'), order.batchShip)
router.get('/orders/:orderNo', requirePermission('order:view'), order.detail)
router.post('/orders/:orderNo/ship', requirePermission('order:ship'), order.ship)
router.put('/orders/:orderNo/close', requirePermission('order:update'), order.close)
router.put('/orders/:orderNo/remark', requirePermission('order:update'), order.remark)

/* 售后 */
router.get('/refunds', requirePermission('refund:view'), refund.list)
router.put('/refunds/:id/audit', requirePermission('refund:audit'), refund.audit)

/* 用户 */
router.get('/users', requirePermission('user:view'), user.list)
router.get('/users/:id', requirePermission('user:view'), user.detail)
router.put('/users/:id/status', requirePermission('user:update'), user.setStatus)
router.get('/users/:id/points', requirePermission('user:view'), user.points)
router.post('/users/:id/points', requirePermission('points:adjust'), user.adjustPoints)

/* 会员等级 */
router.get('/levels', requirePermission('level:view'), level.list)
router.post('/levels', requirePermission('level:update'), level.create)
router.put('/levels/:id', requirePermission('level:update'), level.update)
router.delete('/levels/:id', requirePermission('level:update'), level.remove)

/* 评价管理 */
router.get('/comments', requirePermission('comment:view'), comment.list)
router.put('/comments/:id/status', requirePermission('comment:update'), comment.setStatus)
router.put('/comments/:id/reply', requirePermission('comment:update'), comment.reply)

/* 营销：优惠券 / 运营位 / 公告 */
router.get('/coupons', requirePermission('marketing:view'), marketing.coupons)
router.post('/coupons', requirePermission('marketing:create'), marketing.createCoupon)
router.put('/coupons/:id', requirePermission('marketing:update'), marketing.updateCoupon)
router.delete('/coupons/:id', requirePermission('marketing:delete'), marketing.removeCoupon)
router.get('/banners', requirePermission('marketing:view'), marketing.banners)
router.post('/banners', requirePermission('marketing:create'), marketing.createBanner)
router.put('/banners/:id', requirePermission('marketing:update'), marketing.updateBanner)
router.delete('/banners/:id', requirePermission('marketing:delete'), marketing.removeBanner)
router.get('/notices', requirePermission('marketing:view'), marketing.notices)
router.post('/notices', requirePermission('marketing:create'), marketing.createNotice)
router.put('/notices/:id', requirePermission('marketing:update'), marketing.updateNotice)
router.delete('/notices/:id', requirePermission('marketing:delete'), marketing.removeNotice)

/* 秒杀 */
router.get('/seckills', requirePermission('marketing:view'), marketing.seckills)
router.post('/seckills', requirePermission('marketing:create'), marketing.createSeckill)
router.put('/seckills/:id', requirePermission('marketing:update'), marketing.updateSeckill)
router.put('/seckills/:id/status', requirePermission('marketing:update'), marketing.setSeckillStatus)
router.delete('/seckills/:id', requirePermission('marketing:delete'), marketing.removeSeckill)

/* 满减活动 */
router.get('/promotions', requirePermission('marketing:view'), marketing.promotions)
router.post('/promotions', requirePermission('marketing:create'), marketing.createPromotion)
router.put('/promotions/:id', requirePermission('marketing:update'), marketing.updatePromotion)
router.delete('/promotions/:id', requirePermission('marketing:delete'), marketing.removePromotion)

/* 帮助中心 FAQ */
router.get('/faqs', requirePermission('marketing:view'), content.faqs)
router.post('/faqs', requirePermission('marketing:create'), content.createFaq)
router.put('/faqs/:id', requirePermission('marketing:update'), content.updateFaq)
router.delete('/faqs/:id', requirePermission('marketing:delete'), content.removeFaq)

/* 物流配置 */
router.get('/logistics-companies', requirePermission('logistics:view'), content.logisticsCompanies)
router.post('/logistics-companies', requirePermission('logistics:update'), content.createLogisticsCompany)
router.put('/logistics-companies/:id', requirePermission('logistics:update'), content.updateLogisticsCompany)
router.delete('/logistics-companies/:id', requirePermission('logistics:update'), content.removeLogisticsCompany)
router.get('/freight-templates', requirePermission('logistics:view'), content.freightTemplates)
router.post('/freight-templates', requirePermission('logistics:update'), content.createFreightTemplate)
router.put('/freight-templates/:id', requirePermission('logistics:update'), content.updateFreightTemplate)
router.delete('/freight-templates/:id', requirePermission('logistics:update'), content.removeFreightTemplate)

/* 数据统计 */
router.get('/stats/sales-trend', requirePermission('stats:view'), stats.salesTrend)
router.get('/stats/product-rank', requirePermission('stats:view'), stats.productRank)
router.get('/stats/category-sales', requirePermission('stats:view'), stats.categorySales)
router.get('/stats/user-analysis', requirePermission('stats:view'), stats.userAnalysis)

/* 财务 */
router.get('/finance/records', requirePermission('finance:view'), finance.records)
router.get('/finance/reconciliation', requirePermission('finance:view'), finance.reconciliation)
router.get('/finance/invoices', requirePermission('finance:view'), finance.invoices)
router.put('/finance/invoices/:id', requirePermission('finance:view'), finance.setInvoiceStatus)

/* 留言工单 */
router.get('/feedbacks', requirePermission('feedback:view'), feedback.list)
router.put('/feedbacks/:id/reply', requirePermission('feedback:update'), feedback.reply)
router.put('/feedbacks/:id/close', requirePermission('feedback:update'), feedback.close)

/* 系统配置 */
router.get('/settings', requirePermission('system:view'), setting.list)
router.put('/settings', requirePermission('system:update'), setting.update)

/* 系统与权限 */
router.get('/admins', requirePermission('system:view'), system.admins)
router.post('/admins', requirePermission('system:create'), system.createAdmin)
router.put('/admins/:id', requirePermission('system:update'), system.updateAdmin)
router.put('/admins/:id/password', requirePermission('system:update'), system.resetPassword)
router.delete('/admins/:id', requirePermission('system:delete'), system.removeAdmin)
router.get('/roles', requirePermission('system:view'), system.roles)
router.post('/roles', requirePermission('system:create'), system.createRole)
router.put('/roles/:id', requirePermission('system:update'), system.updateRole)
router.delete('/roles/:id', requirePermission('system:delete'), system.removeRole)
router.put('/roles/:id/permissions', requirePermission('system:update'), system.setRolePermissions)
router.get('/permissions', requirePermission('system:view'), system.permissions)
router.get('/logs', requirePermission('system:view'), system.logs)

/* 文件上传 */
router.post('/upload', requirePermission('product:create'), productUpload.single('file'), product.upload)

export default router
