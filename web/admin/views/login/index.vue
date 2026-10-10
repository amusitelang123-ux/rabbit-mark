<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Lock, User } from '@element-plus/icons-vue'
import { useAdminStore } from '@admin/stores/admin'

const route = useRoute()
const router = useRouter()
const admin = useAdminStore()

/* 账号密码一律留空，不预填演示账号，也不在页面展示任何账号信息 */
const form = ref({ username: '', password: '' })
const loading = ref(false)

/** 左侧品牌区能力清单（纯展示） */
const highlights = ['商品 · 库存 · 分类一体化维护', '订单 · 售后 · 物流全链路跟踪', '会员 · 营销 · 财务数据看板', '角色权限 · 操作日志安全审计']

async function submit() {
  const username = form.value.username.trim()
  if (!username || !form.value.password) {
    ElMessage.warning('请输入账号和密码')
    return
  }
  loading.value = true
  try {
    await admin.login(username, form.value.password)
    ElMessage.success('登录成功')
    const redirect = (route.query.redirect as string) || '/admin/dashboard'
    router.replace(redirect)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="admin-login">
    <div class="admin-login__glow admin-login__glow--top" />
    <div class="admin-login__glow admin-login__glow--bottom" />

    <div class="login-card">
      <!-- 品牌区：与后台深色侧边栏同一视觉语言 -->
      <aside class="login-brand">
        <div class="login-brand__logo">
          <span class="login-brand__mark">兔</span>
          <div class="login-brand__names">
            <strong>小兔鲜</strong>
            <em>XIAOTUXIAN MALL</em>
          </div>
        </div>

        <h2 class="login-brand__title">管理后台</h2>
        <p class="login-brand__desc">商品、订单、用户与权限的一站式运营工作台</p>

        <ul class="login-brand__list">
          <li v-for="item in highlights" :key="item">
            <span class="login-brand__dot" />
            <span>{{ item }}</span>
          </li>
        </ul>

        <p class="login-brand__foot">© 2026 小兔鲜电商 · 教学演示项目</p>
      </aside>

      <!-- 表单区 -->
      <section class="login-panel">
        <header class="login-panel__head">
          <h1>欢迎回来</h1>
          <p>请使用管理员账号登录后台</p>
        </header>

        <el-form :model="form" label-position="top" @submit.prevent="submit">
          <el-form-item label="管理员账号">
            <el-input
              v-model="form.username"
              class="login-field"
              placeholder="请输入管理员账号"
              size="large"
              autocomplete="username"
              :prefix-icon="User"
              clearable
              @keyup.enter="submit"
            />
          </el-form-item>
          <el-form-item label="登录密码">
            <el-input
              v-model="form.password"
              class="login-field"
              type="password"
              placeholder="请输入登录密码"
              size="large"
              autocomplete="current-password"
              :prefix-icon="Lock"
              show-password
              @keyup.enter="submit"
            />
          </el-form-item>

          <el-button
            type="primary"
            size="large"
            class="login-submit"
            :loading="loading"
            @click="submit"
          >
            {{ loading ? '登录中…' : '登 录' }}
          </el-button>
        </el-form>

        <p class="login-panel__tip">账号由超级管理员在「管理员」页面统一分配</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.admin-login {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  overflow: hidden;
  background: linear-gradient(150deg, #161d27 0%, #1f2733 45%, #2d3a4d 100%);
}

/* 背景光晕，避免大面积纯深色显得单调 */
.admin-login__glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  pointer-events: none;
}
.admin-login__glow--top {
  width: 420px;
  height: 420px;
  top: -160px;
  right: -80px;
  background: rgba(254, 124, 0, 0.28);
}
.admin-login__glow--bottom {
  width: 380px;
  height: 380px;
  bottom: -180px;
  left: -120px;
  background: rgba(64, 158, 255, 0.2);
}

.login-card {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  max-width: 880px;
  min-height: 506px;
  border-radius: 18px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 24px 60px rgba(9, 13, 19, 0.45);
}

/* ------------------------------ 品牌区 ------------------------------ */
.login-brand {
  position: relative;
  flex: 0 0 42%;
  padding: 38px 32px;
  display: flex;
  flex-direction: column;
  background: linear-gradient(165deg, #1f2733 0%, #2b394d 100%);
  color: #fff;
  overflow: hidden;
}
.login-brand::after {
  content: '';
  position: absolute;
  width: 260px;
  height: 260px;
  right: -110px;
  bottom: -110px;
  border-radius: 50%;
  background: rgba(254, 124, 0, 0.16);
}
.login-brand__logo {
  display: flex;
  align-items: center;
  gap: 12px;
}
.login-brand__mark {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 12px;
  background: linear-gradient(160deg, #fe7c00, #ff9c3f);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 600;
  box-shadow: 0 6px 16px rgba(254, 124, 0, 0.35);
}
.login-brand__names {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}
.login-brand__names strong {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.login-brand__names em {
  font-size: 10px;
  font-style: normal;
  letter-spacing: 1.6px;
  color: rgba(255, 255, 255, 0.5);
}
.login-brand__title {
  position: relative;
  margin-top: 46px;
  font-size: 30px;
  font-weight: 600;
  letter-spacing: 2px;
}
.login-brand__title::after {
  content: '';
  display: block;
  width: 44px;
  height: 3px;
  margin-top: 14px;
  border-radius: 2px;
  background: #fe7c00;
}
.login-brand__desc {
  position: relative;
  margin-top: 16px;
  font-size: 13px;
  line-height: 1.9;
  color: rgba(255, 255, 255, 0.62);
}
.login-brand__list {
  position: relative;
  margin-top: 30px;
  display: flex;
  flex-direction: column;
  gap: 13px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.78);
}
.login-brand__list li {
  display: flex;
  align-items: center;
  gap: 10px;
}
.login-brand__dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #fe7c00;
  box-shadow: 0 0 0 3px rgba(254, 124, 0, 0.18);
}
.login-brand__foot {
  position: relative;
  margin-top: auto;
  padding-top: 28px;
  font-size: 11px;
  letter-spacing: 0.4px;
  color: rgba(255, 255, 255, 0.38);
}

/* ------------------------------ 表单区 ------------------------------ */
.login-panel {
  flex: 1;
  min-width: 0;
  padding: 48px 46px 38px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: #fff;
}
.login-panel__head h1 {
  font-size: 24px;
  font-weight: 600;
  color: #1f2733;
}
.login-panel__head p {
  margin-top: 8px;
  margin-bottom: 26px;
  font-size: 13px;
  color: #8a93a0;
}
.login-panel :deep(.el-form-item__label) {
  font-size: 13px;
  font-weight: 500;
  color: #4a5260;
  padding-bottom: 6px;
}
.login-panel :deep(.el-form-item) {
  margin-bottom: 20px;
}
.login-panel :deep(.el-input__wrapper) {
  border-radius: 8px;
  padding: 4px 12px;
  box-shadow: 0 0 0 1px #e0e3e8 inset;
  transition: box-shadow 0.2s ease;
}
.login-panel :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c8ccd4 inset;
}
.login-panel :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #fe7c00 inset, 0 0 0 3px rgba(254, 124, 0, 0.12);
}
.login-panel :deep(.el-input__inner) {
  height: 40px;
}
.login-submit {
  width: 100%;
  height: 46px;
  margin-top: 4px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  letter-spacing: 2px;
  background: linear-gradient(135deg, #fe7c00, #ff9c3f);
  box-shadow: 0 8px 20px rgba(254, 124, 0, 0.26);
  transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
}
.login-submit:hover,
.login-submit:focus {
  background: linear-gradient(135deg, #f27000, #ff8f24);
  box-shadow: 0 10px 24px rgba(254, 124, 0, 0.32);
}
.login-submit:active {
  transform: translateY(1px);
  box-shadow: 0 4px 12px rgba(254, 124, 0, 0.28);
}
.login-panel__tip {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid #f0f1f3;
  font-size: 12px;
  line-height: 1.8;
  color: #9aa3af;
}

/* ------------------------------ 自适应 ------------------------------ */
@media (max-width: 820px) {
  .login-card {
    flex-direction: column;
    max-width: 440px;
    min-height: 0;
  }
  .login-brand {
    flex: none;
    padding: 24px 26px 22px;
  }
  .login-brand__title {
    margin-top: 22px;
    font-size: 24px;
  }
  .login-brand__desc {
    margin-top: 10px;
  }
  .login-brand__list,
  .login-brand__foot {
    display: none;
  }
  .login-panel {
    padding: 30px 26px 26px;
  }
}

@media (max-width: 480px) {
  .admin-login {
    padding: 18px 12px;
  }
  .login-panel {
    padding: 26px 20px 22px;
  }
  .login-panel__head h1 {
    font-size: 21px;
  }
}
</style>
