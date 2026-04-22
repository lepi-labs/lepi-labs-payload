/**
 * Unit tests for the Price component.
 *
 * Price is a client component that renders a formatted monetary value using
 * the `useCurrency` hook from the Payload ecommerce plugin.  It supports:
 *   - A fixed `amount` (single price)
 *   - A price range via `lowestAmount` + `highestAmount`
 *   - An optional `currencyCode` prop to look up a specific currency
 *   - An optional `as` prop to change the wrapper element (`p` or `span`)
 *   - Returns `null` when no renderable data is provided
 *
 * All external dependencies are mocked so the tests run without a real
 * plugin or database connection.
 */

import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Mocks (hoisted by Vitest)
// ---------------------------------------------------------------------------

vi.mock('@payloadcms/plugin-ecommerce/client/react', () => ({
  useCurrency: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { useCurrency } from '@payloadcms/plugin-ecommerce/client/react'
import { Price } from '@/components/Price'

const mockUseCurrency = vi.mocked(useCurrency)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A minimal Currency shape satisfying the plugin's type. */
const makeCurrency = (code: string, symbol = '$') => ({
  code,
  decimals: 2,
  symbol,
  name: code,
  locale: 'en-US',
})

/** Default formatCurrency implementation: returns "$<amount>". */
const defaultFormat = (amount?: number | null) =>
  amount == null ? '' : `$${amount.toFixed(2)}`

/** Build the object returned by `useCurrency()`. */
const defaultCurrencyHook = () => ({
  currency: makeCurrency('USD'),
  formatCurrency: vi.fn((amount?: number | null) => defaultFormat(amount)),
  setCurrency: vi.fn(),
  supportedCurrencies: [makeCurrency('USD'), makeCurrency('EUR', '€')],
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Price', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCurrency.mockReturnValue(defaultCurrencyHook())
  })

  // -------------------------------------------------------------------------
  // Fixed amount
  // -------------------------------------------------------------------------

  it('renders a fixed amount', () => {
    render(<Price amount={29.99} />)
    expect(screen.getByText('$29.99')).toBeInTheDocument()
  })

  it('renders 0 as a fixed amount', () => {
    render(<Price amount={0} />)
    expect(screen.getByText('$0.00')).toBeInTheDocument()
  })

  it('calls formatCurrency with the correct amount', () => {
    const hook = defaultCurrencyHook()
    mockUseCurrency.mockReturnValue(hook)
    render(<Price amount={15.5} />)
    expect(hook.formatCurrency).toHaveBeenCalledWith(15.5, expect.anything())
  })

  // -------------------------------------------------------------------------
  // Fixed amount – wrapper element
  // -------------------------------------------------------------------------

  it('renders a <p> element by default', () => {
    const { container } = render(<Price amount={10} />)
    expect(container.querySelector('p')).toBeInTheDocument()
    expect(container.querySelector('span')).not.toBeInTheDocument()
  })

  it('renders a <span> element when as="span"', () => {
    const { container } = render(<Price amount={10} as="span" />)
    expect(container.querySelector('span')).toBeInTheDocument()
    expect(container.querySelector('p')).not.toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Currency code lookup
  // -------------------------------------------------------------------------

  it('passes the matched currency object to formatCurrency when currencyCode is provided', () => {
    const eurCurrency = makeCurrency('EUR', '€')
    const hook = defaultCurrencyHook()
    hook.supportedCurrencies = [makeCurrency('USD'), eurCurrency]
    mockUseCurrency.mockReturnValue(hook)

    render(<Price amount={99} currencyCode="EUR" />)

    expect(hook.formatCurrency).toHaveBeenCalledWith(
      99,
      expect.objectContaining({ currency: eurCurrency }),
    )
  })

  it('passes undefined currency to formatCurrency when currencyCode has no match', () => {
    const hook = defaultCurrencyHook()
    mockUseCurrency.mockReturnValue(hook)

    render(<Price amount={50} currencyCode="XYZ" />)

    expect(hook.formatCurrency).toHaveBeenCalledWith(50, expect.objectContaining({ currency: undefined }))
  })

  it('passes undefined currency to formatCurrency when no currencyCode prop is given', () => {
    const hook = defaultCurrencyHook()
    mockUseCurrency.mockReturnValue(hook)

    render(<Price amount={20} />)

    expect(hook.formatCurrency).toHaveBeenCalledWith(20, expect.objectContaining({ currency: undefined }))
  })

  // -------------------------------------------------------------------------
  // Price range – different low and high
  // -------------------------------------------------------------------------

  it('renders a price range when lowestAmount and highestAmount differ', () => {
    const hook = defaultCurrencyHook()
    mockUseCurrency.mockReturnValue(hook)

    render(<Price lowestAmount={10} highestAmount={50} />)

    expect(hook.formatCurrency).toHaveBeenCalledWith(10, expect.anything())
    expect(hook.formatCurrency).toHaveBeenCalledWith(50, expect.anything())
    expect(screen.getByText('$10.00 - $50.00')).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Price range – equal low and high
  // -------------------------------------------------------------------------

  it('renders a single price when lowestAmount equals highestAmount', () => {
    const hook = defaultCurrencyHook()
    mockUseCurrency.mockReturnValue(hook)

    render(<Price lowestAmount={25} highestAmount={25} />)

    // highestAmount === lowestAmount, so the range branch is skipped and only
    // lowestAmount is rendered (called once, not twice as in a range).
    expect(screen.getByText('$25.00')).toBeInTheDocument()
    expect(hook.formatCurrency).toHaveBeenCalledTimes(1)
    expect(hook.formatCurrency).toHaveBeenCalledWith(25, expect.anything())
  })

  // -------------------------------------------------------------------------
  // Null rendering
  // -------------------------------------------------------------------------

  it('renders nothing (null) when neither amount nor lowestAmount is provided', () => {
    // @ts-expect-error intentionally passing no price props to test null branch
    const { container } = render(<Price />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing (null) when lowestAmount is 0 (falsy)', () => {
    // NOTE: This is intentionally different from `amount={0}`, which renders
    // '$0.00' because the fixed-amount branch uses `typeof amount === 'number'`
    // (true for 0).  The range/single-value branches use `if (lowestAmount)`,
    // which evaluates to false for 0, so the component falls through and returns
    // null.  This test documents the current behavior so any future change is
    // deliberate.
    const { container } = render(<Price lowestAmount={0} highestAmount={0} />)
    expect(container.firstChild).toBeNull()
  })
})
