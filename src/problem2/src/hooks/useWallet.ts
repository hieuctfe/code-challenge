import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Token } from '../types'
import {
  executeSwap,
  SwapError,
  type SwapIntent,
  type SwapOptions,
  type SwapReceipt,
} from '../services/swapService'

export type SwapState = 'idle' | 'submitting' | 'error'

export interface WalletApi {
  /** The input tokens with their balances overlaid from the live wallet. */
  tokens: Token[]
  /** Current balances keyed by symbol. */
  balances: Record<string, number>
  swapState: SwapState
  error: SwapError | null
  /** Execute a swap through the mock backend and apply the resulting balances. */
  submit: (intent: SwapIntent) => Promise<SwapReceipt>
}

/**
 * Owns the (mutable) wallet balances and orchestrates swaps through the mock
 * backend. Balances are seeded from the incoming token list and then evolve as
 * swaps succeed, so the UI reflects real post-trade holdings. `opts` lets tests
 * inject deterministic latency / RNG.
 */
export function useWallet(tokens: Token[], opts?: SwapOptions): WalletApi {
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [swapState, setSwapState] = useState<SwapState>('idle')
  const [error, setError] = useState<SwapError | null>(null)

  // Seed balances for any newly-seen symbol, but preserve balances we already
  // track — so a price refresh (new token identities) never resets holdings.
  useEffect(() => {
    if (tokens.length === 0) return
    setBalances((prev) => {
      let changed = false
      const next = { ...prev }
      for (const t of tokens) {
        if (!(t.symbol in next)) {
          next[t.symbol] = t.balance
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [tokens])

  const mergedTokens = useMemo(
    () => tokens.map((t) => ({ ...t, balance: balances[t.symbol] ?? t.balance })),
    [tokens, balances],
  )

  const submit = useCallback(
    async (intent: SwapIntent): Promise<SwapReceipt> => {
      setSwapState('submitting')
      setError(null)
      try {
        const receipt = await executeSwap({ ...intent, balances }, opts)
        setBalances(receipt.newBalances)
        setSwapState('idle')
        return receipt
      } catch (e) {
        const err = e instanceof SwapError ? e : new SwapError('NETWORK')
        setError(err)
        setSwapState('error')
        throw err
      }
    },
    [balances, opts],
  )

  return { tokens: mergedTokens, balances, swapState, error, submit }
}
