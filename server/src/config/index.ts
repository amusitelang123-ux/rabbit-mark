import dotenv from 'dotenv'

dotenv.config()

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    name: process.env.DB_NAME || 'xtx_mall',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change_me_in_production',
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '2h',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  upload: {
    driver: process.env.UPLOAD_DRIVER || 'local',
    dir: process.env.UPLOAD_DIR || './uploads',
    baseUrl: process.env.UPLOAD_BASE_URL || 'http://localhost:3000/uploads',
  },
  adapter: {
    pay: process.env.PAY_ADAPTER || 'sandbox',
    paySecret: process.env.PAY_SECRET || 'xtx_sandbox_secret',
    sms: process.env.SMS_ADAPTER || 'console',
    logistics: process.env.LOGISTICS_ADAPTER || 'mock',
  },
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
}
