import { Op, type WhereOptions } from 'sequelize'
import { sequelize } from '../config/database'
import {
  Brand,
  Category,
  InventoryLog,
  Product,
  ProductAttribute,
  ProductImage,
  ProductSku,
  SpecGroup,
  SpecValue,
} from '../models'
import type { SpecJson } from '../models/product'
import { AppError } from '../utils/errors'
import { ERR, INVENTORY_TYPE } from '../constants'
import { formatDate } from '../utils/serializers'
import { parseCsv, toCsv } from '../utils/csv'
import { syncProductAggregate } from '../utils/productAggregate'

const adminInclude = [
  { model: ProductSku, as: 'skus' },
  { model: ProductImage, as: 'imageList' },
  { model: ProductAttribute, as: 'attributes' },
  { model: Category, as: 'category' },
  { model: Brand, as: 'brand' },
]

export interface AdminProductQuery {
  keyword?: string
  categoryId?: number
  status?: number
  page?: number
  pageSize?: number
}

export interface ProductInput {
  name: string
  subtitle?: string
  categoryId: number
  brandId?: number | null
  mainImage?: string
  detailHtml?: string
  unit?: string
  weight?: number
  isRecommend?: boolean
  sort?: number
  status?: number
  images?: string[]
  attributes?: { name: string; value: string; sort?: number }[]
}

export interface SkuInput {
  specJson: SpecJson
  specText?: string
  image?: string
  price: number
  marketPrice?: number
  costPrice?: number
  stock?: number
  warnStock?: number
  weight?: number
  status?: number
}

type ProductRow = Product & {
  skus?: ProductSku[]
  imageList?: ProductImage[]
  attributes?: ProductAttribute[]
  category?: Category | null
  brand?: Brand | null
}

export function toAdminSkuDto(sku: ProductSku) {
  return {
    id: Number(sku.id),
    productId: Number(sku.productId),
    skuCode: sku.skuCode,
    spec: sku.specJson,
    specText: sku.specText ?? '',
    image: sku.image ?? '',
    price: Number(sku.price),
    marketPrice: Number(sku.marketPrice ?? 0),
    costPrice: Number(sku.costPrice ?? 0),
    stock: sku.stock,
    lockedStock: sku.lockedStock,
    warnStock: sku.warnStock,
    weight: Number(sku.weight),
    status: sku.status,
  }
}

function toAdminProductDto(p: ProductRow) {
  return {
    id: Number(p.id),
    name: p.name,
    subtitle: p.subtitle ?? '',
    categoryId: Number(p.categoryId),
    categoryName: p.category?.name ?? '',
    brandId: p.brandId ? Number(p.brandId) : null,
    brandName: p.brand?.name ?? '',
    mainImage: p.mainImage ?? '',
    images: (p.imageList ?? []).map((i) => i.image),
    detailHtml: p.detailHtml ?? '',
    unit: p.unit,
    weight: Number(p.weight),
    priceMin: Number(p.priceMin),
    priceMax: Number(p.priceMax),
    totalStock: p.totalStock,
    salesCount: p.salesCount,
    commentCount: p.commentCount,
    avgScore: Number(p.avgScore),
    isRecommend: Boolean(p.isRecommend),
    sort: p.sort,
    status: p.status,
    createdAt: formatDate(p.createdAt),
    skus: (p.skus ?? []).map(toAdminSkuDto),
    attributes: (p.attributes ?? []).map((a) => ({ name: a.name, value: a.value, sort: a.sort })),
  }
}

/* --------------------------------- 商品 SPU -------------------------------- */

