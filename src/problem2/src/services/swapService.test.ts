import { describe, expect, it, vi } from 'vitest'
import { executeSwap, SwapError, type SwapRequest } from './swapService'

const baseReq: SwapRequest = {
  from: 'ETH',
  fromAmount: 2,
  to: 'USDC',
  toAmount: 4000,
  balances: { ETH: 10, USDC: 5000 },
}

describe('executeSwap', () => {
  it('returns a receipt with balances adjusted for the trade on success', async () => {
    // random() >= failureRate -> success path
    const receipt = await executeSwap(baseReq, { delayMs: 0, random: () => 0.99 })

    expect(receipt.newBalances.ETH).toBe(8) // 10 - 2
    expect(receipt.newBalances.USDC).toBe(9000) // 5000 + 4000
    expect(receipt.from).toBe('ETH')
    expect(receipt.to).toBe('USDC')
    expect(receipt.txHash).toMatch(/^0x[0-9a-f]+$/)
    // Original balances object is not mutated.
    expect(baseReq.balances.ETH).toBe(10)
  })

  it('does not let a balance go negative', async () => {
    const receipt = await executeSwap(
      { ...baseReq, fromAmount: 999, balances: { ETH: 10, USDC: 5000 } },
      { delayMs: 0, random: () => 0.99 },
    )
    expect(receipt.newBalances.ETH).toBe(0)
  })

  it('throws a typed SwapError when the simulated call fails', async () => {
    // random() < failureRate -> failure path
    await expect(
      executeSwap(baseReq, { delayMs: 0, failureRate: 1, random: () => 0 }),
    ).rejects.toBeInstanceOf(SwapError)

    await expect(
      executeSwap(baseReq, { delayMs: 0, failureRate: 1, random: () => 0 }),
    ).rejects.toMatchObject({ code: 'NETWORK' })
  })

  it('respects the configured latency', async () => {
    vi.useFakeTimers()
    try {
      let done = false
      const promise = executeSwap(baseReq, { delayMs: 1500, random: () => 0.99 }).then((r) => {
        done = true
        return r
      })

      await vi.advanceTimersByTimeAsync(1499)
      expect(done).toBe(false)

      await vi.advanceTimersByTimeAsync(1)
      const receipt = await promise
      expect(done).toBe(true)
      expect(receipt.newBalances.ETH).toBe(8)
    } finally {
      vi.useRealTimers()
    }
  })
})
