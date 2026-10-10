<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { ElMessage } from 'element-plus'
import { adminApi } from '@admin/api'
import type { AdminOverview, CategorySalesItem, ProductRankItem, UserAnalysis } from '@admin/api'

// 按需注册：只打包折线/饼图与所需组件，避免引入完整 echarts
echarts.use([LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

type ChartInstance = ReturnType<typeof echarts.init>

const loading = ref(true)
const overview = ref<AdminOverview | null>(null)
const trend = ref<{ date: string; orderCount: number; amount: number }[]>([])
const category = ref<CategorySalesItem[]>([])
const rank = ref<ProductRankItem[]>([])
const rankType = ref<'sales' | 'amount'>('sales')
const analysis = ref<UserAnalysis | null>(null)

const trendRef = ref<HTMLDivElement>()
const pieRef = ref<HTMLDivElement>()
let trendChart: ChartInstance | null = null
let pieChart: ChartInstance | null = null

const cards = [
  { key: 'gmv', label: '累计 GMV', unit: '元', color: '#fe7c00' },
  { key: 'orderCount', label: '订单总数', unit: '单', color: '#409eff' },
  { key: 'userCount', label: '用户总数', unit: '人', color: '#67c23a' },
  { key: 'productCount', label: '在售商品', unit: '件', color: '#e6a23c' },
  { key: 'avgOrderAmount', label: '客单价', unit: '元', color: '#909399' },
] as const

function valueOf(key: (typeof cards)[number]['key']): number {
  return overview.value ? Number(overview.value[key] ?? 0) : 0
}

function renderTrend() {
  if (!trendRef.value) return
  trendChart = trendChart ?? echarts.init(trendRef.value)
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['销售额', '订单量'], right: 10, top: 0 },
    grid: { left: 50, right: 50, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: trend.value.map((t) => t.date.slice(5)), boundaryGap: false },
    yAxis: [
      { type: 'value', name: '销售额' },
      { type: 'value', name: '订单量' },
    ],
    series: [
      {
        name: '销售额',
        type: 'line',
        smooth: true,
        showSymbol: false,
        areaStyle: { opacity: 0.12 },
        itemStyle: { color: '#fe7c00' },
        data: trend.value.map((t) => t.amount),
      },
      {
        name: '订单量',
        type: 'line',
        smooth: true,
        showSymbol: false,
        yAxisIndex: 1,
        itemStyle: { color: '#409eff' },
        data: trend.value.map((t) => t.orderCount),
      },
    ],
  })
}

function renderPie() {
  if (!pieRef.value) return
  pieChart = pieChart ?? echarts.init(pieRef.value)
  pieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    legend: { orient: 'vertical', right: 10, top: 'center' },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: true,
        label: { show: false },
        data: category.value.map((c) => ({ name: c.name, value: Number(c.value) })),
      },
    ],
  })
}

async function loadRank() {
  try {
    rank.value = await adminApi.statsApi.productRank(rankType.value, 10)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  }
}

async function switchRank(type: 'sales' | 'amount') {
  rankType.value = type
  await loadRank()
}

function onResize() {
  trendChart?.resize()
  pieChart?.resize()
}

onMounted(async () => {
  try {
    const [ov, tr, cat, an] = await Promise.all([
      adminApi.statsApi.overview(),
      adminApi.statsApi.salesTrend(30),
      adminApi.statsApi.categorySales(),
      adminApi.statsApi.userAnalysis(30),
    ])
    overview.value = ov
    trend.value = tr
    category.value = cat
    analysis.value = an
    await loadRank()
    renderTrend()
    renderPie()
    window.addEventListener('resize', onResize)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  trendChart?.dispose()
  pieChart?.dispose()
})
</script>

<template>
  <div v-loading="loading">
    <el-row :gutter="16">
      <el-col v-for="c in cards" :key="c.key" :xs="12" :sm="8" :md="8" :lg="4" :xl="4">
        <div class="stat-card">
          <span class="stat-card__label">{{ c.label }}</span>
          <b class="stat-card__value" :style="{ color: c.color }">
            {{ valueOf(c.key) }}
            <small>{{ c.unit }}</small>
          </b>
        </div>
      </el-col>
    </el-row>

    <el-card shadow="never" class="block">
      <template #header><span>近 30 天销售趋势</span></template>
      <div ref="trendRef" class="chart chart--line" />
    </el-card>

    <el-row :gutter="16">
      <el-col :md="10">
        <el-card shadow="never" class="block">
          <template #header><span>分类销售占比</span></template>
          <div ref="pieRef" class="chart chart--pie" />
        </el-card>
      </el-col>

      <el-col :md="14">
        <el-card shadow="never" class="block">
          <template #header>
            <div class="block__head">
              <span>商品排行 TOP10</span>
              <el-radio-group :model-value="rankType" size="small" @change="(v: string | number | boolean | undefined) => switchRank(v as 'sales' | 'amount')">
                <el-radio-button value="sales">按销量</el-radio-button>
                <el-radio-button value="amount">按销售额</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <el-table :data="rank" size="small" max-height="330">
            <el-table-column type="index" label="#" width="50" />
            <el-table-column label="商品" min-width="200">
              <template #default="{ row }">
                <div class="rank-cell">
                  <img :src="row.image" alt="" />
                  <span>{{ row.name }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="销量" prop="sales" width="90" />
            <el-table-column label="销售额" width="120">
              <template #default="{ row }">¥{{ row.amount }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-card v-if="analysis" shadow="never" class="block">
      <template #header><span>用户分析</span></template>
      <el-row :gutter="16">
        <el-col :xs="12" :sm="6">
          <div class="mini"><span>累计下单用户</span><b>{{ analysis.buyers }}</b></div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="mini"><span>复购用户</span><b>{{ analysis.repeatUsers }}</b></div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="mini"><span>复购率</span><b>{{ analysis.repeatRate }}%</b></div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="mini"><span>近 30 天新增</span><b>{{ analysis.trend.reduce((s, t) => s + t.newUsers, 0) }}</b></div>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<style scoped>
.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 18px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.stat-card__label {
  font-size: 13px;
  color: #8a93a0;
}
.stat-card__value {
  font-size: 24px;
  font-weight: 500;
}
.stat-card__value small {
  font-size: 12px;
  font-weight: 400;
  color: #9aa3af;
  margin-left: 4px;
}
.block {
  margin-bottom: 16px;
}
.block__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.chart {
  width: 100%;
}
.chart--line {
  height: 300px;
}
.chart--pie {
  height: 300px;
}
.rank-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.rank-cell img {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  object-fit: cover;
}
.mini {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.mini span {
  font-size: 13px;
  color: #8a93a0;
}
.mini b {
  font-size: 20px;
  font-weight: 500;
  color: #1f2733;
}
</style>
