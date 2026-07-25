import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TokenSelectModal } from './TokenSelectModal'
import { TEST_TOKENS } from '../test/fixtures'

function renderModal(overrides: Partial<React.ComponentProps<typeof TokenSelectModal>> = {}) {
  const onSelect = vi.fn()
  const onClose = vi.fn()
  render(
    <TokenSelectModal
      open
      tokens={TEST_TOKENS}
      selectedSymbol="ETH"
      disabledSymbol="USDC"
      onSelect={onSelect}
      onClose={onClose}
      {...overrides}
    />,
  )
  return { onSelect, onClose }
}

describe('TokenSelectModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <TokenSelectModal
        open={false}
        tokens={TEST_TOKENS}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('lists every token when open', () => {
    renderModal()
    const dialog = screen.getByRole('dialog')
    for (const token of TEST_TOKENS) {
      expect(within(dialog).getByRole('button', { name: new RegExp(token.symbol) })).toBeInTheDocument()
    }
  })

  it('filters the list by search query', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.type(screen.getByPlaceholderText(/search/i), 'wbtc')

    expect(screen.getByRole('button', { name: /WBTC/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ETH/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /USDC/ })).not.toBeInTheDocument()
  })

  it('shows an empty state when nothing matches', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.type(screen.getByPlaceholderText(/search/i), 'zzz')
    expect(screen.getByText(/no tokens match/i)).toBeInTheDocument()
  })

  it('calls onSelect with the chosen token', async () => {
    const user = userEvent.setup()
    const { onSelect } = renderModal()
    await user.click(screen.getByRole('button', { name: /WBTC/ }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ symbol: 'WBTC' }))
  })

  it('disables the opposite side token so it cannot be picked', async () => {
    const user = userEvent.setup()
    const { onSelect } = renderModal({ disabledSymbol: 'USDC' })
    const disabled = screen.getByRole('button', { name: /USDC/ })
    expect(disabled).toBeDisabled()
    await user.click(disabled)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
