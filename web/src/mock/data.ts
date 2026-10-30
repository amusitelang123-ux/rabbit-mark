import type {
  Address,
  Banner,
  Brand,
  Category,
  CommentItem,
  Coupon,
  Notice,
  Order,
  OrderStatus,
  Product,
  ProductSku,
  SeckillProduct,
  UserInfo,
} from '@/api/types'
import { placeholder, avatar } from '@/utils/image'
import { addMoney, mulMoney } from '@/utils/money'

/* ----------------------------- Categories ----------------------------- */
export const categories: Category[] = [
  { id: 101, parentId: 0, name: '数码电子', level: 1, icon: '📱', sort: 1 },
  { id: 102, parentId: 0, name: '服饰鞋包', level: 1, icon: '👕', sort: 2 },
  { id: 103, parentId: 0, name: '家居生活', level: 1, icon: '🛋️', sort: 3 },
  { id: 104, parentId: 0, name: '食品生鲜', level: 1, icon: '🥬', sort: 4 },
  { id: 105, parentId: 0, name: '美妆个护', level: 1, icon: '💄', sort: 5 },
  { id: 106, parentId: 0, name: '母婴玩具', level: 1, icon: '🍼', sort: 6 },
  { id: 107, parentId: 0, name: '运动户外', level: 1, icon: '🏀', sort: 7 },
  { id: 108, parentId: 0, name: '图书文娱', level: 1, icon: '📚', sort: 8 },
  { id: 1011, parentId: 101, name: '手机通讯', level: 2, icon: '📱', sort: 1 },
  { id: 1012, parentId: 101, name: '电脑办公', level: 2, icon: '💻', sort: 2 },
  { id: 1013, parentId: 101, name: '影音耳机', level: 2, icon: '🎧', sort: 3 },
  { id: 1014, parentId: 101, name: '智能穿戴', level: 2, icon: '⌚', sort: 4 },
  { id: 1021, parentId: 102, name: '男装女装', level: 2, icon: '👕', sort: 1 },
  { id: 1022, parentId: 102, name: '运动鞋靴', level: 2, icon: '👟', sort: 2 },
  { id: 1023, parentId: 102, name: '箱包配饰', level: 2, icon: '👜', sort: 3 },
  { id: 1031, parentId: 103, name: '厨房用品', level: 2, icon: '🍳', sort: 1 },
  { id: 1032, parentId: 103, name: '家纺床品', level: 2, icon: '🛏️', sort: 2 },
  { id: 1033, parentId: 103, name: '收纳清洁', level: 2, icon: '🧹', sort: 3 },
  { id: 1041, parentId: 104, name: '休闲零食', level: 2, icon: '🍪', sort: 1 },
  { id: 1042, parentId: 104, name: '新鲜水果', level: 2, icon: '🍎', sort: 2 },
  { id: 1043, parentId: 104, name: '粮油调味', level: 2, icon: '🍚', sort: 3 },
  { id: 1051, parentId: 105, name: '护肤彩妆', level: 2, icon: '💄', sort: 1 },
  { id: 1052, parentId: 105, name: '洗护清洁', level: 2, icon: '🧴', sort: 2 },
  { id: 1061, parentId: 106, name: '婴童用品', level: 2, icon: '🍼', sort: 1 },
  { id: 1062, parentId: 106, name: '益智玩具', level: 2, icon: '🧸', sort: 2 },
  { id: 1071, parentId: 107, name: '健身训练', level: 2, icon: '🏋️', sort: 1 },
  { id: 1072, parentId: 107, name: '户外露营', level: 2, icon: '⛺', sort: 2 },
  { id: 1081, parentId: 108, name: '文学小说', level: 2, icon: '📖', sort: 1 },
  { id: 1082, parentId: 108, name: '学习教育', level: 2, icon: '✏️', sort: 2 },
]

