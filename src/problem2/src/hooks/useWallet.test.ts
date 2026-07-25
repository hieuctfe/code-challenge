import { describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useWallet } from './useWallet'
import { SwapError } from '../services/swapService'
import { ETH, TEST_TOKENS, USDC } from '../test/fixtures'

const intent = { from: 'ETH', fromAmount: 2, to: 'USDC', toAmount: 4000 }

describe('useWallet', () => {
  it('seeds balances from the token list', async () => {
    const { result } = renderHook(() => useWallet(TEST_TOKENS))
    await waitFor(() => expect(result.current.balances.ETH).toBe(ETH.balance))
    expect(result.current.balances.USDC).toBe(USDC.balance)
  })

  it('reduces the "from" balance and increases the "to" balance on a successful swap', async () => {
    const { result } = renderHook(() =>
      useWallet(TEST_TOKENS, { delayMs: 0, random: () => 0.99 }),
    )
    await waitFor(() => expect(result.current.balances.ETH).toBe(10))

    await act(async () => {
      await result.current.submit(intent)
    })

    expect(result.current.balances.ETH).toBe(8) // 10 - 2
    expect(result.current.balances.USDC).toBe(9000) // 5000 + 4000
    // Merged tokens reflect the new balance.
    expect(result.current.tokens.find((t) => t.symbol === 'ETH')!.balance).toBe(8)
    expect(result.current.swapState).toBe('idle')
  })

  it('leaves balances unchanged and exposes the error on a failed swap', async () => {
    const { result } = renderHook(() =>
      useWallet(TEST_TOKENS, { delayMs: 0, failureRate: 1, random: () => 0 }),
    )
    await waitFor(() => expect(result.current.balances.ETH).toBe(10))

    await act(async () => {
      await expect(result.current.submit(intent)).rejects.toBeInstanceOf(SwapError)
    })

    expect(result.current.balances.ETH).toBe(10)
    expect(result.current.balances.USDC).toBe(5000)
    expect(result.current.swapState).toBe('error')
    expect(result.current.error?.code).toBe('NETWORK')
  })
})
