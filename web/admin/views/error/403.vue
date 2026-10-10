<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <el-result icon="warning" title="403" sub-title="抱歉，你没有访问该页面的权限">
    <template #extra>
      <el-button type="primary" @click="router.replace('/admin/dashboard')">返回首页</el-button>
    </template>
  </el-result>
</template>
