import { Op } from 'sequelize'
import { Cart, Product, ProductSku } from '../models'
import { AppError } from '../utils/errors'
import { ERR } from '../constants'
import { toCartDto } from '../utils/serializers'

const cartInclude = [
  { model: Product, as: 'product' },
  { model: ProductSku, as: 'sku' },
]

export async function getCart(userId: number) {
  const rows = await Cart.findAll({
    where: { userId },
    include: cartInclude,
    order: [['id', 'DESC']],
  })
  return rows.map((r) => toCartDto(r as unknown as Parameters<typeof toCartDto>[0]))
}

export async function addToCart(
  userId: number,
  input: { productId: number; skuId: number; quantity: number },
) {
  const sku = await ProductSku.findOne({ where: { id: input.skuId, productId: input.productId } })
  if (!sku || sku.status !== 1) throw new AppError('商品规格不可用', ERR.PRODUCT_NOT_FOUND)
  const quantity = Math.max(1, input.quantity)
  if (sku.stock < quantity) throw new AppError('库存不足', ERR.STOCK_NOT_ENOUGH)

  const existing = await Cart.findOne({ where: { userId, skuId: input.skuId } })
  if (existing) {
    existing.quantity += quantity
    existing.selected = 1
    await existing.save()
  } else {
    await Cart.create({
      userId,
      productId: input.productId,
      skuId: input.skuId,
      quantity,
      selected: 1,
    })
  }
  // 加购榜（A-52）：累计加购件数，失败不影响加购主流程
  await Product.increment('cartAddCount', {
    by: quantity,
    where: { id: input.productId },
  }).catch(() => undefined)
  return getCart(userId)
}

export async function updateCartItem(
  userId: number,
  id: number,
  input: { quantity?: number; selected?: boolean },
) {
  const row = await Cart.findOne({ where: { id, userId } })
  if (!row) throw AppError.notFound('购物车记录不存在')
  if (input.quantity !== undefined) row.quantity = Math.max(1, input.quantity)
  if (input.selected !== undefined) row.selected = input.selected ? 1 : 0
  await row.save()
  return getCart(userId)
}

export async function selectAll(userId: number, selected: boolean) {
  await Cart.update({ selected: selected ? 1 : 0 }, { where: { userId } })
  return getCart(userId)
}

export async function removeCartItems(userId: number, ids: number[]) {
  await Cart.destroy({ where: { userId, id: { [Op.in]: ids } } })
  return getCart(userId)
}
