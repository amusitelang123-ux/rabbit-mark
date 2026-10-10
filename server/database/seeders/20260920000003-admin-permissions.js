'use strict'

/**
 * 后台权限点与角色权限种子。
 * 超级管理员（role 1）在服务端直接放行全部权限，无需写入 role_permissions。
 */

const PERMISSIONS = [
  // 菜单（type 1）
  { id: 1, parent_id: 0, name: '数据概览', code: 'stats:view', type: 1, path: '/admin/dashboard', component: 'admin/dashboard/index', icon: 'DataLine', sort: 5 },
  { id: 2, parent_id: 0, name: '商品管理', code: 'product:view', type: 1, path: '/admin/products', component: 'admin/product/list', icon: 'Goods', sort: 10 },
  { id: 3, parent_id: 0, name: '订单管理', code: 'order:view', type: 1, path: '/admin/orders', component: 'admin/order/list', icon: 'List', sort: 20 },
  { id: 4, parent_id: 0, name: '系统管理', code: 'system:view', type: 1, path: '/admin/system', component: '', icon: 'Setting', sort: 90 },
  // 按钮 / 接口（type 3）
  { id: 5, parent_id: 2, name: '新增商品', code: 'product:create', type: 3, path: null, component: null, icon: null, sort: 1 },
  { id: 6, parent_id: 2, name: '编辑商品', code: 'product:update', type: 3, path: null, component: null, icon: null, sort: 2 },
  { id: 7, parent_id: 2, name: '删除商品', code: 'product:delete', type: 3, path: null, component: null, icon: null, sort: 3 },
  { id: 8, parent_id: 3, name: '订单发货', code: 'order:ship', type: 3, path: null, component: null, icon: null, sort: 1 },
  { id: 9, parent_id: 3, name: '订单操作', code: 'order:update', type: 3, path: null, component: null, icon: null, sort: 2 },
  { id: 10, parent_id: 4, name: '新增管理员/角色', code: 'system:create', type: 3, path: null, component: null, icon: null, sort: 1 },
  { id: 11, parent_id: 4, name: '编辑管理员/角色', code: 'system:update', type: 3, path: null, component: null, icon: null, sort: 2 },
  { id: 12, parent_id: 4, name: '删除管理员/角色', code: 'system:delete', type: 3, path: null, component: null, icon: null, sort: 3 },
]

const ROLE_PERMISSIONS = [
  // 商品运营：数据概览 + 商品全部
  { role_id: 2, permission_id: 1 },
  { role_id: 2, permission_id: 2 },
  { role_id: 2, permission_id: 5 },
  { role_id: 2, permission_id: 6 },
  { role_id: 2, permission_id: 7 },
  // 订单客服：数据概览 + 订单全部
  { role_id: 3, permission_id: 1 },
  { role_id: 3, permission_id: 3 },
  { role_id: 3, permission_id: 8 },
  { role_id: 3, permission_id: 9 },
]

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('permissions', PERMISSIONS)
    await queryInterface.bulkInsert('role_permissions', ROLE_PERMISSIONS)
    await queryInterface.sequelize.query('ALTER TABLE `permissions` AUTO_INCREMENT = 13')
    await queryInterface.sequelize.query('ALTER TABLE `role_permissions` AUTO_INCREMENT = 10')
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('role_permissions', null, {})
    await queryInterface.bulkDelete('permissions', null, {})
  },
}
