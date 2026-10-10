'use strict'

/**
 * 增量迁移：admin_logs.admin_id 放宽为可空（A-73 登录日志）。
 * 登录失败且账号不存在时没有 admin_id，但仍需留痕以便排查爆破。
 * 同时已同步进 database/sql/xtx_mall.schema.sql。
 */

const UP_SQL =
  "ALTER TABLE `admin_logs` MODIFY COLUMN `admin_id` BIGINT UNSIGNED NULL COMMENT '管理员 id；登录失败且账号不存在时为空'"

const DOWN_SQL =
  "ALTER TABLE `admin_logs` MODIFY COLUMN `admin_id` BIGINT UNSIGNED NOT NULL COMMENT '管理员 id'"

module.exports = {
  async up(queryInterface) {
    const [cols] = await queryInterface.sequelize.query(
      "SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admin_logs' AND COLUMN_NAME = 'admin_id'",
    )
    if (cols[0] && String(cols[0].IS_NULLABLE).toUpperCase() === 'NO') {
      await queryInterface.sequelize.query(UP_SQL)
    }
  },

  async down(queryInterface) {
    // 先清掉没有归属管理员的记录，否则无法恢复 NOT NULL 约束
    await queryInterface.sequelize.query('DELETE FROM `admin_logs` WHERE `admin_id` IS NULL')
    await queryInterface.sequelize.query(DOWN_SQL)
  },
}
