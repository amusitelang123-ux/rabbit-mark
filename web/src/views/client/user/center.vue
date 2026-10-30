<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { addressApi, commentApi, couponApi, pointsApi, refundApi, userApi } from '@/api'
import type { Address, Coupon, MyComments, MyPoints, PendingComment, Product, Refund } from '@/api/types'
import { useUserStore } from '@/stores/user'
import { useUiStore } from '@/stores/ui'
import { useAddressStore } from '@/stores/address'
import ProductCard from '@/components/ProductCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import AddressFormModal from '@/components/AddressFormModal.vue'
import CommentDialog from '@/views/client/order/components/CommentDialog.vue'
import { formatMoney } from '@/utils/money'

const user = useUserStore()
const ui = useUiStore()
const addressStore = useAddressStore()

type Tab = 'profile' | 'address' | 'coupon' | 'favorite' | 'footprint' | 'refund' | 'comment' | 'security' | 'points'
const active = ref<Tab>('profile')

const menus: { key: Tab; label: string; icon: string }[] = [
  { key: 'profile', label: '个人资料', icon: '👤' },
  { key: 'address', label: '收货地址', icon: '📍' },
  { key: 'coupon', label: '我的优惠券', icon: '🎟️' },
  { key: 'points', label: '我的积分', icon: '⭐' },
  { key: 'favorite', label: '我的收藏', icon: '♥' },
  { key: 'footprint', label: '浏览足迹', icon: '🕓' },
  { key: 'refund', label: '售后服务', icon: '↩' },
  { key: 'comment', label: '我的评价', icon: '✎' },
  { key: 'security', label: '账户安全', icon: '🔒' },
]

const REFUND_TYPE_TEXT: Record<number, string> = { 1: '仅退款', 2: '退货退款', 3: '换货' }
const REFUND_STATUS_TEXT: Record<number, string> = { 0: '待审核', 1: '已同意', 2: '已拒绝', 3: '已退款' }

const addresses = computed(() => addressStore.list)
const showAddressModal = ref(false)
const editingAddress = ref<Address | null>(null)
const deletingId = ref<number | null>(null)
const coupons = ref<Coupon[]>([])
const favorites = ref<Product[]>([])
const footprints = ref<Product[]>([])
const refunds = ref<Refund[]>([])
const myComments = ref<MyComments>({ pending: [], done: [] })

/* 积分 */
const myPoints = ref<MyPoints>({ balance: 0, todaySigned: false, logs: [] })
const signingIn = ref(false)

const POINTS_TYPE_TEXT: Record<number, string> = { 1: '签到', 2: '消费获得', 3: '积分抵扣', 4: '后台调整' }

async function signIn() {
  if (signingIn.value || myPoints.value.todaySigned) return
  signingIn.value = true
  try {
    const res = await pointsApi.signIn()
    ui.toast(`签到成功，获得 ${res.gain} 积分（连续 ${res.streak} 天）`)
    myPoints.value = await pointsApi.mine()
  } catch (e) {
    ui.toast(e instanceof Error ? e.message : '签到失败', 'error')
  } finally {
    signingIn.value = false
  }
}

/* 发布评价 */
const commentModal = ref(false)
const commentTarget = ref<PendingComment | null>(null)

function openComment(item: PendingComment) {
  commentTarget.value = item
  commentModal.value = true
}

async function onCommentSubmitted() {
  myComments.value = await commentApi.mine()
}

/* 修改密码 */
const pwdForm = ref({ oldPassword: '', newPassword: '', confirm: '' })
const pwdSubmitting = ref(false)

async function submitPassword() {
  if (!pwdForm.value.oldPassword || !pwdForm.value.newPassword) {
    ui.toast('请填写原密码与新密码', 'error')
    return
  }
  if (pwdForm.value.newPassword.length < 6) {
    ui.toast('新密码至少 6 位', 'error')
    return
  }
  if (pwdForm.value.newPassword !== pwdForm.value.confirm) {
    ui.toast('两次输入的新密码不一致', 'error')
    return
  }
  pwdSubmitting.value = true
  try {
    await userApi.changePassword({
      oldPassword: pwdForm.value.oldPassword,
      newPassword: pwdForm.value.newPassword,
    })
    ui.toast('密码已修改')
    pwdForm.value = { oldPassword: '', newPassword: '', confirm: '' }
  } catch (e) {
    ui.toast(e instanceof Error ? e.message : '修改失败', 'error')
  } finally {
    pwdSubmitting.value = false
  }
}

