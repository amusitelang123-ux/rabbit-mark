'use strict'

/**
 * 增量迁移：用户账户余额（U-30 余额支付）。
 *
 * 余额用于站内模拟支付、售后退款回补与用户端充值（充值单/流水见 20261030000025）。
 * 后台用户详情仍可手动调整余额。
 */

const COLUMN = {
  name: 'balance',
  sql: "ALTER TABLE `users` ADD COLUMN `balance` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '账户余额' AFTER `total_spent`",
}

module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'",
    )
    const names = new Set(existing.map((c) => c.COLUMN_NAME ?? c.column_name))
    if (!names.has(COLUMN.name)) {
      await queryInterface.sequelize.query(COLUMN.sql)
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE `users` DROP COLUMN `balance`')
  },
}
