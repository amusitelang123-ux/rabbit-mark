'use strict'

/**
 * 增量迁移：新增订单操作日志表（A-25 订单日志）。
 * 记录所有状态变更的操作人、时间、原因，供后台订单详情时间轴展示。
 * 同时已同步进 database/sql/xtx_mall.schema.sql 与 init-schema 的 DROP_ORDER。
 */

const CREATE_SQL = `CREATE TABLE IF NOT EXISTS \`order_logs\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`order_id\` BIGINT UNSIGNED NOT NULL,
  \`action\` VARCHAR(50) NOT NULL COMMENT '动作: create/pay/ship/confirm/cancel/auto_close/admin_close/refund_apply/refund_approve/refund_reject',
  \`operator\` VARCHAR(50) NOT NULL COMMENT '操作人: user:{id} / admin:{id} / system',
  \`remark\` VARCHAR(255) NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_order_time\` (\`order_id\`, \`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='订单操作日志表'`

/** 为历史订单补一条「提交订单」日志，保证时间轴不为空 */
const BACKFILL_SQL = `INSERT INTO \`order_logs\` (\`order_id\`, \`action\`, \`operator\`, \`remark\`, \`created_at\`)
SELECT o.id, 'create', CONCAT('user:', o.user_id), '历史订单回填', o.created_at
  FROM \`orders\` o
 WHERE NOT EXISTS (SELECT 1 FROM \`order_logs\` l WHERE l.order_id = o.id)`

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(CREATE_SQL)
    await queryInterface.sequelize.query(BACKFILL_SQL)
  },

  async down(queryInterface) {
    await queryInterface.dropTable('order_logs')
  },
}
