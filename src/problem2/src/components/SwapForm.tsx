import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Token } from '../types'
import { TokenField } from './TokenField'
import { TokenSelectModal } from './TokenSelectModal'
import { convert, exchangeRate } from '../utils/swap'
import { formatTokenAmount, formatUsd, parseAmount } from '../utils/format'
import { localeFor } from '../i18n'
import {
  executeSwap,
  SwapError,
  type SwapIntent,
  type SwapReceipt,
} from '../services/swapService'

interface SwapFormProps {
  tokens: Token[]
  /**
   * Executes the swap through a backend. Defaults to the mock service using the
   * balances on `tokens`; the app injects the wallet-backed submit so balances
   * persist across swaps.
   */
  onSubmit?: (intent: SwapIntent) => Promise<SwapReceipt>
  onSuccess: (receipt: SwapReceipt) => void
  /** Called with the error and a retry callback when a swap fails. */
  onError?: (error: SwapError, retry: () => void) => void
  /** When provided, renders a "refresh rates" control in the header. */
  onRefreshRates?: () => void
}

type ActiveSide = 'from' | 'to' | null

/** Pick a sensible default token by symbol, falling back to an index. */
function pick(tokens: Token[], symbol: string, fallbackIndex: number): Token {
  return tokens.find((t) => t.symbol === symbol) ?? tokens[fallbackIndex] ?? tokens[0]
}

