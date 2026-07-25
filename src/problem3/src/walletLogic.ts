/**
 * Pure wallet business logic, extracted from the `WalletPage` React component.
 *
 * Everything here is framework-agnostic and side-effect free so it can be unit
 * tested in isolation (see `walletLogic.test.ts`). The React component in
 * `../refactored.tsx` imports from this module and stays thin.
 */

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/** All blockchains we know how to prioritise (replaces the original `any`). */
export type Blockchain = 'Osmosis' | 'Ethereum' | 'Arbitrum' | 'Zilliqa' | 'Neo';

/** A raw balance as returned by the wallet data source. */
export interface WalletBalance {
  currency: string;
  amount: number;
  /** Was missing from the original interface, but read everywhere. */
  blockchain: Blockchain;
}

/** A balance enriched with display-ready fields. */
export interface FormattedWalletBalance extends WalletBalance {
  /** `amount` rendered with fixed precision, e.g. `"12.34"`. */
  formatted: string;
  /** `price * amount`, guarded so it is never `NaN`. */
  usdValue: number;
}

/** Map of `currency` -> USD price. Prices may be missing for some currencies. */
export type Prices = Record<string, number>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Priority returned for any blockchain we don't recognise. */
export const DEFAULT_PRIORITY = -99;

/** Number of decimal places used when formatting token amounts. */
export const AMOUNT_DECIMALS = 2;

/**
 * Priority lookup table. Backed by a `Record` so lookups are O(1) and the table
 * is defined exactly once (not re-created on every render like the original
 * `switch`). Higher number = higher priority = sorted first.
 */
export const BLOCKCHAIN_PRIORITY: Record<Blockchain, number> = {
  Osmosis: 100,
  Ethereum: 50,
  Arbitrum: 30,
  Zilliqa: 20,
  Neo: 20,
};

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Returns the sort priority for a blockchain, or {@link DEFAULT_PRIORITY} for
 * unknown chains. Pure and hoisted so it has stable identity and is testable.
 */
export const getPriority = (blockchain: Blockchain): number =>
  BLOCKCHAIN_PRIORITY[blockchain] ?? DEFAULT_PRIORITY;

/**
 * Filters out balances that should not be shown, then sorts the rest by
 * blockchain priority (descending, stable for equal priorities).
 *
 * Rules:
 * - Keep only balances with a **known** blockchain (priority > default).
 * - Keep only balances with a **positive** amount (`amount > 0`).
 * - Sort by priority descending; the comparator always returns a number.
 *
 * Priority is computed **once per item** (not inside the comparator) to avoid
 * the original `O(n log n)` redundant `getPriority` calls.
 */
export const filterAndSortBalances = (
  balances: readonly WalletBalance[],
): WalletBalance[] => {
  return balances
    .map((balance) => ({ balance, priority: getPriority(balance.blockchain) }))
    .filter(({ priority, balance }) => priority > DEFAULT_PRIORITY && balance.amount > 0)
    .sort((lhs, rhs) => rhs.priority - lhs.priority)
    .map(({ balance }) => balance);
};

/**
 * Enriches balances with display fields:
 * - `formatted`: `amount` with fixed precision ({@link AMOUNT_DECIMALS}).
 * - `usdValue`: `price * amount`, with a missing price guarded to `0` so the
 *   result is never `NaN`.
 */
export const formatBalances = (
  balances: readonly WalletBalance[],
  prices: Prices,
): FormattedWalletBalance[] => {
  return balances.map((balance) => {
    const price = prices[balance.currency] ?? 0; // guard: missing price -> 0, never NaN
    return {
      ...balance,
      formatted: balance.amount.toFixed(AMOUNT_DECIMALS),
      usdValue: price * balance.amount,
    };
  });
};

/**
 * Convenience pipeline: filter + sort, then format. This is the single source
 * of truth the React component consumes.
 */
export const getSortedFormattedBalances = (
  balances: readonly WalletBalance[],
  prices: Prices,
): FormattedWalletBalance[] => formatBalances(filterAndSortBalances(balances), prices);
