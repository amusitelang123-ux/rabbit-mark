-- =============================================================
-- 小兔鲜电商 (XiaoTuXian Mall) · MySQL 8.0 数据库结构
-- 设计约定（详见 docs/小兔鲜电商-开发企划.md 4.1）:
--   * 引擎 InnoDB / 字符集 utf8mb4
--   * 主键 id BIGINT UNSIGNED AUTO_INCREMENT
--   * 金额 DECIMAL(10,2)（禁用 FLOAT/DOUBLE）
--   * 时间 created_at / updated_at；软删除 deleted_at
--   * 状态 TINYINT + 注释枚举
--   * 关联字段 xxx_id，表名小写下划线复数
-- =============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================
-- 用户域
-- =============================================================

CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `username` VARCHAR(50) NULL COMMENT '用户名',
  `phone` VARCHAR(20) NULL COMMENT '手机号',
  `password` VARCHAR(255) NOT NULL COMMENT 'bcrypt 加密密码',
  `pay_password` VARCHAR(255) NULL COMMENT '支付密码(bcrypt)',
  `nickname` VARCHAR(50) NULL COMMENT '昵称',
  `avatar` VARCHAR(255) NULL COMMENT '头像 URL',
  `gender` TINYINT NOT NULL DEFAULT 0 COMMENT '0未知 1男 2女',
  `birthday` DATE NULL COMMENT '生日',
  `level_id` INT NULL COMMENT '会员等级 id',
  `points` INT NOT NULL DEFAULT 0 COMMENT '积分余额',
  `total_spent` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '累计消费',
  `balance` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '账户余额',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '1正常 0禁用',
  `last_login_at` DATETIME NULL COMMENT '最后登录时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL COMMENT '软删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_phone` (`phone`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='用户表';

CREATE TABLE IF NOT EXISTS `user_levels` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL COMMENT '等级名称',
  `min_spent` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '升级所需累计消费',
  `discount_rate` DECIMAL(5,2) NOT NULL DEFAULT 1.00 COMMENT '折扣率(1=无折扣)',
  `icon` VARCHAR(255) NULL,
  `sort` INT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='会员等级表';

CREATE TABLE IF NOT EXISTS `user_addresses` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `receiver` VARCHAR(50) NOT NULL COMMENT '收货人',
  `phone` VARCHAR(20) NOT NULL,
  `province` VARCHAR(50) NOT NULL,
  `city` VARCHAR(50) NOT NULL,
  `district` VARCHAR(50) NOT NULL,
  `detail` VARCHAR(255) NOT NULL,
  `is_default` TINYINT NOT NULL DEFAULT 0 COMMENT '1默认地址',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `fk_address_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='收货地址表';

CREATE TABLE IF NOT EXISTS `user_login_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `login_type` TINYINT NOT NULL DEFAULT 1 COMMENT '1密码 2短信 3注册',
  `ip` VARCHAR(64) NULL,
  `user_agent` VARCHAR(255) NULL,
  `login_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_time` (`user_id`, `login_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='用户登录记录';

CREATE TABLE IF NOT EXISTS `user_tags` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(30) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='用户标签';

