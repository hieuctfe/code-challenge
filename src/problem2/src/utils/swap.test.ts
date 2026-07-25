import { describe, expect, it } from 'vitest'
import type { PriceRecord } from '../types'
import { buildTokens, convert, exchangeRate, iconUrlFor } from './swap'
import { ETH, USDC, WBTC } from '../test/fixtures'

describe('iconUrlFor', () => {
  it('builds a Switcheo token-icon URL from a symbol', () => {
    expect(iconUrlFor('ETH')).toBe(
      'https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens/ETH.svg',
    )
  })
})

describe('exchangeRate', () => {
  it('computes units of `to` per 1 unit of `from` via USD prices', () => {
    // 1 ETH ($2000) buys 2000 USDC ($1).
    expect(exchangeRate(ETH, USDC)).toBe(2000)
    // 1 USDC buys 1/2000 ETH.
    expect(exchangeRate(USDC, ETH)).toBe(1 / 2000)
    // 1 ETH ($2000) buys 0.05 WBTC ($40000).
    expect(exchangeRate(ETH, WBTC)).toBeCloseTo(0.05, 10)
  })

  it('is 1 for the same-token edge case', () => {
    expect(exchangeRate(ETH, ETH)).toBe(1)
  })

  it('returns 0 when the target price is non-positive', () => {
    const zeroPriced = { ...USDC, price: 0 }
    expect(exchangeRate(ETH, zeroPriced)).toBe(0)
  })

  it('returns 0 when a token is missing', () => {
    // @ts-expect-error intentionally passing null to test the guard
    expect(exchangeRate(null, USDC)).toBe(0)
    // @ts-expect-error intentionally passing null to test the guard
    expect(exchangeRate(ETH, null)).toBe(0)
  })
})

describe('convert', () => {
  it('multiplies the amount by the exchange rate', () => {
    expect(convert(3, ETH, USDC)).toBe(6000)
    expect(convert(6000, USDC, ETH)).toBe(3)
  })

  it('returns 0 for a non-finite amount', () => {
    expect(convert(NaN, ETH, USDC)).toBe(0)
    expect(convert(Infinity, ETH, USDC)).toBe(0)
  })

  it('returns 0 when the rate is unavailable (missing price)', () => {
    const zeroPriced = { ...USDC, price: 0 }
    expect(convert(10, ETH, zeroPriced)).toBe(0)
  })

  it('round-trips within floating-point tolerance', () => {
    const back = convert(convert(1, ETH, WBTC), WBTC, ETH)
    expect(back).toBeCloseTo(1, 10)
  })
})

describe('buildTokens', () => {
  const records: PriceRecord[] = [
    { currency: 'ETH', date: '2023-08-29T07:10:52.000Z', price: 1645.93 },
    { currency: 'USDC', date: '2023-08-29T07:10:40.000Z', price: 0.9898 },
    { currency: 'ATOM', date: '2023-08-29T07:10:50.000Z', price: 7.18 },
  ]

  it('maps records to tokens sorted alphabetically by symbol', () => {
    const tokens = buildTokens(records)
    expect(tokens.map((t) => t.symbol)).toEqual(['ATOM', 'ETH', 'USDC'])
  })

  it('attaches an icon URL and a positive mocked balance', () => {
    const [atom] = buildTokens(records)
    expect(atom.iconUrl).toBe(iconUrlFor('ATOM'))
    expect(atom.balance).toBeGreaterThan(0)
  })

  it('derives a deterministic balance for the same symbol/price', () => {
    const a = buildTokens(records)
    const b = buildTokens(records)
    expect(a[0].balance).toBe(b[0].balance)
  })

  it('dedupes a repeated currency, keeping the latest date', () => {
    const withDupes: PriceRecord[] = [
      { currency: 'ETH', date: '2023-08-29T07:00:00.000Z', price: 1000 },
      { currency: 'ETH', date: '2023-08-29T08:00:00.000Z', price: 1645.93 },
      { currency: 'ETH', date: '2023-08-29T06:00:00.000Z', price: 500 },
    ]
    const tokens = buildTokens(withDupes)
    expect(tokens).toHaveLength(1)
    expect(tokens[0].price).toBe(1645.93)
  })

  it('omits records without a positive price', () => {
    const mixed: PriceRecord[] = [
      { currency: 'ZERO', date: '2023-08-29T07:00:00.000Z', price: 0 },
      { currency: 'NEG', date: '2023-08-29T07:00:00.000Z', price: -5 },
      { currency: 'OK', date: '2023-08-29T07:00:00.000Z', price: 2 },
    ]
    expect(buildTokens(mixed).map((t) => t.symbol)).toEqual(['OK'])
  })

  it('ignores malformed records without throwing', () => {
    const dirty = [
      null,
      undefined,
      { currency: 'BAD', date: 'x', price: 'nope' },
      { currency: 'GOOD', date: '2023-08-29T07:00:00.000Z', price: 3 },
    ] as unknown as PriceRecord[]
    expect(buildTokens(dirty).map((t) => t.symbol)).toEqual(['GOOD'])
  })

  it('returns an empty array for empty input', () => {
    expect(buildTokens([])).toEqual([])
  })
})
