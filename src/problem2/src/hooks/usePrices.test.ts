import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { usePrices } from './usePrices'
import { FALLBACK_PRICES } from '../data/fallbackPrices'

const OK_PAYLOAD = [
  { currency: 'ETH', date: '2023-08-29T07:10:52.000Z', price: 1645.93 },
  { currency: 'USDC', date: '2023-08-29T07:10:40.000Z', price: 0.9898 },
]

describe('usePrices', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads tokens from the network on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => OK_PAYLOAD }) as Response),
    )

    const { result } = renderHook(() => usePrices())
    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.usingFallback).toBe(false)
    expect(result.current.tokens.map((t) => t.symbol)).toEqual(['ETH', 'USDC'])
  })

  it('falls back to the bundled snapshot when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      }),
    )

    const { result } = renderHook(() => usePrices())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.usingFallback).toBe(true)
    expect(result.current.tokens.length).toBe(FALLBACK_PRICES.length)
  })

  it('falls back when the response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500 }) as Response),
    )

    const { result } = renderHook(() => usePrices())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.usingFallback).toBe(true)
  })
})
