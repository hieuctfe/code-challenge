import type { Token } from '../types'

/**
 * A small, deterministic set of tokens for use in unit and component tests.
 * Prices are round numbers so expected conversions are easy to reason about,
 * and balances are fixed (not derived) so validation tests are stable.
 */
export const ETH: Token = {
  symbol: 'ETH',
  price: 2000,
  iconUrl: 'https://example.test/ETH.svg',
  balance: 10,
}

export const USDC: Token = {
  symbol: 'USDC',
  price: 1,
  iconUrl: 'https://example.test/USDC.svg',
  balance: 5000,
}

export const WBTC: Token = {
  symbol: 'WBTC',
  price: 40000,
  iconUrl: 'https://example.test/WBTC.svg',
  balance: 2,
}

/** Ordered list mirroring what `buildTokens` would produce (sorted by symbol). */
export const TEST_TOKENS: Token[] = [ETH, USDC, WBTC].sort((a, b) =>
  a.symbol.localeCompare(b.symbol),
)
