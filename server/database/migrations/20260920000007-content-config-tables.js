'use strict'

/**
 * 增量迁移：补充「内容与配置域」三张表
 *   - faqs                常见问题（U-70/U-71 帮助中心）
 *   - logistics_companies 物流公司字典（A-27 物流配置）
 *   - freight_templates   运费模板（A-27，替代硬编码的满 99 包邮规则）
 * 同时已同步进 database/sql/xtx_mall.schema.sql。
 */

const TABLES = [
  `CREATE TABLE IF NOT EXISTS \`faqs\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`category\` VARCHAR(50) NOT NULL COMMENT '问题分类，如 购物指南/支付相关',
    \`question\` VARCHAR(255) NOT NULL,
    \`answer\` TEXT NULL,
    \`sort\` INT NOT NULL DEFAULT 0,
    \`status\` TINYINT NOT NULL DEFAULT 1 COMMENT '1启用 0停用',
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_category_sort\` (\`category\`, \`sort\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='常见问题FAQ表'`,

  `CREATE TABLE IF NOT EXISTS \`logistics_companies\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`name\` VARCHAR(50) NOT NULL COMMENT '物流公司名称',
    \`code\` VARCHAR(30) NOT NULL COMMENT '编码，如 SF',
    \`phone\` VARCHAR(20) NULL COMMENT '客服电话',
    \`sort\` INT NOT NULL DEFAULT 0,
    \`status\` TINYINT NOT NULL DEFAULT 1 COMMENT '1启用 0停用',
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`uk_code\` (\`code\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='物流公司字典表'`,

  `CREATE TABLE IF NOT EXISTS \`freight_templates\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`name\` VARCHAR(50) NOT NULL COMMENT '模板名称',
    \`free_amount\` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '满额包邮门槛，0 表示不参与包邮',
    \`base_freight\` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '未达门槛时的基础运费',
    \`is_default\` TINYINT NOT NULL DEFAULT 0 COMMENT '1 默认模板（全局唯一）',
    \`status\` TINYINT NOT NULL DEFAULT 1 COMMENT '1启用 0停用',
    \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='运费模板表'`,
]

/** 物流公司字典初始数据 */
const LOGISTICS_SEED = [
  { name: '顺丰速运', code: 'SF', phone: '95338', sort: 1, status: 1 },
  { name: '中通快递', code: 'ZTO', phone: '95311', sort: 2, status: 1 },
  { name: '圆通速递', code: 'YTO', phone: '95554', sort: 3, status: 1 },
  { name: '韵达快递', code: 'YD', phone: '95546', sort: 4, status: 1 },
  { name: '申通快递', code: 'STO', phone: '95543', sort: 5, status: 1 },
  { name: '京东物流', code: 'JD', phone: '950616', sort: 6, status: 1 },
  { name: '邮政 EMS', code: 'EMS', phone: '11183', sort: 7, status: 1 },
]

/** FAQ 初始数据（与原前端演示内容保持一致） */
const FAQ_SEED = [
  { category: '购物指南', question: '如何搜索商品？', answer: '在顶部搜索框输入商品名称或关键词，即可查看相关商品；也可以在分类页按分类逐级浏览。', sort: 1 },
  { category: '购物指南', question: '如何加入购物车？', answer: '进入商品详情页，选择规格与数量后点击「加入购物车」；未登录时会先引导登录。', sort: 2 },
  { category: '支付相关', question: '支持哪些支付方式？', answer: '支持微信支付、支付宝、余额支付；演示环境提供沙箱支付通道用于本地联调。', sort: 3 },
  { category: '支付相关', question: '下单后多久需要完成支付？', answer: '订单提交后请在 30 分钟内完成支付，超时系统会自动关闭订单并释放锁定库存。', sort: 4 },
  { category: '配送方式', question: '运费怎么计算？', answer: '默认满 99 元包邮，未满收取基础运费 8 元；具体规则以后台运费模板配置为准。', sort: 5 },
  { category: '配送方式', question: '多久能收到货？', answer: '付款后 24 小时内发货，一般 2-4 天送达；偏远地区可能顺延 1-2 天。', sort: 6 },
  { category: '售后服务', question: '如何申请退换货？', answer: '进入「我的订单」找到对应订单，点击「申请售后」，选择售后类型并填写原因，等待后台审核。', sort: 7 },
  { category: '售后服务', question: '退款多久到账？', answer: '审核通过后立即发起退款，原路退回；微信/支付宝一般 1-3 个工作日到账。', sort: 8 },
]

module.exports = {
  async up(queryInterface) {
    for (const sql of TABLES) {
      await queryInterface.sequelize.query(sql)
    }
    await queryInterface.bulkInsert('logistics_companies', LOGISTICS_SEED)
    await queryInterface.bulkInsert('faqs', FAQ_SEED)
    // 默认运费模板，与既有硬编码规则保持一致
    await queryInterface.bulkInsert('freight_templates', [
      { name: '默认运费模板', free_amount: '99.00', base_freight: '8.00', is_default: 1, status: 1 },
    ])
  },

  async down(queryInterface) {
    for (const table of ['freight_templates', 'logistics_companies', 'faqs']) {
      await queryInterface.dropTable(table)
    }
  },
}
