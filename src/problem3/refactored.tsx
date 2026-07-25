import React, { useMemo } from 'react';
import {
  getSortedFormattedBalances,
  type FormattedWalletBalance,
  type Prices,
  type WalletBalance,
} from './src/walletLogic';

/**
 * Refactored version of the Problem 3 WalletPage.
 *
 * The component is intentionally thin: all the business logic (filtering,
 * sorting, formatting, USD valuation) lives in `./src/walletLogic.ts`, which is
 * pure and unit tested. This file only wires that logic into React.
 *
 * The design-system / data-hook symbols below (`Box`, `useWalletBalances`,
 * `usePrices`, `classes`, `WalletRow`) come from the surrounding application;
 * they are declared here as type stubs so the intent is clear and the file is
 * internally consistent. It is not meant to compile standalone.
 */

// ---------------------------------------------------------------------------
// External dependencies (provided elsewhere in the real app)
// ---------------------------------------------------------------------------
type BoxProps = React.HTMLAttributes<HTMLDivElement>;

declare const classes: { row: string };

declare function useWalletBalances(): WalletBalance[];
declare function usePrices(): Prices;

interface WalletRowProps {
  className?: string;
  amount: number;
  usdValue: number;
  formattedAmount: string;
}
declare const WalletRow: React.FC<WalletRowProps>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Props = BoxProps;

const WalletPage: React.FC<Props> = (props: Props) => {
  // `children` intentionally left inside `...rest` so it passes through the
  // spread rather than being destructured and dropped.
  const { ...rest } = props;
  const balances = useWalletBalances();
  const prices = usePrices();

  // Single memoised derivation delegating to the pure, tested pipeline. Depends
  // on both inputs it actually reads (`balances` for filter/sort, `prices` for
  // USD valuation) - no stale reads, no over-invalidation on unrelated changes.
  const formattedBalances: FormattedWalletBalance[] = useMemo(
    () => getSortedFormattedBalances(balances, prices),
    [balances, prices],
  );

  const rows = useMemo(
    () =>
      formattedBalances.map((balance) => (
        <WalletRow
          className={classes.row}
          key={balance.currency} // stable, unique key instead of index
          amount={balance.amount}
          usdValue={balance.usdValue}
          formattedAmount={balance.formatted}
        />
      )),
    [formattedBalances],
  );

  return <div {...rest}>{rows}</div>;
};

export default WalletPage;
