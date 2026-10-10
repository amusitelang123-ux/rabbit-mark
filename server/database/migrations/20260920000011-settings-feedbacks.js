'use strict'

/**
 * 增量迁移：系统配置表（A-75）+ 留言工单表（U-70/U-74）。
 * 同时已同步进 database/sql/xtx_mall.schema.sql 与 init-schema 的 DROP_ORDER。
 */

const TABLES = [
  `CREATE TABLE IF NOT EXISTS \`settings\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`config_group\` VARCHAR(30) NOT NULL DEFAULT 'site' COMMENT '分组: site/service',
    \`config_key\` VARCHAR(50) NOT NULL COMMENT '配置键，全局唯一',
    \`config_value\` TEXT NULL,
    \`remark\` VARCHAR(255) NULL COMMENT '配置说明',
    \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`uk_config_key\` (\`config_key\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='系统配置表'`,

  `CREATE TABLE IF NOT EXISTS \`feedbacks\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`user_id\` BIGINT UNSIGNED NOT NULL,
    \`type\` TINYINT NOT NULL DEFAULT 1 COMMENT '1咨询 2投诉 3建议',
    \`content\` TEXT NOT NULL,
    \`images\` JSON NULL,
    \`contact\` VARCHAR(100) NULL COMMENT '联系方式',
    \`order_no\` VARCHAR(32) NULL COMMENT '关联订单号',
    \`status\` TINYINT NOT NULL DEFAULT 0 COMMENT '0待处理 1已回复 2已关闭',
    \`reply_content\` TEXT NULL,
    \`reply_at\` DATETIME NULL,
    \`replier\` VARCHAR(50) NULL,
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_user\` (\`user_id\`),
    KEY \`idx_status_time\` (\`status\`, \`created_at\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='留言工单表'`,
]

/** 默认配置：与原前端硬编码值保持一致，便于平滑替换 */
const SETTINGS_SEED = [
  { config_group: 'site', config_key: 'site.name', config_value: '小兔鲜', remark: '站点名称' },
  { config_group: 'site', config_key: 'site.logo', config_value: '', remark: '站点 Logo 地址' },
  { config_group: 'site', config_key: 'site.slogan', config_value: '正品好物 极速送达', remark: '站点标语' },
  { config_group: 'service', config_key: 'service.phone', config_value: '400-000-0000', remark: '客服热线' },
  { config_group: 'service', config_key: 'service.email', config_value: 'service@xtx-mall.demo', remark: '客服邮箱' },
  { config_group: 'service', config_key: 'service.hours', config_value: '每日 9:00 - 22:00', remark: '客服服务时间' },
]

module.exports = {
  async up(queryInterface) {
    for (const sql of TABLES) {
      await queryInterface.sequelize.query(sql)
    }
    await queryInterface.bulkInsert('settings', SETTINGS_SEED)
  },

  async down(queryInterface) {
    for (const table of ['feedbacks', 'settings']) {
      await queryInterface.dropTable(table)
    }
  },
}
