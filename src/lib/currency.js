const CURRENCY_CODE = 'INR'
const LOCALE = 'en-IN'

export function formatCurrency(value) {
  try {
    return new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency: CURRENCY_CODE,
    }).format(value)
  } catch {
    return `${CURRENCY_CODE} ${Number(value).toFixed(2)}`
  }
}

export function formatCompactCurrency(value) {
  try {
    return new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency: CURRENCY_CODE,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  } catch {
    return formatCurrency(value)
  }
}

export function parseCurrency(text) {
  const num = Number(String(text).replace(/[^0-9.-]/g, ''))
  return Number.isNaN(num) ? 0 : num
}
