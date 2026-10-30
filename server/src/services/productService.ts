import { Op, type Order as SequelizeOrder, type WhereOptions } from 'sequelize'
import {
  Banner,
  Brand,
  Category,
  Product,
  ProductAttribute,
  ProductComment,
  ProductImage,
  ProductSku,
  SeckillActivity,
  SeckillProduct,
  User,
} from '../models'
import {
  toBannerDto,
  toCommentDto,
  toProductDto,
  toSeckillDto,
  type ProductWithRelations,
} from '../utils/serializers'
import { getActiveFloorConfigs } from './homeFloorService'

const productInclude = [
  { model: ProductSku, as: 'skus' },
  { model: ProductImage, as: 'imageList' },
  { model: ProductAttribute, as: 'attributes' },
  {
    model: Category,
    as: 'category',
    include: [{ model: Category, as: 'parent' }],
  },
  { model: Brand, as: 'brand' },
]

export interface ProductListQuery {
  categoryId?: number
  keyword?: string
  brandId?: number
  minPrice?: number
  maxPrice?: number
  sortBy?: 'default' | 'sales' | 'priceAsc' | 'priceDesc' | 'new'
  page?: number
  pageSize?: number
}

export async function listCategories() {
  const rows = await Category.findAll({ where: { status: 1 }, order: [['sort', 'ASC']] })
  return rows.map((c) => ({
    id: c.id,
    parentId: c.parentId,
    name: c.name,
    level: c.level as 1 | 2,
    icon: c.icon ?? '',
    sort: c.sort,
  }))
}

export async function listBrands() {
  const rows = await Brand.findAll({ where: { status: 1 }, order: [['sort', 'ASC']] })
  return rows.map((b) => ({ id: b.id, name: b.name, logo: b.logo ?? '' }))
}

async function resolveCategoryIds(categoryId: number): Promise<number[]> {
  const category = await Category.findByPk(categoryId)
  if (!category) return [categoryId]
  if (category.level === 1) {
    const children = await Category.findAll({ where: { parentId: category.id }, attributes: ['id'] })
    return [category.id, ...children.map((c) => c.id)]
  }
  return [category.id]
}

export async function listProducts(query: ProductListQuery) {
  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 12))

  const conditions: WhereOptions[] = [{ status: 1 }]
  if (query.categoryId) {
    const ids = await resolveCategoryIds(query.categoryId)
    conditions.push({ categoryId: { [Op.in]: ids } })
  }
  if (query.brandId) conditions.push({ brandId: query.brandId })
  if (query.keyword) {
    conditions.push({
      [Op.or]: [
        { name: { [Op.like]: `%${query.keyword}%` } },
        { subtitle: { [Op.like]: `%${query.keyword}%` } },
      ],
    } as WhereOptions)
  }
  if (query.minPrice !== undefined) conditions.push({ priceMin: { [Op.gte]: query.minPrice } })
  if (query.maxPrice !== undefined) conditions.push({ priceMin: { [Op.lte]: query.maxPrice } })
  const where: WhereOptions = { [Op.and]: conditions }

  let order: SequelizeOrder = [
    ['sort', 'DESC'],
    ['salesCount', 'DESC'],
  ]
  switch (query.sortBy) {
    case 'sales':
      order = [['salesCount', 'DESC']]
      break
    case 'priceAsc':
      order = [['priceMin', 'ASC']]
      break
    case 'priceDesc':
      order = [['priceMin', 'DESC']]
      break
    case 'new':
      order = [['id', 'DESC']]
      break
  }

  const { rows, count } = await Product.findAndCountAll({
    where,
    include: productInclude,
    order,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    distinct: true,
  })

  return {
    list: rows.map((p) => toProductDto(p as unknown as ProductWithRelations)),
    page,
    pageSize,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  }
}

export async function getProduct(id: number) {
  const product = await Product.findOne({ where: { id, status: 1 }, include: productInclude })
  if (!product) return null
  return toProductDto(product as unknown as ProductWithRelations)
}

