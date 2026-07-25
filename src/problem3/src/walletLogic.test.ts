import { describe, it, expect } from 'vitest';
import {
  BLOCKCHAIN_PRIORITY,
  DEFAULT_PRIORITY,
  filterAndSortBalances,
  formatBalances,
  getPriority,
  getSortedFormattedBalances,
  type Blockchain,
  type Prices,
  type WalletBalance,
} from './walletLogic';

// Small helper to build balances tersely in tests.
const balance = (
  currency: string,
  amount: number,
  blockchain: Blockchain,
): WalletBalance => ({ currency, amount, blockchain });

const PRICES: Prices = {
  OSMO: 2,
  ETH: 3000,
  ARB: 1.5,
  ZIL: 0.02,
  NEO: 10,
  // Note: no price for some currencies on purpose (to test the NaN guard).
};

describe('getPriority', () => {
  it('returns the correct priority for each known blockchain', () => {
    expect(getPriority('Osmosis')).toBe(100);
    expect(getPriority('Ethereum')).toBe(50);
    expect(getPriority('Arbitrum')).toBe(30);
    expect(getPriority('Zilliqa')).toBe(20);
    expect(getPriority('Neo')).toBe(20);
  });

  it('matches the lookup table exactly', () => {
    for (const [chain, priority] of Object.entries(BLOCKCHAIN_PRIORITY)) {
      expect(getPriority(chain as Blockchain)).toBe(priority);
    }
  });

  it('returns the -99 default for unknown chains', () => {
    // Cast: intentionally passing a value outside the union to exercise the
    // runtime fallback path.
    expect(getPriority('Bitcoin' as Blockchain)).toBe(DEFAULT_PRIORITY);
    expect(getPriority('' as Blockchain)).toBe(DEFAULT_PRIORITY);
    expect(DEFAULT_PRIORITY).toBe(-99);
  });
});

describe('filterAndSortBalances', () => {
  it('keeps only positive balances with a known priority', () => {
    const input: WalletBalance[] = [
      balance('ETH', 5, 'Ethereum'), // kept
      balance('OSMO', 0, 'Osmosis'), // dropped: amount == 0
      balance('ARB', -3, 'Arbitrum'), // dropped: amount < 0
      balance('BTC', 10, 'Bitcoin' as Blockchain), // dropped: unknown chain
      balance('ZIL', 1, 'Zilliqa'), // kept
    ];

    const result = filterAndSortBalances(input);

    expect(result.map((b) => b.currency)).toEqual(['ETH', 'ZIL']);
  });

  it('drops zero and negative amounts', () => {
    const input: WalletBalance[] = [
      balance('A', 0, 'Ethereum'),
      balance('B', -0.0001, 'Ethereum'),
      balance('C', 0.0001, 'Ethereum'),
    ];
    expect(filterAndSortBalances(input).map((b) => b.currency)).toEqual(['C']);
  });

  it('drops unknown blockchains even when the amount is positive', () => {
    const input: WalletBalance[] = [
      balance('X', 100, 'Dogecoin' as Blockchain),
      balance('Y', 100, 'Ethereum'),
    ];
    expect(filterAndSortBalances(input).map((b) => b.currency)).toEqual(['Y']);
  });

  it('sorts by priority descending', () => {
    const input: WalletBalance[] = [
      balance('ARB', 1, 'Arbitrum'), // 30
      balance('OSMO', 1, 'Osmosis'), // 100
      balance('ETH', 1, 'Ethereum'), // 50
    ];
    expect(filterAndSortBalances(input).map((b) => b.blockchain)).toEqual([
      'Osmosis',
      'Ethereum',
      'Arbitrum',
    ]);
  });

  it('is stable for equal priorities (input order preserved)', () => {
    // Zilliqa and Neo both have priority 20; their relative order must be kept.
    const input: WalletBalance[] = [
      balance('ZIL', 1, 'Zilliqa'),
      balance('NEO', 1, 'Neo'),
      balance('ZIL2', 1, 'Zilliqa'),
    ];
    expect(filterAndSortBalances(input).map((b) => b.currency)).toEqual([
      'ZIL',
      'NEO',
      'ZIL2',
    ]);
  });

  it('does not mutate the input array', () => {
    const input: WalletBalance[] = [
      balance('ARB', 1, 'Arbitrum'),
      balance('OSMO', 1, 'Osmosis'),
    ];
    const snapshot = [...input];
    filterAndSortBalances(input);
    expect(input).toEqual(snapshot);
  });
});

