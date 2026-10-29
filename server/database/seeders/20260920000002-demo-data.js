'use strict'

const bcrypt = require('bcryptjs')
const fs = require('fs')
const path = require('path')

/* ----------------------------- helpers ----------------------------- */
const DEMO_DIR = path.resolve('uploads', 'demo')
fs.mkdirSync(DEMO_DIR, { recursive: true })
const written = new Set()

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const PALETTES = [
  ['#ffd8a8', '#ff922b'],
  ['#a5d8ff', '#1c7ed6'],
  ['#b2f2bb', '#2f9e44'],
  ['#ffc9c9', '#e03131'],
  ['#d0bfff', '#7048e8'],
  ['#99e9f2', '#0c8599'],
  ['#f5d0fe', '#ae3ec9'],
  ['#e9ecef', '#868e96'],
  ['#ffec99', '#f08c00'],
  ['#c0eb75', '#66a80f'],
]
const EMOJIS = ['🛍️', '📱', '👕', '🛋️', '🥬', '💄', '🍼', '🏀', '📚', '🎧', '💻', '🍎']

function hash(seed) {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return h
}

/** 生成 SVG 占位图文件并返回可通过 /uploads 访问的短 URL */
function writeSvg(name, svg) {
  const file = `${name}.svg`
  if (!written.has(file)) {
    fs.writeFileSync(path.join(DEMO_DIR, file), svg, 'utf8')
    written.add(file)
  }
  return `/uploads/demo/${file}`
}

function placeholder(seed, label, w = 500, h = 500) {
  const [c1, c2] = PALETTES[hash(seed) % PALETTES.length]
  const icon = EMOJIS[hash(seed) % EMOJIS.length]
  const short = escapeXml(label && label.length > 8 ? `${label.slice(0, 8)}…` : label || seed)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><text x="50%" y="45%" font-size="${Math.round(
    h * 0.28,
  )}" text-anchor="middle" dominant-baseline="central">${icon}</text><text x="50%" y="78%" font-size="${Math.round(
    h * 0.055,
  )}" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="600">${short}</text></svg>`
  return writeSvg(`img-${hash(seed).toString(16)}-${w}x${h}`, svg)
}