export async function listProducts(query: AdminProductQuery) {
  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10))
  const conditions: WhereOptions[] = []
  if (query.status !== undefined) conditions.push({ status: query.status })
  if (query.categoryId) conditions.push({ categoryId: query.categoryId })
  if (query.keyword) conditions.push({ name: { [Op.like]: `%${query.keyword}%` } } as WhereOptions)
  const where: WhereOptions = conditions.length ? { [Op.and]: conditions } : {}

  const { rows, count } = await Product.findAndCountAll({
    where,
    include: adminInclude,
    order: [
      ['sort', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    distinct: true,
  })

  return {
    list: rows.map((p) => toAdminProductDto(p as unknown as ProductRow)),
    page,
    pageSize,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  }
}

export async function getProduct(id: number) {
  const product = await Product.findByPk(id, { include: adminInclude })
  if (!product) throw AppError.notFound('商品不存在')
  return toAdminProductDto(product as unknown as ProductRow)
}

export async function createProduct(input: ProductInput) {
  return sequelize.transaction(async (transaction) => {
    const product = await Product.create(
      {
        name: input.name,
        subtitle: input.subtitle ?? '',
        categoryId: input.categoryId,
        brandId: input.brandId ?? null,
        mainImage: input.mainImage ?? '',
        detailHtml: input.detailHtml ?? '',
        unit: input.unit ?? '件',
        weight: (input.weight ?? 0).toFixed(2),
        isRecommend: input.isRecommend ? 1 : 0,
        sort: input.sort ?? 0,
        status: input.status ?? 0,
      },
      { transaction },
    )
    await replaceImages(Number(product.id), input.images, transaction)
    await replaceAttributes(Number(product.id), input.attributes, transaction)
    const full = await Product.findByPk(product.id, { include: adminInclude, transaction })
    return toAdminProductDto(full as unknown as ProductRow)
  })
}

export async function updateProduct(id: number, input: Partial<ProductInput>) {
  return sequelize.transaction(async (transaction) => {
    const product = await Product.findByPk(id, { transaction })
    if (!product) throw AppError.notFound('商品不存在')
    if (input.name !== undefined) product.name = input.name
    if (input.subtitle !== undefined) product.subtitle = input.subtitle
    if (input.categoryId !== undefined) product.categoryId = input.categoryId
    if (input.brandId !== undefined) product.brandId = input.brandId
    if (input.mainImage !== undefined) product.mainImage = input.mainImage
    if (input.detailHtml !== undefined) product.detailHtml = input.detailHtml
    if (input.unit !== undefined) product.unit = input.unit
    if (input.weight !== undefined) product.weight = input.weight.toFixed(2)
    if (input.isRecommend !== undefined) product.isRecommend = input.isRecommend ? 1 : 0
    if (input.sort !== undefined) product.sort = input.sort
    if (input.status !== undefined) product.status = input.status
    await product.save({ transaction })

    if (input.images) await replaceImages(id, input.images, transaction)
    if (input.attributes) await replaceAttributes(id, input.attributes, transaction)

    const full = await Product.findByPk(id, { include: adminInclude, transaction })
    return toAdminProductDto(full as unknown as ProductRow)
  })
}

export async function deleteProduct(id: number) {
  const product = await Product.findByPk(id)
  if (!product) throw AppError.notFound('商品不存在')
  await product.destroy()
}

export async function setProductStatus(id: number, status: 0 | 1) {
  const product = await Product.findByPk(id)
  if (!product) throw AppError.notFound('商品不存在')
  product.status = status
  await product.save()
  return { id: Number(product.id), status: product.status }
}

/* -------------------------------- 批量操作 -------------------------------- */

/** 批量上下架：下架后用户端不可见 */
export async function batchSetStatus(ids: number[], status: 0 | 1) {
  if (!ids.length) throw new AppError('请先选择商品', ERR.PARAM)
  const [affected] = await Product.update({ status }, { where: { id: { [Op.in]: ids } } })
  return { affected, status }
}

/** 批量删除：逐个删除，单个失败不影响其它（返回失败明细） */
export async function batchDelete(ids: number[]) {
  if (!ids.length) throw new AppError('请先选择商品', ERR.PARAM)
  const failed: { id: number; reason: string }[] = []
  let deleted = 0

  for (const id of ids) {
    try {
      const product = await Product.findByPk(id)
      if (!product) throw new Error('商品不存在')
      await product.destroy()
      deleted += 1
    } catch (e) {
      failed.push({ id, reason: e instanceof Error ? e.message : '删除失败' })
    }
  }

  if (deleted === 0) throw new AppError(`全部 ${ids.length} 个商品删除失败`, ERR.PARAM)
  return { deleted, failed }
}

async function replaceImages(
  productId: number,
  images: string[] | undefined,
  transaction: import('sequelize').Transaction,
) {
  if (!images) return
  await ProductImage.destroy({ where: { productId }, transaction })
  for (let i = 0; i < images.length; i++) {
    await ProductImage.create({ productId, image: images[i], sort: i }, { transaction })
  }
}

async function replaceAttributes(
  productId: number,
  attributes: { name: string; value: string; sort?: number }[] | undefined,
  transaction: import('sequelize').Transaction,
) {
  if (!attributes) return
  await ProductAttribute.destroy({ where: { productId }, transaction })
  for (let i = 0; i < attributes.length; i++) {
    const a = attributes[i]
    await ProductAttribute.create(
      { productId, name: a.name, value: a.value, sort: a.sort ?? i },
      { transaction },
    )
  }
}

/* ---------------------------------- SKU ----------------------------------- */

export async function listSkus(productId: number) {
  const rows = await ProductSku.findAll({ where: { productId }, order: [['id', 'ASC']] })
  return rows.map(toAdminSkuDto)
}

export async function createSku(productId: number, input: SkuInput) {
  return sequelize.transaction(async (transaction) => {
    const product = await Product.findByPk(productId, { transaction })
    if (!product) throw AppError.notFound('商品不存在')
    const count = await ProductSku.count({ where: { productId }, transaction })
    const sku = await ProductSku.create(
      {
        productId,
        skuCode: `P${productId}-${String(count + 1).padStart(3, '0')}`,
        specJson: input.specJson,
        specText: input.specText ?? Object.values(input.specJson).join(' / '),
        image: input.image ?? product.mainImage ?? '',
        price: input.price.toFixed(2),
        marketPrice: (input.marketPrice ?? 0).toFixed(2),
        costPrice: (input.costPrice ?? 0).toFixed(2),
        stock: input.stock ?? 0,
        warnStock: input.warnStock ?? 10,
        weight: (input.weight ?? 0).toFixed(2),
        status: input.status ?? 1,
      },
      { transaction },
    )
    await syncProductAggregate(productId, transaction)
    return toAdminSkuDto(sku)
  })
}

export async function updateSku(id: number, input: Partial<SkuInput>) {
  return sequelize.transaction(async (transaction) => {
    const sku = await ProductSku.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE })
    if (!sku) throw AppError.notFound('SKU 不存在')
    if (input.specJson) {
      sku.specJson = input.specJson
      sku.specText = input.specText ?? Object.values(input.specJson).join(' / ')
    } else if (input.specText !== undefined) {
      sku.specText = input.specText
    }
    if (input.image !== undefined) sku.image = input.image
    if (input.price !== undefined) sku.price = input.price.toFixed(2)
    if (input.marketPrice !== undefined) sku.marketPrice = input.marketPrice.toFixed(2)
    if (input.costPrice !== undefined) sku.costPrice = input.costPrice.toFixed(2)
    if (input.stock !== undefined) sku.stock = input.stock
    if (input.warnStock !== undefined) sku.warnStock = input.warnStock
    if (input.weight !== undefined) sku.weight = input.weight.toFixed(2)
    if (input.status !== undefined) sku.status = input.status
    await sku.save({ transaction })
    await syncProductAggregate(Number(sku.productId), transaction)
    return toAdminSkuDto(sku)
  })
}

