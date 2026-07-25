/**
 * Mock "backend" for executing a swap. It behaves like a real service call:
 * network-like latency, intermittent failures, and — on success — a receipt
 * whose `newBalances` reflect the trade (the "pay" token goes down, the
 * "receive" token goes up). All non-determinism (latency, RNG, clock) is
 * injectable so tests are fully deterministic.
 */

export type SwapErrorCode = 'NETWORK' | 'INSUFFICIENT_LIQUIDITY'

/** i18n key each error code maps to, so the UI can translate it. */
export const SWAP_ERROR_MESSAGE_KEY: Record<SwapErrorCode, string> = {
  NETWORK: 'errors.network',
  INSUFFICIENT_LIQUIDITY: 'errors.insufficientLiquidity',
}

export class SwapError extends Error {
  code: SwapErrorCode
  constructor(code: SwapErrorCode) {
    super(code)
    this.name = 'SwapError'
    this.code = code
  }
}

/** What the UI knows when the user confirms: the trade, without wallet state. */
export interface SwapIntent {
  from: string
  fromAmount: number
  to: string
  toAmount: number
}

export interface SwapRequest extends SwapIntent {
  /** Current wallet balances keyed by token symbol. */
  balances: Record<string, number>
}

export interface SwapReceipt {
  txHash: string
  from: string
  fromAmount: number
  to: string
  toAmount: number
  executedAt: number
  /** Balances after applying the trade. */
  newBalances: Record<string, number>
}

export interface SwapOptions {
  /** Fixed latency in ms; defaults to a jittered 800-1600ms. */
  delayMs?: number
  /** Probability [0,1] of a simulated failure. Defaults to 0.12. */
  failureRate?: number
  /** Injectable RNG for deterministic tests. Defaults to Math.random. */
  random?: () => number
  /** Injectable clock. Defaults to Date.now. */
  now?: () => number
}

// Monotonic counter so tx hashes are unique without relying on the clock.
let txCounter = 0

function makeTxHash(req: SwapRequest, seed: number): string {
  const base = `${req.from}-${req.to}-${req.fromAmount}-${seed}`
  let hash = 0
  for (let i = 0; i < base.length; i++) hash = (hash * 31 + base.charCodeAt(i)) >>> 0
  return '0x' + hash.toString(16).padStart(8, '0') + seed.toString(16).padStart(4, '0')
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export async function executeSwap(req: SwapRequest, opts: SwapOptions = {}): Promise<SwapReceipt> {
  const random = opts.random ?? Math.random
  const failureRate = opts.failureRate ?? 0.12
  const now = opts.now ?? Date.now
  const delayMs = opts.delayMs ?? 800 + Math.floor(random() * 800)

  await delay(delayMs)

  // Simulate an intermittent backend failure.
  if (random() < failureRate) {
    const code: SwapErrorCode = random() < 0.5 ? 'NETWORK' : 'INSUFFICIENT_LIQUIDITY'
    throw new SwapError(code)
  }

  const currentFrom = req.balances[req.from] ?? 0
  const currentTo = req.balances[req.to] ?? 0
  const newBalances: Record<string, number> = {
    ...req.balances,
    [req.from]: Math.max(0, currentFrom - req.fromAmount),
    [req.to]: currentTo + req.toAmount,
  }

  return {
    txHash: makeTxHash(req, ++txCounter),
    from: req.from,
    fromAmount: req.fromAmount,
    to: req.to,
    toAmount: req.toAmount,
    executedAt: now(),
    newBalances,
  }
}
