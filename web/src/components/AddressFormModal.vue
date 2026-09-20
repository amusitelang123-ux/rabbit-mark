<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { addressApi } from '@/api'
import type { Address } from '@/api/types'
import { useUiStore } from '@/stores/ui'
import { regionMap } from '@/constants/regions'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; created: [address: Address] }>()

const ui = useUiStore()

const receiver = ref('')
const phone = ref('')
const province = ref('')
const city = ref('')
const district = ref('')
const detail = ref('')
const isDefault = ref(false)
const submitting = ref(false)

const provinces = Object.keys(regionMap)
const cities = computed(() => (province.value ? Object.keys(regionMap[province.value] ?? {}) : []))
const districts = computed(() => (province.value && city.value ? regionMap[province.value]?.[city.value] ?? [] : []))

watch(province, () => {
  city.value = ''
  district.value = ''
})

watch(city, () => {
  district.value = ''
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) reset()
  },
)

function reset() {
  receiver.value = ''
  phone.value = ''
  province.value = ''
  city.value = ''
  district.value = ''
  detail.value = ''
  isDefault.value = false
}

function close() {
  if (submitting.value) return
  emit('update:modelValue', false)
}

async function submit() {
  if (!receiver.value.trim()) {
    ui.toast('请填写收货人姓名', 'error')
    return
  }
  if (!/^1[3-9]\d{9}$/.test(phone.value.trim())) {
    ui.toast('请填写正确的手机号', 'error')
    return
  }
  if (!province.value || !city.value || !district.value) {
    ui.toast('请选择所在地区', 'error')
    return
  }
  if (!detail.value.trim()) {
    ui.toast('请填写详细地址', 'error')
    return
  }
  submitting.value = true
  try {
    const address = await addressApi.create({
      receiver: receiver.value.trim(),
      phone: phone.value.trim(),
      province: province.value,
      city: city.value,
      district: district.value,
      detail: detail.value.trim(),
      isDefault: isDefault.value,
    })
    emit('created', address)
    emit('update:modelValue', false)
  } catch (err) {
    ui.toast(err instanceof Error ? err.message : '保存失败', 'error')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="afm">
      <div v-if="modelValue" class="afm" @click.self="close">
        <div class="afm__dialog" role="dialog" aria-modal="true" aria-label="新增收货地址">
          <header class="afm__head">
            <h2>新增收货地址</h2>
            <button class="afm__close" type="button" aria-label="关闭" @click="close">×</button>
          </header>

          <form class="afm__body" @submit.prevent="submit">
            <div class="field">
              <label for="afm-receiver">收货人</label>
              <input id="afm-receiver" v-model="receiver" class="input" placeholder="请输入收货人姓名" maxlength="50" />
            </div>

            <div class="field">
              <label for="afm-phone">手机号</label>
              <input
                id="afm-phone"
                v-model="phone"
                class="input"
                placeholder="请输入 11 位手机号"
                maxlength="11"
                inputmode="numeric"
              />
            </div>

            <div class="field">
              <label>所在地区</label>
              <div class="afm__region">
                <select v-model="province" class="input" aria-label="省份">
                  <option value="">请选择省</option>
                  <option v-for="p in provinces" :key="p" :value="p">{{ p }}</option>
                </select>
                <select v-model="city" class="input" :disabled="!province" aria-label="城市">
                  <option value="">请选择市</option>
                  <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
                </select>
                <select v-model="district" class="input" :disabled="!city" aria-label="区县">
                  <option value="">请选择区/县</option>
                  <option v-for="d in districts" :key="d" :value="d">{{ d }}</option>
                </select>
              </div>
            </div>

            <div class="field">
              <label for="afm-detail">详细地址</label>
              <textarea
                id="afm-detail"
                v-model="detail"
                class="input afm__detail"
                rows="2"
                maxlength="255"
                placeholder="街道、楼牌号等，例如：天河路 385 号太古汇 B 座 1201"
              />
            </div>

            <label class="afm__check">
              <input v-model="isDefault" type="checkbox" />
              <span>设为默认收货地址</span>
            </label>

            <footer class="afm__foot">
              <button type="button" class="btn btn-secondary" @click="close">取消</button>
              <button type="submit" class="btn btn-primary" :disabled="submitting">
                {{ submitting ? '保存中…' : '保存' }}
              </button>
            </footer>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.afm {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(15, 17, 17, 0.45);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 8vh 16px 24px;
  overflow-y: auto;
}
.afm__dialog {
  width: 100%;
  max-width: 520px;
  background: #fff;
  border-radius: 12px;
  box-shadow: var(--shadow-pop);
}
.afm__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid var(--border-light);
}
.afm__head h2 {
  font-size: 18px;
  font-weight: 800;
}
.afm__close {
  border: none;
  background: none;
  font-size: 24px;
  line-height: 1;
  color: var(--text-secondary);
  padding: 0 4px;
}
.afm__close:hover {
  color: var(--text);
}
.afm__body {
  padding: 20px 22px 22px;
}
.afm__region {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.afm__region select:disabled {
  background: var(--bg-subtle);
  color: var(--text-muted);
  cursor: not-allowed;
}
.afm__detail {
  resize: vertical;
  min-height: 62px;
}
.afm__check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.afm__check input {
  accent-color: var(--amz-link);
}
.afm__foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.afm-enter-active,
.afm-leave-active {
  transition: opacity 0.18s ease;
}
.afm-enter-active .afm__dialog,
.afm-leave-active .afm__dialog {
  transition: transform 0.18s ease;
}
.afm-enter-from,
.afm-leave-to {
  opacity: 0;
}
.afm-enter-from .afm__dialog,
.afm-leave-to .afm__dialog {
  transform: translateY(-12px);
}

@media (max-width: 560px) {
  .afm {
    padding: 4vh 10px 20px;
  }
  .afm__region {
    grid-template-columns: 1fr;
  }
}
</style>
