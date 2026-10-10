<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { adminApi } from '@admin/api'
import type { AdminSetting } from '@admin/api'
import { useAdminStore } from '@admin/stores/admin'

const admin = useAdminStore()
const canEdit = admin.hasPerm('system:update')

const loading = ref(false)
const saving = ref(false)
const settings = ref<AdminSetting[]>([])
/** 本地编辑副本：key -> value */
const draft = ref<Record<string, string>>({})

const GROUP_TITLE: Record<string, string> = { site: '站点信息', service: '客服信息' }

const grouped = computed(() => {
  const map = new Map<string, AdminSetting[]>()
  for (const item of settings.value) {
    if (!map.has(item.group)) map.set(item.group, [])
    map.get(item.group)!.push(item)
  }
  return [...map.entries()].map(([group, items]) => ({
    group,
    title: GROUP_TITLE[group] ?? group,
    items,
  }))
})

const dirty = computed(() =>
  settings.value.some((s) => (draft.value[s.key] ?? '') !== s.value),
)

async function load() {
  loading.value = true
  try {
    settings.value = await adminApi.settingApi.list()
    const next: Record<string, string> = {}
    for (const item of settings.value) next[item.key] = item.value
    draft.value = next
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

async function save() {
  const entries = settings.value
    .filter((s) => (draft.value[s.key] ?? '') !== s.value)
    .map((s) => ({ key: s.key, value: draft.value[s.key] ?? '' }))

  if (!entries.length) {
    ElMessage.info('没有修改任何配置')
    return
  }
  saving.value = true
  try {
    settings.value = await adminApi.settingApi.update(entries)
    const next: Record<string, string> = {}
    for (const item of settings.value) next[item.key] = item.value
    draft.value = next
    ElMessage.success('配置已保存')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}

function resetDraft() {
  const next: Record<string, string> = {}
  for (const item of settings.value) next[item.key] = item.value
  draft.value = next
}

onMounted(load)
</script>

<template>
  <div v-loading="loading">
    <el-card shadow="never" class="block">
      <template #header>
        <div class="head">
          <span>系统配置</span>
          <div v-if="canEdit">
            <el-button :disabled="!dirty" @click="resetDraft">撤销修改</el-button>
            <el-button type="primary" :loading="saving" :disabled="!dirty" @click="save">保存配置</el-button>
          </div>
        </div>
      </template>
      <p class="hint">站点名称与客服信息会实时展示在用户端页头、帮助中心与页脚</p>
    </el-card>

    <el-card v-for="group in grouped" :key="group.group" shadow="never" class="block">
      <template #header><span>{{ group.title }}</span></template>
      <el-form label-width="140px">
        <el-form-item v-for="item in group.items" :key="item.key" :label="item.remark || item.key">
          <el-input v-model="draft[item.key]" :disabled="!canEdit" maxlength="2000" />
          <span class="key-hint">{{ item.key }}</span>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.block {
  margin-bottom: 16px;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.hint {
  font-size: 12.5px;
  color: #9aa3af;
}
.key-hint {
  margin-left: 10px;
  font-size: 12px;
  color: #c0c4cc;
  flex-shrink: 0;
}
</style>
