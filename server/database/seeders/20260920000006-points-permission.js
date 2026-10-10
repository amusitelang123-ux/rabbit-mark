'use strict'

/** 第四批权限点：积分调整 */

const PERMISSIONS = [
  { id: 26, parent_id: 13, name: '调整用户积分', code: 'points:adjust', type: 3, path: null, component: null, icon: null, sort: 4 },
]

const ROLE_PERMISSIONS = [{ role_id: 3, permission_id: 26 }]

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('permissions', PERMISSIONS)
    await queryInterface.bulkInsert('role_permissions', ROLE_PERMISSIONS)
    await queryInterface.sequelize.query('ALTER TABLE `permissions` AUTO_INCREMENT = 27')
    await queryInterface.sequelize.query('ALTER TABLE `role_permissions` AUTO_INCREMENT = 24')
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('role_permissions', { permission_id: 26 }, {})
    await queryInterface.bulkDelete('permissions', { id: 26 }, {})
  },
}
