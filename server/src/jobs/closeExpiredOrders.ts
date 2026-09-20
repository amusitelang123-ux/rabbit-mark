import { closeExpiredOrders } from '../services/orderService'

/** 每分钟扫描一次，关闭超 30 分钟未支付的订单 */
export function startCloseExpiredOrdersJob(): NodeJS.Timeout {
  const timer = setInterval(async () => {
    try {
      const count = await closeExpiredOrders(30)
      if (count > 0) console.log(`[job] 自动关闭超时订单 ${count} 笔`)
    } catch (err) {
      console.error('[job] 关闭超时订单失败', err)
    }
  }, 60 * 1000)
  timer.unref()
  return timer
}
