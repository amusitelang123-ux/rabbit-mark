import { Router } from 'express'
import { requireAdmin } from '../../middlewares/auth'
import * as admin from '../../controllers/admin/adminController'

const router = Router()

router.post('/login', admin.login)
router.get('/me', requireAdmin, admin.me)

router.get('/stats/overview', requireAdmin, admin.overview)
router.get('/products', requireAdmin, admin.products)
router.get('/orders', requireAdmin, admin.orders)

export default router
