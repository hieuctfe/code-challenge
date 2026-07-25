import { describe, expect, it } from 'vitest'
import i18n from './index'
import en from './locales/en.json'
import viCatalog from './locales/vi.json'

/** Recursively collect dotted key paths from a nested catalog object. */
function keyPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k
    return typeof v === 'object' && v !== null
      ? keyPaths(v as Record<string, unknown>, path)
      : [path]
  })
}

/** Collect every {{placeholder}} name from a catalog's leaf strings. */
function placeholders(obj: Record<string, unknown>): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  const walk = (o: Record<string, unknown>, prefix = '') => {
    for (const [k, v] of Object.entries(o)) {
      const path = prefix ? `${prefix}.${k}` : k
      if (typeof v === 'object' && v !== null) walk(v as Record<string, unknown>, path)
      else if (typeof v === 'string') {
        out[path] = [...v.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort()
      }
    }
  }
  walk(obj)
  return out
}

describe('i18n catalogs', () => {
  it('vi exposes exactly the same key set as en', () => {
    expect(keyPaths(viCatalog).sort()).toEqual(keyPaths(en).sort())
  })

  it('vi keeps the same interpolation placeholders as en', () => {
    expect(placeholders(viCatalog)).toEqual(placeholders(en))
  })

  it('resolves interpolated keys in both languages', async () => {
    await i18n.changeLanguage('en')
    expect(i18n.t('form.rate', { fromSymbol: 'ETH', rate: '2,000', toSymbol: 'USDC' })).toBe(
      '1 ETH = 2,000 USDC',
    )
    expect(i18n.t('validation.insufficientBalance', { amount: '10', symbol: 'ETH' })).toBe(
      'Insufficient balance - you hold 10 ETH.',
    )

    await i18n.changeLanguage('vi')
    expect(i18n.t('form.confirmSwap')).toBe('XÁC NHẬN ĐỔI')
    expect(i18n.t('validation.insufficientBalance', { amount: '10', symbol: 'ETH' })).toBe(
      'Số dư không đủ - bạn đang có 10 ETH.',
    )

    await i18n.changeLanguage('en')
  })
})