export const brands: Brand[] = [
  { id: 1, name: '兔鲜优选', logo: placeholder('兔鲜优选', '兔鲜', 120, 60) },
  { id: 2, name: '极光科技', logo: placeholder('极光科技', '极光', 120, 60) },
  { id: 3, name: '云栖家居', logo: placeholder('云栖家居', '云栖', 120, 60) },
  { id: 4, name: '拾光良品', logo: placeholder('拾光良品', '拾光', 120, 60) },
  { id: 5, name: '山野农夫', logo: placeholder('山野农夫', '山野', 120, 60) },
  { id: 6, name: '悦己主义', logo: placeholder('悦己主义', '悦己', 120, 60) },
  { id: 7, name: '小兔宝贝', logo: placeholder('小兔宝贝', '宝贝', 120, 60) },
  { id: 8, name: '风行运动', logo: placeholder('风行运动', '风行', 120, 60) },
  { id: 9, name: '墨韵书房', logo: placeholder('墨韵书房', '墨韵', 120, 60) },
]

const brandName = (id: number) => brands.find((b) => b.id === id)?.name ?? '兔鲜优选'

/** Resolve any category id (top or second level) to its top-level id. */
export function topCategoryId(id: number): number {
  const cat = categories.find((c) => c.id === id)
  if (!cat) return id
  return cat.level === 1 ? cat.id : cat.parentId
}

/* ------------------------------- Products ------------------------------ */
interface Seed {
  id: number
  name: string
  subtitle: string
  categoryId: number
  brandId: number
  specs?: { name: string; values: string[] }[]
  tags?: string[]
  detail: string
}

const SPEC_LIB: Record<string, { name: string; values: string[] }[]> = {
  digital: [
    { name: '颜色', values: ['星空黑', '月光银', '晨曦蓝'] },
    { name: '版本', values: ['8+128G', '12+256G', '16+512G'] },
  ],
  apparel: [
    { name: '颜色', values: ['经典黑', '米白', '雾霾蓝'] },
    { name: '尺码', values: ['S', 'M', 'L', 'XL'] },
  ],
  home: [{ name: '规格', values: ['标准款', '加大款', '豪华款'] }],
  food: [{ name: '规格', values: ['500g', '1kg', '2.5kg'] }],
  beauty: [{ name: '规格', values: ['30ml', '50ml', '100ml'] }],
  baby: [{ name: '颜色', values: ['奶油黄', '天空蓝', '樱花粉'] }],
  sport: [{ name: '尺码', values: ['均码', 'M', 'L'] }],
  book: [{ name: '装帧', values: ['平装', '精装'] }],
}

function specLibFor(categoryId: number) {
  const top = topCategoryId(categoryId)
  if (top === 101) return SPEC_LIB.digital
  if (top === 102) return SPEC_LIB.apparel
  if (top === 103) return SPEC_LIB.home
  if (top === 104) return SPEC_LIB.food
  if (top === 105) return SPEC_LIB.beauty
  if (top === 106) return SPEC_LIB.baby
  if (top === 107) return SPEC_LIB.sport
  return SPEC_LIB.book
}