const form = ref({
  nickname: user.user?.nickname ?? '',
  gender: user.user?.gender ?? 0,
  birthday: user.user?.birthday ?? '',
  phone: user.user?.phone ?? '',
})

function syncForm() {
  form.value = {
    nickname: user.user?.nickname ?? '',
    gender: user.user?.gender ?? 0,
    birthday: user.user?.birthday ?? '',
    phone: user.user?.phone ?? '',
  }
}

const couponTabs = ref<0 | 1 | 2>(0)
const shownCoupons = computed(() => coupons.value.filter((c) => c.status === couponTabs.value))

const fileInput = ref<HTMLInputElement | null>(null)
const uploadingAvatar = ref(false)

const AVATAR_MAX_SIZE = 2 * 1024 * 1024

onMounted(async () => {
  const [, c, fav, fp, rf, cm, pt] = await Promise.all([
    addressStore.load(),
    couponApi.mine(),
    userApi.favorites(),
    userApi.footprints(),
    refundApi.mine(),
    commentApi.mine(),
    pointsApi.mine(),
  ])
  coupons.value = c
  favorites.value = fav
  footprints.value = fp
  refunds.value = rf
  myComments.value = cm
  myPoints.value = pt
  try {
    await user.loadProfile()
    syncForm()
  } catch {
    // 加载失败时沿用本地缓存的资料
  }
})

function pickAvatar() {
  fileInput.value?.click()
}

async function onAvatarChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    ui.toast('请选择图片文件', 'error')
    return
  }
  if (file.size > AVATAR_MAX_SIZE) {
    ui.toast('图片大小不能超过 2MB', 'error')
    return
  }
  uploadingAvatar.value = true
  try {
    const updated = await userApi.uploadAvatar(file)
    user.user = updated
    localStorage.setItem('xtx_user', JSON.stringify(updated))
    ui.toast('头像已更新')
  } catch (err) {
    ui.toast(err instanceof Error ? err.message : '上传失败', 'error')
  } finally {
    uploadingAvatar.value = false
  }
}

async function saveProfile() {
  try {
    const updated = await userApi.updateProfile({
      nickname: form.value.nickname,
      gender: form.value.gender,
      birthday: form.value.birthday || undefined,
    })
    user.user = updated
    localStorage.setItem('xtx_user', JSON.stringify(updated))
    ui.toast('资料已保存')
  } catch (err) {
    ui.toast(err instanceof Error ? err.message : '保存失败', 'error')
  }
}

async function onAddressCreated() {
  await addressStore.load()
  ui.toast('收货地址添加成功')
}

function openCreateAddress() {
  editingAddress.value = null
  showAddressModal.value = true
}

function openEditAddress(address: Address) {
  editingAddress.value = address
  showAddressModal.value = true
}

async function onAddressUpdated() {
  await addressStore.load()
  editingAddress.value = null
  ui.toast('收货地址已更新')
}

async function removeAddress(address: Address) {
  try {
    await addressApi.remove(address.id)
    await addressStore.load()
    deletingId.value = null
    ui.toast('收货地址已删除')
  } catch (err) {
    ui.toast(err instanceof Error ? err.message : '删除失败', 'error')
  }
}

function couponLabel(c: Coupon): string {
  return c.type === 1 ? `¥${c.amount}` : `${(c.discountRate * 10).toFixed(1)}折`
}
</script>

