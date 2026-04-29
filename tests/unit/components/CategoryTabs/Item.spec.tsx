/**
 * Unit tests for the CategoryTabs/Item component.
 *
 * Item is a client component that renders either a Next.js Link (when inactive)
 * or a plain <p> element (when active). Active state is determined by comparing
 * the current pathname to the item's href prop.
 *
 * Dependencies mocked:
 *   - next/navigation  (usePathname, useSearchParams)
 *   - next/link        (Link)
 */

import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    prefetch: _prefetch,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }) => (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  ),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { usePathname, useSearchParams } from 'next/navigation'
import { Item } from '@/components/CategoryTabs/Item'

import type { ReadonlyURLSearchParams } from 'next/navigation'

const mockUsePathname = vi.mocked(usePathname)
const mockUseSearchParams = vi.mocked(useSearchParams)

const mockSearchParams = (params?: string): ReadonlyURLSearchParams =>
  new URLSearchParams(params) as ReadonlyURLSearchParams

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CategoryTabs/Item', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePathname.mockReturnValue('/')
    mockUseSearchParams.mockReturnValue(mockSearchParams())
  })

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  it('renders the item title', () => {
    render(<Item href="/shop" title="All" />)
    expect(screen.getByText('All')).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Inactive state – renders a link
  // -------------------------------------------------------------------------

  it('renders a link when the current pathname does not match href', () => {
    mockUsePathname.mockReturnValue('/shop/widgets')
    render(<Item href="/shop" title="All" />)
    // Link is rendered as an <a> in the mock
    expect(screen.getByRole('link', { name: 'All' })).toBeInTheDocument()
  })

  it('link points to the correct href', () => {
    mockUsePathname.mockReturnValue('/')
    render(<Item href="/shop/electronics" title="Electronics" />)
    const link = screen.getByRole('link', { name: 'Electronics' })
    expect(link).toHaveAttribute('href', '/shop/electronics')
  })

  // -------------------------------------------------------------------------
  // Active state – renders a paragraph instead of a link
  // -------------------------------------------------------------------------

  it('renders a paragraph element when the current pathname matches href', () => {
    mockUsePathname.mockReturnValue('/shop')
    render(<Item href="/shop" title="All" />)
    // When active the component renders <p> not <a>
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('All').tagName).toBe('P')
  })

  // -------------------------------------------------------------------------
  // CSS class for active state
  // -------------------------------------------------------------------------

  it('applies the active background class when item is active', () => {
    mockUsePathname.mockReturnValue('/shop')
    render(<Item href="/shop" title="All" />)
    const el = screen.getByText('All')
    expect(el.className).toMatch(/bg-white\/5/)
  })

  it('does not apply the active background class when item is inactive', () => {
    mockUsePathname.mockReturnValue('/shop/other')
    render(<Item href="/shop" title="All" />)
    const el = screen.getByRole('link', { name: 'All' })
    // The standalone active class `bg-white/5` (without `hover:` prefix) must not be present
    const classes = el.className.split(' ')
    expect(classes).not.toContain('bg-white/5')
  })
})
