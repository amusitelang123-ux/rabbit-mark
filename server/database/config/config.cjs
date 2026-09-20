require('dotenv').config()

const base = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'xtx_mall',
  dialect: 'mysql',
  logging: false,
  define: {
    underscored: true,
    freezeTableName: true,
  },
  dialectOptions: {
    // 允许 migration 一次性执行整份 schema SQL
    multipleStatements: true,
    charset: 'utf8mb4',
  },
  timezone: '+08:00',
}

module.exports = {
  development: base,
  test: { ...base },
  production: { ...base, logging: false },
}
