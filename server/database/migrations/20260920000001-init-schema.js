'use strict'

const fs = require('fs')
const path = require('path')

const SCHEMA_FILE = path.join(__dirname, '..', 'sql', 'xtx_mall.schema.sql')

/** 逆依赖顺序删除，避免外键约束报错 */
const DROP_ORDER = [
  'ai_call_logs',
  'ai_kb_chunks',
  'ai_messages',
  'ai_conversations',
  'feedbacks',
  'settings',
  'order_logs',
  'faqs',
  'logistics_companies',
  'freight_templates',
  'stat_daily',
  'finance_records',
  'admin_logs',
  'role_permissions',
  'permissions',
  'roles',
  'admin_users',
  'notices',
  'banners',
  'promotions',
  'seckill_products',
  'seckill_activities',
  'user_coupons',
  'coupons',
  'invoices',
  'payment_records',
  'order_refunds',
  'order_logistics',
  'order_items',
  'orders',
  'carts',
  'product_comments',
  'inventory_logs',
  'product_attributes',
  'spec_values',
  'spec_groups',
  'product_images',
  'product_skus',
  'products',
  'brands',
  'categories',
  'user_footprints',
  'user_favorites',
  'user_points_log',
  'user_addresses',
  'user_levels',
  'users',
]

module.exports = {
  async up(queryInterface) {
    const sql = fs.readFileSync(SCHEMA_FILE, 'utf8')
    await queryInterface.sequelize.query(sql)
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0')
    for (const table of DROP_ORDER) {
      await queryInterface.sequelize.query(`DROP TABLE IF EXISTS \`${table}\``)
    }
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1')
  },
}