<template>
  <div class="page">
    <div class="container">
      <div class="uc">
        <!-- Sidebar -->
        <aside class="uc__side">
          <div class="uc__profile card">
            <img :src="user.user?.avatar" class="uc__avatar" alt="头像" />
            <h2>{{ user.user?.nickname }}</h2>
            <span class="uc__level">{{ user.user?.levelName }}</span>
            <div class="uc__stats">
              <div><b>{{ user.user?.points }}</b><span>积分</span></div>
              <div><b>¥{{ formatMoney(user.user?.totalSpent ?? 0) }}</b><span>累计消费</span></div>
            </div>
          </div>

          <nav class="uc__menu card">
            <button
              v-for="m in menus"
              :key="m.key"
              :class="{ 'is-active': active === m.key }"
              @click="active = m.key"
            >
              <span class="uc__menu-icon">{{ m.icon }}</span>
              {{ m.label }}
            </button>
          </nav>
        </aside>

        <!-- Content -->
        <section class="uc__content card">
          <!-- Profile -->
          <template v-if="active === 'profile'">
            <h1 class="uc__title">个人资料</h1>
            <div class="uc-form">
              <div class="uc-form__avatar">
                <img :src="user.user?.avatar" alt="头像" />
                <button class="btn btn-secondary btn-sm" :disabled="uploadingAvatar" @click="pickAvatar">
                  {{ uploadingAvatar ? '上传中…' : '更换头像' }}
                </button>
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  class="uc-form__file"
                  @change="onAvatarChange"
                />
              </div>
              <div class="field">
                <label>昵称</label>
                <input v-model="form.nickname" class="input" />
              </div>
              <div class="field">
                <label>手机号</label>
                <input v-model="form.phone" class="input" disabled />
              </div>
              <div class="field">
                <label>性别</label>
                <div class="uc-form__radio">
                  <label><input v-model="form.gender" type="radio" :value="0" /> 保密</label>
                  <label><input v-model="form.gender" type="radio" :value="1" /> 男</label>
                  <label><input v-model="form.gender" type="radio" :value="2" /> 女</label>
                </div>
              </div>
              <div class="field">
                <label>生日</label>
                <input v-model="form.birthday" type="date" class="input" />
              </div>
              <button class="btn btn-primary" @click="saveProfile">保存修改</button>
            </div>
          </template>

          <!-- Address -->
          <template v-else-if="active === 'address'">
            <div class="uc__head">
              <h1 class="uc__title">收货地址</h1>
              <button class="btn btn-secondary btn-sm" @click="openCreateAddress">＋ 新增地址</button>
            </div>
            <div v-if="addresses.length" class="uc-addr-grid">
              <div v-for="a in addresses" :key="a.id" class="uc-addr">
                <div class="uc-addr__head">
                  <b>{{ a.receiver }}</b>
                  <span class="muted">{{ a.phone }}</span>
                  <span v-if="a.isDefault" class="tag">默认</span>
                </div>
                <p class="muted">{{ a.province }}{{ a.city }}{{ a.district }}{{ a.detail }}</p>
                <div v-if="deletingId === a.id" class="uc-addr__actions">
                  <span class="uc-addr__confirm">确认删除该地址？</span>
                  <button class="link uc-addr__danger" @click="removeAddress(a)">确认删除</button>
                  <button class="link" @click="deletingId = null">取消</button>
                </div>
                <div v-else class="uc-addr__actions">
                  <button class="link" @click="openEditAddress(a)">编辑</button>
                  <button class="link" @click="deletingId = a.id">删除</button>
                </div>
              </div>
            </div>
            <EmptyState v-else icon="📍" title="还没有收货地址" desc="添加地址后，下单时即可快速选择">
              <button class="btn btn-primary" @click="openCreateAddress">＋ 新增地址</button>
            </EmptyState>
          </template>

          <!-- Coupons -->
          <template v-else-if="active === 'coupon'">
            <h1 class="uc__title">我的优惠券</h1>
            <div class="uc__subtabs">
              <button :class="{ 'is-active': couponTabs === 0 }" @click="couponTabs = 0">未使用</button>
              <button :class="{ 'is-active': couponTabs === 1 }" @click="couponTabs = 1">已使用</button>
              <button :class="{ 'is-active': couponTabs === 2 }" @click="couponTabs = 2">已过期</button>
            </div>
            <div class="uc-coupons">
              <div v-for="c in shownCoupons" :key="c.id" class="uc-coupon" :class="{ 'is-used': c.status !== 0 }">
                <div class="uc-coupon__left">
                  <b>{{ couponLabel(c) }}</b>
                  <span>{{ c.type === 1 ? `满 ${c.minAmount} 可用` : '折扣券' }}</span>
                </div>
                <div class="uc-coupon__right">
                  <h3>{{ c.name }}</h3>
                  <p class="muted">{{ c.scopeText }}</p>
                  <p class="muted">{{ c.validText }}</p>
                </div>
                <button v-if="c.status === 0" class="btn btn-primary btn-sm" @click="ui.toast('去使用', 'info')">去使用</button>
              </div>
              <EmptyState v-if="!shownCoupons.length" icon="🎟️" title="暂无优惠券" />
            </div>
          </template>

          <!-- Points -->
          <template v-else-if="active === 'points'">
            <h1 class="uc__title">我的积分</h1>

            <div class="pts-hero">
              <div>
                <p class="pts-hero__label">当前积分</p>
                <b class="pts-hero__value">{{ myPoints.balance }}</b>
                <p class="pts-hero__tip">消费 1 元得 1 积分，签到可得额外积分</p>
              </div>
              <button class="btn btn-primary" :disabled="myPoints.todaySigned || signingIn" @click="signIn">
                {{ myPoints.todaySigned ? '今日已签到' : signingIn ? '签到中…' : '每日签到' }}
              </button>
            </div>

            <p class="muted uc__footprint-date">积分明细</p>
            <ul v-if="myPoints.logs.length" class="pts-list">
              <li v-for="l in myPoints.logs" :key="l.id" class="pts-item">
                <div>
                  <p>{{ POINTS_TYPE_TEXT[l.type] ?? '积分变动' }}</p>
                  <p class="muted">{{ l.remark }} · {{ l.createdAt }}</p>
                </div>
                <div class="pts-item__right">
                  <b :class="l.change > 0 ? 'pts-plus' : 'pts-minus'">
                    {{ l.change > 0 ? '+' : '' }}{{ l.change }}
                  </b>
                  <span class="muted">余额 {{ l.balance }}</span>
                </div>
              </li>
            </ul>
            <EmptyState v-else icon="⭐" title="暂无积分记录" desc="下单完成或每日签到即可获得积分" />
          </template>

          <!-- Favorite -->
          <template v-else-if="active === 'favorite'">
            <h1 class="uc__title">我的收藏</h1>
            <div v-if="favorites.length" class="grid-products">
              <ProductCard v-for="p in favorites" :key="p.id" :product="p" />
            </div>
            <EmptyState v-else icon="♥" title="还没有收藏商品" />
          </template>

          <!-- Refund -->
          <template v-else-if="active === 'refund'">
            <h1 class="uc__title">售后服务</h1>
            <ul v-if="refunds.length" class="rf-list">
              <li v-for="r in refunds" :key="r.id" class="rf-item">
                <div class="rf-item__main">
                  <p class="rf-item__no">售后单号：{{ r.refundNo }}</p>
                  <p class="muted">订单号：{{ r.orderNo }} · 申请时间：{{ r.createdAt }}</p>
                  <p class="rf-item__reason">
                    {{ REFUND_TYPE_TEXT[r.type] ?? '售后' }} · {{ r.reason }}
                  </p>
                  <p v-if="r.auditRemark" class="muted">审核备注：{{ r.auditRemark }}</p>
                </div>
                <div class="rf-item__right">
                  <b class="rf-item__amount">¥{{ formatMoney(r.amount) }}</b>
                  <span class="rf-item__status" :class="`is-${r.status}`">{{ REFUND_STATUS_TEXT[r.status] }}</span>
                </div>
              </li>
            </ul>
            <EmptyState v-else icon="↩" title="暂无售后记录" desc="订单有问题可前往订单详情申请售后" />
          </template>

          <!-- Comment -->
          <template v-else-if="active === 'comment'">
            <h1 class="uc__title">我的评价</h1>

            <template v-if="myComments.pending.length">
              <p class="muted uc__footprint-date">待评价（{{ myComments.pending.length }}）</p>
              <ul class="cm-list">
                <li v-for="p in myComments.pending" :key="p.orderItemId" class="cm-item">
                  <img :src="p.productImage" :alt="p.productName" />
                  <div class="cm-item__info">
                    <p class="cm-item__name">{{ p.productName }}</p>
                    <p class="muted">{{ p.skuSpecText }} · 订单 {{ p.orderNo }}</p>
                  </div>
                  <button class="btn btn-primary btn-sm" @click="openComment(p)">去评价</button>
                </li>
              </ul>
            </template>

            <p v-if="myComments.done.length" class="muted uc__footprint-date">已评价（{{ myComments.done.length }}）</p>
            <ul v-if="myComments.done.length" class="cm-list">
              <li v-for="c in myComments.done" :key="c.id" class="cm-item cm-item--done">
                <img :src="c.productImage" :alt="c.productName" />
                <div class="cm-item__info">
                  <p class="cm-item__name">{{ c.productName }}</p>
                  <p class="cm-stars">{{ '★'.repeat(c.score) }}<span class="muted">{{ '☆'.repeat(5 - c.score) }}</span></p>
                  <p class="cm-item__content">{{ c.content }}</p>
                  <p v-if="c.replyContent" class="muted">商家回复：{{ c.replyContent }}</p>
                  <p class="muted">{{ c.createdAt }}</p>
                </div>
              </li>
            </ul>

            <EmptyState
              v-if="!myComments.pending.length && !myComments.done.length"
              icon="✎"
              title="暂无评价记录"
              desc="订单完成后即可评价商品"
            />
          </template>

          <!-- Security -->
          <template v-else-if="active === 'security'">
            <h1 class="uc__title">账户安全</h1>
            <div class="sec-card">
              <h3>修改密码</h3>
              <p class="muted">为保障账户安全，建议定期更换密码</p>
              <div class="sec-field">
                <label>原密码</label>
                <input v-model="pwdForm.oldPassword" type="password" placeholder="请输入原密码" />
              </div>
              <div class="sec-field">
                <label>新密码</label>
                <input v-model="pwdForm.newPassword" type="password" placeholder="至少 6 位" />
              </div>
              <div class="sec-field">
                <label>确认新密码</label>
                <input v-model="pwdForm.confirm" type="password" placeholder="再次输入新密码" />
              </div>
              <button class="btn btn-primary" :disabled="pwdSubmitting" @click="submitPassword">
                {{ pwdSubmitting ? '提交中…' : '确认修改' }}
              </button>
            </div>
          </template>

          <!-- Footprint -->
          <template v-else>
            <h1 class="uc__title">浏览足迹</h1>
            <p class="muted uc__footprint-date">今天</p>
            <div v-if="footprints.length" class="grid-products">
              <ProductCard v-for="p in footprints" :key="p.id" :product="p" />
            </div>
            <EmptyState v-else icon="🕓" title="暂无浏览记录" />
          </template>
        </section>
      </div>
    </div>

    <AddressFormModal
      v-model="showAddressModal"
      :address="editingAddress"
      @created="onAddressCreated"
      @updated="onAddressUpdated"
    />

    <CommentDialog
      v-model="commentModal"
      :order-item-id="commentTarget?.orderItemId ?? 0"
      :product-name="commentTarget?.productName ?? ''"
      :product-image="commentTarget?.productImage ?? ''"
      :order-no="commentTarget?.orderNo ?? ''"
      @submitted="onCommentSubmitted"
    />
  </div>
