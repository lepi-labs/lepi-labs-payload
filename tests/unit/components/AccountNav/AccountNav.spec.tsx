/**
 * Unit tests for the AccountNav component.
 *
 * AccountNav renders a set of navigation links and applies an active
 * highlight to the link matching the current pathname.
 *
 * Dependencies mocked here:
 *   - next/navigation  (usePathname)
 *   - next/link        (Link → plain <a>)
 */

import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  ),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { usePathname } from 'next/navigation'
import { AccountNav } from '@/components/AccountNav'

const mockUsePathname = vi.mocked(usePathname)

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AccountNav', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePathname.mockReturnValue('/')
  })

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  it('renders all navigation links', () => {
    render(<AccountNav />)

    expect(screen.getByRole('link', { name: /account settings/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /addresses/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /orders/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /log out/i })).toBeInTheDocument()
  })

  it('links to correct hrefs', () => {
    render(<AccountNav />)

    expect(screen.getByRole('link', { name: /account settings/i })).toHaveAttribute(
      'href',
      '/account',
    )
    expect(screen.getByRole('link', { name: /addresses/i })).toHaveAttribute(
      'href',
      '/account/addresses',
    )
    expect(screen.getByRole('link', { name: /orders/i })).toHaveAttribute('href', '/orders')
    expect(screen.getByRole('link', { name: /log out/i })).toHaveAttribute('href', '/logout')
  })

  // -------------------------------------------------------------------------
  // Active link – /account
  // -------------------------------------------------------------------------

  it('marks "Account settings" as active on /account', () => {
    mockUsePathname.mockReturnValue('/account')
    render(<AccountNav />)

    const link = screen.getByRole('link', { name: /account settings/i })
    expect(link.className).toContain('text-primary/100')
  })

  it('does not mark "Account settings" as active on a different path', () => {
    mockUsePathname.mockReturnValue('/account/addresses')
    render(<AccountNav />)

    const link = screen.getByRole('link', { name: /account settings/i })
    // The link always has hover:text-primary/100 as part of its base style.
    // The *active* state additionally adds the standalone text-primary/100 class
    // (without a prefix).  Check that the standalone token is absent.
    expect(link.className).not.toMatch(/(^| )text-primary\/100( |$)/)
  })

  // -------------------------------------------------------------------------
  // Active link – /account/addresses
  // -------------------------------------------------------------------------

  it('marks "Addresses" as active on /account/addresses', () => {
    mockUsePathname.mockReturnValue('/account/addresses')
    render(<AccountNav />)

    const link = screen.getByRole('link', { name: /addresses/i })
    expect(link.className).toContain('text-primary/100')
  })

  // -------------------------------------------------------------------------
  // Active link – /orders
  // -------------------------------------------------------------------------

  it('marks "Orders" as active on /orders', () => {
    mockUsePathname.mockReturnValue('/orders')
    render(<AccountNav />)

    // With Button asChild, the active className is merged onto the rendered <a> element.
    const link = screen.getByRole('link', { name: /orders/i })
    expect(link.className).toMatch(/(^| )text-primary\/100( |$)/)
  })

  it('marks "Orders" as active on a sub-order path like /orders/123', () => {
    mockUsePathname.mockReturnValue('/orders/123')
    render(<AccountNav />)

    const link = screen.getByRole('link', { name: /orders/i })
    expect(link.className).toMatch(/(^| )text-primary\/100( |$)/)
  })

  // -------------------------------------------------------------------------
  // Active link – /logout
  // -------------------------------------------------------------------------

  it('marks "Log out" as active on /logout', () => {
    mockUsePathname.mockReturnValue('/logout')
    render(<AccountNav />)

    // With Button asChild, the active className is merged onto the rendered <a> element.
    const link = screen.getByRole('link', { name: /log out/i })
    expect(link.className).toMatch(/(^| )text-primary\/100( |$)/)
  })

  // -------------------------------------------------------------------------
  // className prop forwarding
  // -------------------------------------------------------------------------

  it('forwards className to the wrapper div', () => {
    const { container } = render(<AccountNav className="my-custom-class" />)
    expect(container.firstChild).toHaveClass('my-custom-class')
  })
})