function avatar(name) {
  const [c1, c2] = PALETTES[hash(name) % PALETTES.length]
  const letter = escapeXml((name.trim()[0] || '兔').toUpperCase())
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><circle cx="32" cy="32" r="32" fill="url(#g)"/><text x="32" y="33" font-size="28" text-anchor="middle" dominant-baseline="central" fill="#fff" font-family="sans-serif" font-weight="700">${letter}</text></svg>`
  return writeSvg(`avatar-${hash(name).toString(16)}`, svg)
}

const now = new Date()
function dateOffset(days, hour = 12) {
  const d = new Date(now.getTime() + days * 86400000)
  d.setHours(hour, 0, 0, 0)
  return d
}
const dt = (d) => d

/* ----------------------------- reference data ----------------------------- */
const TOPS = [
  [101, '数码电子', '📱'],
  [102, '服饰鞋包', '👕'],
  [103, '家居生活', '🛋️'],
  [104, '食品生鲜', '🥬'],
  [105, '美妆个护', '💄'],
  [106, '母婴玩具', '🍼'],
  [107, '运动户外', '🏀'],
  [108, '图书文娱', '📚'],
]
const CHILDREN = {
  101: ['手机通讯', '电脑办公'],
  102: ['男装女装', '运动鞋靴'],
  103: ['厨房用品', '家纺床品'],
  104: ['休闲零食', '新鲜水果'],
  105: ['护肤彩妆', '洗护清洁'],
  106: ['婴童用品', '益智玩具'],
  107: ['健身训练', '户外露营'],
  108: ['文学小说', '学习教育'],
}

const BRANDS = [
  '兔鲜优选',
  '极光科技',
  '云栖家居',
  '拾光良品',
  '山野农夫',
  '悦己主义',
  '小兔宝贝',
  '风行运动',
  '墨韵书房',
  '臻选严选',
]

const SPEC_LIB = {
  101: [
    { name: '颜色', values: ['星空黑', '月光银', '晨曦蓝'] },
    { name: '版本', values: ['8+128G', '12+256G'] },
  ],
  102: [
    { name: '颜色', values: ['经典黑', '米白', '雾霾蓝'] },
    { name: '尺码', values: ['M', 'L', 'XL'] },
  ],
  103: [{ name: '规格', values: ['标准款', '加大款', '豪华款'] }],
  104: [{ name: '规格', values: ['500g', '1kg', '2.5kg'] }],
  105: [{ name: '规格', values: ['30ml', '50ml', '100ml'] }],
  106: [{ name: '颜色', values: ['奶油黄', '天空蓝', '樱花粉'] }],
  107: [{ name: '尺码', values: ['均码', 'M', 'L'] }],
  108: [{ name: '装帧', values: ['平装', '精装'] }],
}

const SEEDS = [
  [1001, '极光 Note 15 旗舰智能手机', '2 亿像素影像 · 120Hz 高刷 · 5500mAh', 1011, 2, 3299],
  [1002, '极光 Book Air 14 轻薄本', '2.8K 触控屏 · 32G 内存 · 1TB 固态', 1012, 2, 5999],
  [1003, '极光降噪耳机 Pro', '48dB 主动降噪 · 空间音频', 1011, 2, 899],
  [1004, '极光智能手表 GT4', '血氧心率监测 · 14 天续航', 1011, 2, 1299],
  [1005, '兔鲜优选 全棉基础圆领T恤', '新疆长绒棉 · 不易变形', 1021, 1, 99],
  [1006, '拾光良品 轻薄羽绒服', '90 白鸭绒 · 防泼水', 1021, 4, 599],
  [1007, '风行运动 缓震跑步鞋', '回弹中底 · 透气网面', 1022, 8, 399],
  [1008, '拾光良品 通勤单肩托特包', '大容量 · 头层牛皮', 1021, 4, 469],
  [1009, '云栖家居 不粘炒锅', '麦饭石涂层 · 少油不粘', 1031, 3, 199],
  [1010, '云栖家居 60 支全棉四件套', '长绒棉贡缎 · 亲肤透气', 1032, 3, 399],
  [1011, '云栖家居 折叠收纳箱', '加厚牛津布 · 免安装', 1031, 3, 59],
  [1012, '山野农夫 每日坚果混合装', '7 种果仁 · 独立小包', 1041, 5, 129],
  [1013, '山野农夫 阿克苏冰糖心苹果', '脆甜多汁 · 顺丰包邮', 1042, 5, 69],
  [1014, '山野农夫 五常稻花香大米', '当季新米 · 粒粒饱满', 1041, 5, 89],
  [1015, '悦己主义 玻尿酸精华水', '深层补水 · 温和不刺激', 1051, 6, 159],
  [1016, '悦己主义 丝绒哑光口红', '显白不拔干', 1051, 6, 119],
  [1017, '兔鲜优选 氨基酸洗发水', '控油蓬松 · 无硅油', 1052, 1, 79],
  [1018, '小兔宝贝 婴儿纸尿裤', '超薄透气 · 干爽整夜', 1061, 7, 139],
  [1019, '小兔宝贝 积木益智拼装', '大颗粒 · 安全无毛刺', 1061, 7, 99],
  [1020, '风行运动 折叠跑步机', '家用静音 · 免安装', 1071, 8, 1599],
  [1021, '风行运动 户外露营帐篷', '3-4 人 · 全自动速开', 1071, 8, 399],
  [1022, '墨韵书房 经典文学套装', '精装典藏 · 全 8 册', 1081, 9, 299],
  [1023, '墨韵书房 儿童英语启蒙绘本', '点读笔配套 · 全 20 册', 1081, 9, 189],
  [1024, '极光平板 Pad 11', '144Hz 护眼屏 · 学习办公', 1012, 2, 2299],
  [1025, '兔鲜优选 冰丝防晒衣', 'UPF50+ · 凉感透气', 1022, 1, 129],
  [1026, '云栖家居 智能感应台灯', '无频闪 · 三档色温', 1031, 3, 149],
  [1027, '山野农夫 云南小台芒', '皮薄核小 · 香甜多汁', 1042, 5, 49],
  [1028, '悦己主义 保湿身体乳', '长效滋润 · 留香持久', 1051, 6, 89],
]

const COMMENT_TEXTS = [
  '质量非常好，做工精致，和描述完全一致，物流也很快，五星好评！',
  '用了一段时间才来评价，效果超出预期，性价比很高，推荐购买。',
  '包装很用心，客服态度也不错，东西收到没有磕碰，满意。',
  '颜色很正，尺码标准，用料扎实，会回购的。',
  '整体不错，就是发货稍微慢了一点，产品本身没问题。',
  '第二次购买了，一如既往地好用，家里人都很喜欢。',
]
const NICKNAMES = ['小兔爱吃萝卜', '风一样的男子', '柠檬不酸', '山间清风', '数码发烧友', '居家小能手']

/* ----------------------------- build rows ----------------------------- */
function buildCategories() {
  const rows = []
  TOPS.forEach(([id, name, icon], i) => {
    rows.push({
      id,
      parent_id: 0,
      name,
      level: 1,
      icon,
      sort: i + 1,
      status: 1,
      created_at: now,
      updated_at: now,
    })
    CHILDREN[id].forEach((childName, j) => {
      rows.push({
        id: id * 10 + (j + 1),
        parent_id: id,
        name: childName,
        level: 2,
        icon,
        sort: j + 1,
        status: 1,
        created_at: now,
        updated_at: now,
      })
    })
  })
  return rows
}

function buildBrands() {
  return BRANDS.map((name, i) => ({
    id: i + 1,
    name,
    logo: placeholder(`brand-${i}`, name, 120, 60),
    sort: i + 1,
    status: 1,
    created_at: now,
    updated_at: now,
  }))
}

function topOf(categoryId) {
  // 二级分类 id = 顶级 id * 10 + n，如 1011 -> 101
  return Math.floor(categoryId / 10)
}

function buildProductsAndSkus() {
  const products = []
  const skus = []
  const images = []
  let skuSeq = 1
  SEEDS.forEach(([id, name, subtitle, categoryId, brandId, base]) => {
    const top = topOf(categoryId)
    const groups = SPEC_LIB[top] || [{ name: '规格', values: ['默认'] }]
    let combos = [{}]
    groups.forEach((g) => {
      const next = []
      combos.forEach((c) => g.values.forEach((v) => next.push({ ...c, [g.name]: v })))
      combos = next
    })
    const productSkus = combos.map((spec, i) => {
      const price = Math.round((base + i * Math.max(3, base * 0.06)) * 100) / 100
      const specText = Object.entries(spec)
        .map(([k, v]) => `${k}:${v}`)
        .join(' / ')
      const sku = {
        id: id * 100 + i,
        product_id: id,
        sku_code: `SKU${id}${String(i + 1).padStart(2, '0')}`,
        spec_json: JSON.stringify(spec),
        spec_text: specText,
        image: placeholder(`${name}-${specText}`, name, 500, 500),
        price: price.toFixed(2),
        market_price: (price * 1.25).toFixed(2),
        cost_price: (price * 0.6).toFixed(2),
        stock: 20 + ((id + i * 13) % 180),
        locked_stock: 0,
        warn_stock: 10,
        weight: 0.5,
        status: 1,
        created_at: now,
        updated_at: now,
      }
      skuSeq += 1
      return sku
    })
    skus.push(...productSkus)
    const prices = productSkus.map((s) => Number(s.price))
    const totalStock = productSkus.reduce((sum, s) => sum + s.stock, 0)
    products.push({
      id,
      name,
      subtitle,
      category_id: categoryId,
      brand_id: brandId,
      main_image: placeholder(name, name, 500, 500),
      detail_html: `<p>${subtitle}。平台自营正品，假一赔十，48 小时内发货。</p><ul><li>精选优质材料</li><li>严格品控出厂</li><li>支持 7 天无理由退换</li></ul>`,
      unit: '件',
      weight: 0.5,
      price_min: Math.min(...prices).toFixed(2),
      price_max: Math.max(...prices).toFixed(2),
      total_stock: totalStock,
      sales_count: ((id * 173) % 9000) + 120,
      comment_count: 0,
      avg_score: '5.00',
      is_recommend: id % 3 === 0 ? 1 : 0,
      sort: 100 - (id % 100),
      status: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    })
    for (let k = 0; k < 4; k += 1) {
      images.push({
        product_id: id,
        image: placeholder(`${name}-${k}`, name, 500, 500),
        sort: k,
        created_at: now,
      })
    }
  })
  return { products, skus, images }
}

function buildUsers() {
  const hash = bcrypt.hashSync('123456', 10)
  const users = []
  const addresses = []
  for (let i = 1; i <= 20; i += 1) {
    const nickname = NICKNAMES[(i - 1) % NICKNAMES.length] + (i > 6 ? i : '')
    users.push({
      id: i,
      username: `user${i}`,
      phone: `1380000${String(i).padStart(4, '0')}`,
      password: hash,
      nickname,
      avatar: avatar(nickname),
      gender: i % 3,
      birthday: '1998-06-15',
      level_id: i % 4 === 0 ? 3 : i % 3 === 0 ? 2 : 1,
      points: (i * 137) % 5000,
      total_spent: ((i * 523) % 20000).toFixed(2),
      status: 1,
      last_login_at: dateOffset(-i, 10),
      created_at: dateOffset(-60 + i, 9),
      updated_at: now,
      deleted_at: null,
    })
    if (i <= 3) {
      addresses.push(
        {
          user_id: i,
          receiver: ['张小兔', '李同学', '王小明'][i - 1],
          phone: `1380000${String(i).padStart(4, '0')}`,
          province: '广东省',
          city: ['湛江市', '广州市', '深圳市'][i - 1],
          district: ['赤坎区', '天河区', '南山区'][i - 1],
          detail: ['岭南师范学院 明德楼 302', '天河路 385 号太古汇 B 座', '科技园南路 18 号'][i - 1],
          is_default: 1,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        {
          user_id: i,
          receiver: '家人代收',
          phone: '13900006666',
          province: '广东省',
          city: '广州市',
          district: '越秀区',
          detail: '中山五路 33 号',
          is_default: 0,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      )
    }
  }
  return { users, addresses }
}

function buildMarketing(products, skus) {
  const banners = [
    [1, '新人专享 首单立减', '注册即领 88 元新人券包', '/coupons', '#1c3d5a'],
    [2, '数码焕新季', '旗舰手机 低至 8 折', '/category/101', '#2f2a4a'],
    [3, '生鲜直采 产地包邮', '当季水果 新鲜到家', '/category/104', '#1f4a2e'],
    [4, '家居焕新 满 300 减 60', '打造理想生活空间', '/category/103', '#4a3320'],
  ].map(([id, title, subtitle, link, bg]) => ({
    id,
    title,
    subtitle,
    image: placeholder(`banner-${id}`, title, 1200, 400),
    link,
    bg,
    position: 'home_top',
    sort: id,
    status: 1,
    created_at: now,
    updated_at: now,
  }))

  const coupons = [
    [1, '新人首单券', 1, 20, 1, 99, 2, 7],
    [2, '满 200 减 30', 1, 30, 1, 200, 2, 30],
    [3, '数码专享 9 折券', 2, 0, 0.9, 500, 1, 60],
    [4, '满 500 减 80', 1, 80, 1, 500, 2, 30],
    [5, '生鲜尝鲜券', 1, 15, 1, 59, 1, 45],
    [6, '家居满减券', 1, 50, 1, 300, 1, 45],
    [7, '美妆满 199 减 40', 1, 40, 1, 199, 2, 30],
    [8, '服饰 8.8 折券', 2, 0, 0.88, 199, 2, 30],
  ].map(([id, name, type, amount, rate, minAmount, , validDays]) => {
    // 让演示券的范围与名称一致：数码 101、生鲜 104、家居 103、美妆 105、服饰 102，其余为全场券
    const scope = id === 3 || id === 5 || id === 6 || id === 7 || id === 8 ? 2 : 1
    const scopeIds =
      id === 3 ? [101] : id === 5 ? [104] : id === 6 ? [103] : id === 7 ? [105] : id === 8 ? [102] : null
    return {
      id,
      name,
      type,
      amount: amount.toFixed(2),
      discount_rate: rate.toFixed(2),
      min_amount: minAmount.toFixed(2),
      total_count: 10000,
      received_count: 0,
      used_count: 0,
      per_user_limit: 3,
      valid_type: 2,
      valid_start: dateOffset(-10),
      valid_end: dateOffset(validDays + 30),
      valid_days: validDays,
      scope,
      // queryInterface.bulkInsert 不会自动序列化 JSON 字段，这里必须手动 stringify
      scope_ids: scopeIds ? JSON.stringify(scopeIds) : null,
      status: 1,
      created_at: dateOffset(-10),
      updated_at: now,
    }
  })

  const seckillProducts = skus
    .filter((s) => s.id % 100 === 0)
    .slice(0, 8)
    .map((sku, i) => ({
      activity_id: 1,
      product_id: sku.product_id,
      sku_id: sku.id,
      seckill_price: (Number(sku.price) * 0.68).toFixed(2),
      seckill_stock: 50 + ((i * 17) % 120),
      sold_count: 30 + ((i * 23) % 200),
      limit_per_user: 2,
      sort: i + 1,
    }))

  const seckillActivities = [
    {
      id: 1,
      name: '今日限时秒杀',
      start_time: dateOffset(-1),
      end_time: dateOffset(30),
      status: 1,
      created_at: dateOffset(-1),
      updated_at: now,
    },
  ]

  const notices = [
    {
      title: '小兔鲜平台服务升级公告',
      content: '为提供更好的购物体验，平台将于近期进行系统升级。',
      type: 1,
      status: 1,
      publish_at: dateOffset(-2),
      created_at: dateOffset(-2),
    },
  ]

  return { banners, coupons, seckillProducts, seckillActivities, notices }
}

function buildComments(products, users, startId) {
  const rows = []
  let id = startId
  products.forEach((p, pi) => {
    const count = 3 + (pi % 4)
    for (let i = 0; i < count; i += 1) {
      const user = users[(pi + i) % users.length]
      const score = i % 7 === 0 ? 4 : 5
      rows.push({
        id: id++,
        user_id: user.id,
        product_id: p.id,
        sku_id: null,
        order_id: null,
        order_item_id: null,
        score,
        content: COMMENT_TEXTS[(pi + i) % COMMENT_TEXTS.length],
        images: i % 3 === 0 ? JSON.stringify([placeholder(`c${p.id}a`, '买家秀', 120, 120)]) : null,
        is_anonymous: i % 5 === 0 ? 1 : 0,
        reply_content: i === 0 ? '感谢您的支持，我们会持续做好品质与服务！' : null,
        reply_at: i === 0 ? dateOffset(-1) : null,
        status: 1,
        created_at: dateOffset(-((pi + i) % 20)),
        updated_at: now,
      })
    }
  })
  return rows
}

function buildOrders(products, skus, users) {
  const orders = []
  const items = []
  const logistics = []
  const payments = []
  const statuses = [10, 20, 30, 40, 70, 40, 20, 10, 30, 40]
  let itemId = 1
  let orderId = 1

  for (let i = 0; i < 30; i += 1) {
    const status = statuses[i % statuses.length]
    const user = users[i % users.length]
    const p1 = products[i % products.length]
    const skus1 = skus.filter((s) => s.product_id === p1.id)
    const sku1 = skus1[i % skus1.length]
    const qty1 = (i % 2) + 1

    const lineItems = [
      {
        product: p1,
        sku: sku1,
        quantity: qty1,
        subtotal: Number(sku1.price) * qty1,
      },
    ]
    if (i % 2 === 0) {
      const p2 = products[(i + 5) % products.length]
      const skus2 = skus.filter((s) => s.product_id === p2.id)
      const sku2 = skus2[(i + 1) % skus2.length]
      lineItems.push({ product: p2, sku: sku2, quantity: 1, subtotal: Number(sku2.price) })
    }

    const totalAmount = lineItems.reduce((s, it) => s + it.subtotal, 0)
    const couponAmount = i % 3 === 0 ? Math.min(30, totalAmount * 0.1) : 0
    const freightAmount = totalAmount >= 99 ? 0 : 8
    const payAmount = totalAmount + freightAmount - couponAmount
    const orderNo = `XTX202609${String(28 - (i % 27)).padStart(2, '0')}${String(1000 + i)}`
    const createdAt = dateOffset(-(i % 25), 10 + (i % 8))

    orders.push({
      id: orderId,
      order_no: orderNo,
      user_id: user.id,
      status,
      total_amount: totalAmount.toFixed(2),
      discount_amount: couponAmount.toFixed(2),
      coupon_amount: couponAmount.toFixed(2),
      freight_amount: freightAmount.toFixed(2),
      pay_amount: payAmount.toFixed(2),
      paid_amount: status === 10 ? '0.00' : payAmount.toFixed(2),
      coupon_id: null,
      pay_type: status === 10 ? null : 4,
      pay_time: status === 10 ? null : createdAt,
      ship_time: status >= 30 ? dateOffset(-(i % 20), 15) : null,
      receive_time: status === 40 ? dateOffset(-(i % 15), 18) : null,
      finish_time: status === 40 ? dateOffset(-(i % 15), 18) : null,
      close_time: status === 70 ? dateOffset(-(i % 20), 11) : null,
      receiver_name: '张小兔',
      receiver_phone: '138****8888',
      receiver_address: '广东省湛江市赤坎区岭南师范学院 明德楼 302',
      remark: i % 2 === 0 ? '请尽快发货，谢谢' : '',
      admin_remark: null,
      source: 1,
      created_at: createdAt,
      updated_at: createdAt,
    })

    lineItems.forEach((it) => {
      items.push({
        id: itemId++,
        order_id: orderId,
        product_id: it.product.id,
        sku_id: it.sku.id,
        product_name: it.product.name,
        sku_spec_text: it.sku.spec_text,
        product_image: it.product.main_image,
        price: it.sku.price,
        quantity: it.quantity,
        subtotal: it.subtotal.toFixed(2),
        discount_amount: '0.00',
        is_commented: status === 40 ? 1 : 0,
        refund_status: 0,
        created_at: createdAt,
        updated_at: createdAt,
      })
    })

    if (status >= 30) {
      logistics.push({
        order_id: orderId,
        company: ['顺丰速运', '中通快递', '圆通速递'][i % 3],
        tracking_no: `SF${900000000 + i}`,
        status: status === 40 ? 2 : 1,
        traces: JSON.stringify([
          { time: '2026-09-20 09:00:00', text: '【派送中】快递员正在为您派送' },
          { time: '2026-09-19 20:00:00', text: '快件已到达【广州转运中心】' },
          { time: '2026-09-19 08:00:00', text: '包裹已从【湛江分拨中心】发出' },
        ]),
        created_at: createdAt,
        updated_at: createdAt,
      })
    }

    if (status !== 10 && status !== 70) {
      payments.push({
        pay_no: `PAY${orderNo}`,
        order_id: orderId,
        order_no: orderNo,
        user_id: user.id,
        amount: payAmount.toFixed(2),
        channel: 4,
        status: 1,
        third_party_no: `MOCK${100000 + i}`,
        request_body: null,
        callback_body: null,
        paid_at: createdAt,
        created_at: createdAt,
        updated_at: createdAt,
      })
    }

    orderId += 1
  }

  return { orders, items, logistics, payments }
}

/* ----------------------------- seeder ----------------------------- */
module.exports = {
  async up(queryInterface) {
    const { products, skus, images } = buildProductsAndSkus()
    const { users, addresses } = buildUsers()
    const { banners, coupons, seckillProducts, seckillActivities, notices } = buildMarketing(products, skus)
    const comments = buildComments(products, users, 1)
    const { orders, items, logistics, payments } = buildOrders(products, skus, users)

    // 商品评价数/均分冗余字段回填
    const commentAgg = {}
    comments.forEach((c) => {
      const a = (commentAgg[c.product_id] ||= { count: 0, sum: 0 })
      a.count += 1
      a.sum += c.score
    })
    products.forEach((p) => {
      const a = commentAgg[p.id]
      if (a) {
        p.comment_count = a.count
        p.avg_score = (a.sum / a.count).toFixed(2)
      }
    })

    const levels = [
      { id: 1, name: '普通会员', min_spent: '0.00', discount_rate: '1.00', icon: '', sort: 1, status: 1 },
      { id: 2, name: '白银会员', min_spent: '1000.00', discount_rate: '0.98', icon: '', sort: 2, status: 1 },
      { id: 3, name: '黄金会员', min_spent: '5000.00', discount_rate: '0.95', icon: '', sort: 3, status: 1 },
      { id: 4, name: '钻石会员', min_spent: '20000.00', discount_rate: '0.92', icon: '', sort: 4, status: 1 },
    ]

    const roles = [
      { id: 1, name: '超级管理员', code: 'super_admin', description: '拥有全部权限', status: 1, created_at: now, updated_at: now },
      { id: 2, name: '商品运营', code: 'product_op', description: '商品与分类管理', status: 1, created_at: now, updated_at: now },
      { id: 3, name: '订单客服', code: 'order_op', description: '订单与售后处理', status: 1, created_at: now, updated_at: now },
    ]

    const adminUsers = [
      {
        id: 1,
        username: 'admin',
        password: bcrypt.hashSync('admin123', 10),
        real_name: '系统管理员',
        phone: '13800000000',
        avatar: avatar('管理员'),
        role_id: 1,
        status: 1,
        last_login_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    ]

    await queryInterface.bulkInsert('user_levels', levels)
    await queryInterface.bulkInsert('roles', roles)
    await queryInterface.bulkInsert('admin_users', adminUsers)
    await queryInterface.bulkInsert('categories', buildCategories())
    await queryInterface.bulkInsert('brands', buildBrands())
    await queryInterface.bulkInsert('products', products)
    await queryInterface.bulkInsert('product_skus', skus)
    await queryInterface.bulkInsert('product_images', images)
    await queryInterface.bulkInsert('banners', banners)
    await queryInterface.bulkInsert('coupons', coupons)
    await queryInterface.bulkInsert('seckill_activities', seckillActivities)
    await queryInterface.bulkInsert('seckill_products', seckillProducts)
    await queryInterface.bulkInsert('notices', notices)
    await queryInterface.bulkInsert('users', users)
    await queryInterface.bulkInsert('user_addresses', addresses)
    await queryInterface.bulkInsert('product_comments', comments)
    await queryInterface.bulkInsert('orders', orders)
    await queryInterface.bulkInsert('order_items', items)
    await queryInterface.bulkInsert('order_logistics', logistics)
    await queryInterface.bulkInsert('payment_records', payments)

    // 重置自增，避免后续插入 id 冲突
    for (const t of ['product_comments']) {
      await queryInterface.sequelize.query(
        `ALTER TABLE \`${t}\` AUTO_INCREMENT = ${comments.length + 1}`,
      )
    }
  },

  async down(queryInterface) {
    const tables = [
      'payment_records',
      'order_logistics',
      'order_items',
      'orders',
      'product_comments',
      'user_addresses',
      'users',
      'notices',
      'seckill_products',
      'seckill_activities',
      'coupons',
      'banners',
      'product_images',
      'product_skus',
      'products',
      'brands',
      'categories',
      'admin_users',
      'roles',
      'user_levels',
    ]
    for (const t of tables) {
      await queryInterface.bulkDelete(t, null, {})
    }
  },
}
