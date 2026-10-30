import { aggregateRecent } from '../services/statDailyService'

/**
 * stat_daily 预聚合任务：
 * - 启动时回填最近 30 天（已存在的日期幂等 upsert）；
 * - 每 10 分钟刷新今天/昨天，避免统计接口实时扫描业务表。
 */
export function startStatAggregationJob(): NodeJS.Timeout {
  const refresh = async () => {
    try {
      await aggregateRecent(2)
    } catch (err) {
      console.error('[job] 每日经营预聚合失败', err)
    }
  }

  void (async () => {
    try {
      await aggregateRecent(30)
      console.log('[job] stat_daily 已回填最近 30 天')
    } catch (err) {
      console.error('[job] stat_daily 回填失败', err)
    }
  })()

  const timer = setInterval(refresh, 10 * 60 * 1000)
  timer.unref()
  return timer
}
