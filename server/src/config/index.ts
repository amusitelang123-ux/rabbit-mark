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
  /**
   * AI 能力（智能客服）。密钥只从环境变量读取，不落库、不进日志。
   * DEEPSEEK_API_KEY 留空时自动降级为 mock 适配器，保证无网/无 Key 也能演示。
   */
  ai: {
    enabled: (process.env.AI_ENABLED ?? 'true') !== 'false',
    adapter: process.env.AI_ADAPTER || 'deepseek',
    baseUrl: (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, ''),
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    timeoutMs: Number(process.env.AI_TIMEOUT_MS || 25000),
    maxTokens: Number(process.env.AI_MAX_TOKENS || 900),
    temperature: Number(process.env.AI_TEMPERATURE || 0.3),
    /** 每日成本上限（元），超过后自动停止调用并引导转人工 */
    dailyBudget: Number(process.env.AI_DAILY_BUDGET_CNY || 20),
    /** 成本估算单价（元 / 百万 token），仅用于后台统计展示 */
    priceInPerM: Number(process.env.AI_PRICE_IN_PER_M || 2),
    priceOutPerM: Number(process.env.AI_PRICE_OUT_PER_M || 8),
    /** 送入模型的历史消息条数 */
    maxHistory: Number(process.env.AI_MAX_HISTORY || 8),
  },
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
}
