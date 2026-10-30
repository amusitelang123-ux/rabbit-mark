import { createApp } from './app'
import { connectDatabase } from './config/database'
import { config } from './config'
import { startCloseExpiredOrdersJob } from './jobs/closeExpiredOrders'
import { startStatAggregationJob } from './jobs/aggregateDailyStats'

async function bootstrap() {
  try {
    await connectDatabase()
  } catch (err) {
    console.error('[db] 数据库连接失败，请检查 .env 配置并确认 MySQL 已启动')
    console.error(err)
    process.exit(1)
  }

  const app = createApp()
  app.listen(config.port, () => {
    console.log(`[server] 小兔鲜 API 已启动 → http://localhost:${config.port}/api/health`)
  })

  startCloseExpiredOrdersJob()
  startStatAggregationJob()
}

process.on('unhandledRejection', (reason) => console.error('[unhandledRejection]', reason))
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err))

bootstrap()