</template>

<style scoped>
.uc {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 18px;
  align-items: start;
}
.uc__side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: calc(var(--header-h) + var(--subnav-h) + 12px);
}
.uc__profile {
  padding: 24px;
  text-align: center;
}
.uc__avatar {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  margin: 0 auto 12px;
  border: 3px solid var(--amz-orange);
  object-fit: cover;
  background: var(--bg-hover);
}
.uc__profile h2 {
  font-size: 18px;
  margin-bottom: 6px;
}
.uc__level {
  display: inline-block;
  background: linear-gradient(90deg, #ffe0a3, #febd69);
  color: #6b4300;
  font-size: 12px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 100px;
}
.uc__stats {
  display: flex;
  margin-top: 16px;
  border-top: 1px solid var(--border-light);
  padding-top: 14px;
}
.uc__stats div {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.uc__stats b {
  font-size: 16px;
  color: var(--amz-price);
}
.uc__stats span {
  font-size: 12px;
  color: var(--text-secondary);
}
.uc__menu {
  padding: 8px;
  display: flex;
  flex-direction: column;
}
.uc__menu button {
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: none;
  text-align: left;
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--text);
}
.uc__menu button:hover {
  background: var(--bg-hover);
}
.uc__menu button.is-active {
  background: #fff4e5;
  color: #b45309;
  font-weight: 700;
}
.uc__menu-icon {
  font-size: 16px;
}

.uc__content {
  padding: 24px;
  min-height: 500px;
}
.uc__title {
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 20px;
}
.uc__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.uc__head .uc__title {
  margin-bottom: 0;
}
.uc__subtabs {
  display: flex;
  gap: 6px;
  margin: -6px 0 18px;
}
.uc__subtabs button {
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 100px;
  padding: 6px 16px;
  font-size: 13px;
}
.uc__subtabs button.is-active {
  background: var(--amz-navy-2);
  border-color: var(--amz-navy-2);
  color: #fff;
}
.uc__footprint-date {
  margin-bottom: 12px;
  font-weight: 700;
}

.uc-form {
  max-width: 420px;
}
.uc-form__avatar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}
.uc-form__avatar img {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border);
  background: var(--bg-hover);
}
.uc-form__file {
  display: none;
}
.uc-form__radio {
  display: flex;
  gap: 20px;
  font-size: 14px;
}
.uc-form__radio label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.uc-addr-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.uc-addr {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
}
.uc-addr__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.uc-addr__actions {
  display: flex;
  gap: 16px;
  margin-top: 12px;
}
.uc-addr__actions button {
  background: none;
  border: none;
  font-size: 13px;
}
.uc-addr__confirm {
  font-size: 13px;
  color: var(--text-secondary);
}
.uc-addr__danger {
  color: var(--amz-price);
  font-weight: 700;
}

