import { Op, type Transaction } from 'sequelize'
import { sequelize } from '../config/database'
import { HomeFloor, HomeFloorProduct, Product } from '../models'
import { AppError } from '../utils/errors'
import { ERR } from '../constants'

export interface FloorInput {
  title: string
  subtitle?: string
  categoryId?: number | null
  sort?: number
  status?: number
  productIds?: number[]
}

export interface FloorConfig {
  title: string
  subtitle: string
  categoryId: number | null
  productIds: number[]
}

/** 校验并去重选品 ID：必须都是真实存在的商品 */
async function normalizeProductIds(ids: number[] | undefined, transaction?: Transaction): Promise<number[]> {
  if (!ids?.length) return []
  const unique = [...new Set(ids.map(Number).filter((id) => Number.isInteger(id) && id > 0))]
  if (!unique.length) return []
  const count = await Product.count({ where: { id: { [Op.in]: unique } }, transaction })
  if (count !== unique.length) throw new AppError('选品中包含不存在的商品', ERR.PARAM)
  return unique.slice(0, 20)
}

async function replaceFloorProducts(
  floorId: number,
  productIds: number[],
  transaction: Transaction,
) {
  await HomeFloorProduct.destroy({ where: { floorId }, transaction })
  if (!productIds.length) return
  await HomeFloorProduct.bulkCreate(
    productIds.map((productId, index) => ({ floorId, productId, sort: index })),
    { transaction },
  )
}

/** 后台：楼层列表（含选品名称/主图，便于编辑回显） */
export async function listFloors() {
  const floors = await HomeFloor.findAll({
    order: [
      ['sort', 'ASC'],
      ['id', 'ASC'],
    ],
  })
  if (!floors.length) return []

  const items = await HomeFloorProduct.findAll({
    order: [
      ['floorId', 'ASC'],
      ['sort', 'ASC'],
    ],
  })
  const productIds = [...new Set(items.map((item) => Number(item.productId)))]
  const products = productIds.length
    ? await Product.findAll({
        where: { id: { [Op.in]: productIds } },
        attributes: ['id', 'name', 'mainImage'],
      })
    : []
  const productMap = new Map(products.map((p) => [Number(p.id), p]))

  return floors.map((floor) => ({
    id: Number(floor.id),
    title: floor.title,
    subtitle: floor.subtitle ?? '',
    categoryId: floor.categoryId ? Number(floor.categoryId) : null,
    sort: floor.sort,
    status: floor.status,
    products: items
      .filter((item) => Number(item.floorId) === Number(floor.id))
      .map((item) => {
        const product = productMap.get(Number(item.productId))
        return {
          id: Number(item.productId),
          name: product?.name ?? '商品已删除',
          image: product?.mainImage ?? '',
        }
      }),
  }))
}

/** 后台：新增楼层 */
export async function createFloor(input: FloorInput) {
  return sequelize.transaction(async (transaction) => {
    const productIds = await normalizeProductIds(input.productIds, transaction)
    const floor = await HomeFloor.create(
      {
        title: input.title,
        subtitle: input.subtitle ?? null,
        categoryId: input.categoryId ?? null,
        sort: input.sort ?? 0,
        status: input.status ?? 1,
      },
      { transaction },
    )
    await replaceFloorProducts(Number(floor.id), productIds, transaction)
    return {
      id: Number(floor.id),
      title: floor.title,
      subtitle: floor.subtitle ?? '',
      categoryId: floor.categoryId ? Number(floor.categoryId) : null,
      sort: floor.sort,
      status: floor.status,
      products: productIds.map((id) => ({ id, name: '', image: '' })),
    }
  })
}

/** 后台：编辑楼层 */
export async function updateFloor(id: number, input: Partial<FloorInput>) {
  return sequelize.transaction(async (transaction) => {
    const floor = await HomeFloor.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE })
    if (!floor) throw AppError.notFound('推荐楼层不存在')
    const productIds =
      input.productIds !== undefined
        ? await normalizeProductIds(input.productIds, transaction)
        : null

    if (input.title !== undefined) floor.title = input.title
    if (input.subtitle !== undefined) floor.subtitle = input.subtitle
    if (input.categoryId !== undefined) floor.categoryId = input.categoryId
    if (input.sort !== undefined) floor.sort = input.sort
    if (input.status !== undefined) floor.status = input.status
    await floor.save({ transaction })
    if (productIds) await replaceFloorProducts(id, productIds, transaction)

    return {
      id: Number(floor.id),
      title: floor.title,
      subtitle: floor.subtitle ?? '',
      categoryId: floor.categoryId ? Number(floor.categoryId) : null,
      sort: floor.sort,
      status: floor.status,
      products: productIds
        ? productIds.map((pid) => ({ id: pid, name: '', image: '' }))
        : undefined,
    }
  })
}

/** 后台：删除楼层 */
export async function deleteFloor(id: number) {
  await sequelize.transaction(async (transaction) => {
    const floor = await HomeFloor.findByPk(id, { transaction })
    if (!floor) throw AppError.notFound('推荐楼层不存在')
    await HomeFloorProduct.destroy({ where: { floorId: id }, transaction })
    await floor.destroy({ transaction })
  })
}

/**
 * 客户端：生效中的楼层配置（只返回结构与商品 ID）。
 * 商品详情由 productService 用统一 DTO 装载，避免此处重复维护商品关联。
 */
export async function getActiveFloorConfigs(): Promise<FloorConfig[]> {
  const floors = await HomeFloor.findAll({
    where: { status: 1 },
    order: [
      ['sort', 'ASC'],
      ['id', 'ASC'],
    ],
  })
  if (!floors.length) return []

  const items = await HomeFloorProduct.findAll({
    where: { floorId: { [Op.in]: floors.map((f) => Number(f.id)) } },
    order: [['sort', 'ASC']],
  })
  return floors.map((floor) => ({
    title: floor.title,
    subtitle: floor.subtitle ?? '',
    categoryId: floor.categoryId ? Number(floor.categoryId) : null,
    productIds: items
      .filter((item) => Number(item.floorId) === Number(floor.id))
      .map((item) => Number(item.productId)),
  }))
}
