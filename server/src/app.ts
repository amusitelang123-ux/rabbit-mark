import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'
import routes from './routes'
import { errorHandler, notFoundHandler } from './middlewares/error'
import { config } from './config'

export function createApp() {
  const app = express()

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(cors({ origin: config.corsOrigin, credentials: true }))
  app.use(express.json({ limit: '2mb' }))
  app.use(express.urlencoded({ extended: true }))
  if (config.env === 'development') app.use(morgan('dev'))

  // 静态资源（商品图片）
  app.use('/uploads', express.static(path.resolve(config.upload.dir)))

  // 所有接口挂载在 /api 下
  app.use('/api', routes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
