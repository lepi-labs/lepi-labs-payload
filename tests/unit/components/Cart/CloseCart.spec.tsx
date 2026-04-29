/**
 * Unit tests for the CloseCart component.
 *
 * CloseCart is a pure presentational component that renders a close/X icon
 * inside a styled container. It accepts an optional `className` prop which is
 * forwarded to the inner icon element via clsx.
 *
 * No external hooks or async behaviour – tests only verify the rendered output.
 */

import React from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { CloseCart } from '@/components/Cart/CloseCart'

describe('CloseCart', () => {
  it('renders without crashing', () => {
    const { container } = render(<CloseCart />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders an SVG icon (the X icon)', () => {
    const { container } = render(<CloseCart />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('applies the provided className to the icon element', () => {
    const { container } = render(<CloseCart className="my-custom-class" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveClass('my-custom-class')
  })

  it('renders without a className prop without error', () => {
    // Should not throw when className is omitted
    expect(() => render(<CloseCart />)).not.toThrow()
  })
})
