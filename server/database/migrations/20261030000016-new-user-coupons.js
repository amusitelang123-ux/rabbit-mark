'use strict'

/**
 * 增量迁移：优惠券增加「新人券」标记。
 *
 * 注册成功后自动发放 is_new_user=1 的启用券（U-63 新人券包 / 新人专享）。
 * 迁移同时把历史数据中名称包含「新人」的券标记为新人券，便于演示数据直接生效。
 */

const COLUMN = {
  name: 'is_new_user',
  sql: "ALTER TABLE `coupons` ADD COLUMN `is_new_user` TINYINT NOT NULL DEFAULT 0 COMMENT '1新人券（注册自动发放） 0普通券' AFTER `status`",
}

const BACKFILL_SQL = "UPDATE `coupons` SET `is_new_user` = 1 WHERE `name` LIKE '%新人%'"

module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'coupons'",
    )
    const names = new Set(existing.map((c) => c.COLUMN_NAME ?? c.column_name))
    if (!names.has(COLUMN.name)) {
      await queryInterface.sequelize.query(COLUMN.sql)
    }
    await queryInterface.sequelize.query(BACKFILL_SQL)
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE `coupons` DROP COLUMN `is_new_user`')
  },
}
