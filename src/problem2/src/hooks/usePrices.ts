import { useCallback, useEffect, useState } from 'react'
import type { Token } from '../types'
import { fetchPrices } from '../services/pricesService'

interface PricesState {
  tokens: Token[]
  loading: boolean
  /** Non-fatal note shown when the app fell back to bundled data. */
  usingFallback: boolean
}

interface UsePricesResult extends PricesState {
  /** Re-fetch prices with a small live-market jitter so rates visibly move. */
  refresh: () => void
}

/**
 * Loads token prices via the prices service (real fetch + graceful fallback)
 * and exposes a `refresh` that simulates a live-market re-quote. Never throws:
 * the service always resolves with data so the form always renders.
 */
export function usePrices(): UsePricesResult {
  const [state, setState] = useState<PricesState>({
    tokens: [],
    loading: true,
    usingFallback: false,
  })

  useEffect(() => {
    let cancelled = false
    fetchPrices().then(({ tokens, usingFallback }) => {
      if (!cancelled) setState({ tokens, loading: false, usingFallback })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const refresh = useCallback(() => {
    fetchPrices({ jitter: true }).then(({ tokens, usingFallback }) => {
      setState((prev) => ({ ...prev, tokens, usingFallback }))
    })
  }, [])

  return { ...state, refresh }
}
