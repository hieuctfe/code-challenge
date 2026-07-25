import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SwapForm } from './SwapForm'
import { TEST_TOKENS } from '../test/fixtures'

function renderForm() {
  const onSuccess = vi.fn()
  render(<SwapForm tokens={TEST_TOKENS} onSuccess={onSuccess} />)
  return { onSuccess }
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

  it('shows a loading state then reports success on submit', async () => {
    const user = userEvent.setup()
    const { onSuccess } = renderForm()
    await user.type(payInput(), '2')

    await user.click(screen.getByRole('button', { name: 'CONFIRM SWAP' }))

    // Immediately after clicking, the mocked round-trip is in flight.
    expect(screen.getByRole('button', { name: /confirming swap/i })).toBeDisabled()

    await waitFor(
      () => {
        expect(onSuccess).toHaveBeenCalledWith({
          fromAmount: 2,
          from: 'ETH',
          toAmount: 4000,
          to: 'USDC',
        })
      },
      { timeout: 3000 },
    )

    // The amount resets after a successful swap.
    expect(payInput().value).toBe('')
  })
})
