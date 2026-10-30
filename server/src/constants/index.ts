/** 业务错误码分段，详见企划 5.2 */
export const ERR = {
  SUCCESS: 0,
  PARAM: 10000,
  UNAUTHORIZED: 10001,
  FORBIDDEN: 10002,
  NOT_FOUND: 10003,
  RATE_LIMIT: 10004,
  // 用户
  LOGIN_FAILED: 11001,
  USER_DISABLED: 11002,
  USER_EXISTS: 11003,
  SMS_CODE_INVALID: 11004,
  // 商品
  PRODUCT_NOT_FOUND: 12001,
  PRODUCT_OFF_SHELF: 12002,
  // 购物车
  CART_EMPTY: 13001,
  // 订单
  ORDER_NOT_FOUND: 14001,
  ORDER_STATUS_INVALID: 14002,
  STOCK_NOT_ENOUGH: 14003,
  // 支付
  PAY_FAILED: 15001,
  PAY_AMOUNT_MISMATCH: 15002,
  PAY_RECORD_NOT_FOUND: 15003,
  PAY_STATUS_INVALID: 15004,
  BALANCE_NOT_ENOUGH: 15005,
  RECHARGE_NOT_FOUND: 15006,
  // 营销
  COUPON_INVALID: 16001,
  // 后台与权限
  ADMIN_PERMISSION_DENIED: 17002,
} as const

/** 支付渠道 */
export const PAY_CHANNEL = {
  WECHAT: 1,
  ALIPAY: 2,
  BALANCE: 3,
  SANDBOX: 4,
} as const

/** 支付单状态 */
export const PAY_STATUS = {
  PENDING: 0,
  SUCCESS: 1,
  FAILED: 2,
  REFUNDED: 3,
  CLOSED: 4,
} as const

/** 余额流水类型（U-30） */
export const BALANCE_LOG_TYPE = {
  RECHARGE: 1,
  PAYMENT: 2,
  REFUND: 3,
  ADMIN_ADJUST: 4,
} as const

/** 余额充值规则：单笔金额范围与快捷金额（单位：元） */
export const BALANCE_RECHARGE = {
  MIN: 0.01,
  MAX: 50000,
  PRESETS: [50, 100, 200, 500, 1000, 2000],
} as const

/** 库存变更类型 */
export const INVENTORY_TYPE = {
  IN: 1,
  ORDER_LOCK: 2,
  PAID_DEDUCT: 3,
  CANCEL_RELEASE: 4,
  MANUAL_ADJUST: 5,
} as const

/** 售后类型 */
export const REFUND_TYPE = {
  REFUND_ONLY: 1,
  RETURN_REFUND: 2,
  EXCHANGE: 3,
} as const

/** 售后单状态 */
export const REFUND_STATUS = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
  REFUNDED: 3,
  /** 已同意退货/换货，等待商家收到退货 */
  AWAITING_RETURN: 4,
  /** 换货完成（无退款） */
  EXCHANGED: 5,
} as const

/** 财务流水类型 */
export const FINANCE_TYPE = {
  INCOME: 1,
  REFUND: 2,
} as const

/** 演示环境短信验证码（SMS_ADAPTER=console 时使用） */
export const SMS_MOCK_CODE = '8888'

/** 促销活动类型 */
export const PROMOTION_TYPE = {
  FULL_REDUCE: 1,
  FULL_GIFT: 2,
} as const

/** 积分流水类型 */
export const POINTS_TYPE = {
  SIGN_IN: 1,
  ORDER_REWARD: 2,
  DEDUCT: 3,
  ADMIN_ADJUST: 4,
  COMMENT_REWARD: 5,
} as const

/** 签到 / 消费 / 评价积分规则 */
export const POINTS_RULE = {
  /** 每日签到基础积分 */
  SIGN_IN_BASE: 10,
  /** 连续签到每日递增 */
  SIGN_IN_STEP: 2,
  /** 连续签到递增上限 */
  SIGN_IN_MAX_BONUS: 20,
  /** 消费获得积分比例：1 元 = 1 积分 */
  PER_YUAN: 1,
  /** 评价晒单奖励积分（U-65） */
  COMMENT_REWARD: 5,
  /** 积分抵现：100 积分 = 1 元（U-64） */
  DEDUCT_POINTS_PER_YUAN: 100,
  /** 单笔订单最多抵扣应付金额的 50% */
  DEDUCT_MAX_RATE: 0.5,
} as const

export const ORDER_STATUS = {
  PENDING_PAY: 10,
  PAID: 20,
  SHIPPED: 30,
  FINISHED: 40,
  REFUNDING: 50,
  REFUNDED: 60,
  CLOSED: 70,
} as const

export const ORDER_STATUS_TEXT: Record<number, string> = {
  10: '待付款',
  20: '待发货',
  30: '待收货',
  40: '已完成',
  50: '退款中',
  60: '已退款',
  70: '已取消',
}