const SEEDS: Seed[] = [
  { id: 1001, name: '极光 Note 15 旗舰智能手机', subtitle: '2 亿像素影像 · 120Hz 高刷 · 5500mAh', categoryId: 1011, brandId: 2, tags: ['热销', '包邮'], detail: '<p>搭载新一代旗舰芯片，2 亿像素主摄，夜景纯净通透。</p><ul><li>6.8 英寸 120Hz 曲面屏</li><li>5500mAh 大电池 + 120W 快充</li><li>IP68 防尘防水</li></ul>' },
  { id: 1002, name: '极光 Book Air 14 轻薄本', subtitle: '2.8K 触控屏 · 32G 内存 · 1TB 固态', categoryId: 1012, brandId: 2, tags: ['新品'], detail: '<p>仅 1.19kg 的金属机身，续航长达 18 小时，办公出行两相宜。</p>' },
  { id: 1003, name: '极光降噪耳机 Pro', subtitle: '48dB 主动降噪 · 空间音频', categoryId: 1013, brandId: 2, tags: ['爆款'], detail: '<p>双馈降噪，通勤地铁瞬间安静；单次续航 12 小时。</p>' },
  { id: 1004, name: '极光智能手表 GT4', subtitle: '血氧心率监测 · 14 天续航', categoryId: 1014, brandId: 2, tags: ['运动'], detail: '<p>100+ 运动模式，全天候健康监测。</p>' },
  { id: 1005, name: '兔鲜优选 全棉基础圆领T恤', subtitle: '新疆长绒棉 · 不易变形', categoryId: 1021, brandId: 1, tags: ['百搭'], detail: '<p>260g 重磅纯棉，柔软亲肤，四季百搭。</p>' },
  { id: 1006, name: '拾光良品 轻薄羽绒服', subtitle: '90 白鸭绒 · 防泼水', categoryId: 1021, brandId: 4, tags: ['冬季'], detail: '<p>充绒量 130g，轻盈保暖，可折叠收纳。</p>' },
  { id: 1007, name: '风行运动 缓震跑步鞋', subtitle: '回弹中底 · 透气网面', categoryId: 1022, brandId: 8, tags: ['热销'], detail: '<p>分区缓震，长距离奔跑依旧稳定。</p>' },
  { id: 1008, name: '拾光良品 通勤单肩托特包', subtitle: '大容量 · 头层牛皮', categoryId: 1023, brandId: 4, tags: ['通勤'], detail: '<p>可容纳 14 寸笔记本，通勤出差一包搞定。</p>' },
  { id: 1009, name: '云栖家居 不粘炒锅', subtitle: '麦饭石涂层 · 少油不粘', categoryId: 1031, brandId: 3, tags: ['厨房'], detail: '<p>厚底受热均匀，燃气电磁炉通用。</p>' },
  { id: 1010, name: '云栖家居 60 支全棉四件套', subtitle: '长绒棉贡缎 · 亲肤透气', categoryId: 1032, brandId: 3, tags: ['家纺'], detail: '<p>60 支高密贡缎，越洗越柔软。</p>' },
  { id: 1011, name: '云栖家居 折叠收纳箱', subtitle: '加厚牛津布 · 免安装', categoryId: 1033, brandId: 3, tags: ['收纳'], detail: '<p>可叠放设计，换季衣物一站式收纳。</p>' },
  { id: 1012, name: '山野农夫 每日坚果混合装', subtitle: '7 种果仁 · 独立小包', categoryId: 1041, brandId: 5, tags: ['热销'], detail: '<p>科学配比，每日一包补充能量。</p>' },
  { id: 1013, name: '山野农夫 阿克苏冰糖心苹果', subtitle: '脆甜多汁 · 顺丰包邮', categoryId: 1042, brandId: 5, tags: ['包邮'], detail: '<p>新疆阿克苏直采，糖心明显，脆甜爽口。</p>' },
  { id: 1014, name: '山野农夫 五常稻花香大米', subtitle: '当季新米 · 粒粒饱满', categoryId: 1043, brandId: 5, tags: ['新米'], detail: '<p>五常核心产区，米饭油亮回甘。</p>' },
  { id: 1015, name: '悦己主义 玻尿酸精华水', subtitle: '深层补水 · 温和不刺激', categoryId: 1051, brandId: 6, tags: ['护肤'], detail: '<p>多重玻尿酸复配，敏感肌可用。</p>' },
  { id: 1016, name: '悦己主义 丝绒哑光口红', subtitle: '显白不拔干', categoryId: 1051, brandId: 6, tags: ['彩妆'], detail: '<p>一抹显色，丝绒质地持久不脱色。</p>' },
  { id: 1017, name: '兔鲜优选 氨基酸洗发水', subtitle: '控油蓬松 · 无硅油', categoryId: 1052, brandId: 1, tags: ['洗护'], detail: '<p>温和清洁，蓬松不扁塌。</p>' },
  { id: 1018, name: '小兔宝贝 婴儿纸尿裤', subtitle: '超薄透气 · 干爽整夜', categoryId: 1061, brandId: 7, tags: ['母婴'], detail: '<p>3D 透气芯体，弱酸亲肤。</p>' },
  { id: 1019, name: '小兔宝贝 积木益智拼装', subtitle: '大颗粒 · 安全无毛刺', categoryId: 1062, brandId: 7, tags: ['益智'], detail: '<p>锻炼动手能力，亲子互动首选。</p>' },
  { id: 1020, name: '风行运动 折叠跑步机', subtitle: '家用静音 · 免安装', categoryId: 1071, brandId: 8, tags: ['健身'], detail: '<p>折叠后仅 0.3 ㎡，居家健身不占地。</p>' },
  { id: 1021, name: '风行运动 户外露营帐篷', subtitle: '3-4 人 · 全自动速开', categoryId: 1072, brandId: 8, tags: ['露营'], detail: '<p>加厚防雨面料，公园野营皆宜。</p>' },
  { id: 1022, name: '墨韵书房 经典文学套装', subtitle: '精装典藏 · 全 8 册', categoryId: 1081, brandId: 9, tags: ['好书'], detail: '<p>名家译本，纸张考究，适合收藏。</p>' },
  { id: 1023, name: '墨韵书房 儿童英语启蒙绘本', subtitle: '点读笔配套 · 全 20 册', categoryId: 1082, brandId: 9, tags: ['启蒙'], detail: '<p>情景式学习，培养语言兴趣。</p>' },
  { id: 1024, name: '极光平板 Pad 11', subtitle: '144Hz 护眼屏 · 学习办公', categoryId: 1012, brandId: 2, tags: ['热销'], detail: '<p>11 英寸高刷屏，支持手写笔。</p>' },
  { id: 1025, name: '兔鲜优选 冰丝防晒衣', subtitle: 'UPF50+ · 凉感透气', categoryId: 1021, brandId: 1, tags: ['夏季'], detail: '<p>轻薄凉感，户外通勤防晒必备。</p>' },
  { id: 1026, name: '云栖家居 智能感应台灯', subtitle: '无频闪 · 三档色温', categoryId: 1031, brandId: 3, tags: ['智能'], detail: '<p>国AA 级照度，呵护双眼。</p>' },
  { id: 1027, name: '山野农夫 云南小台芒', subtitle: '皮薄核小 · 香甜多汁', categoryId: 1042, brandId: 5, tags: ['应季'], detail: '<p>云南高原直采，成熟度精选。</p>' },
  { id: 1028, name: '悦己主义 保湿身体乳', subtitle: '长效滋润 · 留香持久', categoryId: 1051, brandId: 6, tags: ['身体护理'], detail: '<p>乳液质地好吸收，秋冬不干燥。</p>' },
]

