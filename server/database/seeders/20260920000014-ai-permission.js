'use strict'

/** 第七批权限点：AI 客服（会话查看 + 知识库重建） */

const PERMISSIONS = [
  { id: 31, parent_id: 0, name: 'AI 客服', code: 'ai:view', type: 1, path: '/admin/ai', component: 'admin/ai/index', icon: 'MagicStick', sort: 29 },
  { id: 32, parent_id: 31, name: '重建知识库', code: 'ai:manage', type: 3, path: null, component: null, icon: null, sort: 1 },
]

const ROLE_PERMISSIONS = [
  { role_id: 3, permission_id: 31 },
  { role_id: 3, permission_id: 32 },
]

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('permissions', PERMISSIONS)
    await queryInterface.bulkInsert('role_permissions', ROLE_PERMISSIONS)
    await queryInterface.sequelize.query('ALTER TABLE `permissions` AUTO_INCREMENT = 33')
    await queryInterface.sequelize.query('ALTER TABLE `role_permissions` AUTO_INCREMENT = 30')
  },

  async down(queryInterface) {
    const ids = PERMISSIONS.map((p) => p.id)
    await queryInterface.bulkDelete('role_permissions', { permission_id: ids }, {})
    await queryInterface.bulkDelete('permissions', { id: ids }, {})
  },
}
