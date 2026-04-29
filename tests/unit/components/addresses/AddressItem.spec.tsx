/**
 * Unit tests for the addresses/AddressItem component.
 *
 * AddressItem renders address information and optional action buttons.
 * When actions are not hidden and an id is present, it renders a
 * CreateAddressModal by default.
 *
 * Dependencies mocked here:
 *   - @/components/addresses/CreateAddressModal
 *   - next/navigation (usePathname – pulled in transitively by CreateAddressModal deps)
 */

import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/components/addresses/CreateAddressModal', () => ({
  CreateAddressModal: ({
    buttonText,
    modalTitle,
    addressID,
  }: {
    buttonText?: string
    modalTitle?: string
    addressID?: string
  }) => (
    <button data-testid="create-address-modal" data-address-id={addressID}>
      {buttonText ?? 'Edit'}
    </button>
  ),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import type { Address } from '@/payload-types'
import { AddressItem } from '@/components/addresses/AddressItem'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeAddress = (
  overrides: Partial<Omit<Address, 'country'>> & { country?: string } = {},
): Partial<Omit<Address, 'country'>> & { country?: string } => ({
  id: 'addr-1',
  title: 'Mr',
  firstName: 'John',
  lastName: 'Doe',
  company: 'Acme Corp',
  phone: '555-1234',
  addressLine1: '123 Main St',
  addressLine2: 'Suite 4',
  city: 'Springfield',
  state: 'IL',
  postalCode: '62701',
  country: 'US',
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  ...overrides,
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AddressItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // Null guard
  // -------------------------------------------------------------------------

  it('renders nothing when address is falsy', () => {
    // @ts-expect-error — intentionally passing undefined to test guard
    const { container } = render(<AddressItem address={undefined} />)
    expect(container.firstChild).toBeNull()
  })

  // -------------------------------------------------------------------------
  // Address fields
  // -------------------------------------------------------------------------

  it('renders the full name', () => {
    render(<AddressItem address={makeAddress()} />)
    expect(screen.getByText(/John Doe/)).toBeInTheDocument()
  })

  it('renders the title when present', () => {
    render(<AddressItem address={makeAddress({ title: 'Dr' })} />)
    expect(screen.getByText(/Dr/)).toBeInTheDocument()
  })

  it('renders company when present', () => {
    render(<AddressItem address={makeAddress({ company: 'ACME' })} />)
    expect(screen.getByText(/ACME/)).toBeInTheDocument()
  })

  it('renders phone when present', () => {
    render(<AddressItem address={makeAddress({ phone: '555-9999' })} />)
    expect(screen.getByText('555-9999')).toBeInTheDocument()
  })

  it('renders addressLine1', () => {
    render(<AddressItem address={makeAddress({ addressLine1: '1 Test Ave' })} />)
    expect(screen.getByText(/1 Test Ave/)).toBeInTheDocument()
  })

  it('renders addressLine2 when present', () => {
    render(<AddressItem address={makeAddress({ addressLine2: 'Apt 2' })} />)
    expect(screen.getByText(/Apt 2/)).toBeInTheDocument()
  })

  it('renders city, state and postal code', () => {
    render(<AddressItem address={makeAddress()} />)
    expect(screen.getByText(/Springfield.*IL.*62701/s)).toBeInTheDocument()
  })

  it('renders country', () => {
    render(<AddressItem address={makeAddress({ country: 'Canada' })} />)
    expect(screen.getByText('Canada')).toBeInTheDocument()
  })

  it('omits optional fields when they are absent', () => {
    render(
      <AddressItem
        address={makeAddress({ title: undefined, company: undefined, phone: undefined, addressLine2: undefined })}
      />,
    )
    expect(screen.queryByText(/Mr/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Acme/)).not.toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Actions – default (Edit modal)
  // -------------------------------------------------------------------------

  it('renders the default Edit action when id is present', () => {
    render(<AddressItem address={makeAddress({ id: 'addr-1' })} />)
    expect(screen.getByTestId('create-address-modal')).toBeInTheDocument()
    expect(screen.getByTestId('create-address-modal')).toHaveTextContent('Edit')
  })

  it('passes the address id to CreateAddressModal', () => {
    render(<AddressItem address={makeAddress({ id: 'addr-42' })} />)
    expect(screen.getByTestId('create-address-modal')).toHaveAttribute(
      'data-address-id',
      'addr-42',
    )
  })

  it('does not render actions when hideActions is true', () => {
    render(<AddressItem address={makeAddress()} hideActions />)
    expect(screen.queryByTestId('create-address-modal')).not.toBeInTheDocument()
  })

  it('does not render default actions when address has no id', () => {
    render(<AddressItem address={makeAddress({ id: undefined })} />)
    expect(screen.queryByTestId('create-address-modal')).not.toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Actions – custom overrides
  // -------------------------------------------------------------------------

  it('renders custom actions when provided', () => {
    render(
      <AddressItem
        address={makeAddress()}
        actions={<button data-testid="custom-action">Custom</button>}
      />,
    )
    expect(screen.getByTestId('custom-action')).toBeInTheDocument()
    expect(screen.queryByTestId('create-address-modal')).not.toBeInTheDocument()
  })

  it('renders beforeActions before the default modal', () => {
    render(
      <AddressItem
        address={makeAddress()}
        beforeActions={<span data-testid="before">Before</span>}
      />,
    )
    expect(screen.getByTestId('before')).toBeInTheDocument()
    expect(screen.getByTestId('create-address-modal')).toBeInTheDocument()
  })

  it('renders afterActions after the default modal', () => {
    render(
      <AddressItem
        address={makeAddress()}
        afterActions={<span data-testid="after">After</span>}
      />,
    )
    expect(screen.getByTestId('after')).toBeInTheDocument()
    expect(screen.getByTestId('create-address-modal')).toBeInTheDocument()
  })
})
