import type { Category } from '@/api/types'

/** 从已加载的分类树中解析任意分类所属的顶级分类 id */
export function findTopCategoryId(id: number, categories: Category[]): number {
  const cat = categories.find((c) => c.id === id)
  if (!cat) return id
  return cat.level === 1 ? cat.id : cat.parentId
}

export function findCategoryName(id: number, categories: Category[]): string {
  return categories.find((c) => c.id === id)?.name ?? ''
}
