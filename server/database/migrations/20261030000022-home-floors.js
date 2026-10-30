'use strict'

/**
 * 增量迁移：首页推荐楼层人工编排（A-44）。
 *
 * home_floors          楼层：标题、副标题、入口分类、排序、启用状态
 * home_floor_products  楼层选品：按 sort 决定商品顺序
 */

const CREATE_FLOORS = `CREATE TABLE IF NOT EXISTS \`home_floors\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`title\` VARCHAR(50) NOT NULL,
  \`subtitle\` VARCHAR(100) NULL,
  \`category_id\` INT NULL COMMENT '入口分类，空则跳全部商品',
  \`sort\` INT NOT NULL DEFAULT 0,
  \`status\` TINYINT NOT NULL DEFAULT 1,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_status_sort\` (\`status\`, \`sort\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='首页推荐楼层'`

const CREATE_FLOOR_PRODUCTS = `CREATE TABLE IF NOT EXISTS \`home_floor_products\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`floor_id\` BIGINT UNSIGNED NOT NULL,
  \`product_id\` BIGINT UNSIGNED NOT NULL,
  \`sort\` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_floor_product\` (\`floor_id\`, \`product_id\`),
  KEY \`idx_floor_sort\` (\`floor_id\`, \`sort\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='首页楼层选品'`

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(CREATE_FLOORS)
    await queryInterface.sequelize.query(CREATE_FLOOR_PRODUCTS)
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS `home_floor_products`')
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS `home_floors`')
  },
}