export async function deleteSku(id: number) {
  return sequelize.transaction(async (transaction) => {
    const sku = await ProductSku.findByPk(id, { transaction })
    if (!sku) throw AppError.notFound('SKU 不存在')
    const productId = Number(sku.productId)
    await sku.destroy({ transaction })
    await syncProductAggregate(productId, transaction)
  })
}

function cartesian(groups: { name: string; values: string[] }[]): SpecJson[] {
  return groups.reduce<SpecJson[]>((acc, g) => {
    const next: SpecJson[] = []
    for (const combo of acc) for (const v of g.values) next.push({ ...combo, [g.name]: v })
    return next
  }, [{}])
}

/** 按规格组笛卡尔积批量生成 SKU，已存在的规格组合自动跳过（幂等） */
export async function generateSkus(
  productId: number,
  groups: { name: string; values: string[] }[],
  defaults: Partial<Omit<SkuInput, 'specJson'>> = {},
) {
  return sequelize.transaction(async (transaction) => {
    const product = await Product.findByPk(productId, { transaction })
    if (!product) throw AppError.notFound('商品不存在')
    const combos = cartesian(groups.filter((g) => g.name && g.values.length))
    if (!combos.length) throw new AppError('请先定义规格组与规格值', ERR.PARAM)

    const existing = await ProductSku.findAll({ where: { productId }, transaction })
    const signature = (spec: SpecJson) =>
      JSON.stringify(Object.keys(spec).sort().map((k) => [k, spec[k]]))
    const existSet = new Set(existing.map((s) => signature(s.specJson)))

    let seq = existing.length
    for (const combo of combos) {
      if (existSet.has(signature(combo))) continue
      seq += 1
      await ProductSku.create(
        {
          productId,
          skuCode: `P${productId}-${String(seq).padStart(3, '0')}`,
          specJson: combo,
          specText: Object.values(combo).join(' / '),
          image: defaults.image ?? product.mainImage ?? '',
          price: (defaults.price ?? Number(product.priceMin) ?? 0).toFixed(2),
          marketPrice: (defaults.marketPrice ?? 0).toFixed(2),
          costPrice: (defaults.costPrice ?? 0).toFixed(2),
          stock: defaults.stock ?? 0,
          warnStock: defaults.warnStock ?? 10,
          weight: (defaults.weight ?? 0).toFixed(2),
          status: defaults.status ?? 1,
        },
        { transaction },
      )
    }
    await syncProductAggregate(productId, transaction)
    const rows = await ProductSku.findAll({ where: { productId }, order: [['id', 'ASC']], transaction })
    return rows.map(toAdminSkuDto)
  })
}

