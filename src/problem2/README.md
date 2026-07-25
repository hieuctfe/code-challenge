# Problem 2 — Currency Swap Form

A polished, interactive currency swap form. A user picks a token to pay with, a
token to receive, enters an amount, and the form computes the exchange in real
time from live token prices. Submitting runs a mocked backend round-trip with a
loading state and a success toast.

## Features

- **Live exchange rates** derived from real token prices, with a `1 X = n Y`
  rate line and USD value hints on both sides.
- **Searchable token picker** — a modal dialog listing every priced token with
  its icon, USD price, and (mocked) wallet balance; filter by ticker.
- **Swap-direction button** that flips the two tokens and carries the amount
  over for a seamless reverse quote.
- **MAX button** to fill the full wallet balance.
- **Inline validation** covering empty / non-numeric / zero / negative amounts,
  identical from/to tokens, and amounts exceeding the mocked wallet balance.
  The submit button is disabled while the form is invalid.
- **Mocked submit** — `CONFIRM SWAP` shows a spinner for ~1.5s, then a success
  toast summarizing the trade. No real transaction is made.
- **Graceful token icons** — remote SVGs with a generated monogram fallback
  when an icon is missing.
- **Resilient data loading** — if the live prices endpoint is unreachable the
  app falls back to a bundled snapshot, so it always renders (offline / CI safe).
- Responsive layout, dark theme, subtle animations, and keyboard-accessible
  controls (focus rings, `Esc` to close the picker, focus-on-open search).

## Tech stack

- **Vite** (bonus points) + **React 18** + **TypeScript**
- **Tailwind CSS v3** for styling
- No component library — all UI is hand-built and self-contained.

## Getting started

```bash
npm install
npm run dev       # start the dev server (Vite prints the local URL)
npm run build     # type-check + production build into dist/
npm run preview   # preview the production build
npm test          # run the unit / component test suite once
npm run test:watch  # re-run tests on change
npm run typecheck # type-check without emitting
```

Requires Node 18+ (developed on Node 20).

## Testing

**Stack:** [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
running in a `jsdom` environment, with `@testing-library/jest-dom` matchers and
`@testing-library/user-event` for realistic interactions.

```bash
npm test              # single run (CI-friendly)
npm run test:watch    # watch mode
npm run test:coverage # run with a V8 coverage report
```

Configuration lives in the `test` block of `vite.config.ts` (`globals: true`,
`environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`). Test files
(`*.test.ts`/`*.test.tsx`) and the `src/test/` helpers are excluded from the
production `tsc` build, so `npm run build` stays clean.

**What's covered (53 tests):**

- **`utils/swap.ts`** — exchange-rate math via USD prices, same-token and
  missing-price edge cases, conversion (including non-finite amounts and
  round-trips), and `buildTokens` (alphabetical sort, deterministic mocked
  balance, dedupe-by-latest-date, dropping non-positive / malformed records).
- **`utils/format.ts`** — the tolerant amount parser (empty, non-numeric,
  thousands separators, trailing dot, very large / very small, negatives) and
  the magnitude-aware token / USD / balance formatters.
- **`hooks/usePrices.ts`** — network success path plus graceful fallback to the
  bundled snapshot on fetch failure / non-OK response, with `fetch` stubbed via
  `vi.stubGlobal` (deterministic and offline).
- **`SwapForm`** — renders the default pair and rate line; inline validation for
  empty / zero / negative / non-numeric / over-balance amounts (with submit
  disabled); receive-amount computation; the swap-direction flip; token
  selection with the opposite side disabled; and the submit flow (loading state
  → mocked ~1.5 s round-trip → `onSuccess`).
- **`TokenSelectModal`** — search filtering, empty state, selection callback,
  the disabled opposite-side token, and `Esc`-to-close.

Tests query by role and accessible name (not brittle CSS selectors), so they
stay resilient to styling changes.

## Architecture / best practices

- **Pure logic is decoupled from React.** All rate/conversion math, token
  building, and the price dedupe-by-latest-date transform live as exported pure
  functions in `utils/` (`buildTokens`, `exchangeRate`, `convert`) and are unit
  tested in isolation from any component or network call.
- **Data fetching is isolated in a hook.** `usePrices` owns the fetch, the
  fallback, and the loading flag; it never throws, so the UI always renders.
- **Components stay presentational and prop-driven.** `SwapForm` receives its
  token list as a prop, which keeps it deterministic and trivially testable
  without mocking the network.
- **Accessibility as a contract.** Interactive controls carry `aria-label`s and
  proper roles (`dialog`, `status`), which double as stable test hooks.

## Data sources

- **Prices:** `https://interview.switcheo.com/prices.json` — an array of
  `{ currency, date, price }`. On load the app dedupes by currency (keeping the
  latest `date`) and keeps only tokens that have a positive price.
- **Icons:** `https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens/{SYMBOL}.svg`.

## Notes on mocking

- **Wallet balances** are mocked deterministically from each token's symbol and
  price (roughly \$500–\$10,000 of holdings per token) so validation against a
  balance is demonstrable.
- **The swap submission** is mocked with a `setTimeout` delay — there is no
  backend and no on-chain activity.
- A **bundled fallback price list** (`src/data/fallbackPrices.ts`) is a snapshot
  of the live endpoint, used only when the network request fails.

## Project structure

```
src/
  components/
    SwapForm.tsx          # form state, validation, submit flow
    TokenField.tsx        # one "pay"/"receive" row (amount + token trigger)
    TokenSelectModal.tsx  # searchable token picker dialog
    TokenIcon.tsx         # remote icon with monogram fallback
    Toast.tsx             # success toast
  hooks/
    usePrices.ts          # fetch + fallback, returns tradable tokens
    usePrices.test.ts     # hook test (fetch stubbed)
  utils/
    swap.ts               # token building, rate math, conversion
    swap.test.ts          # pure-logic unit tests
    format.ts             # number / currency formatting
    format.test.ts        # formatter / parser unit tests
  data/
    fallbackPrices.ts     # offline snapshot of prices.json
  test/
    setup.ts              # jest-dom matchers + cleanup (Vitest setupFiles)
    fixtures.ts           # deterministic Token fixtures for tests
  types.ts                # shared types
  App.tsx                 # layout, loading skeleton, toast wiring
```

`SwapForm.test.tsx` and `TokenSelectModal.test.tsx` sit alongside their
components in `src/components/`.
