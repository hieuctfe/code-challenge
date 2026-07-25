import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export type ToastVariant = 'success' | 'error'

interface ToastProps {
  message: string
  detail?: string
  variant?: ToastVariant
  /** Optional retry action, shown as a button (used by the error toast). */
  onRetry?: () => void
  onDismiss: () => void
}

const VARIANTS = {
  success: {
    ring: 'border-emerald-400/25',
    iconWrap: 'bg-emerald-500/20 text-emerald-400',
    icon: <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />,
  },
  error: {
    ring: 'border-rose-400/30',
    iconWrap: 'bg-rose-500/20 text-rose-400',
    icon: <path d="M12 8v5m0 3h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />,
  },
} as const

/** A transient toast that auto-dismisses; success (default) or error variant. */
export function Toast({ message, detail, variant = 'success', onRetry, onDismiss }: ToastProps) {
  const { t } = useTranslation()

  useEffect(() => {
    // Error toasts linger a little longer so the retry action is reachable.
    const timeout = variant === 'error' ? 6000 : 4200
    const timer = setTimeout(onDismiss, timeout)
    return () => clearTimeout(timer)
  }, [onDismiss, variant])

  const v = VARIANTS[variant]

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div
        role="status"
        className={`animate-toast-in pointer-events-auto flex items-start gap-3 rounded-2xl border ${v.ring} bg-slate-900/95 px-4 py-3 shadow-2xl backdrop-blur`}
      >
        <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${v.iconWrap}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            {v.icon}
          </svg>
        </span>
        <div className="pr-2">
          <p className="text-sm font-semibold text-white">{message}</p>
          {detail && <p className="mt-0.5 text-xs text-slate-400">{detail}</p>}
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-1.5 rounded-md text-xs font-semibold text-rose-300 transition hover:text-rose-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              {t('toast.retry')}
            </button>
          )}
        </div>
        <button
          onClick={onDismiss}
          aria-label={t('a11y.dismiss')}
          className="rounded-full p-1 text-slate-500 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
