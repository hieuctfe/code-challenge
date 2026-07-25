# Problem 2 - Currency Swap Form

A polished, interactive currency swap form. A user picks a token to pay with, a
token to receive, enters an amount, and the form computes the exchange in real
time from live token prices. Submitting runs a mocked backend round-trip with a
loading state and a success toast.

## Features

- **Live exchange rates** derived from real token prices, with a `1 X = n Y`
  rate line and USD value hints on both sides.
- **Searchable token picker** - a modal dialog listing every priced token with
  its icon, USD price, and (mocked) wallet balance; filter by ticker.
- **Swap-direction button** that flips the two tokens and carries the amount
  over for a seamless reverse quote.
- **MAX button** to fill the full wallet balance.
- **Inline validation** covering empty / non-numeric / zero / negative amounts,
  identical from/to tokens, and amounts exceeding the mocked wallet balance.
  The submit button is disabled while the form is invalid.
- **Backend-like submit** - `CONFIRM SWAP` calls a mock swap *service* with
  network-like latency; on success it updates the wallet balances (the "pay"
  token goes down, the "receive" token goes up) and shows a summary toast. The
  service also simulates intermittent failures, surfaced as an error toast with
  a **Retry** action.
- **Live-market refresh** - a refresh control re-quotes prices with a small
  random drift so the rate visibly moves, like a live feed.
- **Internationalized (i18n)** - all UI text is translatable via `react-i18next`
  (English + Vietnamese shipped). A top-right language switcher persists the
  choice to `localStorage`, and number/currency formatting follows the active
  locale.
- **Graceful token icons** - remote SVGs with a generated monogram fallback
  when an icon is missing.
- **Resilient data loading** - if the live prices endpoint is unreachable the
  app falls back to a bundled snapshot, so it always renders (offline / CI safe).
- Responsive layout, dark theme, subtle animations, and keyboard-accessible
  controls (focus rings, `Esc` to close the picker, focus-on-open search).

## Tech stack

- **Vite** (bonus points) + **React 18** + **TypeScript**
- **Tailwind CSS v3** for styling
- **react-i18next** (+ `i18next-browser-languagedetector`) for localization
- No component library - all UI is hand-built and self-contained.

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

- **`utils/swap.ts`** - exchange-rate math via USD prices, same-token and
  missing-price edge cases, conversion (including non-finite amounts and
  round-trips), and `buildTokens` (alphabetical sort, deterministic mocked
  balance, dedupe-by-latest-date, dropping non-positive / malformed records).
- **`utils/format.ts`** - the tolerant amount parser (empty, non-numeric,
  thousands separators, trailing dot, very large / very small, negatives) and
  the magnitude-aware token / USD / balance formatters.
- **`hooks/usePrices.ts`** - network success path plus graceful fallback to the
  bundled snapshot on fetch failure / non-OK response, with `fetch` stubbed via
  `vi.stubGlobal` (deterministic and offline).
- **`SwapForm`** - renders the default pair and rate line; inline validation for
  empty / zero / negative / non-numeric / over-balance amounts (with submit
  disabled); receive-amount computation; the swap-direction flip; token
  selection with the opposite side disabled; and the submit flow (loading state
  -> mocked ~1.5 s round-trip -> `onSuccess`).
- **`TokenSelectModal`** - search filtering, empty state, selection callback,
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

- **Prices:** `https://interview.switcheo.com/prices.json` - an array of
  `{ currency, date, price }`. On load the app dedupes by currency (keeping the
  latest `date`) and keeps only tokens that have a positive price.
- **Icons:** `https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens/{SYMBOL}.svg`.

## Notes on mocking

- **Mock service layer** (`src/services/`): `pricesService.fetchPrices` owns the
  real network call + fallback (and an optional jitter for the refresh
  re-quote); `swapService.executeSwap` simulates a backend round-trip with
  injectable latency, an intermittent typed `SwapError`, and a receipt whose
  `newBalances` reflect the trade. All non-determinism (latency, RNG, clock) is
  injectable so tests are deterministic.
- **Wallet** (`src/hooks/useWallet.ts`): owns the mutable balances (seeded from
  each token's deterministic mocked holding, ~\$500-\$10,000 worth) and applies
  the service's `newBalances` after each successful swap, so holdings evolve like
  a real account. No real transaction or on-chain activity occurs.
- A **bundled fallback price list** (`src/data/fallbackPrices.ts`) is a snapshot
  of the live endpoint, used only when the network request fails.

## Internationalization

- Setup lives in `src/i18n/` - `index.ts` initializes i18next synchronously with
  inline resources (no HTTP backend) and a `localStorage`/`navigator` detector;
  `locales/en.json` and `locales/vi.json` are the message catalogs. `en.json` is
  the source of truth: `locales/types.ts` derives `TranslationCatalog` from it
  (via `typeof`), which both powers `t()`'s compile-time key checking and forces
  every other locale to expose the same keys (a mismatch fails `tsc`). The
  `i18n.test.ts` parity check is a runtime backstop.
- Components pull text via `useTranslation()` / `t('key', { ...vars })`.
  `formatTokenAmount` / `formatUsd` / `formatBalance` take an optional locale
  (default `en-US`) so grouping/decimal separators follow the language.
- Add a language by dropping in a new `locales/<lng>.json` catalog and listing
  the code in `SUPPORTED_LANGUAGES` (`src/i18n/index.ts`). JSON keeps the
  catalogs translator/TMS-friendly.

## Project structure

```
src/
  components/
    SwapForm.tsx          # form state, validation, service-backed submit
    TokenField.tsx        # one "pay"/"receive" row (amount + token trigger)
    TokenSelectModal.tsx  # searchable token picker dialog
    TokenIcon.tsx         # remote icon with monogram fallback
    Toast.tsx             # success / error toast (with optional retry)
    LanguageSwitcher.tsx  # top-right EN/VI toggle (persisted)
  services/
    pricesService.ts      # real fetch + fallback (+ jitter on refresh)
    swapService.ts        # mock swap backend: latency, failures, receipt
  hooks/
    usePrices.ts          # loads prices via the service, exposes refresh()
    useWallet.ts          # mutable balances + submit orchestration
  utils/
    swap.ts               # token building, rate math, conversion
    format.ts             # locale-aware number / currency formatting
  data/
    fallbackPrices.ts     # offline snapshot of prices.json
  i18n/
    index.ts              # i18next init + localeFor() helper
    locales/{en,vi}.json  # message catalogs (JSON, TMS-friendly)
    locales/types.ts      # TranslationCatalog derived from en.json
  test/
    setup.ts              # jest-dom + i18n init + cleanup (Vitest setupFiles)
    fixtures.ts           # deterministic Token fixtures for tests
  types.ts                # shared types
  App.tsx                 # layout, wallet wiring, toast + language switcher
```

Each source module has a colocated `*.test.ts(x)`.

`SwapForm.test.tsx` and `TokenSelectModal.test.tsx` sit alongside their
components in `src/components/`.
