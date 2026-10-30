import type { Transaction } from 'sequelize'
import { OrderLog } from '../models'

/** 订单动作 -> 中文文案（后台时间轴展示） */
export const ORDER_ACTION_TEXT: Record<string, string> = {
  create: '提交订单',
  pay: '支付成功',
  ship: '商家发货',
  reship: '修改物流单号',
  confirm: '确认收货',
  cancel: '取消订单',
  auto_close: '超时自动关闭',
  admin_close: '后台关闭订单',
  refund_apply: '申请售后',
  refund_agree: '售后审核通过，等待收货',
  refund_receive: '确认收到退货，售后完成',
  refund_approve: '售后退款完成',
  refund_reject: '售后审核拒绝',
  remark: '后台备注',
  abnormal_mark: '标记异常订单',
  abnormal_clear: '取消异常标记',
  remind_ship: '提醒发货',
  rebuy: '再次购买',
  delete: '删除订单',
  comment: '发表评价',
}

export type OrderAction = keyof typeof ORDER_ACTION_TEXT

/** 记录订单操作日志（与订单状态变更同事务，失败不阻断主流程） */
export async function writeOrderLog(
  orderId: number,
  action: OrderAction,
  operator: string,
  remark?: string,
  transaction?: Transaction,
): Promise<void> {
  try {
    await OrderLog.create(
      { orderId, action, operator, remark: remark ?? null },
      { transaction },
    )
  } catch {
    // 日志失败不影响主业务
  }
}