describe('formatBalances', () => {
  it('formats amounts with fixed decimals', () => {
    const result = formatBalances([balance('ETH', 1.98765, 'Ethereum')], PRICES);
    expect(result[0].formatted).toBe('1.99');
  });

  it('computes usdValue from price * amount', () => {
    const result = formatBalances([balance('ETH', 2, 'Ethereum')], PRICES);
    expect(result[0].usdValue).toBe(6000); // 3000 * 2
  });

  it('guards a missing price to 0 (never NaN)', () => {
    const result = formatBalances([balance('MISSING', 5, 'Ethereum')], PRICES);
    expect(result[0].usdValue).toBe(0);
    expect(Number.isNaN(result[0].usdValue)).toBe(false);
  });

  it('preserves the original balance fields', () => {
    const b = balance('OSMO', 3, 'Osmosis');
    const [formatted] = formatBalances([b], PRICES);
    expect(formatted).toMatchObject({
      currency: 'OSMO',
      amount: 3,
      blockchain: 'Osmosis',
    });
  });
});

describe('getSortedFormattedBalances (full pipeline)', () => {
  it('filters, sorts and formats in one pass', () => {
    const input: WalletBalance[] = [
      balance('ARB', 4, 'Arbitrum'), // priority 30
      balance('OSMO', 0, 'Osmosis'), // dropped (amount 0)
      balance('ETH', 2, 'Ethereum'), // priority 50
      balance('BTC', 9, 'Bitcoin' as Blockchain), // dropped (unknown)
    ];

    const result = getSortedFormattedBalances(input, PRICES);

    expect(result.map((b) => b.currency)).toEqual(['ETH', 'ARB']);
    expect(result[0].formatted).toBe('2.00');
    expect(result[0].usdValue).toBe(6000);
  });
});

// ---------------------------------------------------------------------------
// Regression tests: encode the ORIGINAL bugs so they stay fixed.
// ---------------------------------------------------------------------------
describe('regressions for the original WalletPage bugs', () => {
  it('A2: keeps positive balances instead of dropping them', () => {
    // Original inverted filter kept amount <= 0 and dropped positives.
    const input: WalletBalance[] = [
      balance('ETH', 10, 'Ethereum'),
      balance('OSMO', 20, 'Osmosis'),
    ];
    expect(filterAndSortBalances(input)).toHaveLength(2);
  });

  it('A3: comparator is a total order (equal priorities do not throw/reorder)', () => {
    const input: WalletBalance[] = [
      balance('NEO', 1, 'Neo'),
      balance('ZIL', 1, 'Zilliqa'),
    ];
    // Equal priority (20). No exception, order preserved -> comparator returns 0.
    expect(() => filterAndSortBalances(input)).not.toThrow();
    expect(filterAndSortBalances(input).map((b) => b.currency)).toEqual(['NEO', 'ZIL']);
  });

  it('A5: never produces NaN usdValue for a missing price', () => {
    const result = getSortedFormattedBalances(
      [balance('GHOST', 1, 'Ethereum')],
      {}, // no prices at all
    );
    expect(result[0].usdValue).toBe(0);
  });

  it('A6: uses explicit precision rather than rounding to whole numbers', () => {
    const result = getSortedFormattedBalances(
      [balance('ETH', 1.5, 'Ethereum')],
      PRICES,
    );
    // Original `.toFixed()` would have yielded "2"; we expect "1.50".
    expect(result[0].formatted).toBe('1.50');
  });
});
