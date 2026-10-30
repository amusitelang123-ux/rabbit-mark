'use strict'

/**
 * 增量迁移：订单增加后台「异常标记」。
 *
 * A-23 要求后台可标记异常订单并在列表/详情醒目提示；
 * 只新增冗余字段，不改变订单状态机（异常是运营标记，不是订单状态）。
 */

const COLUMNS = [
  {
    name: 'is_abnormal',
    sql: "ALTER TABLE `orders` ADD COLUMN `is_abnormal` TINYINT NOT NULL DEFAULT 0 COMMENT '后台异常标记 1是 0否' AFTER `admin_remark`",
  },
  {
    name: 'abnormal_reason',
    sql: "ALTER TABLE `orders` ADD COLUMN `abnormal_reason` VARCHAR(255) NULL COMMENT '异常原因' AFTER `is_abnormal`",
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
