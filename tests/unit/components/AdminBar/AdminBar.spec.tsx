/**
 * Unit tests for the AdminBar component.
 *
 * AdminBar is shown only to users with the 'admin' role.  It delegates the
 * actual admin-bar UI to the @payloadcms/admin-bar package.  The component
 * derives the current collection from URL segments via useSelectedLayoutSegments.
 *
 * Dependencies mocked here:
 *   - next/navigation              (useSelectedLayoutSegments)
 *   - @payloadcms/admin-bar        (PayloadAdminBar – capture onAuthChange for testing)
 */

import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import type { User } from '@/payload-types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('next/navigation', () => ({
  useSelectedLayoutSegments: vi.fn(),
}))

/** Capture the onAuthChange callback so tests can trigger auth events. */
let capturedOnAuthChange: ((user: User | null) => void) | undefined

vi.mock('@payloadcms/admin-bar', () => ({
  PayloadAdminBar: (props: { onAuthChange?: (user: User | null) => void; className?: string }) => {
    capturedOnAuthChange = props.onAuthChange
    return <div data-testid="payload-admin-bar" className={props.className}>Admin Bar</div>
  },
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { useSelectedLayoutSegments } from 'next/navigation'
import { AdminBar } from '@/components/AdminBar'

const mockUseSelectedLayoutSegments = vi.mocked(useSelectedLayoutSegments)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  email: 'admin@example.com',
  roles: ['admin'],
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  ...overrides,
} as User)

/** Trigger an auth change event with the supplied user. */
const triggerAuthChange = (user: User | null) => {
  act(() => {
    capturedOnAuthChange?.(user)
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AdminBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnAuthChange = undefined
    mockUseSelectedLayoutSegments.mockReturnValue([])
  })

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  it('renders the PayloadAdminBar element', () => {
    render(<AdminBar />)
    expect(screen.getByTestId('payload-admin-bar')).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Visibility – hidden by default
  // -------------------------------------------------------------------------

  it('is hidden before any auth event fires', () => {
    const { container } = render(<AdminBar />)
    // The wrapper div should carry the "hidden" class
    expect(container.firstChild).toHaveClass('hidden')
  })

  // -------------------------------------------------------------------------
  // Visibility – admin user
  // -------------------------------------------------------------------------

  it('becomes visible after an admin user authenticates', () => {
    const { container } = render(<AdminBar />)
    triggerAuthChange(makeUser({ roles: ['admin'] }))
    expect(container.firstChild).toHaveClass('block')
    expect(container.firstChild).not.toHaveClass('hidden')
  })

  it('remains hidden when a non-admin user authenticates', () => {
    const { container } = render(<AdminBar />)
    triggerAuthChange(makeUser({ roles: ['customer'] }))
    expect(container.firstChild).toHaveClass('hidden')
    expect(container.firstChild).not.toHaveClass('block')
  })

  it('remains hidden when a user with no roles authenticates', () => {
    const { container } = render(<AdminBar />)
    triggerAuthChange(makeUser({ roles: undefined }))
    expect(container.firstChild).toHaveClass('hidden')
  })

  it('becomes hidden again when auth changes to null', () => {
    const { container } = render(<AdminBar />)
    // First make it visible
    triggerAuthChange(makeUser({ roles: ['admin'] }))
    expect(container.firstChild).toHaveClass('block')
    // Then revoke
    triggerAuthChange(null)
    expect(container.firstChild).toHaveClass('hidden')
  })

  // -------------------------------------------------------------------------
  // adminBarProps forwarding
  // -------------------------------------------------------------------------

  it('renders without crashing when adminBarProps is provided', () => {
    render(<AdminBar adminBarProps={{ id: 'custom-id' }} />)
    expect(screen.getByTestId('payload-admin-bar')).toBeInTheDocument()
  })
})