/** 库存调整：写库存流水并同步商品聚合 */
export async function adjustStock(
  skuId: number,
  input: { change: number; remark?: string },
  operator: string,
) {
  return sequelize.transaction(async (transaction) => {
    const sku = await ProductSku.findByPk(skuId, { transaction, lock: transaction.LOCK.UPDATE })
    if (!sku) throw AppError.notFound('SKU 不存在')
    const before = sku.stock
    sku.stock = Math.max(0, sku.stock + input.change)
    await sku.save({ transaction })
    await InventoryLog.create(
      {
        skuId,
        type: INVENTORY_TYPE.MANUAL_ADJUST,
        change: input.change,
        before,
        after: sku.stock,
        operator,
        remark: input.remark ?? '后台库存调整',
      },
      { transaction },
    )
    await syncProductAggregate(Number(sku.productId), transaction)
    return toAdminSkuDto(sku)
  })
}

/* --------------------------------- 分类 ----------------------------------- */

export interface CategoryNode {
  id: number
  parentId: number
  name: string
  level: number
  icon: string
  sort: number
  status: number
  children: CategoryNode[]
}

export async function listCategoryTree() {
  const rows = await Category.findAll({
    order: [
      ['sort', 'ASC'],
      ['id', 'ASC'],
    ],
  })
  const nodes = new Map<number, CategoryNode>()
  rows.forEach((c) => {
    nodes.set(Number(c.id), {
      id: Number(c.id),
      parentId: Number(c.parentId),
      name: c.name,
      level: c.level,
      icon: c.icon ?? '',
      sort: c.sort,
      status: c.status,
      children: [],
    })
  })
  const roots: CategoryNode[] = []
  nodes.forEach((node) => {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  })
  return roots
}

