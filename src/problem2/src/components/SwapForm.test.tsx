import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SwapForm } from './SwapForm'
import { SwapError, type SwapIntent, type SwapReceipt } from '../services/swapService'
import { ETH, TEST_TOKENS, USDC } from '../test/fixtures'

/** Build a deterministic receipt from an intent, applying the trade to balances. */
function receiptFor(intent: SwapIntent): SwapReceipt {
  return {
    txHash: '0xtest',
    ...intent,
    executedAt: 0,
    newBalances: {
      ETH: 10 - (intent.from === 'ETH' ? intent.fromAmount : 0),
      USDC: 5000 + (intent.to === 'USDC' ? intent.toAmount : 0),
    },
  }
}

function renderForm(
  overrides: Partial<React.ComponentProps<typeof SwapForm>> = {},
) {
  const onSuccess = vi.fn()
  const onError = vi.fn()
  // Default submit resolves on a short delay so the loading state is observable.
  const onSubmit = vi.fn(
    (intent: SwapIntent) =>
      new Promise<SwapReceipt>((resolve) => setTimeout(() => resolve(receiptFor(intent)), 20)),
  )
  render(
    <SwapForm tokens={TEST_TOKENS} onSubmit={onSubmit} onSuccess={onSuccess} onError={onError} {...overrides} />,
  )
  return { onSuccess, onError, onSubmit }
}

const payInput = () => screen.getByLabelText('You pay amount') as HTMLInputElement
const receiveInput = () => screen.getByLabelText('You receive amount') as HTMLInputElement
const submitButton = () => screen.getByRole('button', { name: /confirm swap|enter an amount|amount|number|different|balance/i })

describe('SwapForm', () => {
  it('renders both sides with the default ETH -> USDC pair and a rate line', () => {
    renderForm()
    expect(payInput()).toBeInTheDocument()
    expect(receiveInput()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'You pay token: ETH' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'You receive token: USDC' })).toBeInTheDocument()
    // 1 ETH ($2000) = 2000 USDC ($1)
    expect(screen.getByText(/1 ETH = 2,000 USDC/)).toBeInTheDocument()
  })

  it('disables submit initially with no amount entered', () => {
    renderForm()
    expect(screen.getByRole('button', { name: 'Enter an amount' })).toBeDisabled()
  })

  it.each([
    ['0', /greater than zero/i],
    ['-5', /greater than zero/i],
    ['abc', /valid number/i],
  ])('shows an inline error and disables submit for invalid amount %s', async (value, message) => {
    const user = userEvent.setup()
    renderForm()
    await user.type(payInput(), value)
    // The message renders both in the inline error and on the submit button.
    expect(screen.getAllByText(message).length).toBeGreaterThan(0)
    expect(submitButton()).toBeDisabled()
  })

  it('errors when the amount exceeds the wallet balance', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.type(payInput(), '999') // ETH balance is 10
    expect(screen.getAllByText(/insufficient balance/i).length).toBeGreaterThan(0)
    expect(submitButton()).toBeDisabled()
  })

  it('clicking MAX fills a spendable amount without an insufficient-balance error', async () => {
    // Regression: a balance with many decimals used to be rounded UP by MAX
    // (toFixed), producing an amount just above the balance and tripping the
    // insufficient-balance check.
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    const eth = { ...ETH, balance: 3.123456789 }
    render(<SwapForm tokens={[eth, USDC].sort((a, b) => a.symbol.localeCompare(b.symbol))} onSuccess={onSuccess} />)

    await user.click(screen.getByRole('button', { name: 'MAX' }))

    expect(screen.queryByText(/insufficient balance/i)).not.toBeInTheDocument()
    expect(Number(payInput().value)).toBeLessThanOrEqual(eth.balance)
    expect(screen.getByRole('button', { name: 'CONFIRM SWAP' })).toBeEnabled()
  })

  it('computes the receive amount and enables submit for a valid amount', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.type(payInput(), '2')
    expect(receiveInput().value).toBe('4,000') // 2 ETH * 2000
    expect(screen.getByRole('button', { name: 'CONFIRM SWAP' })).toBeEnabled()
  })

  it('flips the two tokens when the swap-direction button is clicked', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.click(screen.getByRole('button', { name: 'Swap direction' }))
    expect(screen.getByRole('button', { name: 'You pay token: USDC' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'You receive token: ETH' })).toBeInTheDocument()
  })

  it('lets the user pick a new pay token, with the opposite token disabled', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.click(screen.getByRole('button', { name: 'You pay token: ETH' }))

    // The current receive token (USDC) must be disabled in the picker.
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('button', { name: /USDC/ })).toBeDisabled()

    await user.click(dialog.getByRole('button', { name: /WBTC/ }))
    expect(screen.getByRole('button', { name: 'You pay token: WBTC' })).toBeInTheDocument()
  })

  it('shows a loading state then reports success (with adjusted balances) on submit', async () => {
    const user = userEvent.setup()
    const { onSuccess } = renderForm()
    await user.type(payInput(), '2')

    await user.click(screen.getByRole('button', { name: 'CONFIRM SWAP' }))

    // Immediately after clicking, the round-trip is in flight.
    expect(screen.getByRole('button', { name: /confirming swap/i })).toBeDisabled()

    await waitFor(
      () => {
        expect(onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({ fromAmount: 2, from: 'ETH', toAmount: 4000, to: 'USDC' }),
        )
      },
      { timeout: 3000 },
    )

    // The receipt carries balances reduced for the "pay" side.
    const receipt = onSuccess.mock.calls[0][0] as SwapReceipt
    expect(receipt.newBalances.ETH).toBe(8) // 10 - 2

    // The amount resets after a successful swap.
    expect(payInput().value).toBe('')
  })

  it('reports an error and re-enables submit when the swap fails', async () => {
    const user = userEvent.setup()
    const onError = vi.fn()
    const onSubmit = vi.fn(() => Promise.reject(new SwapError('NETWORK')))
    const { onSuccess } = renderForm({ onSubmit, onError })
    await user.type(payInput(), '2')

    await user.click(screen.getByRole('button', { name: 'CONFIRM SWAP' }))

    await waitFor(() => expect(onError).toHaveBeenCalled())
    const [error, retry] = onError.mock.calls[0]
    expect(error).toBeInstanceOf(SwapError)
    expect(typeof retry).toBe('function')

    // No success, amount preserved for retry, button usable again.
    expect(onSuccess).not.toHaveBeenCalled()
    expect(payInput().value).toBe('2')
    expect(screen.getByRole('button', { name: 'CONFIRM SWAP' })).toBeEnabled()
  })
})
