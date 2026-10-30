<script setup lang="ts">
import { ref, watch } from 'vue'
import { commentApi } from '@/api'
import type { MyComment } from '@/api/types'
import { useUiStore } from '@/stores/ui'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    orderItemId: number
    productName?: string
    productImage?: string
    orderNo?: string
  }>(),
  { productName: '', productImage: '', orderNo: '' },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submitted: [comment: MyComment]
}>()

const ui = useUiStore()

const MAX_IMAGES = 6
const MAX_SIZE = 5 * 1024 * 1024

const score = ref(5)
const content = ref('')
const images = ref<string[]>([])
const anonymous = ref(false)
const uploading = ref(false)
const submitting = ref(false)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    score.value = 5
    content.value = ''
    images.value = []
    anonymous.value = false
    uploading.value = false
    submitting.value = false
  },
)

function close() {
  if (submitting.value) return
  emit('update:modelValue', false)
}

async function onPickImages(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length) return

  const remain = MAX_IMAGES - images.value.length
  if (remain <= 0) {
    ui.toast(`最多上传 ${MAX_IMAGES} 张图片`, 'error')
    return
  }
  if (files.length > remain) {
    ui.toast(`最多上传 ${MAX_IMAGES} 张图片，已忽略多余文件`, 'info')
  }

  for (const file of files.slice(0, remain)) {
    if (!file.type.startsWith('image/')) {
      ui.toast(`「${file.name}」不是图片文件`, 'error')
      continue
    }
    if (file.size > MAX_SIZE) {
      ui.toast(`「${file.name}」超过 5MB`, 'error')
      continue
    }
    uploading.value = true
    try {
      const { url } = await commentApi.uploadImage(file)
      images.value.push(url)
    } catch (e) {
      ui.toast(e instanceof Error ? e.message : '图片上传失败', 'error')
    } finally {
      uploading.value = false
    }
  }
}

function removeImage(index: number) {
  images.value.splice(index, 1)
}

async function submit() {
  if (submitting.value) return
  if (!props.orderItemId) {
    ui.toast('缺少订单商品信息', 'error')
    return
  }
  if (!content.value.trim()) {
    ui.toast('请填写评价内容', 'error')
    return
  }
  submitting.value = true
  try {
    const created = await commentApi.create({
      orderItemId: props.orderItemId,
      score: score.value,
      content: content.value.trim(),
      images: images.value.length ? images.value : undefined,
      isAnonymous: anonymous.value,
    })
    ui.toast(
      created.rewardPoints ? `评价发布成功，获得 ${created.rewardPoints} 积分` : '评价发布成功',
      'success',
    )
    emit('submitted', created)
    emit('update:modelValue', false)
  } catch (e) {
    ui.toast(e instanceof Error ? e.message : '发布失败', 'error')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div v-if="modelValue" class="cim-mask" @click.self="close">
    <div class="cim-modal card" role="dialog" aria-modal="true">
      <header class="cim-modal__head">
        <div>
          <h2>评价晒单</h2>
          <p v-if="orderNo" class="muted">订单号：{{ orderNo }}</p>
        </div>
        <button class="cim-modal__close" aria-label="关闭" @click="close">✕</button>
      </header>

      <div class="cim-product">
        <img v-if="productImage" :src="productImage" :alt="productName" />
        <p>{{ productName }}</p>
      </div>

      <p class="cim-label">商品评分</p>
      <div class="cim-stars">
        <button
          v-for="s in [1, 2, 3, 4, 5]"
          :key="s"
          class="cim-star"
          :class="{ 'is-on': s <= score }"
          :aria-label="`${s} 星`"
          @click="score = s"
        >
          ★
        </button>
        <span class="muted cim-stars__text">{{ score }} 分</span>
      </div>

      <p class="cim-label">评价内容</p>
      <textarea
        v-model="content"
        class="cim-textarea"
        rows="4"
        maxlength="1000"
        placeholder="分享你的使用体验，晒图更有说服力～"
      />

      <p class="cim-label">
        晒图 <span class="muted">（选填，最多 {{ MAX_IMAGES }} 张）</span>
      </p>
      <div class="cim-images">
        <div v-for="(url, index) in images" :key="url" class="cim-image">
          <img :src="url" alt="评价图片" />
          <button class="cim-image__remove" aria-label="移除图片" @click="removeImage(index)">✕</button>
        </div>
        <label v-if="images.length < MAX_IMAGES" class="cim-add" :class="{ 'is-disabled': uploading }">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            :disabled="uploading"
            @change="onPickImages"
          />
          <span v-if="uploading" class="cim-add__text">上传中…</span>
          <span v-else class="cim-add__text">+<br />上传图片</span>
        </label>
      </div>

      <label class="cim-anonymous">
        <input v-model="anonymous" type="checkbox" />
        匿名评价
      </label>

      <div class="cim-actions">
        <button class="btn btn-secondary" :disabled="submitting" @click="close">取消</button>
        <button class="btn btn-primary" :disabled="submitting || uploading" @click="submit">
          {{ submitting ? '提交中…' : '发布评价' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cim-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2100;
  padding: 16px;
}
.cim-modal {
  width: 100%;
  max-width: 540px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 22px;
}
.cim-modal__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.cim-modal__head h2 {
  font-size: 20px;
  font-weight: 800;
  margin-bottom: 4px;
}
.cim-modal__head .muted {
  font-size: 13px;
}
.cim-modal__close {
  border: none;
  background: none;
  font-size: 18px;
  color: var(--text-secondary);
  cursor: pointer;
}
.cim-product {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  background: var(--bg-subtle);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
}
.cim-product img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
}
.cim-label {
  font-size: 14px;
  font-weight: 700;
  margin: 18px 0 8px;
}
.cim-label .muted {
  font-weight: 400;
  font-size: 12px;
}
.cim-stars {
  display: flex;
  align-items: center;
  gap: 2px;
}
.cim-star {
  border: none;
  background: none;
  padding: 0 4px;
  font-size: 28px;
  line-height: 1;
  color: var(--amz-star-empty);
  cursor: pointer;
}
.cim-star.is-on {
  color: var(--amz-star);
}
.cim-stars__text {
  margin-left: 8px;
  font-size: 13px;
}
.cim-textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  outline: none;
}
.cim-textarea:focus {
  border-color: var(--amz-orange);
}
.cim-images {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.cim-image {
  position: relative;
  width: 78px;
  height: 78px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-light);
}
.cim-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cim-image__remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
}
.cim-add {
  width: 78px;
  height: 78px;
  border: 1px dashed var(--border);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-secondary);
  cursor: pointer;
  background: #fff;
}
.cim-add:hover {
  border-color: var(--amz-orange);
  color: var(--amz-price);
}
.cim-add.is-disabled {
  cursor: wait;
  opacity: 0.7;
}
.cim-add input {
  display: none;
}
.cim-add__text {
  font-size: 12px;
  line-height: 1.4;
}
.cim-anonymous {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
}
.cim-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}
</style>