export async function createCategory(input: {
  name: string
  parentId?: number
  icon?: string
  sort?: number
  status?: number
}) {
  const parentId = input.parentId ?? 0
  let level = 1
  if (parentId) {
    const parent = await Category.findByPk(parentId)
    if (!parent) throw AppError.notFound('父分类不存在')
    level = parent.level + 1
  }
  const row = await Category.create({
    name: input.name,
    parentId,
    level,
    icon: input.icon ?? null,
    sort: input.sort ?? 0,
    status: input.status ?? 1,
  })
  return { id: Number(row.id) }
}

export async function updateCategory(
  id: number,
  input: Partial<{ name: string; icon: string; sort: number; status: number }>,
) {
  const row = await Category.findByPk(id)
  if (!row) throw AppError.notFound('分类不存在')
  if (input.name !== undefined) row.name = input.name
  if (input.icon !== undefined) row.icon = input.icon
  if (input.sort !== undefined) row.sort = input.sort
  if (input.status !== undefined) row.status = input.status
  await row.save()
  return { id: Number(row.id) }
}

export async function deleteCategory(id: number) {
  const childCount = await Category.count({ where: { parentId: id } })
  if (childCount) throw new AppError('请先删除子分类', ERR.PARAM)
  const productCount = await Product.count({ where: { categoryId: id } })
  if (productCount) throw new AppError('该分类下仍有商品，无法删除', ERR.PARAM)
  const row = await Category.findByPk(id)
  if (!row) throw AppError.notFound('分类不存在')
  await row.destroy()
}

/* --------------------------------- 品牌 ----------------------------------- */

export async function listBrands() {
  const rows = await Brand.findAll({
    order: [
      ['sort', 'ASC'],
      ['id', 'ASC'],
    ],
  })
  return rows.map((b) => ({
    id: Number(b.id),
    name: b.name,
    logo: b.logo ?? '',
    sort: b.sort,
    status: b.status,
  }))
}

export async function createBrand(input: { name: string; logo?: string; sort?: number; status?: number }) {
  const row = await Brand.create({
    name: input.name,
    logo: input.logo ?? null,
    sort: input.sort ?? 0,
    status: input.status ?? 1,
  })
  return { id: Number(row.id) }
}

export async function updateBrand(
  id: number,
  input: Partial<{ name: string; logo: string; sort: number; status: number }>,
) {
  const row = await Brand.findByPk(id)
  if (!row) throw AppError.notFound('品牌不存在')
  if (input.name !== undefined) row.name = input.name
  if (input.logo !== undefined) row.logo = input.logo
  if (input.sort !== undefined) row.sort = input.sort
  if (input.status !== undefined) row.status = input.status
  await row.save()
  return { id: Number(row.id) }
}

export async function deleteBrand(id: number) {
  const used = await Product.count({ where: { brandId: id } })
  if (used) throw new AppError('该品牌下仍有商品，无法删除', ERR.PARAM)
  const row = await Brand.findByPk(id)
  if (!row) throw AppError.notFound('品牌不存在')
  await row.destroy()
}

/* -------------------------------- 规格模板 -------------------------------- */

export async function listSpecGroups() {
  const groups = await SpecGroup.findAll({
    include: [{ model: SpecValue, as: 'values' }],
    order: [
      ['sort', 'ASC'],
      ['id', 'ASC'],
    ],
  })
  return groups.map((g) => ({
    id: Number(g.id),
    name: g.name,
    sort: g.sort,
    values: (g.get('values') as SpecValue[] | undefined)?.map((v) => v.value) ?? [],
  }))
}

export async function createSpecGroup(input: { name: string; sort?: number; values?: string[] }) {
  return sequelize.transaction(async (transaction) => {
    const group = await SpecGroup.create(
      { name: input.name, sort: input.sort ?? 0 },
      { transaction },
    )
    for (let i = 0; i < (input.values ?? []).length; i++) {
      await SpecValue.create(
        { groupId: Number(group.id), value: input.values![i], sort: i },
        { transaction },
      )
    }
    return { id: Number(group.id) }
  })
}

