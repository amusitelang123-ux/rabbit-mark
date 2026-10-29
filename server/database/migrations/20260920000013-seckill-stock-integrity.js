'use strict'

/**
 * 修复秒杀库存脏数据并加约束。
 *
 * 背景：seckill_products.sold_count 允许被写成大于 seckill_stock（历史演示数据、
 * 后台把秒杀库存改小等），剩余名额变成负数后，用户只要购物车里有该 SKU，
 * 下单就会被判定「秒杀库存不足」——即使商品本身库存充足，活动期间也完全无法购买。
 *
 * 处理：
 *   1. 把已售数量收敛到 [0, seckill_stock]，负库存/非法限购一并归一；
 *   2. 加 CHECK 约束，保证 sold_count <= seckill_stock，防止再次写坏。
 */

const REPAIR_STATEMENTS = [
  'UPDATE `seckill_products` SET `sold_count` = `seckill_stock` WHERE `sold_count` > `seckill_stock`',
  'UPDATE `seckill_products` SET `sold_count` = 0 WHERE `sold_count` < 0',
  'UPDATE `seckill_products` SET `seckill_stock` = 0 WHERE `seckill_stock` < 0',
  'UPDATE `seckill_products` SET `limit_per_user` = 1 WHERE `limit_per_user` < 1',
]

const CONSTRAINT_NAME = 'chk_seckill_sold_count'

const FIND_CONSTRAINT_SQL = `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'seckill_products'
    AND CONSTRAINT_TYPE = 'CHECK' AND CONSTRAINT_NAME = '${CONSTRAINT_NAME}'`

const ADD_CONSTRAINT_SQL = `ALTER TABLE \`seckill_products\` ADD CONSTRAINT \`${CONSTRAINT_NAME}\`
  CHECK (\`sold_count\` >= 0 AND \`sold_count\` <= \`seckill_stock\`)`

module.exports = {
  async up(queryInterface) {
    for (const sql of REPAIR_STATEMENTS) {
      await queryInterface.sequelize.query(sql)
    }
    const [rows] = await queryInterface.sequelize.query(FIND_CONSTRAINT_SQL)
    if (!rows.length) {
      await queryInterface.sequelize.query(ADD_CONSTRAINT_SQL)
    }
  },

  async down(queryInterface) {
    // 数据修复本身不可逆（已售罄的行保持 sold_count = seckill_stock），这里只移除约束
    const [rows] = await queryInterface.sequelize.query(FIND_CONSTRAINT_SQL)
    if (rows.length) {
      await queryInterface.sequelize.query(
        `ALTER TABLE \`seckill_products\` DROP CHECK \`${CONSTRAINT_NAME}\``,
      )
    }
  },
}
