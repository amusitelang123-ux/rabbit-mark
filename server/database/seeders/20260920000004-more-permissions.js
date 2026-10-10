'use strict'

/**
 * 第二批权限点：用户 / 售后 / 营销 / 财务，以及角色授权。
 * 超级管理员（role 1）在服务端直接放行，无需写入 role_permissions。
 */

const PERMISSIONS = [
  { id: 13, parent_id: 0, name: '用户管理', code: 'user:view', type: 1, path: '/admin/users', component: 'admin/user/list', icon: 'Avatar', sort: 15 },
  { id: 14, parent_id: 13, name: '启用/禁用用户', code: 'user:update', type: 3, path: null, component: null, icon: null, sort: 1 },
  { id: 15, parent_id: 0, name: '售后管理', code: 'refund:view', type: 1, path: '/admin/refunds', component: 'admin/refund/list', icon: 'RefreshLeft', sort: 25 },
  { id: 16, parent_id: 15, name: '售后审核', code: 'refund:audit', type: 3, path: null, component: null, icon: null, sort: 1 },
  { id: 17, parent_id: 0, name: '营销管理', code: 'marketing:view', type: 1, path: '/admin/marketing', component: 'admin/marketing/coupon', icon: 'Ticket', sort: 30 },
  { id: 18, parent_id: 17, name: '新增营销内容', code: 'marketing:create', type: 3, path: null, component: null, icon: null, sort: 1 },
  { id: 19, parent_id: 17, name: '编辑营销内容', code: 'marketing:update', type: 3, path: null, component: null, icon: null, sort: 2 },
  { id: 20, parent_id: 17, name: '删除营销内容', code: 'marketing:delete', type: 3, path: null, component: null, icon: null, sort: 3 },
  { id: 21, parent_id: 0, name: '财务管理', code: 'finance:view', type: 1, path: '/admin/finance', component: 'admin/finance/index', icon: 'Money', sort: 80 },
]

const ROLE_PERMISSIONS = [
  // 商品运营：营销管理
  { role_id: 2, permission_id: 17 },
  { role_id: 2, permission_id: 18 },
  { role_id: 2, permission_id: 19 },
  { role_id: 2, permission_id: 20 },
  // 订单客服：用户 + 售后 + 财务
  { role_id: 3, permission_id: 13 },
  { role_id: 3, permission_id: 14 },
  { role_id: 3, permission_id: 15 },
  { role_id: 3, permission_id: 16 },
  { role_id: 3, permission_id: 21 },
]

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('permissions', PERMISSIONS)
    await queryInterface.bulkInsert('role_permissions', ROLE_PERMISSIONS)
    await queryInterface.sequelize.query('ALTER TABLE `permissions` AUTO_INCREMENT = 22')
    await queryInterface.sequelize.query('ALTER TABLE `role_permissions` AUTO_INCREMENT = 19')
  },

  async down(queryInterface) {
    const ids = PERMISSIONS.map((p) => p.id)
    await queryInterface.bulkDelete('role_permissions', { permission_id: ids }, {})
    await queryInterface.bulkDelete('permissions', { id: ids }, {})
  },
}
