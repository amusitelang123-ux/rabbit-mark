<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@admin/api'
import type { AdminFreightTemplate, AdminLogisticsCompany } from '@admin/api'
import { useAdminStore } from '@admin/stores/admin'

const admin = useAdminStore()
const canEdit = admin.hasPerm('logistics:update')
const tab = ref('company')
const loading = ref(false)

/* -------------------------------- 物流公司 -------------------------------- */
const companies = ref<AdminLogisticsCompany[]>([])

const companyDialog = reactive({
  visible: false,
  mode: 'create' as 'create' | 'edit',
  id: 0,
  name: '',
  code: '',
  phone: '',
  sort: 0,
  status: 1,
})

async function loadCompanies() {
  loading.value = true
  try {
    companies.value = await adminApi.logisticsApi.companies()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function openCreateCompany() {
  Object.assign(companyDialog, { visible: true, mode: 'create', id: 0, name: '', code: '', phone: '', sort: 0, status: 1 })
}

function openEditCompany(row: AdminLogisticsCompany) {
  Object.assign(companyDialog, {
    visible: true,
    mode: 'edit',
    id: row.id,
    name: row.name,
    code: row.code,
    phone: row.phone,
    sort: row.sort,
    status: row.status,
  })
}

async function submitCompany() {
  if (!companyDialog.name || !companyDialog.code) {
    ElMessage.warning('请填写公司名称与编码')
    return
  }
  const payload = {
    name: companyDialog.name,
    code: companyDialog.code.toUpperCase(),
    phone: companyDialog.phone,
    sort: companyDialog.sort,
    status: companyDialog.status,
  }
  try {
    if (companyDialog.mode === 'create') await adminApi.logisticsApi.createCompany(payload)
    else await adminApi.logisticsApi.updateCompany(companyDialog.id, payload)
    ElMessage.success('已保存')
    companyDialog.visible = false
    loadCompanies()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
}

async function removeCompany(row: AdminLogisticsCompany) {
  try {
    await ElMessageBox.confirm(`确定删除物流公司「${row.name}」吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await adminApi.logisticsApi.removeCompany(row.id)
    ElMessage.success('已删除')
    loadCompanies()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

/* -------------------------------- 运费模板 -------------------------------- */
const templates = ref<AdminFreightTemplate[]>([])

const templateDialog = reactive({
  visible: false,
  mode: 'create' as 'create' | 'edit',
  id: 0,
  name: '',
  freeAmount: 99,
  baseFreight: 8,
  isDefault: 0,
  status: 1,
})

async function loadTemplates() {
  loading.value = true
  try {
    templates.value = await adminApi.logisticsApi.templates()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function openCreateTemplate() {
  Object.assign(templateDialog, {
    visible: true,
    mode: 'create',
    id: 0,
    name: '',
    freeAmount: 99,
    baseFreight: 8,
    isDefault: 0,
    status: 1,
  })
}

function openEditTemplate(row: AdminFreightTemplate) {
  Object.assign(templateDialog, {
    visible: true,
    mode: 'edit',
    id: row.id,
    name: row.name,
    freeAmount: row.freeAmount,
    baseFreight: row.baseFreight,
    isDefault: row.isDefault,
    status: row.status,
  })
}

async function submitTemplate() {
  if (!templateDialog.name) {
    ElMessage.warning('请填写模板名称')
    return
  }
  const payload = {
    name: templateDialog.name,
    freeAmount: templateDialog.freeAmount,
    baseFreight: templateDialog.baseFreight,
    isDefault: templateDialog.isDefault,
    status: templateDialog.status,
  }
  try {
    if (templateDialog.mode === 'create') await adminApi.logisticsApi.createTemplate(payload)
    else await adminApi.logisticsApi.updateTemplate(templateDialog.id, payload)
    ElMessage.success('已保存')
    templateDialog.visible = false
    loadTemplates()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
}

async function setDefaultTemplate(row: AdminFreightTemplate) {
  try {
    await adminApi.logisticsApi.updateTemplate(row.id, { isDefault: 1 })
    ElMessage.success('已设为默认模板')
    loadTemplates()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '操作失败')
  }
}

async function removeTemplate(row: AdminFreightTemplate) {
  try {
    await ElMessageBox.confirm(`确定删除运费模板「${row.name}」吗？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await adminApi.logisticsApi.removeTemplate(row.id)
    ElMessage.success('已删除')
    loadTemplates()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

onMounted(() => {
  loadCompanies()
  loadTemplates()
})
</script>

<template>
  <el-card shadow="never">
    <el-tabs v-model="tab">
      <el-tab-pane label="物流公司" name="company">
        <div class="pane-head">
          <el-button v-if="canEdit" type="primary" @click="openCreateCompany">新增物流公司</el-button>
          <span class="hint">发货时可直接从字典中选择，避免手输错别字</span>
        </div>
        <el-table v-loading="loading" :data="companies" stripe>
          <el-table-column label="ID" prop="id" width="70" />
          <el-table-column label="公司名称" prop="name" width="180" />
          <el-table-column label="编码" prop="code" width="120" />
          <el-table-column label="客服电话" prop="phone" width="150" />
          <el-table-column label="排序" prop="sort" width="80" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="canEdit" label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEditCompany(row)">编辑</el-button>
              <el-button link type="danger" @click="removeCompany(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="运费模板" name="template">
        <div class="pane-head">
          <el-button v-if="canEdit" type="primary" @click="openCreateTemplate">新增运费模板</el-button>
          <span class="hint">下单时按「默认模板」计算运费；未配置时回退内置规则（满 99 包邮，否则 8 元）</span>
        </div>
        <el-table v-loading="loading" :data="templates" stripe>
          <el-table-column label="ID" prop="id" width="70" />
          <el-table-column label="模板名称" prop="name" width="200" />
          <el-table-column label="包邮门槛" width="150">
            <template #default="{ row }">{{ row.freeAmount > 0 ? `满 ¥${row.freeAmount}` : '不包邮' }}</template>
          </el-table-column>
          <el-table-column label="基础运费" width="130">
            <template #default="{ row }">¥{{ row.baseFreight }}</template>
          </el-table-column>
          <el-table-column label="默认" width="110">
            <template #default="{ row }">
              <el-tag v-if="row.isDefault === 1" type="success">默认</el-tag>
              <el-button v-else-if="canEdit" link type="primary" @click="setDefaultTemplate(row)">设为默认</el-button>
              <span v-else class="hint">—</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="canEdit" label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEditTemplate(row)">编辑</el-button>
              <el-button link type="danger" @click="removeTemplate(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </el-card>

  <el-dialog v-model="companyDialog.visible" :title="companyDialog.mode === 'create' ? '新增物流公司' : '编辑物流公司'" width="440px">
    <el-form label-width="90px">
      <el-form-item label="公司名称"><el-input v-model="companyDialog.name" placeholder="如 顺丰速运" /></el-form-item>
      <el-form-item label="编码">
        <el-input v-model="companyDialog.code" placeholder="如 SF" />
      </el-form-item>
      <el-form-item label="客服电话"><el-input v-model="companyDialog.phone" placeholder="如 95338" /></el-form-item>
      <el-form-item label="排序"><el-input-number v-model="companyDialog.sort" :min="0" /></el-form-item>
      <el-form-item label="状态">
        <el-switch v-model="companyDialog.status" :active-value="1" :inactive-value="0" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="companyDialog.visible = false">取消</el-button>
      <el-button type="primary" @click="submitCompany">保存</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="templateDialog.visible" :title="templateDialog.mode === 'create' ? '新增运费模板' : '编辑运费模板'" width="460px">
    <el-form label-width="100px">
      <el-form-item label="模板名称"><el-input v-model="templateDialog.name" placeholder="如 默认运费模板" /></el-form-item>
      <el-form-item label="包邮门槛">
        <el-input-number v-model="templateDialog.freeAmount" :min="0" :precision="2" />
        <span class="hint">0 表示不参与包邮</span>
      </el-form-item>
      <el-form-item label="基础运费">
        <el-input-number v-model="templateDialog.baseFreight" :min="0" :precision="2" />
      </el-form-item>
      <el-form-item label="设为默认">
        <el-switch v-model="templateDialog.isDefault" :active-value="1" :inactive-value="0" />
      </el-form-item>
      <el-form-item label="状态">
        <el-switch v-model="templateDialog.status" :active-value="1" :inactive-value="0" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="templateDialog.visible = false">取消</el-button>
      <el-button type="primary" @click="submitTemplate">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.pane-head {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.hint {
  font-size: 12px;
  color: #9aa3af;
}
</style>
