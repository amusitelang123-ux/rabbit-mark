<script setup lang="ts">
const columns = [
  { title: '了解我们', links: ['关于小兔鲜', '加入我们', '品牌故事', '联系方式'] },
  { title: '购物指南', links: ['购物流程', '会员介绍', '常见问题', '联系客服'] },
  { title: '配送方式', links: ['配送范围', '运费说明', '海外配送', '自提点'] },
  { title: '售后服务', links: ['退换货政策', '退款说明', '取消订单', '价格保护'] },
]

function toTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <footer class="ftr">
    <button class="ftr__top" type="button" @click="toTop">回到顶部</button>
    <div class="ftr__main">
      <div class="container ftr__grid">
        <div v-for="col in columns" :key="col.title" class="ftr__col">
          <h4>{{ col.title }}</h4>
          <ul>
            <li v-for="l in col.links" :key="l"><a href="javascript:void(0)">{{ l }}</a></li>
          </ul>
        </div>
        <div class="ftr__col ftr__brand">
          <h4>小兔鲜 · 平台自营</h4>
          <p>正品保障 · 极速配送 · 售后无忧</p>
          <p class="ftr__hotline">客服热线 400-888-8888</p>
          <div class="ftr__pays">
            <span>微信支付</span><span>支付宝</span><span>余额</span><span>沙箱</span>
          </div>
        </div>
      </div>
    </div>
    <div class="ftr__bottom">
      <div class="container">
        <p>© 2026 小兔鲜电商 XiaoTuXian Mall · 仅用于教学演示，非真实交易平台</p>
        <p>粤ICP备00000000号 · 增值电信业务经营许可证</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.ftr {
  margin-top: 40px;
}
.ftr__top {
  width: 100%;
  background: var(--amz-navy-3);
  color: #fff;
  border: none;
  padding: 14px;
  font-size: 13px;
  transition: background 0.15s;
}
.ftr__top:hover {
  background: #485769;
}
.ftr__main {
  background: var(--amz-navy-2);
  color: #ddd;
  padding: 36px 0;
}
.ftr__grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 24px;
}
.ftr__col h4 {
  color: #fff;
  font-size: 15px;
  margin-bottom: 12px;
}
.ftr__col ul li {
  margin-bottom: 8px;
}
.ftr__col a {
  font-size: 13px;
  color: #ccc;
}
.ftr__col a:hover {
  color: #fff;
  text-decoration: underline;
}
.ftr__brand p {
  font-size: 13px;
  line-height: 1.7;
}
.ftr__hotline {
  color: var(--amz-orange) !important;
  font-weight: 700;
}
.ftr__pays {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.ftr__pays span {
  border: 1px solid #55657a;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 12px;
}
.ftr__bottom {
  background: var(--amz-navy);
  color: #999;
  text-align: center;
  padding: 18px 0;
  font-size: 12px;
  line-height: 1.9;
}
@media (max-width: 900px) {
  .ftr__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
