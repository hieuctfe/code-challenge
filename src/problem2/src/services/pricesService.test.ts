import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchPrices } from './pricesService'
import { FALLBACK_PRICES } from '../data/fallbackPrices'

const OK_PAYLOAD = [
  { currency: 'ETH', date: '2023-08-29T07:10:52.000Z', price: 1645.93 },
  { currency: 'USDC', date: '2023-08-29T07:10:40.000Z', price: 0.9898 },
]

describe('fetchPrices', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns built tokens from the network on success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => OK_PAYLOAD }) as Response))

    const { tokens, usingFallback } = await fetchPrices()
    expect(usingFallback).toBe(false)
    expect(tokens.map((t) => t.symbol)).toEqual(['ETH', 'USDC'])
  })

  it('falls back to the bundled snapshot when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('offline')
    }))

    const { tokens, usingFallback } = await fetchPrices()
    expect(usingFallback).toBe(true)
    expect(tokens.length).toBe(FALLBACK_PRICES.length)
  })

  it('falls back when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 }) as Response))

    const { usingFallback } = await fetchPrices()
    expect(usingFallback).toBe(true)
  })

  it('jitter changes prices but not the set of symbols', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => OK_PAYLOAD }) as Response))

    const plain = await fetchPrices()
    const jittered = await fetchPrices({ jitter: true, random: () => 0.9 })

    expect(jittered.tokens.map((t) => t.symbol)).toEqual(plain.tokens.map((t) => t.symbol))
    // With random() = 0.9, drift = 1.016, so every price shifts.
    expect(jittered.tokens[0].price).not.toBe(plain.tokens[0].price)
  })
})
