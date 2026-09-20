import { Coupon, UserCoupon } from '../models'
import { AppError } from '../utils/errors'
import { ERR } from '../constants'
import { generateNo } from '../utils/helpers'
import { toCouponDto, toUserCouponDto } from '../utils/serializers'

export async function couponCenter() {
  const rows = await Coupon.findAll({ where: { status: 1 }, order: [['id', 'ASC']] })
  return rows.map(toCouponDto)
}

export async function receiveCoupon(userId: number, couponId: number) {
  const coupon = await Coupon.findOne({ where: { id: couponId, status: 1 } })
  if (!coupon) throw new AppError('优惠券不存在或已停用', ERR.COUPON_INVALID)

  const received = await UserCoupon.count({ where: { userId, couponId } })
  if (received >= coupon.perUserLimit) throw new AppError('已达领取上限', ERR.COUPON_INVALID)
  if (coupon.totalCount > 0 && coupon.receivedCount >= coupon.totalCount) {
    throw new AppError('优惠券已领完', ERR.COUPON_INVALID)
  }

  const expireAt =
    coupon.validType === 2 && coupon.validDays
      ? new Date(Date.now() + coupon.validDays * 24 * 60 * 60 * 1000)
      : coupon.validEnd

  const row = await UserCoupon.create({
    userId,
    couponId: Number(coupon.id),
    couponCode: generateNo('CP'),
    status: 0,
    receivedAt: new Date(),
    expireAt,
  })
  coupon.receivedCount += 1
  await coupon.save()
  return { id: Number(row.id), couponId: Number(coupon.id) }
}

export async function myCoupons(userId: number) {
  const rows = await UserCoupon.findAll({
    where: { userId },
    include: [{ model: Coupon, as: 'coupon' }],
    order: [['id', 'DESC']],
  })
  return rows.map((r) => toUserCouponDto(r as unknown as Parameters<typeof toUserCouponDto>[0]))
}
