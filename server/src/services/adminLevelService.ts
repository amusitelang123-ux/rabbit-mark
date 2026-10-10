import { fn, col } from 'sequelize'
import { User, UserLevel } from '../models'
import { AppError } from '../utils/errors'

export interface LevelInput {
  name: string
  minSpent?: number
  discountRate?: number
  icon?: string
  sort?: number
  status?: number
}

export async function listLevels() {
  const [levels, counts] = await Promise.all([
    UserLevel.findAll({
      order: [
        ['sort', 'ASC'],
        ['id', 'ASC'],
      ],
    }),
    User.findAll({
      attributes: ['levelId', [fn('COUNT', col('id')), 'cnt']],
      group: ['levelId'],
      raw: true,
    }) as unknown as Promise<{ levelId: number | null; cnt: string }[]>,
  ])

  const countMap = new Map(counts.map((c) => [Number(c.levelId), Number(c.cnt)]))

  return levels.map((l) => ({
    id: Number(l.id),
    name: l.name,
    minSpent: Number(l.minSpent),
    discountRate: Number(l.discountRate),
    icon: l.icon ?? '',
    sort: l.sort,
    status: l.status,
    userCount: countMap.get(Number(l.id)) ?? 0,
  }))
}

export async function createLevel(input: LevelInput) {
  const level = await UserLevel.create({
    name: input.name,
    minSpent: (input.minSpent ?? 0).toFixed(2),
    discountRate: (input.discountRate ?? 1).toFixed(2),
    icon: input.icon ?? null,
    sort: input.sort ?? 0,
    status: input.status ?? 1,
  })
  return { id: Number(level.id) }
}

export async function updateLevel(id: number, input: Partial<LevelInput>) {
  const level = await UserLevel.findByPk(id)
  if (!level) throw AppError.notFound('会员等级不存在')
  if (input.name !== undefined) level.name = input.name
  if (input.minSpent !== undefined) level.minSpent = input.minSpent.toFixed(2)
  if (input.discountRate !== undefined) level.discountRate = input.discountRate.toFixed(2)
  if (input.icon !== undefined) level.icon = input.icon
  if (input.sort !== undefined) level.sort = input.sort
  if (input.status !== undefined) level.status = input.status
  await level.save()
  return { id: Number(level.id) }
}

export async function deleteLevel(id: number) {
  const level = await UserLevel.findByPk(id)
  if (!level) throw AppError.notFound('会员等级不存在')
  const used = await User.count({ where: { levelId: id } })
  if (used) throw AppError.forbidden('该等级下仍有用户，无法删除')
  await level.destroy()
}