function buildSkus(seed: Seed): ProductSku[] {
  const specs = seed.specs ?? specLibFor(seed.categoryId)
  const groups = specs.length ? specs : [{ name: '规格', values: ['默认'] }]
  const combos: Record<string, string>[] = [{}]
  groups.forEach((g) => {
    const next: Record<string, string>[] = []
    combos.forEach((c) => g.values.forEach((v) => next.push({ ...c, [g.name]: v })))
    combos.length = 0
    combos.push(...next)
  })
  const base = 29 + ((seed.id * 37) % 460)
  return combos.map((spec, i) => {
    const price = addMoney(base, i * Math.max(3, Math.round(base * 0.06)))
    const specText = Object.entries(spec)
      .map(([k, v]) => `${k}:${v}`)
      .join(' / ')
    return {
      id: seed.id * 100 + i,
      productId: seed.id,
      skuCode: `SKU${seed.id}${String(i + 1).padStart(2, '0')}`,
      spec,
      specText,
      image: placeholder(`${seed.name}-${specText}`, seed.name, 400, 400),
      price,
      marketPrice: addMoney(price, Math.round(price * 0.25)),
      stock: 8 + ((seed.id + i * 13) % 180),
      warnStock: 10,
      status: 1,
    }
  })
}

export const products: Product[] = SEEDS.map((seed) => {
  const skus = buildSkus(seed)
  const prices = skus.map((s) => s.price)
  const totalStock = skus.reduce((sum, s) => sum + s.stock, 0)
  return {
    id: seed.id,
    name: seed.name,
    subtitle: seed.subtitle,
    categoryId: seed.categoryId,
    brandId: seed.brandId,
    mainImage: placeholder(seed.name, seed.name, 500, 500),
    images: [0, 1, 2, 3].map((i) => placeholder(`${seed.name}-${i}`, seed.name, 500, 500)),
    detailHtml: seed.detail,
    unit: '件',
    priceMin: Math.min(...prices),
    priceMax: Math.max(...prices),
    totalStock,
    salesCount: ((seed.id * 173) % 9000) + 120,
    commentCount: ((seed.id * 61) % 1800) + 30,
    avgScore: 4 + ((seed.id % 10) / 10),
    isRecommend: seed.id % 3 === 0,
    tags: seed.tags ?? [],
    categoryName: categoryName(seed.categoryId),
    brandName: brandName(seed.brandId),
    topCategoryId: topCategoryId(seed.categoryId),
    topCategoryName: categoryName(topCategoryId(seed.categoryId)),
    skus,
  }
})

