import { afterEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LanguageSwitcher } from './LanguageSwitcher'
import i18n from '../i18n'

afterEach(async () => {
  await i18n.changeLanguage('en')
  localStorage.clear()
})

describe('LanguageSwitcher', () => {
  it('renders EN and VI controls with EN active by default', () => {
    render(<LanguageSwitcher />)
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'VI' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('switches the language and marks the new choice active', async () => {
    const user = userEvent.setup()
    render(<LanguageSwitcher />)

    await user.click(screen.getByRole('button', { name: 'VI' }))

    expect(i18n.language).toBe('vi')
    expect(screen.getByRole('button', { name: 'VI' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('persists the selected language to localStorage', async () => {
    const user = userEvent.setup()
    render(<LanguageSwitcher />)

    await user.click(screen.getByRole('button', { name: 'VI' }))

    // i18next-browser-languagedetector caches under this key.
    expect(localStorage.getItem('i18nextLng')).toBe('vi')
  })
})
