'use strict'

/**
 * 增量迁移：订单增加用户催发货提醒字段，供后台订单列表/详情直接展示。
 *
 * 用户端「提醒发货」原本只写 order_logs，后台需要展开操作日志才能看到；
 * 这里把提醒次数与最近提醒时间冗余到 orders，便于后台列表筛选、排序与告警。
 * 同时已同步进 database/sql/xtx_mall.schema.sql 与 Order 模型。
 */

const COLUMNS = [
  {
    name: 'remind_ship_count',
    sql: "ALTER TABLE `orders` ADD COLUMN `remind_ship_count` INT NOT NULL DEFAULT 0 COMMENT '用户催发货次数' AFTER `user_deleted_at`",
  },
  {
    name: 'last_remind_ship_at',
    sql: "ALTER TABLE `orders` ADD COLUMN `last_remind_ship_at` DATETIME NULL COMMENT '最近催发货时间' AFTER `remind_ship_count`",
  },
]

/** 历史数据回填：从 order_logs 汇总已存在的催发货记录 */
const BACKFILL_SQL = `UPDATE \`orders\` o
LEFT JOIN (
  SELECT \`order_id\`, COUNT(*) AS cnt, MAX(\`created_at\`) AS last_at
    FROM \`order_logs\`
   WHERE \`action\` = 'remind_ship'
   GROUP BY \`order_id\`
) l ON l.\`order_id\` = o.\`id\`
SET o.\`remind_ship_count\` = COALESCE(l.cnt, 0),
    o.\`last_remind_ship_at\` = l.last_at`

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
    await queryInterface.sequelize.query(BACKFILL_SQL)
  },

  async down(queryInterface) {
    for (const column of [...COLUMNS].reverse()) {
      await queryInterface.sequelize.query(`ALTER TABLE \`orders\` DROP COLUMN \`${column.name}\``)
    }
  },
}