CREATE TABLE IF NOT EXISTS `user_tag_relations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `tag_id` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_tag` (`user_id`, `tag_id`),
  KEY `idx_tag` (`tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='用户标签关联';

CREATE TABLE IF NOT EXISTS `user_points_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `type` TINYINT NOT NULL COMMENT '1签到 2消费获得 3积分抵扣 4后台调整',
  `change` INT NOT NULL COMMENT '积分变动(正负)',
  `balance` INT NOT NULL COMMENT '变动后余额',
  `remark` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='积分流水表';

CREATE TABLE IF NOT EXISTS `balance_recharges` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pay_no` VARCHAR(32) NOT NULL COMMENT '充值单号(支付回调幂等键)',
  `user_id` BIGINT UNSIGNED NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL COMMENT '充值金额',
  `channel` TINYINT NOT NULL COMMENT '1微信 2支付宝 4沙箱',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0待支付 1成功 2失败 4已关闭',
  `third_party_no` VARCHAR(64) NULL,
  `request_body` TEXT NULL,
  `callback_body` TEXT NULL,
  `paid_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pay_no` (`pay_no`),
  KEY `idx_user_status` (`user_id`, `status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='余额充值单';

CREATE TABLE IF NOT EXISTS `balance_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `type` TINYINT NOT NULL COMMENT '1充值 2余额支付 3退款入账 4后台调整',
  `change` DECIMAL(12,2) NOT NULL COMMENT '变动金额(正负)',
  `balance` DECIMAL(12,2) NOT NULL COMMENT '变动后余额',
  `related_no` VARCHAR(32) NULL COMMENT '关联单号',
  `remark` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_time` (`user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='余额流水';

CREATE TABLE IF NOT EXISTS `user_favorites` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_product` (`user_id`, `product_id`),
  KEY `idx_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='收藏表';

CREATE TABLE IF NOT EXISTS `user_footprints` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `viewed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_time` (`user_id`, `viewed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='浏览足迹表';

-- =============================================================
-- 商品域
-- =============================================================

CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `parent_id` INT NOT NULL DEFAULT 0 COMMENT '父级 id，0 为顶级',
  `name` VARCHAR(50) NOT NULL,
  `level` TINYINT NOT NULL DEFAULT 1 COMMENT '1一级 2二级',
  `icon` VARCHAR(255) NULL COMMENT '图标',
  `sort` INT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '1启用 0停用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_parent` (`parent_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='商品分类表';

CREATE TABLE IF NOT EXISTS `brands` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `logo` VARCHAR(255) NULL,
  `sort` INT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='品牌表';

CREATE TABLE IF NOT EXISTS `products` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(200) NOT NULL COMMENT '商品名称',
  `subtitle` VARCHAR(255) NULL COMMENT '卖点副标题',
  `category_id` INT NOT NULL,
  `brand_id` INT NULL,
  `main_image` VARCHAR(255) NULL COMMENT '主图',
  `detail_html` MEDIUMTEXT NULL COMMENT '图文详情',
  `unit` VARCHAR(20) NOT NULL DEFAULT '件',
  `weight` DECIMAL(8,2) NOT NULL DEFAULT 0,
  `price_min` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '最低 SKU 价(冗余)',
  `price_max` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '最高 SKU 价(冗余)',
  `total_stock` INT NOT NULL DEFAULT 0 COMMENT '总库存(冗余)',
  `sales_count` INT NOT NULL DEFAULT 0 COMMENT '销量(冗余)',
  `cart_add_count` INT NOT NULL DEFAULT 0 COMMENT '累计加购件数',
  `comment_count` INT NOT NULL DEFAULT 0,
  `avg_score` DECIMAL(3,2) NOT NULL DEFAULT 5.00,
  `is_recommend` TINYINT NOT NULL DEFAULT 0,
  `sort` INT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0下架 1上架',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category_id`, `status`),
  KEY `idx_status_sort` (`status`, `sort`),
  KEY `idx_sales` (`sales_count`),
  KEY `idx_brand` (`brand_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='商品 SPU 表';

CREATE TABLE IF NOT EXISTS `product_skus` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `sku_code` VARCHAR(64) NOT NULL COMMENT 'SKU 编码',
  `spec_json` JSON NOT NULL COMMENT '规格组合 {"颜色":"白","尺码":"L"}',
  `spec_text` VARCHAR(200) NULL COMMENT '规格文本（展示/搜索）',
  `image` VARCHAR(255) NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `market_price` DECIMAL(10,2) NULL COMMENT '划线价',
  `cost_price` DECIMAL(10,2) NULL COMMENT '成本价',
  `stock` INT NOT NULL DEFAULT 0,
  `locked_stock` INT NOT NULL DEFAULT 0 COMMENT '锁定库存',
  `warn_stock` INT NOT NULL DEFAULT 10,
  `weight` DECIMAL(8,2) NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '1启用 0停用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sku_code` (`sku_code`),
  KEY `idx_product` (`product_id`),
  CONSTRAINT `fk_sku_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='商品 SKU 表';

CREATE TABLE IF NOT EXISTS `product_images` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `image` VARCHAR(255) NOT NULL,
  `sort` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='商品图片表';

CREATE TABLE IF NOT EXISTS `spec_groups` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL COMMENT '规格组名，如 颜色/尺码',
  `sort` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='规格组表';

CREATE TABLE IF NOT EXISTS `spec_values` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `group_id` INT NOT NULL,
  `value` VARCHAR(50) NOT NULL,
  `sort` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_group` (`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='规格值表';

CREATE TABLE IF NOT EXISTS `product_attributes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(50) NOT NULL COMMENT '参数名',
  `value` VARCHAR(255) NOT NULL COMMENT '参数值',
  `sort` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='商品参数表';

CREATE TABLE IF NOT EXISTS `inventory_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sku_id` BIGINT UNSIGNED NOT NULL,
  `type` TINYINT NOT NULL COMMENT '1入库 2下单锁定 3支付扣减 4取消回退 5手工调整',
  `change` INT NOT NULL,
  `before` INT NOT NULL,
  `after` INT NOT NULL,
  `operator` VARCHAR(50) NULL,
  `remark` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sku` (`sku_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='库存变更流水表';

CREATE TABLE IF NOT EXISTS `product_comments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `sku_id` BIGINT UNSIGNED NULL,
  `order_id` BIGINT UNSIGNED NULL,
  `order_item_id` BIGINT UNSIGNED NULL,
  `score` TINYINT NOT NULL DEFAULT 5 COMMENT '1-5',
  `content` VARCHAR(1000) NOT NULL,
  `images` JSON NULL,
  `is_anonymous` TINYINT NOT NULL DEFAULT 0,
  `reply_content` VARCHAR(500) NULL,
  `reply_at` DATETIME NULL,
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '1显示 0隐藏',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product_score` (`product_id`, `score`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='商品评价表';

-- =============================================================
-- 交易域
-- =============================================================

CREATE TABLE IF NOT EXISTS `carts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `sku_id` BIGINT UNSIGNED NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `selected` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_sku` (`user_id`, `sku_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='购物车表';

CREATE TABLE IF NOT EXISTS `orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_no` VARCHAR(32) NOT NULL COMMENT '订单号',
  `user_id` BIGINT UNSIGNED NOT NULL,
  `status` TINYINT NOT NULL DEFAULT 10 COMMENT '10待付款 20待发货 30待收货 40已完成 50退款中 60已退款 70已取消',
  `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '商品总额(原价)',
  `discount_amount` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '优惠总额(秒杀+满减+券)',
  `seckill_amount` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '秒杀优惠快照',
  `promotion_amount` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '满减优惠快照',
  `coupon_amount` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '优惠券抵扣',
  `points_used` INT NOT NULL DEFAULT 0 COMMENT '本单消耗积分',
  `points_amount` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '积分抵扣金额',
  `freight_amount` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '运费',
  `pay_amount` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '应付金额',
  `paid_amount` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '实付金额',
  `coupon_id` BIGINT UNSIGNED NULL COMMENT '用户券 id',
  `pay_type` TINYINT NULL COMMENT '1微信 2支付宝 3余额 4沙箱',
  `pay_time` DATETIME NULL,
  `ship_time` DATETIME NULL,
  `receive_time` DATETIME NULL,
  `finish_time` DATETIME NULL,
  `close_time` DATETIME NULL,
  `receiver_name` VARCHAR(50) NULL COMMENT '收货人快照',
  `receiver_phone` VARCHAR(20) NULL,
  `receiver_address` VARCHAR(255) NULL,
  `remark` VARCHAR(255) NULL,
  `admin_remark` VARCHAR(255) NULL,
  `is_abnormal` TINYINT NOT NULL DEFAULT 0 COMMENT '后台异常标记 1是 0否',
  `abnormal_reason` VARCHAR(255) NULL COMMENT '异常原因',
  `user_deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '用户是否删除(仅隐藏，不做物理删除)',
  `user_deleted_at` DATETIME NULL COMMENT '用户删除时间',
  `remind_ship_count` INT NOT NULL DEFAULT 0 COMMENT '用户催发货次数',
  `last_remind_ship_at` DATETIME NULL COMMENT '最近催发货时间',
  `source` TINYINT NOT NULL DEFAULT 1 COMMENT '1H5 2PC 3小程序',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_user_status` (`user_id`, `status`),
  KEY `idx_status_created` (`status`, `created_at`),
  KEY `idx_pay_time` (`pay_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='订单主表';

CREATE TABLE IF NOT EXISTS `order_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `sku_id` BIGINT UNSIGNED NOT NULL,
  `product_name` VARCHAR(200) NOT NULL COMMENT '快照:商品名',
  `sku_spec_text` VARCHAR(200) NULL COMMENT '快照:规格',
  `product_image` VARCHAR(255) NULL COMMENT '快照:图片',
  `price` DECIMAL(10,2) NOT NULL COMMENT '快照:成交单价',
  `original_price` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '快照:原价(未参与秒杀时等于 price)',
  `seckill_product_id` BIGINT UNSIGNED NULL COMMENT '关联秒杀商品 id，非秒杀订单为空',
  `quantity` INT NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  `discount_amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `is_gift` TINYINT NOT NULL DEFAULT 0 COMMENT '1满赠赠品 0普通商品',
  `is_commented` TINYINT NOT NULL DEFAULT 0,
  `refund_status` TINYINT NOT NULL DEFAULT 0 COMMENT '0无 1申请中 2已退款 3已拒绝',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_id`),
  KEY `idx_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='订单明细表';

CREATE TABLE IF NOT EXISTS `order_logistics` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `company` VARCHAR(50) NULL,
  `tracking_no` VARCHAR(64) NULL,
  `status` TINYINT NOT NULL DEFAULT 0,
  `traces` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='订单物流表';

CREATE TABLE IF NOT EXISTS `order_refunds` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `refund_no` VARCHAR(32) NOT NULL,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `order_item_id` BIGINT UNSIGNED NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `type` TINYINT NOT NULL COMMENT '1仅退款 2退货退款 3换货',
  `reason` VARCHAR(255) NULL,
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `images` JSON NULL,
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0待审核 1同意 2拒绝 3已退款',
  `audit_remark` VARCHAR(255) NULL,
  `audit_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_refund_no` (`refund_no`),
  KEY `idx_order` (`order_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='售后/退款表';

CREATE TABLE IF NOT EXISTS `payment_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pay_no` VARCHAR(32) NOT NULL COMMENT '支付单号(幂等键)',
  `order_id` BIGINT UNSIGNED NOT NULL,
  `order_no` VARCHAR(32) NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `channel` TINYINT NOT NULL COMMENT '1微信 2支付宝 3余额 4沙箱',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0待支付 1成功 2失败 3已退款 4已关闭',
  `third_party_no` VARCHAR(64) NULL,
  `request_body` TEXT NULL,
  `callback_body` TEXT NULL,
  `paid_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pay_no` (`pay_no`),
  KEY `idx_order` (`order_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='支付流水表';

CREATE TABLE IF NOT EXISTS `invoices` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `type` TINYINT NOT NULL COMMENT '1普票 2专票',
  `title` VARCHAR(100) NOT NULL,
  `tax_no` VARCHAR(50) NULL,
  `content` VARCHAR(255) NULL,
  `email` VARCHAR(100) NULL,
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0待开 1已开',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='发票表';

-- =============================================================
-- 营销域
-- =============================================================

CREATE TABLE IF NOT EXISTS `coupons` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `type` TINYINT NOT NULL COMMENT '1满减 2折扣',
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '面额',
  `discount_rate` DECIMAL(5,2) NOT NULL DEFAULT 1.00 COMMENT '折扣率',
  `min_amount` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '使用门槛',
  `total_count` INT NOT NULL DEFAULT 0 COMMENT '发放总量',
  `received_count` INT NOT NULL DEFAULT 0,
  `used_count` INT NOT NULL DEFAULT 0,
  `per_user_limit` INT NOT NULL DEFAULT 1,
  `valid_type` TINYINT NOT NULL DEFAULT 1 COMMENT '1固定区间 2领取后N天',
  `valid_start` DATETIME NULL,
  `valid_end` DATETIME NULL,
  `valid_days` INT NULL,
  `scope` TINYINT NOT NULL DEFAULT 1 COMMENT '1全场 2指定分类 3指定商品',
  `scope_ids` JSON NULL,
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '1启用 0停用',
  `is_new_user` TINYINT NOT NULL DEFAULT 0 COMMENT '1新人券（注册自动发放） 0普通券',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='优惠券模板表';

CREATE TABLE IF NOT EXISTS `user_coupons` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `coupon_id` BIGINT UNSIGNED NOT NULL,
  `coupon_code` VARCHAR(32) NOT NULL,
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0未使用 1已使用 2已过期',
  `order_id` BIGINT UNSIGNED NULL,
  `received_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `used_at` DATETIME NULL,
  `expire_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_coupon_code` (`coupon_code`),
  KEY `idx_user_status` (`user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='用户优惠券表';

CREATE TABLE IF NOT EXISTS `seckill_activities` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME NOT NULL,
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0未开始 1进行中 2已结束',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='秒杀活动表';

CREATE TABLE IF NOT EXISTS `seckill_products` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `activity_id` BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `sku_id` BIGINT UNSIGNED NOT NULL,
  `seckill_price` DECIMAL(10,2) NOT NULL,
  `seckill_stock` INT NOT NULL DEFAULT 0,
  `sold_count` INT NOT NULL DEFAULT 0,
  `limit_per_user` INT NOT NULL DEFAULT 1,
  `sort` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_activity` (`activity_id`),
  KEY `idx_product` (`product_id`),
  CONSTRAINT `chk_seckill_sold_count` CHECK (`sold_count` >= 0 AND `sold_count` <= `seckill_stock`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='秒杀商品表';

CREATE TABLE IF NOT EXISTS `promotions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `type` TINYINT NOT NULL COMMENT '1满减 2满赠',
  `rule_json` JSON NOT NULL,
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME NOT NULL,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='满减/促销活动表';

CREATE TABLE IF NOT EXISTS `banners` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(100) NOT NULL,
  `subtitle` VARCHAR(200) NULL,
  `image` VARCHAR(255) NOT NULL,
  `link` VARCHAR(255) NULL,
  `bg` VARCHAR(50) NULL COMMENT '背景色',
  `position` VARCHAR(30) NOT NULL DEFAULT 'home_top',
  `sort` INT NOT NULL DEFAULT 0,
  `start_time` DATETIME NULL,
  `end_time` DATETIME NULL,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='首页运营位表';

CREATE TABLE IF NOT EXISTS `notices` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(200) NOT NULL,
  `content` TEXT NULL,
  `type` TINYINT NOT NULL DEFAULT 1,
  `status` TINYINT NOT NULL DEFAULT 1,
  `publish_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='公告表';

-- =============================================================
-- 后台与权限域 (RBAC)
-- =============================================================

CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `real_name` VARCHAR(50) NULL,
  `phone` VARCHAR(20) NULL,
  `avatar` VARCHAR(255) NULL,
  `role_id` INT NULL,
  `status` TINYINT NOT NULL DEFAULT 1,
  `last_login_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_role` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='管理员表';

CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `description` VARCHAR(255) NULL,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='角色表';

CREATE TABLE IF NOT EXISTS `permissions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `parent_id` INT NOT NULL DEFAULT 0,
  `name` VARCHAR(50) NOT NULL,
  `code` VARCHAR(80) NOT NULL COMMENT '如 product:create',
  `type` TINYINT NOT NULL DEFAULT 1 COMMENT '1菜单 2按钮 3接口',
  `path` VARCHAR(120) NULL,
  `component` VARCHAR(120) NULL,
  `icon` VARCHAR(50) NULL,
  `sort` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='权限表';

CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `role_id` INT NOT NULL,
  `permission_id` INT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_perm` (`role_id`, `permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='角色权限关联表';

CREATE TABLE IF NOT EXISTS `admin_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id` BIGINT UNSIGNED NULL COMMENT '管理员 id；登录失败且账号不存在时为空',
  `module` VARCHAR(50) NULL,
  `action` VARCHAR(50) NULL,
  `target_id` BIGINT UNSIGNED NULL,
  `content` VARCHAR(1000) NULL,
  `ip` VARCHAR(64) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin` (`admin_id`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='后台操作日志表';

-- =============================================================
-- 财务与统计域
-- =============================================================

CREATE TABLE IF NOT EXISTS `finance_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NULL,
  `type` TINYINT NOT NULL COMMENT '1收入 2退款',
  `amount` DECIMAL(10,2) NOT NULL,
  `channel` TINYINT NULL,
  `status` TINYINT NOT NULL DEFAULT 1,
  `occurred_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_type_time` (`type`, `occurred_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='财务流水表';

CREATE TABLE IF NOT EXISTS `stat_daily` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `stat_date` DATE NOT NULL,
  `gmv` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `order_count` INT NOT NULL DEFAULT 0,
  `paid_count` INT NOT NULL DEFAULT 0,
  `new_users` INT NOT NULL DEFAULT 0,
  `refund_amount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `avg_order_amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_stat_date` (`stat_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='每日经营统计表(预聚合)';

-- =============================================================
-- 内容与配置域（补充）
-- =============================================================

CREATE TABLE IF NOT EXISTS `home_floors` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(50) NOT NULL,
  `subtitle` VARCHAR(100) NULL,
  `category_id` INT NULL COMMENT '入口分类，空则跳全部商品',
  `sort` INT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status_sort` (`status`, `sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='首页推荐楼层';

CREATE TABLE IF NOT EXISTS `home_floor_products` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `floor_id` BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `sort` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_floor_product` (`floor_id`, `product_id`),
  KEY `idx_floor_sort` (`floor_id`, `sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='首页楼层选品';

CREATE TABLE IF NOT EXISTS `faqs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category` VARCHAR(50) NOT NULL COMMENT '问题分类，如 购物指南/支付相关',
  `question` VARCHAR(255) NOT NULL,
  `answer` TEXT NULL,
  `sort` INT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '1启用 0停用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category_sort` (`category`, `sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='常见问题FAQ表';

CREATE TABLE IF NOT EXISTS `logistics_companies` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL COMMENT '物流公司名称',
  `code` VARCHAR(30) NOT NULL COMMENT '编码，如 SF',
  `phone` VARCHAR(20) NULL COMMENT '客服电话',
  `sort` INT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '1启用 0停用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='物流公司字典表';

CREATE TABLE IF NOT EXISTS `freight_templates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL COMMENT '模板名称',
  `free_amount` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '满额包邮门槛，0 表示不参与包邮',
  `base_freight` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '未达门槛时的基础运费',
  `is_default` TINYINT NOT NULL DEFAULT 0 COMMENT '1 默认模板（全局唯一）',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '1启用 0停用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='运费模板表';

-- =============================================================
-- 订单操作日志（A-25）
-- =============================================================

CREATE TABLE IF NOT EXISTS `order_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `action` VARCHAR(50) NOT NULL COMMENT '动作: create/pay/ship/confirm/cancel/auto_close/admin_close/refund_apply/refund_approve/refund_reject',
  `operator` VARCHAR(50) NOT NULL COMMENT '操作人: user:{id} / admin:{id} / system',
  `remark` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_time` (`order_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='订单操作日志表';

-- =============================================================
-- 系统配置（A-75）与留言工单（U-70/U-74）
-- =============================================================

CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `config_group` VARCHAR(30) NOT NULL DEFAULT 'site' COMMENT '分组: site/service',
  `config_key` VARCHAR(50) NOT NULL COMMENT '配置键，全局唯一',
  `config_value` TEXT NULL,
  `remark` VARCHAR(255) NULL COMMENT '配置说明',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='系统配置表';

CREATE TABLE IF NOT EXISTS `feedbacks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `type` TINYINT NOT NULL DEFAULT 1 COMMENT '1咨询 2投诉 3建议',
  `content` TEXT NOT NULL,
  `images` JSON NULL,
  `contact` VARCHAR(100) NULL COMMENT '联系方式',
  `order_no` VARCHAR(32) NULL COMMENT '关联订单号',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0待处理 1已回复 2已关闭',
  `reply_content` TEXT NULL,
  `reply_at` DATETIME NULL,
  `replier` VARCHAR(50) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status_time` (`status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='留言工单表';

-- =============================================================
-- AI 智能客服（方向一）
-- =============================================================

CREATE TABLE IF NOT EXISTS `ai_conversations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NULL COMMENT '用户 id；匿名会话为空',
  `order_no` VARCHAR(32) NULL COMMENT '关联订单号（可选）',
  `title` VARCHAR(100) NULL COMMENT '会话标题，取首个问题',
  `source` VARCHAR(20) NOT NULL DEFAULT 'contact' COMMENT '入口：contact/product/help',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '1进行中 2已转人工 3已关闭',
  `message_count` INT NOT NULL DEFAULT 0,
  `last_message` VARCHAR(255) NULL COMMENT '最后一条消息摘要',
  `last_message_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_time` (`user_id`, `last_message_at`),
  KEY `idx_order` (`order_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='AI 客服会话表';

CREATE TABLE IF NOT EXISTS `ai_messages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `conversation_id` BIGINT UNSIGNED NOT NULL,
  `role` VARCHAR(16) NOT NULL COMMENT 'user/assistant/tool/system',
  `content` TEXT NOT NULL,
  `citations` JSON NULL COMMENT '知识引用 [{sourceType,sourceId,title,snippet}]',
  `tool_calls` JSON NULL COMMENT '工具调用留痕 [{name,arguments,result}]',
  `tokens` INT NOT NULL DEFAULT 0,
  `model` VARCHAR(50) NULL,
  `latency_ms` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_conversation` (`conversation_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='AI 客服消息表';

CREATE TABLE IF NOT EXISTS `ai_kb_chunks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `source_type` VARCHAR(20) NOT NULL COMMENT 'faq/notice/logistics/freight/policy',
  `source_id` BIGINT UNSIGNED NULL COMMENT '来源表主键；平台规则为固定序号',
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `keywords` VARCHAR(500) NULL COMMENT '检索关键词（调试用）',
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_source` (`source_type`, `source_id`),
  KEY `idx_type_status` (`source_type`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='AI 知识库切片表';

CREATE TABLE IF NOT EXISTS `ai_call_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `module` VARCHAR(30) NOT NULL COMMENT '调用场景：chat/rebuild',
  `user_id` BIGINT UNSIGNED NULL,
  `conversation_id` BIGINT UNSIGNED NULL,
  `model` VARCHAR(50) NULL,
  `prompt_tokens` INT NOT NULL DEFAULT 0,
  `completion_tokens` INT NOT NULL DEFAULT 0,
  `total_tokens` INT NOT NULL DEFAULT 0,
  `cost` DECIMAL(10,4) NOT NULL DEFAULT 0 COMMENT '估算成本（元）',
  `latency_ms` INT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '1成功 0失败',
  `error` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_time` (`created_at`),
  KEY `idx_module_time` (`module`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='AI 调用审计表';

SET FOREIGN_KEY_CHECKS = 1;
