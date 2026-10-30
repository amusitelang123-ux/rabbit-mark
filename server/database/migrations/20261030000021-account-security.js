'use strict'

/**
 * 增量迁移：账户安全（U-45）。
 *
 * 1) users.pay_password：支付密码（bcrypt，预留能力，6 位数字）
 * 2) user_login_logs：登录设备/地点记录，供「账户安全-登录设备」展示
 */

const PASSWORD_COLUMN = {
  name: 'pay_password',
  sql: "ALTER TABLE `users` ADD COLUMN `pay_password` VARCHAR(255) NULL COMMENT '支付密码(bcrypt)' AFTER `password`",
}

const CREATE_LOGIN_LOGS = `CREATE TABLE IF NOT EXISTS \`user_login_logs\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`user_id\` BIGINT UNSIGNED NOT NULL,
  \`login_type\` TINYINT NOT NULL DEFAULT 1 COMMENT '1密码 2短信 3注册',
  \`ip\` VARCHAR(64) NULL,
  \`user_agent\` VARCHAR(255) NULL,
  \`login_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_user_time\` (\`user_id\`, \`login_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='用户登录记录'`

module.exports = {
  async up(queryInterface) {
    const [columns] = await queryInterface.sequelize.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'",
    )
    const names = new Set(columns.map((c) => c.COLUMN_NAME ?? c.column_name))
    if (!names.has(PASSWORD_COLUMN.name)) {
      await queryInterface.sequelize.query(PASSWORD_COLUMN.sql)
    }
    await queryInterface.sequelize.query(CREATE_LOGIN_LOGS)
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS `user_login_logs`')
    await queryInterface.sequelize.query('ALTER TABLE `users` DROP COLUMN `pay_password`')
  },
}
