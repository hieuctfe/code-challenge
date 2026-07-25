import type { Token } from '../types'
import { buildTokens } from '../utils/swap'
import { FALLBACK_PRICES } from '../data/fallbackPrices'

const PRICES_URL = 'https://interview.switcheo.com/prices.json'

export interface FetchPricesResult {
  tokens: Token[]
  /** True when the live request failed and the bundled snapshot was used. */
  usingFallback: boolean
}

export interface FetchPricesOptions {
  /** Apply a small random price drift to simulate a live market on refresh. */
  jitter?: boolean
  /** Injectable RNG for deterministic tests. Defaults to Math.random. */
  random?: () => number
}

/** Apply up to +/-2% drift per token so a manual refresh visibly moves rates. */
function applyJitter(tokens: Token[], random: () => number): Token[] {
  return tokens.map((tk) => ({ ...tk, price: tk.price * (1 + (random() - 0.5) * 0.04) }))
}

/**
 * Fetches live token prices from the Switcheo endpoint and derives the tradable
 * token list. Never throws: on any failure it returns the bundled snapshot with
 * `usingFallback: true`, so the UI always has data to render.
 */
export async function fetchPrices(opts: FetchPricesOptions = {}): Promise<FetchPricesResult> {
  const maybeJitter = (tokens: Token[]) =>
    opts.jitter ? applyJitter(tokens, opts.random ?? Math.random) : tokens

  try {
    const res = await fetch(PRICES_URL, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const tokens = buildTokens(data)
    if (tokens.length === 0) throw new Error('No priced tokens')
    return { tokens: maybeJitter(tokens), usingFallback: false }
  } catch {
    return { tokens: maybeJitter(buildTokens(FALLBACK_PRICES)), usingFallback: true }
  }
}
