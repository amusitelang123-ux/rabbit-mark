'use strict'

/** 第六批权限点：留言工单管理 */

const PERMISSIONS = [
  { id: 29, parent_id: 0, name: '留言工单', code: 'feedback:view', type: 1, path: '/admin/feedbacks', component: 'admin/feedback/list', icon: 'ChatLineSquare', sort: 28 },
  { id: 30, parent_id: 29, name: '回复/关闭工单', code: 'feedback:update', type: 3, path: null, component: null, icon: null, sort: 1 },
]

const ROLE_PERMISSIONS = [
  { role_id: 3, permission_id: 29 },
  { role_id: 3, permission_id: 30 },
]

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('permissions', PERMISSIONS)
    await queryInterface.bulkInsert('role_permissions', ROLE_PERMISSIONS)
    await queryInterface.sequelize.query('ALTER TABLE `permissions` AUTO_INCREMENT = 31')
    await queryInterface.sequelize.query('ALTER TABLE `role_permissions` AUTO_INCREMENT = 28')
  },

  async down(queryInterface) {
    const ids = PERMISSIONS.map((p) => p.id)
    await queryInterface.bulkDelete('role_permissions', { permission_id: ids }, {})
    await queryInterface.bulkDelete('permissions', { id: ids }, {})
  },
}
