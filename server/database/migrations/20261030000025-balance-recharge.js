'use strict'

/**
 * 增量迁移：余额充值与余额流水（U-30 余额支付闭环）。
 *
 * 1) balance_recharges：用户端充值单（独立于订单支付单，回调幂等键 pay_no）
 * 2) balance_logs：余额变动流水（充值/余额支付/退款/后台调账），用于钱包明细与对账
 */

const CREATE_RECHARGES = `CREATE TABLE IF NOT EXISTS \`balance_recharges\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`pay_no\` VARCHAR(32) NOT NULL COMMENT '充值单号(支付回调幂等键)',
  \`user_id\` BIGINT UNSIGNED NOT NULL,
  \`amount\` DECIMAL(10,2) NOT NULL COMMENT '充值金额',
  \`channel\` TINYINT NOT NULL COMMENT '1微信 2支付宝 4沙箱',
  \`status\` TINYINT NOT NULL DEFAULT 0 COMMENT '0待支付 1成功 2失败 4已关闭',
  \`third_party_no\` VARCHAR(64) NULL,
  \`request_body\` TEXT NULL,
  \`callback_body\` TEXT NULL,
  \`paid_at\` DATETIME NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_pay_no\` (\`pay_no\`),
  KEY \`idx_user_status\` (\`user_id\`, \`status\`),
  KEY \`idx_created_at\` (\`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='余额充值单'`

const CREATE_LOGS = `CREATE TABLE IF NOT EXISTS \`balance_logs\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`user_id\` BIGINT UNSIGNED NOT NULL,
  \`type\` TINYINT NOT NULL COMMENT '1充值 2余额支付 3退款入账 4后台调整',
  \`change\` DECIMAL(12,2) NOT NULL COMMENT '变动金额(正负)',
  \`balance\` DECIMAL(12,2) NOT NULL COMMENT '变动后余额',
  \`related_no\` VARCHAR(32) NULL COMMENT '关联单号',
  \`remark\` VARCHAR(255) NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_user_time\` (\`user_id\`, \`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='余额流水'`

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(CREATE_RECHARGES)
    await queryInterface.sequelize.query(CREATE_LOGS)
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS `balance_logs`')
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS `balance_recharges`')
  },
}
