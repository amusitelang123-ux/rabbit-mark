<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@admin/api'
import type { Order } from '@/api/types'
import { ORDER_STATUS_TEXT } from '@/constants/order'
import { useAdminStore } from '@admin/stores/admin'

const route = useRoute()
const router = useRouter()
const admin = useAdminStore()

const orderNo = route.params.orderNo as string
const loading = ref(true)
const order = ref<Order | null>(null)

const PAY_CHANNEL_TEXT: Record<number, string> = { 1: '微信支付', 2: '支付宝', 3: '余额', 4: '沙箱支付' }
const PAY_STATUS_TEXT: Record<number, string> = { 0: '待支付', 1: '支付成功', 2: '支付失败', 3: '已退款', 4: '已关闭' }

const shipDialog = reactive({ visible: false, company: '', trackingNo: '' })
const reshipDialog = reactive({ visible: false, company: '', trackingNo: '' })
const remarkDialog = reactive({ visible: false, remark: '' })
const abnormalDialog = reactive({ visible: false, reason: '' })

async function load() {
  loading.value = true
  try {
    order.value = await adminApi.orderApi.detail(orderNo)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function openShip() {
  Object.assign(shipDialog, { visible: true, company: '', trackingNo: '' })
}

async function submitShip() {
  if (!shipDialog.company || !shipDialog.trackingNo) {
    ElMessage.warning('请填写物流公司与运单号')
    return
  }
  try {
    await adminApi.orderApi.ship(orderNo, { company: shipDialog.company, trackingNo: shipDialog.trackingNo })
    ElMessage.success('发货成功')
    shipDialog.visible = false
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '发货失败')
  }
}

async function closeOrder() {
  let reason = ''
  try {
    const res = await ElMessageBox.prompt('请输入关闭原因', '关闭订单', { inputValue: '后台关闭订单' })
    reason = res.value
  } catch {
    return
  }
  try {
    await adminApi.orderApi.close(orderNo, reason)
    ElMessage.success('订单已关闭')
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '关闭失败')
  }
}

function openRemark() {
  Object.assign(remarkDialog, { visible: true, remark: '' })
}

/** A-22 修改运单号：回填当前物流信息 */
function openReship() {
  if (!order.value?.logistics) return
  Object.assign(reshipDialog, {
    visible: true,
    company: order.value.logistics.company,
    trackingNo: order.value.logistics.trackingNo,
  })
}

async function submitReship() {
  if (!reshipDialog.company || !reshipDialog.trackingNo) {
    ElMessage.warning('请填写物流公司与运单号')
    return
  }
  try {
    await adminApi.orderApi.updateShipping(orderNo, {
      company: reshipDialog.company,
      trackingNo: reshipDialog.trackingNo,
    })
    ElMessage.success('运单号已更新')
    reshipDialog.visible = false
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '更新失败')
  }
}

/** A-23 异常标记 */
function openAbnormal() {
  Object.assign(abnormalDialog, { visible: true, reason: order.value?.abnormalReason ?? '' })
}

async function submitAbnormal() {
  if (!abnormalDialog.reason.trim()) {
    ElMessage.warning('请填写异常原因')
    return
  }
  try {
    await adminApi.orderApi.markAbnormal(orderNo, {
      abnormal: true,
      reason: abnormalDialog.reason.trim(),
    })
    ElMessage.success('已标记异常')
    abnormalDialog.visible = false
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '标记失败')
  }
}

async function clearAbnormal() {
  try {
    await ElMessageBox.confirm('确定取消该订单的异常标记吗？', '取消异常', { type: 'warning' })
  } catch {
    return
  }
  try {
    await adminApi.orderApi.markAbnormal(orderNo, { abnormal: false })
    ElMessage.success('已取消异常标记')
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '操作失败')
  }
}