export const productMap = new Map(products.map((p) => [p.id, p]))

export function categoryName(id: number): string {
  return categories.find((c) => c.id === id)?.name ?? '全部分类'
}

export function brandById(id: number): string {
  return brandName(id)
}

/* ------------------------------ Comments ------------------------------ */
const COMMENT_TEXTS = [
  '质量非常好，做工精致，和描述完全一致，物流也很快，五星好评！',
  '用了一段时间才来评价，效果超出预期，性价比很高，推荐购买。',
  '包装很用心，客服态度也不错，东西收到没有磕碰，满意。',
  '颜色很正，尺码标准，用料扎实，会回购的。',
  '整体不错，就是发货稍微慢了一点，产品本身没问题。',
  '第二次购买了，一如既往地好用，家里人都很喜欢。',
]

export function commentsFor(productId: number): CommentItem[] {
  const base = productId * 7
  return Array.from({ length: 6 }).map((_, i) => {
    const seed = base + i
    const nick = ['小兔爱吃萝卜', '风一样的男子', '柠檬不酸', '山间清风', '数码发烧友', '居家小能手'][i % 6]
    return {
      id: seed,
      userId: seed,
      nickname: nick,
      avatar: avatar(nick),
      score: i === 4 ? 4 : 5,
      content: COMMENT_TEXTS[(base + i) % COMMENT_TEXTS.length],
      images: i % 3 === 0 ? [placeholder(`c${seed}a`, '买家秀', 120, 120), placeholder(`c${seed}b`, '买家秀', 120, 120)] : [],
      specText: `颜色: ${['经典黑', '米白', '雾霾蓝'][i % 3]} / 尺码: ${['M', 'L', 'XL'][i % 3]}`,
      replyContent: i === 0 ? '感谢您的支持，我们会持续做好品质与服务！' : undefined,
      createdAt: `2026-0${(i % 8) + 1}-1${i % 9} 10:2${i}:00`,
    }
  })
}

/* ------------------------------- Banners ------------------------------- */
export const banners: Banner[] = [
  { id: 1, title: '新人专享 首单立减', subtitle: '注册即领 88 元新人券包', image: placeholder('新人专享', '新人专享', 1200, 400), link: '/coupons', bg: '#1c3d5a' },
  { id: 2, title: '数码焕新季', subtitle: '旗舰手机 低至 8 折', image: placeholder('数码焕新', '数码焕新', 1200, 400), link: '/category/101', bg: '#2f2a4a' },
  { id: 3, title: '生鲜直采 产地包邮', subtitle: '当季水果 新鲜到家', image: placeholder('生鲜直采', '生鲜直采', 1200, 400), link: '/category/104', bg: '#1f4a2e' },
  { id: 4, title: '家居焕新 满 300 减 60', subtitle: '打造理想生活空间', image: placeholder('家居焕新', '家居焕新', 1200, 400), link: '/category/103', bg: '#4a3320' },
]

