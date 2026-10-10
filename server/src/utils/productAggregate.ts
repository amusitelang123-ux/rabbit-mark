import type { Transaction } from 'sequelize'
import { Product, ProductSku } from '../models'

/**
 * 同步商品冗余聚合字段（priceMin / priceMax / totalStock），可顺带累加销量。
 * SKU 增删改、库存调整、支付成功扣减后都应调用，保证列表页排序与展示准确。
 */
export async function syncProductAggregate(
  productId: number,
  transaction: Transaction,
  salesDelta = 0,
): Promise<void> {
  const skus = await ProductSku.findAll({ where: { productId, status: 1 }, transaction })
  const product = await Product.findByPk(productId, { transaction })
  if (!product) return
  const prices = skus.map((s) => Number(s.price))
  product.priceMin = (prices.length ? Math.min(...prices) : 0).toFixed(2)
  product.priceMax = (prices.length ? Math.max(...prices) : 0).toFixed(2)
  product.totalStock = skus.reduce((sum, s) => sum + s.stock, 0)
  if (salesDelta) product.salesCount = Math.max(0, product.salesCount + salesDelta)
  await product.save({ transaction })
}
