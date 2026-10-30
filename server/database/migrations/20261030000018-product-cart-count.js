'use strict'

/**
 * 增量迁移：商品增加「累计加购件数」冗余字段。
 *
 * A-52 需要「加购 TOP10」，而 carts 只保存当前购物车，无法反映历史加购行为；
 * 这里在商品上累计加购次数，加购接口每次累加，统计页据此排序。
 * 历史数据用当前购物车数量回填一个近似值。
 */

const COLUMN = {
  name: 'cart_add_count',
  sql: "ALTER TABLE `products` ADD COLUMN `cart_add_count` INT NOT NULL DEFAULT 0 COMMENT '累计加购件数' AFTER `sales_count`",
}

const BACKFILL_SQL = `UPDATE \`products\` p
LEFT JOIN (
  SELECT \`product_id\`, SUM(\`quantity\`) AS qty
    FROM \`carts\`
   GROUP BY \`product_id\`
) c ON c.\`product_id\` = p.\`id\`
SET p.\`cart_add_count\` = COALESCE(c.qty, 0)`

module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'",
    )
    const names = new Set(existing.map((c) => c.COLUMN_NAME ?? c.column_name))
    if (!names.has(COLUMN.name)) {
      await queryInterface.sequelize.query(COLUMN.sql)
    }
    await queryInterface.sequelize.query(BACKFILL_SQL)
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE `products` DROP COLUMN `cart_add_count`')
  },
}
