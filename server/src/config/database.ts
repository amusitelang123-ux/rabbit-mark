import { Sequelize } from 'sequelize'
import { config } from './index'

export const sequelize = new Sequelize(config.db.name, config.db.user, config.db.password, {
  host: config.db.host,
  port: config.db.port,
  dialect: 'mysql',
  logging: config.env === 'development' ? (msg) => console.log(`[sql] ${msg}`) : false,
  define: {
    underscored: true,
    freezeTableName: true,
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    charset: 'utf8mb4',
  },
  timezone: '+08:00',
})

export async function connectDatabase(): Promise<void> {
  await sequelize.authenticate()
  console.log('[db] MySQL connected')
}
