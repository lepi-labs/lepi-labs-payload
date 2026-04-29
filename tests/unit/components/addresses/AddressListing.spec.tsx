/**
 * Unit tests for the addresses/AddressListing component.
 *
 * AddressListing fetches the current user's addresses via the useAddresses
 * hook and renders them, or shows an empty-state message.
 *
 * Dependencies mocked here:
 *   - @payloadcms/plugin-ecommerce/client/react  (useAddresses hook)
 *   - @/components/addresses/AddressItem          (rendering detail tested separately)
 */

import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@payloadcms/plugin-ecommerce/client/react', () => ({
  useAddresses: vi.fn(),
}))

vi.mock('@/components/addresses/AddressItem', () => ({
  AddressItem: ({ address }: { address: { id?: string; firstName?: string } }) => (
    <div data-testid={`address-item-${address.id}`}>{address.firstName}</div>
  ),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { useAddresses } from '@payloadcms/plugin-ecommerce/client/react'
import { AddressListing } from '@/components/addresses/AddressListing'
import type { Address } from '@/payload-types'

const mockUseAddresses = vi.mocked(useAddresses)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeAddress = (overrides: Partial<Address> = {}): Address => ({
  id: 'addr-1',
  firstName: 'Jane',
  lastName: 'Smith',
  addressLine1: '1 Example St',
  city: 'Chicago',
  state: 'IL',
  postalCode: '60601',
  country: 'US',
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  ...overrides,
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AddressListing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // Empty states
  // -------------------------------------------------------------------------

  it('shows empty message when addresses is undefined', () => {
    mockUseAddresses.mockReturnValue({ addresses: undefined } as unknown as ReturnType<typeof useAddresses>)
    render(<AddressListing />)
    expect(screen.getByText(/no addresses found/i)).toBeInTheDocument()
  })

  it('shows empty message when addresses array is empty', () => {
    mockUseAddresses.mockReturnValue({ addresses: [] } as unknown as ReturnType<typeof useAddresses>)
    render(<AddressListing />)
    expect(screen.getByText(/no addresses found/i)).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Populated list
  // -------------------------------------------------------------------------

  it('renders an AddressItem for each address', () => {
    const addresses = [
      makeAddress({ id: 'addr-1', firstName: 'Alice' }),
      makeAddress({ id: 'addr-2', firstName: 'Bob' }),
    ]
    mockUseAddresses.mockReturnValue({ addresses } as ReturnType<typeof useAddresses>)
    render(<AddressListing />)

    expect(screen.getByTestId('address-item-addr-1')).toBeInTheDocument()
    expect(screen.getByTestId('address-item-addr-2')).toBeInTheDocument()
  })

  it('renders the correct number of list items', () => {
    const addresses = [
      makeAddress({ id: 'addr-1' }),
      makeAddress({ id: 'addr-2' }),
      makeAddress({ id: 'addr-3' }),
    ]
    mockUseAddresses.mockReturnValue({ addresses } as ReturnType<typeof useAddresses>)
    render(<AddressListing />)

    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('does not show empty message when addresses are present', () => {
    mockUseAddresses.mockReturnValue({
      addresses: [makeAddress()],
    } as ReturnType<typeof useAddresses>)
    render(<AddressListing />)

    expect(screen.queryByText(/no addresses found/i)).not.toBeInTheDocument()
  })
})