/** The complete currency swap form: inputs, validation, and service-backed submit. */
export function SwapForm({ tokens, onSubmit, onSuccess, onError, onRefreshRates }: SwapFormProps) {
  const { t, i18n } = useTranslation()
  const locale = localeFor(i18n.language)
  const [fromToken, setFromToken] = useState<Token>(() => pick(tokens, 'ETH', 0))
  const [toToken, setToToken] = useState<Token>(() => pick(tokens, 'USDC', 1))
  const [amount, setAmount] = useState('')
  const [activeSide, setActiveSide] = useState<ActiveSide>(null)
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // If the token list identity changes (e.g. live data replaces fallback),
  // re-resolve the selected tokens so prices/balances stay in sync.
  useEffect(() => {
    setFromToken((prev) => pick(tokens, prev.symbol, 0))
    setToToken((prev) => pick(tokens, prev.symbol, 1))
  }, [tokens])

  const parsedAmount = parseAmount(amount)
  const rate = exchangeRate(fromToken, toToken)
  const receiveAmount = convert(parsedAmount, fromToken, toToken)

  const fromUsd = Number.isFinite(parsedAmount) ? parsedAmount * fromToken.price : NaN
  const toUsd = Number.isFinite(receiveAmount) ? receiveAmount * toToken.price : NaN

  // Validation returns a translation key (+ params) rather than a finished
  // string, so the message re-localizes automatically when the language changes.
  const error = useMemo<{ key: string; params?: Record<string, string> } | null>(() => {
    if (amount.trim() === '') return { key: 'validation.enterAmount' }
    if (Number.isNaN(parsedAmount)) return { key: 'validation.validNumber' }
    if (parsedAmount <= 0) return { key: 'validation.greaterThanZero' }
    if (fromToken.symbol === toToken.symbol) return { key: 'validation.differentTokens' }
    // Tolerate floating-point noise so an exact MAX (or a value equal to the
    // balance) is not wrongly rejected. The tolerance scales with magnitude.
    const balanceEpsilon = Math.max(1e-8, Math.abs(fromToken.balance) * 1e-9)
    if (parsedAmount > fromToken.balance + balanceEpsilon)
      return {
        key: 'validation.insufficientBalance',
        params: { amount: formatTokenAmount(fromToken.balance, locale), symbol: fromToken.symbol },
      }
    return null
  }, [amount, parsedAmount, fromToken, toToken, locale])

  const errorMessage = error ? t(error.key, error.params) : null
  const showError = touched && error

  function handleSwapDirection() {
    setFromToken(toToken)
    setToToken(fromToken)
    // Carry the computed receive amount over as the new pay amount for continuity.
    if (Number.isFinite(receiveAmount) && parsedAmount > 0) {
      setAmount(String(Number(receiveAmount.toFixed(8))))
    }
  }

  function handleSelect(token: Token) {
    if (activeSide === 'from') {
      // Prevent selecting the same token as the other side; swap instead.
      if (token.symbol === toToken.symbol) setToToken(fromToken)
      setFromToken(token)
    } else if (activeSide === 'to') {
      if (token.symbol === fromToken.symbol) setFromToken(toToken)
      setToToken(token)
    }
    setActiveSide(null)
  }

  function handleMax() {
    setTouched(true)
    // Floor to 8 decimals rather than round: rounding to nearest can produce a
    // value slightly above the real balance and trip the insufficient-balance
    // check. Flooring guarantees the MAX amount is always spendable.
    const max = Math.floor(fromToken.balance * 1e8) / 1e8
    setAmount(String(max))
  }

  // Fallback submit used when the app doesn't inject a wallet-backed one:
  // calls the mock backend directly using the balances on the current tokens.
  async function defaultSubmit(intent: SwapIntent): Promise<SwapReceipt> {
    const balances = Object.fromEntries(tokens.map((tk) => [tk.symbol, tk.balance]))
    return executeSwap({ ...intent, balances })
  }

  async function runSwap() {
    if (error || submitting) return
    const intent: SwapIntent = {
      from: fromToken.symbol,
      fromAmount: parsedAmount,
      to: toToken.symbol,
      toAmount: receiveAmount,
    }
    setSubmitting(true)
    try {
      const receipt = await (onSubmit ?? defaultSubmit)(intent)
      onSuccess(receipt)
      setAmount('')
      setTouched(false)
    } catch (e) {
      const err = e instanceof SwapError ? e : new SwapError('NETWORK')
      // Keep the amount so the user can retry the same trade.
      onError?.(err, runSwap)
    } finally {
      setSubmitting(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (error) return
    void runSwap()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl backdrop-blur-xl sm:p-6"
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">{t('form.title')}</h1>
          <p className="text-xs text-slate-400">{t('form.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {t('form.liveRates')}
          </span>
          {onRefreshRates && (
            <button
              type="button"
              onClick={onRefreshRates}
              aria-label={t('a11y.refreshRates')}
              className="rounded-full border border-white/10 bg-white/[0.04] p-1 text-slate-400 transition hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="relative flex flex-col gap-1.5">
        <TokenField
          label={t('form.youPay')}
          token={fromToken}
          value={amount}
          usdValue={fromUsd}
          onValueChange={(v) => {
            setTouched(true)
            setAmount(v)
          }}
          onOpenSelect={() => setActiveSide('from')}
          onMax={handleMax}
          error={showError ? errorMessage ?? undefined : undefined}
        />

        {/* Swap-direction button, overlapping the two fields */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-center">
          <button
            type="button"
            onClick={handleSwapDirection}
            aria-label={t('a11y.swapDirection')}
            className="pointer-events-auto group flex h-10 w-10 items-center justify-center rounded-xl border-4 border-slate-900 bg-indigo-500 text-white shadow-lg transition hover:bg-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 active:scale-95"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="transition-transform duration-300 group-hover:rotate-180"
            >
              <path d="M7 4v13M7 17l-3-3m3 3 3-3M17 20V7m0 13 3-3m-3 3-3-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <TokenField
          label={t('form.youReceive')}
          token={toToken}
          value={
            parsedAmount > 0 && Number.isFinite(receiveAmount)
              ? formatTokenAmount(receiveAmount, locale)
              : ''
          }
          readOnly
          usdValue={toUsd}
          onOpenSelect={() => setActiveSide('to')}
        />
      </div>

      {/* Exchange-rate line */}
      <div className="mt-4 flex items-center justify-between rounded-xl bg-white/[0.03] px-3.5 py-2.5 text-xs">
        <span className="text-slate-400">{t('form.rateLabel')}</span>
        <span className="font-medium text-slate-200">
          {t('form.rate', {
            fromSymbol: fromToken.symbol,
            rate: formatTokenAmount(rate, locale),
            toSymbol: toToken.symbol,
          })}
        </span>
      </div>

      {/* Inline validation message */}
      <div className="mt-3 min-h-[1.25rem]">
        {showError && (
          <p className="animate-fade-in flex items-center gap-1.5 text-xs font-medium text-rose-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4m0 4h.01" strokeLinecap="round" />
            </svg>
            {errorMessage}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={!!error || submitting}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-3.5 text-sm font-bold text-white shadow-lg transition
          hover:from-indigo-400 hover:to-violet-400
          disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400 disabled:shadow-none
          focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 active:scale-[0.99]"
      >
        {submitting ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z" />
            </svg>
            {t('form.confirming')}
          </>
        ) : amount.trim() === '' ? (
          t('form.enterAmountShort')
        ) : errorMessage ? (
          errorMessage
        ) : (
          t('form.confirmSwap')
        )}
      </button>

      {parsedAmount > 0 && !error && (
        <p className="mt-3 text-center text-[11px] text-slate-500">
          {t('form.receiveHint', {
            amount: formatTokenAmount(receiveAmount, locale),
            symbol: toToken.symbol,
            usd: formatUsd(toUsd, locale),
          })}
        </p>
      )}

      <TokenSelectModal
        open={activeSide !== null}
        tokens={tokens}
        selectedSymbol={activeSide === 'from' ? fromToken.symbol : toToken.symbol}
        disabledSymbol={activeSide === 'from' ? toToken.symbol : fromToken.symbol}
        onSelect={handleSelect}
        onClose={() => setActiveSide(null)}
      />
    </form>
  )
}
