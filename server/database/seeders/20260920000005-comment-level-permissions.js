'use strict'

/** 第三批权限点：商品评价管理、会员等级管理 */

const PERMISSIONS = [
  { id: 22, parent_id: 0, name: '评价管理', code: 'comment:view', type: 1, path: '/admin/comments', component: 'admin/comment/list', icon: 'ChatDotSquare', sort: 12 },
  { id: 23, parent_id: 22, name: '评价处理', code: 'comment:update', type: 3, path: null, component: null, icon: null, sort: 1 },
  { id: 24, parent_id: 13, name: '会员等级', code: 'level:view', type: 2, path: '/admin/levels', component: 'admin/level/index', icon: null, sort: 2 },
  { id: 25, parent_id: 13, name: '编辑会员等级', code: 'level:update', type: 3, path: null, component: null, icon: null, sort: 3 },
]

const ROLE_PERMISSIONS = [
  // 商品运营：评价管理
  { role_id: 2, permission_id: 22 },
  { role_id: 2, permission_id: 23 },
  // 订单客服：会员等级
  { role_id: 3, permission_id: 24 },
  { role_id: 3, permission_id: 25 },
]

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('permissions', PERMISSIONS)
    await queryInterface.bulkInsert('role_permissions', ROLE_PERMISSIONS)
    await queryInterface.sequelize.query('ALTER TABLE `permissions` AUTO_INCREMENT = 26')
    await queryInterface.sequelize.query('ALTER TABLE `role_permissions` AUTO_INCREMENT = 23')
  },

  async down(queryInterface) {
    const ids = PERMISSIONS.map((p) => p.id)
    await queryInterface.bulkDelete('role_permissions', { permission_id: ids }, {})
    await queryInterface.bulkDelete('permissions', { id: ids }, {})
  },
}
