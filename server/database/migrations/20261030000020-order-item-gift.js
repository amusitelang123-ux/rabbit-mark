'use strict'

/**
 * 增量迁移：订单明细增加「赠品」标记（U-62 满赠）。
 *
 * 赠品行与普通商品行共用 order_items，price/subtotal 为 0，
 * is_gift=1 用于前端标记、售后/销量统计时区分赠品。
 */

const COLUMN = {
  name: 'is_gift',
  sql: "ALTER TABLE `order_items` ADD COLUMN `is_gift` TINYINT NOT NULL DEFAULT 0 COMMENT '1满赠赠品 0普通商品' AFTER `discount_amount`",
}

module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items'",
    )
    const names = new Set(existing.map((c) => c.COLUMN_NAME ?? c.column_name))
    if (!names.has(COLUMN.name)) {
      await queryInterface.sequelize.query(COLUMN.sql)
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE `order_items` DROP COLUMN `is_gift`')
  },
}