.uc-coupons {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.uc-coupon {
  display: grid;
  grid-template-columns: 160px 1fr auto;
  align-items: center;
  gap: 18px;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}
.uc-coupon__left {
  background: linear-gradient(135deg, #ff9d2e, #febd69);
  color: #fff;
  padding: 20px 16px;
  text-align: center;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}
.uc-coupon__left b {
  font-size: 26px;
}
.uc-coupon__left span {
  font-size: 12px;
  opacity: 0.95;
}
.uc-coupon__right {
  padding: 12px 0;
}
.uc-coupon__right h3 {
  font-size: 16px;
  margin-bottom: 4px;
}
.uc-coupon__right p {
  font-size: 12.5px;
}
.uc-coupon.is-used {
  filter: grayscale(1);
  opacity: 0.75;
}
.uc-coupon > button {
  margin-right: 18px;
}

@media (max-width: 900px) {
  .uc {
    grid-template-columns: 1fr;
  }
  .uc__side {
    position: static;
  }
  .uc-addr-grid {
    grid-template-columns: 1fr;
  }
  .uc-coupon {
    grid-template-columns: 120px 1fr;
  }
  .uc-coupon > button {
    display: none;
  }
}

.rf-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.rf-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px 16px;
}
.rf-item__no {
  font-size: 14px;
  margin-bottom: 4px;
}
.rf-item__reason {
  font-size: 13px;
  margin-top: 6px;
  color: var(--text-secondary);
}
.rf-item__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}
.rf-item__amount {
  color: var(--amz-price);
  font-size: 16px;
}
.rf-item__status {
  font-size: 13px;
  font-weight: 700;
}
.rf-item__status.is-0 {
  color: var(--amz-price);
}
.rf-item__status.is-1 {
  color: var(--amz-success);
}
.rf-item__status.is-2 {
  color: #c0392b;
}
.rf-item__status.is-3 {
  color: var(--amz-success);
}