/* ------------------------------- Seckill ------------------------------- */
export const seckills: SeckillProduct[] = products.slice(0, 8).map((p, i) => ({
  id: i + 1,
  productId: p.id,
  name: p.name,
  image: p.mainImage,
  price: addMoney(p.priceMin * 0.68, 0),
  originPrice: p.priceMin,
  stock: 50 + (i * 17) % 120,
  soldCount: 30 + (i * 23) % 200,
}))

/* ------------------------------- Coupons ------------------------------- */
export const coupons: Coupon[] = [
  { id: 1, name: '新人首单券', type: 1, amount: 20, discountRate: 1, minAmount: 99, scopeText: '全场通用', validText: '领取后 7 天内有效', status: 0 },
  { id: 2, name: '满 200 减 30', type: 1, amount: 30, discountRate: 1, minAmount: 200, scopeText: '全场通用', validText: '2026-09-01 ~ 2026-12-31', status: 0 },
  { id: 3, name: '数码专享 9 折券', type: 2, amount: 0, discountRate: 0.9, minAmount: 500, scopeText: '数码电子分类', validText: '2026-09-01 ~ 2026-10-31', status: 0 },
  { id: 4, name: '满 500 减 80', type: 1, amount: 80, discountRate: 1, minAmount: 500, scopeText: '全场通用', validText: '2026-09-01 ~ 2026-12-31', status: 0 },
  { id: 5, name: '生鲜尝鲜券', type: 1, amount: 15, discountRate: 1, minAmount: 59, scopeText: '食品生鲜分类', validText: '已过期', status: 2 },
  { id: 6, name: '家居满减券', type: 1, amount: 50, discountRate: 1, minAmount: 300, scopeText: '家居生活分类', validText: '已使用', status: 1 },
]

/* ------------------------------ Addresses ------------------------------ */
export const addresses: Address[] = [
  { id: 1, receiver: '张小兔', phone: '138****8888', province: '广东省', city: '湛江市', district: '赤坎区', detail: '岭南师范学院 明德楼 302', isDefault: true },
  { id: 2, receiver: '李同学', phone: '139****6666', province: '广东省', city: '广州市', district: '天河区', detail: '天河路 385 号太古汇 B 座', isDefault: false },
]

/* -------------------------------- User --------------------------------- */
export const demoUser: UserInfo = {
  id: 1,
  username: 'rabbit_fan',
  nickname: '小兔爱吃萝卜',
  avatar: avatar('小兔'),
  phone: '138****8888',
  gender: 2,
  birthday: '1998-06-15',
  levelName: '黄金会员',
  points: 2860,
  totalSpent: 6823.5,
}

/* ------------------------------- Orders -------------------------------- */
function orderItems(p: Product, skuIndex: number, qty: number, commented = false) {
  const sku = p.skus[skuIndex % p.skus.length]
  const subtotal = mulMoney(sku.price, qty)
  return {
    id: p.id,
    productId: p.id,
    skuId: sku.id,
    productName: p.name,
    skuSpecText: sku.specText,
    productImage: p.mainImage,
    price: sku.price,
    originalPrice: sku.price,
    seckill: false,
    quantity: qty,
    subtotal,
    isCommented: commented,
  }
}

const STATUSES: OrderStatus[] = [10, 20, 30, 40, 70, 40, 20, 10]

