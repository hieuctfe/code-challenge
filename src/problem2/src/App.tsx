import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePrices } from './hooks/usePrices'
import { useWallet } from './hooks/useWallet'
import { SwapForm } from './components/SwapForm'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { Toast, type ToastVariant } from './components/Toast'
import { formatTokenAmount } from './utils/format'
import { localeFor } from './i18n'
import { SWAP_ERROR_MESSAGE_KEY } from './services/swapService'

interface ToastState {
  message: string
  detail: string
  variant: ToastVariant
  onRetry?: () => void
}

export default function App() {
  const { t, i18n } = useTranslation()
  const locale = localeFor(i18n.language)
  const { tokens: priceTokens, loading, usingFallback, refresh } = usePrices()
  const wallet = useWallet(priceTokens)
  const [toast, setToast] = useState<ToastState | null>(null)

  // Keep the browser tab title in sync with the active language.
  useEffect(() => {
    document.title = t('app.title')
  }, [t, i18n.language])

  return (
    <div className="app-bg flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="fixed right-4 top-4 z-40">
        <LanguageSwitcher />
      </div>
      <main className="flex w-full flex-col items-center">
        {loading ? (
          <FormSkeleton />
        ) : (
          <SwapForm
            tokens={wallet.tokens}
            onSubmit={wallet.submit}
            onRefreshRates={refresh}
            onSuccess={(receipt) =>
              setToast({
                variant: 'success',
                message: t('toast.swapConfirmed'),
                detail: t('toast.swapDetail', {
                  fromAmount: formatTokenAmount(receipt.fromAmount, locale),
                  from: receipt.from,
                  toAmount: formatTokenAmount(receipt.toAmount, locale),
                  to: receipt.to,
                }),
              })
            }
            onError={(error, retry) =>
              setToast({
                variant: 'error',
                message: t('toast.swapFailed'),
                detail: t(SWAP_ERROR_MESSAGE_KEY[error.code]),
                onRetry: () => {
                  setToast(null)
                  retry()
                },
              })
            }
          />
        )}

        {usingFallback && !loading && (
          <p className="mt-4 max-w-md text-center text-[11px] text-amber-300/70">
            {t('app.fallbackBanner')}
          </p>
        )}

        <footer className="mt-6 text-center text-[11px] text-slate-600">
          {t('app.footer')}
        </footer>
      </main>

      {toast && (
        <Toast
          message={toast.message}
          detail={toast.detail}
          variant={toast.variant}
          onRetry={toast.onRetry}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}

/** Loading placeholder shown while prices are being fetched. */
function FormSkeleton() {
  return (
    <div className="w-full max-w-md animate-pulse rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-xl">
      <div className="mb-6 h-6 w-24 rounded-lg bg-white/10" />
      <div className="mb-2 h-28 rounded-2xl bg-white/[0.04]" />
      <div className="mb-2 h-28 rounded-2xl bg-white/[0.04]" />
      <div className="mt-4 h-10 rounded-xl bg-white/[0.04]" />
      <div className="mt-4 h-14 rounded-2xl bg-white/10" />
    </div>
  )
}
