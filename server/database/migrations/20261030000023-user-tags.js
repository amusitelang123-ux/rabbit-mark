'use strict'

/**
 * 增量迁移：用户标签（A-35）。
 *
 * user_tags          标签字典
 * user_tag_relations 用户-标签关联，按标签筛选用户/分群
 */

const CREATE_TAGS = `CREATE TABLE IF NOT EXISTS \`user_tags\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(30) NOT NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_name\` (\`name\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='用户标签'`

const CREATE_RELATIONS = `CREATE TABLE IF NOT EXISTS \`user_tag_relations\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`user_id\` BIGINT UNSIGNED NOT NULL,
  \`tag_id\` INT NOT NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_user_tag\` (\`user_id\`, \`tag_id\`),
  KEY \`idx_tag\` (\`tag_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='用户标签关联'`

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(CREATE_TAGS)
    await queryInterface.sequelize.query(CREATE_RELATIONS)
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS `user_tag_relations`')
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS `user_tags`')
  },
}