export const orders: Order[] = STATUSES.map((status, i) => {
  const p1 = products[i % products.length]
  const p2 = products[(i + 5) % products.length]
  // 保留部分已完成订单未评价，便于演示「评价晒单」
  const commented = status === 40 && i % 3 !== 0
  const items = [orderItems(p1, i, (i % 2) + 1, commented), ...(i % 2 === 0 ? [orderItems(p2, i + 1, 1, commented)] : [])]
  const totalAmount = addMoney(...items.map((it) => it.subtotal))
  const couponAmount = i % 3 === 0 ? Math.min(30, Math.round(totalAmount * 0.1)) : 0
  const promotionAmount = totalAmount >= 199 ? 20 : 0
  const freightAmount = totalAmount >= 99 ? 0 : 8
  const payAmount = addMoney(totalAmount, freightAmount) - couponAmount - promotionAmount
  const day = String(28 - i).padStart(2, '0')
  const createdAt = `2026-09-${day} 14:${String(10 + i).padStart(2, '0')}:00`
  return {
    orderNo: `XTX202609${day}${String(1000 + i)}`,
    status,
    items,
    totalAmount,
    discountAmount: couponAmount + promotionAmount,
    seckillAmount: 0,
    couponAmount,
    promotionAmount,
    freightAmount,
    payAmount,
    receiverName: addresses[0].receiver,
    receiverPhone: addresses[0].phone,
    receiverAddress: `${addresses[0].province}${addresses[0].city}${addresses[0].district}${addresses[0].detail}`,
    payType: status === 10 ? null : 4,
    payTime: status === 10 ? null : createdAt,
    shipTime: status >= 30 ? createdAt : null,
    receiveTime: status === 40 ? createdAt : null,
    remindShipCount: 0,
    lastRemindShipAt: null,
    remark: i % 2 === 0 ? '请尽快发货，谢谢' : '',
    createdAt,
    logs: [
      {
        id: i * 10 + 1,
        action: 'create',
        actionText: '提交订单',
        operator: 'user:1',
        remark: '',
        createdAt,
      },
    ],
    logistics:
      status >= 30
        ? {
            company: ['顺丰速运', '中通快递', '圆通速递'][i % 3],
            trackingNo: `SF${900000000 + i}`,
            traces: [
              { time: `${createdAt}`, text: '包裹已从【湛江分拨中心】发出' },
              { time: `${createdAt}`, text: '快件已到达【广州转运中心】' },
              { time: `${createdAt}`, text: '【派送中】快递员正在为您派送' },
            ],
          }
        : undefined,
  }
})

export const orderStatusText: Record<OrderStatus, string> = {
  10: '待付款',
  20: '待发货',
  30: '待收货',
  40: '已完成',
  50: '退款中',
  60: '已退款',
  70: '已取消',
}

/* ------------------------------ Notices ------------------------------ */
export const notices: Notice[] = [
  {
    id: 1,
    title: '小兔鲜平台服务升级公告',
    content: '为提供更好的购物体验，小兔鲜将于近期进行系统升级。升级期间下单、支付、售后与物流查询功能均不受影响，商品浏览可能短暂变慢，请耐心等待。感谢您的理解与支持。',
    type: 1,
    publishAt: '2026-10-21 10:20:00',
    createdAt: '2026-10-21 10:20:00',
  },
  {
    id: 2,
    title: '双十一预售开启，爆款好物低至 5 折',
    content: '小兔鲜双十一预售已正式开启，数码、生鲜、家居三大会场爆款低至 5 折。预售订单支持定金膨胀，尾款支付期间可叠加多档满减，名额有限先到先得。',
    type: 1,
    publishAt: '2026-10-19 09:00:00',
    createdAt: '2026-10-19 09:00:00',
  },
  {
    id: 3,
    title: '生鲜产地直采配送范围扩大至 218 个城市',
    content: '即日起，小兔鲜生鲜产地直采配送范围扩大至 218 个城市，冷链商品次日达，偏远地区同步上线当日达专区。下单时请以结算页预计送达时间为准。',
    type: 1,
    publishAt: '2026-10-15 15:30:00',
    createdAt: '2026-10-15 15:30:00',
  },
  {
    id: 4,
    title: '积分商城上线，每日签到领好礼',
    content: '小兔鲜积分商城正式上线，每日签到即可领积分，积分可兑换平台优惠券与免运费券。本月内登录即送 500 积分，签到连续 7 天额外奖励翻倍。',
    type: 1,
    publishAt: '2026-10-12 08:00:00',
    createdAt: '2026-10-12 08:00:00',
  },
  {
    id: 5,
    title: '发货时效升级：华东仓全面当日发',
    content: '自本日起，华东地区订单将在付款后 12 小时内发出，全国大部分地区实现 48 小时送达。已升级慢必赔承诺，超时未送达将自动发放补偿券。',
    type: 1,
    publishAt: '2026-10-08 11:05:00',
    createdAt: '2026-10-08 11:05:00',
  },
]
