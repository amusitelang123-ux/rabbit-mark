'use strict'

/** 第五批权限点：物流配置（物流公司字典 / 运费模板） */

const PERMISSIONS = [
  { id: 27, parent_id: 0, name: '物流配置', code: 'logistics:view', type: 1, path: '/admin/logistics', component: 'admin/logistics/index', icon: 'Van', sort: 85 },
  { id: 28, parent_id: 27, name: '编辑物流配置', code: 'logistics:update', type: 3, path: null, component: null, icon: null, sort: 1 },
]

const ROLE_PERMISSIONS = [
  { role_id: 3, permission_id: 27 },
  { role_id: 3, permission_id: 28 },
]

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('permissions', PERMISSIONS)
    await queryInterface.bulkInsert('role_permissions', ROLE_PERMISSIONS)
    await queryInterface.sequelize.query('ALTER TABLE `permissions` AUTO_INCREMENT = 29')
    await queryInterface.sequelize.query('ALTER TABLE `role_permissions` AUTO_INCREMENT = 26')
  },

  async down(queryInterface) {
    const ids = PERMISSIONS.map((p) => p.id)
    await queryInterface.bulkDelete('role_permissions', { permission_id: ids }, {})
    await queryInterface.bulkDelete('permissions', { id: ids }, {})
  },
}
