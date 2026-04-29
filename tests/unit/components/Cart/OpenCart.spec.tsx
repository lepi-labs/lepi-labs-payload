/**
 * Unit tests for the OpenCartButton component.
 *
 * OpenCartButton is a presentational component that renders the cart icon
 * in the navigation bar. It optionally displays a quantity badge when the
 * `quantity` prop is provided.
 *
 * No external hooks – tests only verify rendered output.
 */

import React from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { OpenCartButton } from '@/components/Cart/OpenCart'

describe('OpenCartButton', () => {
  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  it('renders the "Cart" label', () => {
    render(<OpenCartButton />)
    expect(screen.getByText('Cart')).toBeInTheDocument()
  })

  it('renders a button element', () => {
    render(<OpenCartButton />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Quantity badge
  // -------------------------------------------------------------------------

  it('does not display a quantity badge when quantity is undefined', () => {
    render(<OpenCartButton />)
    // Only the plain "Cart" text node should be visible; no numeric badge
    expect(screen.queryByText(/\d+/)).not.toBeInTheDocument()
  })

  it('does not display a quantity badge when quantity is 0', () => {
    render(<OpenCartButton quantity={0} />)
    expect(screen.queryByText(/\d+/)).not.toBeInTheDocument()
  })

  it('displays the quantity when quantity > 0', () => {
    render(<OpenCartButton quantity={3} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('displays the separator dot when quantity > 0', () => {
    render(<OpenCartButton quantity={5} />)
    expect(screen.getByText('•')).toBeInTheDocument()
  })

  it('does not display the separator dot when quantity is undefined', () => {
    render(<OpenCartButton />)
    expect(screen.queryByText('•')).not.toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Extra props
  // -------------------------------------------------------------------------

  it('renders without error when extra props are provided', () => {
    // OpenCartButton destructures className but does not forward it to the
    // underlying Button element; this test verifies the component still renders
    // without crashing when additional props are passed.
    expect(() => render(<OpenCartButton className="extra-class" />)).not.toThrow()
  })
})