export async function updateSpecGroup(
  id: number,
  input: Partial<{ name: string; sort: number; values: string[] }>,
) {
  return sequelize.transaction(async (transaction) => {
    const group = await SpecGroup.findByPk(id, { transaction })
    if (!group) throw AppError.notFound('规格组不存在')
    if (input.name !== undefined) group.name = input.name
    if (input.sort !== undefined) group.sort = input.sort
    await group.save({ transaction })
    if (input.values) {
      await SpecValue.destroy({ where: { groupId: id }, transaction })
      for (let i = 0; i < input.values.length; i++) {
        await SpecValue.create({ groupId: id, value: input.values[i], sort: i }, { transaction })
      }
    }
    return { id: Number(group.id) }
  })
}

export async function deleteSpecGroup(id: number) {
  return sequelize.transaction(async (transaction) => {
    const group = await SpecGroup.findByPk(id, { transaction })
    if (!group) throw AppError.notFound('规格组不存在')
    await SpecValue.destroy({ where: { groupId: id }, transaction })
    await group.destroy({ transaction })
  })
}

/* ------------------------------ 商品导入导出 ------------------------------- */

export const PRODUCT_EXPORT_HEADER = [
  'ID',
  '商品名称',
  '分类',
  '品牌',
  '最低售价',
  '总库存',
  '销量',
  '状态',
  '创建时间',
]

export const PRODUCT_IMPORT_HEADER = [
  '商品名称',
  '分类名称',
  '品牌名称',
  '副标题',
  '单位',
  '重量kg',
  '主图URL',
  '售价',
  '划线价',
  '库存',
  '状态(1上架/0下架)',
]

/**
 * 导入模板（含两行示例）。
 * 分类/品牌按「名称」填写，也兼容直接填 ID；品牌可留空。
 */
export function productImportTemplate(): string {
  return toCsv(PRODUCT_IMPORT_HEADER, [
    ['示例商品A', '手机通讯', '极光科技', '轻盈透气，日常通勤首选', '件', '0.5', '', '199.00', '259.00', '100', '1'],
    ['示例商品B', '运动鞋靴', '', '限时特惠', '件', '0.3', '', '89.00', '129.00', '50', '0'],
  ])
}

/** 导出商品清单（上限 5000 条） */
export async function exportProducts(query: AdminProductQuery = {}) {
  const conditions: WhereOptions[] = []
  if (query.keyword) conditions.push({ name: { [Op.like]: `%${query.keyword}%` } } as WhereOptions)
  if (query.categoryId) conditions.push({ categoryId: query.categoryId })
  if (query.status !== undefined) conditions.push({ status: query.status })
  const where: WhereOptions = conditions.length ? { [Op.and]: conditions } : {}

  const rows = await Product.findAll({
    where,
    include: [
      { model: ProductSku, as: 'skus' },
      { model: Category, as: 'category' },
      { model: Brand, as: 'brand' },
    ],
    order: [['id', 'DESC']],
    limit: 5000,
  })

  return rows.map((p) => {
    const skus = (p.get('skus') as ProductSku[] | undefined) ?? []
    return {
      id: Number(p.id),
      name: p.name,
      categoryName: (p.get('category') as Category | null)?.name ?? '',
      brandName: (p.get('brand') as Brand | null)?.name ?? '',
      price: skus.length ? Math.min(...skus.map((s) => Number(s.price))) : Number(p.priceMin),
      stock: skus.reduce((sum, s) => sum + s.stock, 0),
      salesCount: p.salesCount,
      status: p.status,
      createdAt: formatDate(p.createdAt),
    }
  })
}

export interface ProductImportResult {
  total: number
  created: number
  updated: number
  failed: { row: number; reason: string }[]
}

/**
 * 导入商品：按「商品名称」判定新增或更新；新增时同时建立一条默认 SKU。
 * 逐行容错，单行失败不影响其它行。
 */