export async function getProductComments(productId: number) {
  const rows = await ProductComment.findAll({
    where: { productId, status: 1 },
    include: [{ model: User, as: 'user' }],
    order: [['id', 'DESC']],
    limit: 50,
  })
  return rows.map((c) => toCommentDto(c as unknown as Parameters<typeof toCommentDto>[0]))
}

export async function getRecommendProducts(excludeId: number, size = 4) {
  const rows = await Product.findAll({
    where: { status: 1, id: { [Op.ne]: excludeId } },
    include: productInclude,
    order: [['salesCount', 'DESC']],
    limit: size,
  })
  return rows.map((p) => toProductDto(p as unknown as ProductWithRelations))
}

export async function getHomeData() {
  const [banners, tops] = await Promise.all([
    Banner.findAll({ where: { status: 1, position: 'home_top' }, order: [['sort', 'ASC']] }),
    Category.findAll({ where: { status: 1, level: 1 }, order: [['sort', 'ASC']] }),
  ])

  const now = new Date()
  const activity = await SeckillActivity.findOne({
    where: { status: 1, startTime: { [Op.lte]: now }, endTime: { [Op.gte]: now } },
  })
  let seckills: ReturnType<typeof toSeckillDto>[] = []
  if (activity) {
    const rows = await SeckillProduct.findAll({
      where: { activityId: activity.id },
      include: [{ model: Product, as: 'product' }],
      order: [['sort', 'ASC']],
      limit: 8,
    })
    seckills = rows.map((r) => toSeckillDto(r as unknown as Parameters<typeof toSeckillDto>[0]))
  }

  const recommendRows = await Product.findAll({
    where: { status: 1, isRecommend: 1 },
    include: productInclude,
    order: [['sort', 'DESC']],
    limit: 10,
  })

  const floors: {
    title: string
    subtitle: string
    categoryId: number | null
    products: ReturnType<typeof toProductDto>[]
  }[] = []
  // A-44：优先使用后台人工编排的楼层；未配置时回退为「按一级分类自动生成」
  const configuredFloors = await getActiveFloorConfigs()
  if (configuredFloors.length) {
    const allIds = [...new Set(configuredFloors.flatMap((f) => f.productIds))]
    const rows = allIds.length
      ? await Product.findAll({
          where: { id: { [Op.in]: allIds }, status: 1 },
          include: productInclude,
        })
      : []
    const productMap = new Map(rows.map((p) => [Number(p.id), p]))
    for (const config of configuredFloors) {
      const products = config.productIds
        .map((id) => productMap.get(id))
        .filter((p): p is Product => Boolean(p))
        .map((p) => toProductDto(p as unknown as ProductWithRelations))
      if (!products.length) continue
      floors.push({
        title: config.title,
        subtitle: config.subtitle || '精选好物 品质保障',
        categoryId: config.categoryId,
        products,
      })
    }
  } else {
    for (const top of tops.slice(0, 4)) {
      const ids = await resolveCategoryIds(top.id)
      const products = await Product.findAll({
        where: { status: 1, categoryId: { [Op.in]: ids } },
        include: productInclude,
        order: [['salesCount', 'DESC']],
        limit: 8,
      })
      floors.push({
        title: top.name,
        subtitle: '精选好物 品质保障',
        categoryId: top.id,
        products: products.map((p) => toProductDto(p as unknown as ProductWithRelations)),
      })
    }
  }

  const categoryDto = tops.map((c) => ({
    id: c.id,
    parentId: c.parentId,
    name: c.name,
    level: c.level as 1 | 2,
    icon: c.icon ?? '',
    sort: c.sort,
  }))

  return {
    banners: banners.map(toBannerDto),
    seckills,
    categories: categoryDto,
    recommend: recommendRows.map((p) => toProductDto(p as unknown as ProductWithRelations)),
    floors,
  }
}
