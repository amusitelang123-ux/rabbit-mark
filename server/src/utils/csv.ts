/**
 * 极简 CSV 编解码（RFC 4180 子集）：
 * 支持双引号包裹、字段内逗号/换行、双引号转义（""）。
 * 导出时统一加 UTF-8 BOM，保证 Excel 打开中文不乱码。
 */

export function toCsv(header: string[], rows: (string | number)[][]): string {
  const escape = (value: string | number) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const lines = [header, ...rows].map((row) => row.map(escape).join(','))
  return '\uFEFF' + lines.join('\r\n')
}

export function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\r') {
      // 忽略，等 \n 统一处理
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}
