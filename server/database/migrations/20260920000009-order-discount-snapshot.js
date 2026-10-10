'use strict'

/**
 * 增量迁移：orders 增加分档优惠快照列。
 * 对应企划 3.1.5「促销计算原则」——叠加顺序
 *   商品原价 → 秒杀价 → 满减 → 优惠券 → 运费
 * 并要求「在订单中快照记录每一档优惠金额，避免后期对不上账」。
 * 同时已同步进 database/sql/xtx_mall.schema.sql。
 */

const COLUMNS = [
  {
    table: 'orders',
    name: 'seckill_amount',
    sql: "ALTER TABLE `orders` ADD COLUMN `seckill_amount` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '秒杀优惠快照' AFTER `discount_amount`",
  },
  {
    table: 'orders',
    name: 'promotion_amount',
    sql: "ALTER TABLE `orders` ADD COLUMN `promotion_amount` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '满减优惠快照' AFTER `seckill_amount`",
  },
  {
    table: 'order_items',
    name: 'original_price',
    sql: "ALTER TABLE `order_items` ADD COLUMN `original_price` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '快照:原价(未参与秒杀时等于 price)' AFTER `price`",
  },
  {
    table: 'order_items',
    name: 'seckill_product_id',
    sql: "ALTER TABLE `order_items` ADD COLUMN `seckill_product_id` BIGINT UNSIGNED NULL COMMENT '关联秒杀商品 id，非秒杀订单为空' AFTER `original_price`",
  },
]

/** 回填历史订单：把已有的「优惠总额 - 券」归入满减档；原价回填为成交价 */
const BACKFILL = [
  "UPDATE `orders` SET `promotion_amount` = GREATEST(`discount_amount` - `coupon_amount`, 0) WHERE `promotion_amount` = 0",
  'UPDATE `order_items` SET `original_price` = `price` WHERE `original_price` = 0',
]

module.exports = {
  async up(queryInterface) {
    for (const column of COLUMNS) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${column.table}'`,
      )
      const names = new Set(existing.map((c) => c.COLUMN_NAME ?? c.column_name))
      if (!names.has(column.name)) {
        await queryInterface.sequelize.query(column.sql)
      }
    }
    for (const sql of BACKFILL) {
      await queryInterface.sequelize.query(sql)
    }
  },

  async down(queryInterface) {
    for (const column of [...COLUMNS].reverse()) {
      await queryInterface.sequelize.query(`ALTER TABLE \`${column.table}\` DROP COLUMN \`${column.name}\``)
    }
  },
}
