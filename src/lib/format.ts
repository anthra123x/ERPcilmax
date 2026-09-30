const CURRENCY_LOCALE: Record<string, string> = {
  COP: 'es-CO',
  USD: 'en-US',
  EUR: 'es-ES',
}

export function formatCurrency(value: number | string | null | undefined, currency = 'COP'): string {
  if (value === null || value === undefined) {
    return '$0'
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(numValue)) {
    return '$0'
  }

  const locale = CURRENCY_LOCALE[currency] || 'es-CO'

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numValue)
}

export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return '0'
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(numValue) || numValue === null) {
    return '0'
  }

  return new Intl.NumberFormat('es-CO').format(numValue)
}

function convertHundreds(n: number): string {
  const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE']
  const tens = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
  const teens = [
    'DIEZ',
    'ONCE',
    'DOCE',
    'TRECE',
    'CATORCE',
    'QUINCE',
    'DIECISÉIS',
    'DIECISIETE',
    'DIECIOCHO',
    'DIECINUEVE',
  ]
  const twenties = [
    'VEINTE',
    'VEINTIÚN',
    'VEINTIDÓS',
    'VEINTITRÉS',
    'VEINTICUATRO',
    'VEINTICINCO',
    'VEINTISÉIS',
    'VEINTISIETE',
    'VEINTIOCHO',
    'VEINTINUEVE',
  ]
  const hundreds = [
    '',
    'CIENTO',
    'DOSCIENTOS',
    'TRESCIENTOS',
    'CUATROCIENTOS',
    'QUINIENTOS',
    'SEISCIENTOS',
    'SETECIENTOS',
    'OCHOCIENTOS',
    'NOVECIENTOS',
  ]

  if (n === 0) return ''
  if (n === 100) return 'CIEN'

  let result = ''
  const c = Math.floor(n / 100)
  const d = Math.floor((n % 100) / 10)
  const u = n % 10

  if (c > 0) result += hundreds[c] + ' '

  const du = n % 100
  if (du >= 10 && du <= 19) {
    result += teens[du - 10]
  } else if (du >= 20 && du <= 29) {
    result += twenties[du - 20]
  } else if (d > 2) {
    result += tens[d]
    if (u > 0) result += ' Y ' + units[u]
  } else if (u > 0) {
    result += units[u]
  }

  return result.trim()
}

export function formatCurrencyInWords(value: number | string | null | undefined): string {
  const num = Math.floor(Math.abs(Number(value) || 0))
  if (num === 0) return 'CERO PESOS M/CTE'

  const millions = Math.floor(num / 1000000)
  const thousands = Math.floor((num % 1000000) / 1000)
  const remainder = num % 1000

  const parts: string[] = []

  if (millions > 0) {
    if (millions === 1) {
      parts.push('UN MILLÓN')
    } else {
      parts.push(`${convertHundreds(millions)} MILLONES`)
    }
  }

  if (thousands > 0) {
    if (thousands === 1) {
      parts.push('MIL')
    } else {
      parts.push(`${convertHundreds(thousands)} MIL`)
    }
  }

  if (remainder > 0) {
    parts.push(convertHundreds(remainder))
  }

  const words = parts.join(' ').trim()
  const isPureMillion = millions > 0 && thousands === 0 && remainder === 0
  const currencySuffix = isPureMillion ? 'DE PESOS M/CTE' : 'PESOS M/CTE'

  return `${words} ${currencySuffix}`
}

export function generateCufe(
  invoiceNumber: string,
  date: Date | string,
  total: number,
  companyNit = '901482391',
  clientDoc = '222222222222',
): string {
  const d = new Date(date)
  const dateStr = isNaN(d.getTime()) ? '2026-01-01' : d.toISOString().slice(0, 10)
  const seed = `${invoiceNumber}|${dateStr}|${Math.round(total)}|${companyNit}|${clientDoc}|dian-cufe-val`

  let h1 = 0x811c9dc5
  let h2 = 0x41c64e6d
  let h3 = 0x5a7c2b3d
  let h4 = 0x2e4b6c8a
  let h5 = 0x9e3779b9
  let h6 = 0x3c6ef372
  let h7 = 0xbb67ae85
  let h8 = 0x6a09e667
  let h9 = 0x1384b632
  let h10 = 0x76891234
  let h11 = 0xabcdef01
  let h12 = 0x5555aaaa

  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193)
    h2 = Math.imul(h2 ^ (c << 1), 0x5bd1e995)
    h3 = Math.imul(h3 ^ (c << 2), 0x27d4eb2f)
    h4 = Math.imul(h4 ^ (c << 3), 0x165667b1)
    h5 = Math.imul(h5 ^ c, 0x2de8c3d9)
    h6 = Math.imul(h6 ^ (c << 1), 0x6739b21f)
    h7 = Math.imul(h7 ^ (c << 2), 0x43b2a197)
    h8 = Math.imul(h8 ^ (c << 3), 0x83c16fb5)
    h9 = Math.imul(h9 ^ c, 0x1a2b3c4d)
    h10 = Math.imul(h10 ^ (c << 1), 0x5e6f7a8b)
    h11 = Math.imul(h11 ^ (c << 2), 0x9c8d7e6f)
    h12 = Math.imul(h12 ^ (c << 3), 0x1f2e3d4c)
  }

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0')
  return `${toHex(h1)}${toHex(h2)}${toHex(h3)}${toHex(h4)}${toHex(h5)}${toHex(h6)}${toHex(h7)}${toHex(h8)}${toHex(h9)}${toHex(h10)}${toHex(h11)}${toHex(h12)}`.toLowerCase()
}
