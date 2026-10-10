import type { Transaction } from 'sequelize'
import { sequelize } from '../config/database'
import { Faq, FreightTemplate, LogisticsCompany } from '../models'
import { AppError } from '../utils/errors'
import { ERR } from '../constants'
import { formatDate } from '../utils/serializers'

/* ---------------------------------- FAQ ----------------------------------- */

function toFaqDto(f: Faq) {
  return {
    id: Number(f.id),
    category: f.category,
    question: f.question,
    answer: f.answer ?? '',
    sort: f.sort,
    status: f.status,
    createdAt: formatDate(f.createdAt),
  }
}

export async function listFaqs(onlyEnabled = false) {
  const rows = await Faq.findAll({
    where: onlyEnabled ? { status: 1 } : {},
    order: [
      ['category', 'ASC'],
      ['sort', 'ASC'],
      ['id', 'ASC'],
    ],
  })
  return rows.map(toFaqDto)
}

/** 客户端：按分类分组返回 */
export async function faqGroups() {
  const list = await listFaqs(true)
  const map = new Map<string, { category: string; items: ReturnType<typeof toFaqDto>[] }>()
  for (const item of list) {
    if (!map.has(item.category)) map.set(item.category, { category: item.category, items: [] })
    map.get(item.category)!.items.push(item)
  }
  return [...map.values()]
}

export interface FaqInput {
  category: string
  question: string
  answer?: string
  sort?: number
  status?: number
}

export async function createFaq(input: FaqInput) {
  const faq = await Faq.create({
    category: input.category,
    question: input.question,
    answer: input.answer ?? null,
    sort: input.sort ?? 0,
    status: input.status ?? 1,
  })
  return toFaqDto(faq)
}

export async function updateFaq(id: number, input: Partial<FaqInput>) {
  const faq = await Faq.findByPk(id)
  if (!faq) throw AppError.notFound('FAQ 不存在')
  if (input.category !== undefined) faq.category = input.category
  if (input.question !== undefined) faq.question = input.question
  if (input.answer !== undefined) faq.answer = input.answer
  if (input.sort !== undefined) faq.sort = input.sort
  if (input.status !== undefined) faq.status = input.status
  await faq.save()
  return toFaqDto(faq)
}

export async function deleteFaq(id: number) {
  const faq = await Faq.findByPk(id)
  if (!faq) throw AppError.notFound('FAQ 不存在')
  await faq.destroy()
}

/* -------------------------------- 物流公司 -------------------------------- */

function toCompanyDto(c: LogisticsCompany) {
  return {
    id: Number(c.id),
    name: c.name,
    code: c.code,
    phone: c.phone ?? '',
    sort: c.sort,
    status: c.status,
  }
}

export async function listLogisticsCompanies(onlyEnabled = false) {
  const rows = await LogisticsCompany.findAll({
    where: onlyEnabled ? { status: 1 } : {},
    order: [
      ['sort', 'ASC'],
      ['id', 'ASC'],
    ],
  })
  return rows.map(toCompanyDto)
}

export interface CompanyInput {
  name: string
  code: string
  phone?: string
  sort?: number
  status?: number
}

export async function createLogisticsCompany(input: CompanyInput) {
  const exists = await LogisticsCompany.findOne({ where: { code: input.code } })
  if (exists) throw new AppError('物流公司编码已存在', ERR.PARAM)
  const company = await LogisticsCompany.create({
    name: input.name,
    code: input.code,
    phone: input.phone ?? null,
    sort: input.sort ?? 0,
    status: input.status ?? 1,
  })
  return toCompanyDto(company)
}

export async function updateLogisticsCompany(id: number, input: Partial<CompanyInput>) {
  const company = await LogisticsCompany.findByPk(id)
  if (!company) throw AppError.notFound('物流公司不存在')
  if (input.code !== undefined && input.code !== company.code) {
    const exists = await LogisticsCompany.findOne({ where: { code: input.code } })
    if (exists) throw new AppError('物流公司编码已存在', ERR.PARAM)
    company.code = input.code
  }
  if (input.name !== undefined) company.name = input.name
  if (input.phone !== undefined) company.phone = input.phone
  if (input.sort !== undefined) company.sort = input.sort
  if (input.status !== undefined) company.status = input.status
  await company.save()
  return toCompanyDto(company)
}

export async function deleteLogisticsCompany(id: number) {
  const company = await LogisticsCompany.findByPk(id)
  if (!company) throw AppError.notFound('物流公司不存在')
  await company.destroy()
}

/* -------------------------------- 运费模板 -------------------------------- */

function toTemplateDto(t: FreightTemplate) {
  return {
    id: Number(t.id),
    name: t.name,
    freeAmount: Number(t.freeAmount),
    baseFreight: Number(t.baseFreight),
    isDefault: t.isDefault,
    status: t.status,
  }
}

export async function listFreightTemplates() {
  const rows = await FreightTemplate.findAll({ order: [['isDefault', 'DESC'], ['id', 'ASC']] })
  return rows.map(toTemplateDto)
}

export interface TemplateInput {
  name: string
  freeAmount?: number
  baseFreight?: number
  isDefault?: number
  status?: number
}

export async function createFreightTemplate(input: TemplateInput) {
  return sequelize.transaction(async (transaction) => {
    if (input.isDefault) {
      await FreightTemplate.update({ isDefault: 0 }, { where: {}, transaction })
    }
    const template = await FreightTemplate.create(
      {
        name: input.name,
        freeAmount: (input.freeAmount ?? 0).toFixed(2),
        baseFreight: (input.baseFreight ?? 0).toFixed(2),
        isDefault: input.isDefault ?? 0,
        status: input.status ?? 1,
      },
      { transaction },
    )
    return toTemplateDto(template)
  })
}

export async function updateFreightTemplate(id: number, input: Partial<TemplateInput>) {
  return sequelize.transaction(async (transaction) => {
    const template = await FreightTemplate.findByPk(id, { transaction })
    if (!template) throw AppError.notFound('运费模板不存在')
    if (input.isDefault === 1) {
      await FreightTemplate.update({ isDefault: 0 }, { where: {}, transaction })
    }
    if (input.name !== undefined) template.name = input.name
    if (input.freeAmount !== undefined) template.freeAmount = input.freeAmount.toFixed(2)
    if (input.baseFreight !== undefined) template.baseFreight = input.baseFreight.toFixed(2)
    if (input.isDefault !== undefined) template.isDefault = input.isDefault
    if (input.status !== undefined) template.status = input.status
    await template.save({ transaction })
    return toTemplateDto(template)
  })
}

export async function deleteFreightTemplate(id: number) {
  const template = await FreightTemplate.findByPk(id)
  if (!template) throw AppError.notFound('运费模板不存在')
  if (template.isDefault) throw new AppError('默认运费模板不可删除', ERR.PARAM)
  await template.destroy()
}

/**
 * 按下单商品总额计算运费：优先使用启用中的默认模板；
 * 未配置模板时回退到内置规则（满 99 包邮，否则 8 元）。
 */
export async function calcFreight(goodsTotal: number, transaction?: Transaction): Promise<number> {
  const template = await FreightTemplate.findOne({
    where: { status: 1 },
    order: [
      ['isDefault', 'DESC'],
      ['id', 'ASC'],
    ],
    transaction,
  })
  if (!template) return goodsTotal >= 99 ? 0 : 8
  const freeAmount = Number(template.freeAmount)
  if (freeAmount > 0 && goodsTotal >= freeAmount) return 0
  return Number(template.baseFreight)
}
