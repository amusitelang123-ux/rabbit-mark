'use strict'

/**
 * 增量迁移：AI 智能客服（方向一）。
 *
 * ai_conversations  会话：按用户 + 订单维度，记录标题、状态、最后一条消息
 * ai_messages       消息：用户/助手消息、知识引用、工具调用留痕、token 与耗时
 * ai_kb_chunks      知识库切片：FAQ / 公告 / 物流 / 运费模板 / 平台规则
 * ai_call_logs      调用审计：模型、token、成本、延迟、失败原因
 */

const CREATE_CONVERSATIONS = `CREATE TABLE IF NOT EXISTS \`ai_conversations\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`user_id\` BIGINT UNSIGNED NULL COMMENT '用户 id；匿名会话为空',
  \`order_no\` VARCHAR(32) NULL COMMENT '关联订单号（可选）',
  \`title\` VARCHAR(100) NULL COMMENT '会话标题，取首个问题',
  \`source\` VARCHAR(20) NOT NULL DEFAULT 'contact' COMMENT '入口：contact/product/help',
  \`status\` TINYINT NOT NULL DEFAULT 1 COMMENT '1进行中 2已转人工 3已关闭',
  \`message_count\` INT NOT NULL DEFAULT 0,
  \`last_message\` VARCHAR(255) NULL COMMENT '最后一条消息摘要',
  \`last_message_at\` DATETIME NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_user_time\` (\`user_id\`, \`last_message_at\`),
  KEY \`idx_order\` (\`order_no\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='AI 客服会话表'`

const CREATE_MESSAGES = `CREATE TABLE IF NOT EXISTS \`ai_messages\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`conversation_id\` BIGINT UNSIGNED NOT NULL,
  \`role\` VARCHAR(16) NOT NULL COMMENT 'user/assistant/tool/system',
  \`content\` TEXT NOT NULL,
  \`citations\` JSON NULL COMMENT '知识引用 [{sourceType,sourceId,title,snippet}]',
  \`tool_calls\` JSON NULL COMMENT '工具调用留痕 [{name,arguments,result}]',
  \`tokens\` INT NOT NULL DEFAULT 0,
  \`model\` VARCHAR(50) NULL,
  \`latency_ms\` INT NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_conversation\` (\`conversation_id\`, \`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='AI 客服消息表'`

const CREATE_KB_CHUNKS = `CREATE TABLE IF NOT EXISTS \`ai_kb_chunks\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`source_type\` VARCHAR(20) NOT NULL COMMENT 'faq/notice/logistics/freight/policy',
  \`source_id\` BIGINT UNSIGNED NULL COMMENT '来源表主键；平台规则为固定序号',
  \`title\` VARCHAR(255) NOT NULL,
  \`content\` TEXT NOT NULL,
  \`keywords\` VARCHAR(500) NULL COMMENT '检索关键词（调试用）',
  \`status\` TINYINT NOT NULL DEFAULT 1,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_source\` (\`source_type\`, \`source_id\`),
  KEY \`idx_type_status\` (\`source_type\`, \`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='AI 知识库切片表'`

const CREATE_CALL_LOGS = `CREATE TABLE IF NOT EXISTS \`ai_call_logs\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`module\` VARCHAR(30) NOT NULL COMMENT '调用场景：chat/rebuild',
  \`user_id\` BIGINT UNSIGNED NULL,
  \`conversation_id\` BIGINT UNSIGNED NULL,
  \`model\` VARCHAR(50) NULL,
  \`prompt_tokens\` INT NOT NULL DEFAULT 0,
  \`completion_tokens\` INT NOT NULL DEFAULT 0,
  \`total_tokens\` INT NOT NULL DEFAULT 0,
  \`cost\` DECIMAL(10,4) NOT NULL DEFAULT 0 COMMENT '估算成本（元）',
  \`latency_ms\` INT NOT NULL DEFAULT 0,
  \`status\` TINYINT NOT NULL DEFAULT 1 COMMENT '1成功 0失败',
  \`error\` VARCHAR(255) NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_time\` (\`created_at\`),
  KEY \`idx_module_time\` (\`module\`, \`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='AI 调用审计表'`

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(CREATE_CONVERSATIONS)
    await queryInterface.sequelize.query(CREATE_MESSAGES)
    await queryInterface.sequelize.query(CREATE_KB_CHUNKS)
    await queryInterface.sequelize.query(CREATE_CALL_LOGS)
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS `ai_call_logs`')
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS `ai_kb_chunks`')
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS `ai_messages`')
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS `ai_conversations`')
  },
}
