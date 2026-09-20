import { Router } from 'express'
import clientRouter from './client'
import adminRouter from './admin'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({ code: 0, message: 'ok', data: { status: 'up', time: new Date().toISOString() } })
})

router.use('/client/v1', clientRouter)
router.use('/admin', adminRouter)

export default router