.cm-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}
.cm-item {
  display: flex;
  align-items: center;
  gap: 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px 16px;
}
.cm-item--done {
  align-items: flex-start;
}
.cm-item img {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}
.cm-item__info {
  flex: 1;
  min-width: 0;
}
.cm-item__name {
  font-size: 14px;
  margin-bottom: 4px;
}
.cm-item__content {
  font-size: 13px;
  margin: 6px 0 4px;
}
.cm-stars {
  color: var(--amz-orange);
  font-size: 14px;
  letter-spacing: 1px;
}
.cm-stars .muted {
  color: var(--border);
}

.sec-card {
  max-width: 420px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px;
}
.sec-card h3 {
  font-size: 16px;
  margin-bottom: 4px;
}
.sec-field {
  margin-top: 14px;
}
.sec-field label {
  display: block;
  font-size: 13px;
  margin-bottom: 6px;
  color: var(--text-secondary);
}
.sec-field input {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 14px;
  outline: none;
}
.sec-field input:focus {
  border-color: var(--amz-orange);
}
.sec-card > .btn {
  margin-top: 20px;
}

.pts-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  background: linear-gradient(120deg, #fff4e6, #ffe8cc);
  border-radius: 12px;
  padding: 24px 26px;
  margin-bottom: 22px;
}
.pts-hero__label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.pts-hero__value {
  font-size: 34px;
  font-weight: 900;
  color: var(--amz-price);
  line-height: 1.1;
}
.pts-hero__tip {
  font-size: 12.5px;
  color: var(--text-secondary);
  margin-top: 6px;
}
.pts-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pts-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 16px;
}
.pts-item p:first-child {
  font-size: 14px;
}
.pts-item__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}
.pts-item__right b {
  font-size: 16px;
}
.pts-plus {
  color: var(--amz-success);
}
.pts-minus {
  color: #c0392b;
}
</style>
