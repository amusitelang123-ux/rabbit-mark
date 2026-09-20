import type { OrderStatus } from '@/api/types'

export const ORDER_STATUS_TEXT: Record<OrderStatus, string> = {
  10: '待付款',
  20: '待发货',
  30: '待收货',
  40: '已完成',
  50: '退款中',
  60: '已退款',
  70: '已取消',
}

export const ORDER_TABS = [
  { key: 'all', label: '全部订单' },
  { key: 10, label: '待付款' },
  { key: 20, label: '待发货' },
  { key: 30, label: '待收货' },
  { key: 40, label: '已完成' },
  { key: 70, label: '已取消' },
] as const
