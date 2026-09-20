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
  // 营销
  COUPON_INVALID: 16001,
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