export async function importProducts(csvText: string, operator: string): Promise<ProductImportResult> {
  const rows = parseCsv(csvText)
  if (rows.length < 2) throw new AppError('CSV 内容为空或缺少数据行', ERR.PARAM)

  const body = rows.slice(1)
  const result: ProductImportResult = { total: body.length, created: 0, updated: 0, failed: [] }

  const [categories, brands] = await Promise.all([
    Category.findAll({ attributes: ['id', 'name'] }),
    Brand.findAll({ attributes: ['id', 'name'] }),
  ])
  const categoryById = new Map(categories.map((c) => [Number(c.id), Number(c.id)]))
  const categoryByName = new Map(categories.map((c) => [c.name, Number(c.id)]))
  const brandById = new Map(brands.map((b) => [Number(b.id), Number(b.id)]))
  const brandByName = new Map(brands.map((b) => [b.name, Number(b.id)]))

  /** 分类/品牌：优先按名称解析，纯数字时兼容按 ID 解析 */
  const resolveCategory = (raw: string | undefined): number | null => {
    const value = (raw ?? '').trim()
    if (!value) return null
    if (/^\d+$/.test(value)) return categoryById.get(Number(value)) ?? categoryByName.get(value) ?? null
    return categoryByName.get(value) ?? null
  }
  const resolveBrand = (raw: string | undefined): number | null => {
    const value = (raw ?? '').trim()
    if (!value) return null
    if (/^\d+$/.test(value)) return brandById.get(Number(value)) ?? brandByName.get(value) ?? null
    return brandByName.get(value) ?? null
  }

  for (let i = 0; i < body.length; i += 1) {
    const lineNo = i + 2
    const cells = body[i]
    const [
      name,
      categoryIdRaw,
      brandIdRaw,
      subtitle,
      unit,
      weightRaw,
      mainImage,
      priceRaw,
      marketRaw,
      stockRaw,
      statusRaw,
    ] = cells
    const rowName = (name ?? '').trim()

    try {
      if (!rowName) throw new Error('商品名称为空')
      const categoryId = resolveCategory(categoryIdRaw)
      if (!categoryId) {
        throw new Error(`分类「${(categoryIdRaw ?? '').trim() || '空'}」不存在，请填分类名称或 ID`)
      }
      const price = Number(priceRaw)
      if (!Number.isFinite(price) || price < 0) throw new Error(`售价「${priceRaw ?? ''}」非法`)

      const base = {
        name: rowName,
        subtitle: (subtitle ?? '').trim(),
        categoryId,
        brandId: resolveBrand(brandIdRaw),
        unit: (unit ?? '').trim() || '件',
        weight: (Number(weightRaw) || 0).toFixed(2),
        mainImage: (mainImage ?? '').trim(),
        status: String(statusRaw ?? '').trim() === '1' ? 1 : 0,
      }

      const existing = await Product.findOne({ where: { name: rowName } })
      if (existing) {
        await existing.update(base)
        result.updated += 1
        continue
      }

      await sequelize.transaction(async (transaction) => {
        const product = await Product.create(
          { ...base, priceMin: price.toFixed(2), priceMax: price.toFixed(2) },
          { transaction },
        )
        const stock = Math.max(0, Number(stockRaw) || 0)
        const sku = await ProductSku.create(
          {
            productId: Number(product.id),
            skuCode: `IMP${Date.now()}${String(i).padStart(3, '0')}`,
            specJson: {},
            specText: '默认',
            image: base.mainImage,
            price: price.toFixed(2),
            marketPrice: (Number(marketRaw) || price).toFixed(2),
            stock,
            status: 1,
          },
          { transaction },
        )
        await syncProductAggregate(Number(product.id), transaction)
        if (stock > 0) {
          await InventoryLog.create(
            {
              skuId: Number(sku.id),
              type: INVENTORY_TYPE.IN,
              change: stock,
              before: 0,
              after: stock,
              operator,
              remark: `商品导入初始库存（${rowName}）`,
            },
            { transaction },
          )
        }
      })
      result.created += 1
    } catch (e) {
      result.failed.push({ row: lineNo, reason: e instanceof Error ? e.message : '未知错误' })
    }
  }

  if (result.total > 0 && result.failed.length === result.total) {
    throw new AppError(
      `全部 ${result.total} 行导入失败：第 ${result.failed[0].row} 行 ${result.failed[0].reason}`,
      ERR.PARAM,
    )
  }
  return result
}
