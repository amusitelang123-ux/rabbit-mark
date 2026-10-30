'use strict'

/**
 * 增量迁移：订单增加积分抵现快照字段（U-64）。
 *
 * points_used   本单消耗积分（取消/关单/整单退款时原路退回）
 * points_amount 积分抵扣金额（元级快照，参与订单金额明细）
 */

const COLUMNS = [
  {
    name: 'points_used',
    sql: "ALTER TABLE `orders` ADD COLUMN `points_used` INT NOT NULL DEFAULT 0 COMMENT '本单消耗积分' AFTER `coupon_amount`",
  },
  {
    name: 'points_amount',
    sql: "ALTER TABLE `orders` ADD COLUMN `points_amount` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '积分抵扣金额' AFTER `points_used`",
  },
]

module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'",
    )
    const names = new Set(existing.map((c) => c.COLUMN_NAME ?? c.column_name))
    for (const column of COLUMNS) {
      if (!names.has(column.name)) {
        await queryInterface.sequelize.query(column.sql)
      }
    }
  },

  async down(queryInterface) {
    for (const column of [...COLUMNS].reverse()) {
      await queryInterface.sequelize.query(`ALTER TABLE \`orders\` DROP COLUMN \`${column.name}\``)
    }
  },
}
