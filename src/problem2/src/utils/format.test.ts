import { describe, expect, it } from 'vitest'
import {
  formatBalance,
  formatTokenAmount,
  formatUsd,
  parseAmount,
} from './format'

describe('parseAmount', () => {
  it('parses a plain decimal string', () => {
    expect(parseAmount('12.5')).toBe(12.5)
  })

  it('strips thousands separators and surrounding whitespace', () => {
    expect(parseAmount('  1,234.56 ')).toBe(1234.56)
    expect(parseAmount('1,000,000')).toBe(1000000)
  })

  it('returns NaN for empty input', () => {
    expect(parseAmount('')).toBeNaN()
  })

  it('returns NaN for non-numeric input', () => {
    expect(parseAmount('abc')).toBeNaN()
    expect(parseAmount('1.2.3')).toBeNaN()
  })

  it('tolerates a trailing dot (mid-typing) as a valid number', () => {
    // Number("12.") === 12, which lets the field update while the user types.
    expect(parseAmount('12.')).toBe(12)
  })

  it('handles very large and very small magnitudes', () => {
    expect(parseAmount('1e-9')).toBe(1e-9)
    expect(parseAmount('123456789012345')).toBe(123456789012345)
  })

  it('parses negative values (validation happens elsewhere)', () => {
    expect(parseAmount('-5')).toBe(-5)
  })
})

describe('formatTokenAmount', () => {
  it('returns "0" for zero and non-finite values', () => {
    expect(formatTokenAmount(0)).toBe('0')
    expect(formatTokenAmount(NaN)).toBe('0')
    expect(formatTokenAmount(Infinity)).toBe('0')
  })

  it('uses 2 decimals for large magnitudes and groups thousands', () => {
    expect(formatTokenAmount(12345.678)).toBe('12,345.68')
  })

  it('uses more decimals for sub-1 values', () => {
    expect(formatTokenAmount(0.123456)).toBe('0.123456')
  })

  it('uses 8 decimals for very small values', () => {
    expect(formatTokenAmount(0.00000123)).toBe('0.00000123')
  })

  it('does not pad with trailing zeros (minimumFractionDigits 0)', () => {
    expect(formatTokenAmount(5)).toBe('5')
  })
})

describe('formatUsd', () => {
  it('formats as USD currency with 2 decimals', () => {
    expect(formatUsd(1234.5)).toBe('$1,234.50')
  })

  it('falls back to $0.00 for non-finite values', () => {
    expect(formatUsd(NaN)).toBe('$0.00')
  })

  it('shows extra precision for sub-cent values', () => {
    expect(formatUsd(0.0001234)).toBe('$0.000123')
  })
})

describe('formatBalance', () => {
  it('shows up to 4 decimals for values >= 1', () => {
    expect(formatBalance(1234.56789)).toBe('1,234.5679')
  })

  it('shows up to 6 decimals for values < 1', () => {
    expect(formatBalance(0.1234567)).toBe('0.123457')
  })
})