async function submitRemark() {
  try {
    await adminApi.orderApi.remark(orderNo, remarkDialog.remark)
    ElMessage.success('备注已保存')
    remarkDialog.visible = false
    load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
}

onMounted(load)
</script>

<template>
  <div v-loading="loading">
    <el-card shadow="never" class="head">
      <div class="head__left">
        <h2>{{ order ? ORDER_STATUS_TEXT[order.status] : '' }}</h2>
        <p>订单号：{{ orderNo }}<span v-if="order"> · 下单时间：{{ order.createdAt }}</span></p>
      </div>
      <div class="head__actions">
        <el-button @click="router.push('/admin/orders')">返回列表</el-button>
        <el-button v-if="order?.status === 20 && admin.hasPerm('order:ship')" type="primary" @click="openShip">发货</el-button>
        <el-button
          v-if="order?.logistics && (order.status === 30 || order.status === 40) && admin.hasPerm('order:ship')"
          @click="openReship"
        >
          修改运单号
        </el-button>
        <el-button
          v-if="order && (order.status === 10 || order.status === 20) && admin.hasPerm('order:update')"
          type="danger"
          @click="closeOrder"
        >
          关闭订单
        </el-button>
        <el-button v-if="admin.hasPerm('order:update')" @click="openRemark">备注</el-button>
        <el-button
          v-if="order && !order.isAbnormal && admin.hasPerm('order:update')"
          type="warning"
          plain
          @click="openAbnormal"
        >
          标记异常
        </el-button>
        <el-button v-if="order?.isAbnormal && admin.hasPerm('order:update')" type="success" plain @click="clearAbnormal">
          取消异常
        </el-button>
      </div>
    </el-card>

    <el-alert
      v-if="order?.isAbnormal"
      type="error"
      effect="light"
      show-icon
      :closable="false"
      class="remind-alert"
      title="该订单已被标记为异常"
    >
      {{ order.abnormalReason || '未填写异常原因' }}
    </el-alert>

    <el-alert
      v-if="order && order.status === 20 && order.remindShipCount > 0"
      type="warning"
      effect="light"
      show-icon
      :closable="false"
      class="remind-alert"
    >
      <template #title>
        用户已催发货 <b>{{ order.remindShipCount }}</b> 次，最近一次 {{ order.lastRemindShipAt || '—' }}。
        <el-button v-if="admin.hasPerm('order:ship')" link type="primary" @click="openShip">立即发货</el-button>
      </template>
    </el-alert>

    <el-row v-if="order" :gutter="16">
      <el-col :md="16">
        <el-card shadow="never" class="block">
          <template #header><span>商品明细</span></template>
          <el-table :data="order.items" size="small">
            <el-table-column label="商品" min-width="220">
              <template #default="{ row }">
                <div class="item-cell">
                  <img :src="row.productImage" alt="" />
                  <div>
                    <p>{{ row.productName }}</p>
                    <p class="muted">
                      <el-tag v-if="row.isGift" type="warning" size="small">赠品</el-tag>
                      <el-tag v-else-if="row.seckill" type="danger" size="small">秒杀</el-tag>
                      {{ row.skuSpecText }}
                    </p>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="单价" width="110">
              <template #default="{ row }">¥{{ row.price }}</template>
            </el-table-column>
            <el-table-column label="数量" prop="quantity" width="80" />
            <el-table-column label="小计" width="110">
              <template #default="{ row }">¥{{ row.subtotal }}</template>
            </el-table-column>
          </el-table>
        </el-card>

        <el-card v-if="order.logistics" shadow="never" class="block">
          <template #header><span>物流信息</span></template>
          <p class="logi">
            <b>{{ order.logistics.company }}</b>
            <span class="muted">运单号：{{ order.logistics.trackingNo }}</span>
          </p>
          <el-timeline>
            <el-timeline-item v-for="(t, i) in order.logistics.traces" :key="i" :timestamp="t.time">
              {{ t.text }}
            </el-timeline-item>
          </el-timeline>
        </el-card>

        <el-card shadow="never" class="block">
          <template #header><span>操作日志</span></template>
          <el-empty v-if="!order.logs.length" description="暂无操作记录" :image-size="60" />
          <el-timeline v-else>
            <el-timeline-item
              v-for="log in order.logs"
              :key="log.id"
              :timestamp="log.createdAt"
              placement="top"
            >
              <p class="log-action">{{ log.actionText }}</p>
              <p class="log-meta">{{ log.operator }}<span v-if="log.remark"> · {{ log.remark }}</span></p>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>

      <el-col :md="8">
        <el-card shadow="never" class="block">
          <template #header><span>收货信息</span></template>
          <p><b>{{ order.receiverName }}</b> {{ order.receiverPhone }}</p>
          <p class="muted">{{ order.receiverAddress }}</p>
          <p v-if="order.remark" class="remark">买家备注：{{ order.remark }}</p>
        </el-card>

        <el-card shadow="never" class="block">
          <template #header><span>金额明细</span></template>
          <div class="amount-row"><span>商品总额</span><b>¥{{ order.totalAmount }}</b></div>
          <div class="amount-row"><span>运费</span><b>¥{{ order.freightAmount }}</b></div>
          <div class="amount-row"><span>秒杀优惠</span><b>-¥{{ order.seckillAmount }}</b></div>
          <div class="amount-row"><span>优惠券抵扣</span><b>-¥{{ order.couponAmount }}</b></div>
          <div class="amount-row"><span>满减优惠</span><b>-¥{{ order.promotionAmount }}</b></div>
          <div v-if="order.pointsAmount" class="amount-row">
            <span>积分抵扣（{{ order.pointsUsed }} 积分）</span><b>-¥{{ order.pointsAmount }}</b>
          </div>
          <div class="amount-row amount-row--total"><span>实付金额</span><b>¥{{ order.payAmount }}</b></div>
          <p class="muted pay-type">
            支付方式：{{ order.payType ? ['', '微信支付', '支付宝', '余额', '沙箱支付'][order.payType] : '未支付' }}
          </p>
          <p v-if="order.invoice" class="muted pay-type">
            发票：{{ order.invoice.type === 2 ? '增值税专票' : '电子普票' }} · {{ order.invoice.title }}
            <span v-if="order.invoice.taxNo"> · 税号 {{ order.invoice.taxNo }}</span>
            <span v-if="order.invoice.email"> · {{ order.invoice.email }}</span>
          </p>
        </el-card>

        <el-card v-if="order.payment" shadow="never" class="block">
          <template #header><span>支付信息</span></template>
          <p class="pay-info">支付单号：{{ order.payment.payNo }}</p>
          <p class="pay-info">支付渠道：{{ PAY_CHANNEL_TEXT[order.payment.channel] ?? '—' }}</p>
          <p class="pay-info">支付状态：{{ PAY_STATUS_TEXT[order.payment.status] ?? '—' }}</p>
          <p class="pay-info">支付金额：¥{{ order.payment.amount }}</p>
          <p class="pay-info">支付时间：{{ order.payment.paidAt || '—' }}</p>
          <p class="pay-info">第三方交易号：{{ order.payment.thirdPartyNo || '—' }}</p>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="shipDialog.visible" title="订单发货" width="420px">
      <el-form label-width="90px">
        <el-form-item label="物流公司"><el-input v-model="shipDialog.company" placeholder="如 顺丰速运" /></el-form-item>
        <el-form-item label="运单号"><el-input v-model="shipDialog.trackingNo" placeholder="请输入运单号" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shipDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitShip">确认发货</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="reshipDialog.visible" title="修改运单号" width="420px">
      <el-form label-width="90px">
        <el-form-item label="物流公司"><el-input v-model="reshipDialog.company" placeholder="如 顺丰速运" /></el-form-item>
        <el-form-item label="运单号"><el-input v-model="reshipDialog.trackingNo" placeholder="请输入运单号" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reshipDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitReship">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="abnormalDialog.visible" title="标记异常订单" width="440px">
      <el-input
        v-model="abnormalDialog.reason"
        type="textarea"
        :rows="4"
        maxlength="255"
        show-word-limit
        placeholder="请填写异常原因，如：用户反馈未收到货 / 地址异常"
      />
      <template #footer>
        <el-button @click="abnormalDialog.visible = false">取消</el-button>
        <el-button type="warning" @click="submitAbnormal">确认标记</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="remarkDialog.visible" title="后台备注" width="420px">
      <el-input v-model="remarkDialog.remark" type="textarea" :rows="4" placeholder="仅后台可见" />
      <template #footer>
        <el-button @click="remarkDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitRemark">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.head {
  margin-bottom: 16px;
}
.remind-alert {
  margin-bottom: 16px;
}
.pay-info {
  font-size: 13px;
  color: #606266;
  line-height: 1.9;
  word-break: break-all;
}
.head :deep(.el-card__body) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.head__left h2 {
  font-size: 20px;
  font-weight: 500;
  color: #67c23a;
  margin-bottom: 6px;
}
.head__left p {
  font-size: 13px;
  color: #8a93a0;
}
.block {
  margin-bottom: 16px;
}
.item-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.item-cell img {
  width: 46px;
  height: 46px;
  border-radius: 6px;
  object-fit: cover;
}
.muted {
  color: #9aa3af;
  font-size: 13px;
}
.logi {
  display: flex;
  gap: 14px;
  margin-bottom: 14px;
}
.remark {
  margin-top: 10px;
  background: #fdf6ec;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 13px;
  color: #b88230;
}
.amount-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
}
.amount-row--total {
  border-top: 1px solid #ebeef5;
  padding-top: 12px;
  font-size: 16px;
}
.amount-row--total b {
  color: #fe7c00;
}
.pay-type {
  margin-top: 8px;
}
.log-action {
  font-size: 13.5px;
  font-weight: 500;
  color: #1f2733;
}
.log-meta {
  font-size: 12px;
  color: #9aa3af;
  margin-top: 2px;
}
</style>
