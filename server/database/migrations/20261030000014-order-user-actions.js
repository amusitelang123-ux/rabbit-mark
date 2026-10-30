'use strict'

/**
 * 增量迁移：订单用户侧操作（U-18 删除订单）。
 *
 * 企划 4.1 约定「订单类不删除只置状态」，因此用户删除订单只做**逻辑隐藏**：
 *   - user_deleted = 1 的订单不再出现在用户端列表/详情/再次购买/物流等入口；
 *   - 订单主表、明细、支付流水、财务流水、后台订单管理全部保留，保证对账与审计。
 * 同时已同步进 database/sql/xtx_mall.schema.sql 与 Order 模型。
 */

const COLUMNS = [
  {
    name: 'user_deleted',
    sql: "ALTER TABLE `orders` ADD COLUMN `user_deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '用户是否删除(仅隐藏，不做物理删除)' AFTER `admin_remark`",
  },
  {
    name: 'user_deleted_at',
    sql: 'ALTER TABLE `orders` ADD COLUMN `user_deleted_at` DATETIME NULL COMMENT \'用户删除时间\' AFTER `user_deleted`',
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
