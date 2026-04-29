/**
 * Unit tests for the CheckoutAddresses component.
 *
 * CheckoutAddresses fetches the current user's saved addresses via the
 * useAddresses hook from the Payload ecommerce plugin and either:
 *   - Shows a "no addresses found" message with a create-address modal, or
 *   - Shows a heading, description, and an "Select an address" dialog trigger.
 *
 * Dependencies mocked:
 *   - @payloadcms/plugin-ecommerce/client/react  (useAddresses)
 *   - @/components/addresses/AddressItem
 *   - @/components/addresses/CreateAddressModal
 *   - @/components/ui/dialog  (Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger)
 *   - @/components/ui/button  (Button)
 */

import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import type { Address } from '@/payload-types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@payloadcms/plugin-ecommerce/client/react', () => ({
  useAddresses: vi.fn(),
}))

vi.mock('@/components/addresses/AddressItem', () => ({
  AddressItem: ({
    address,
    actions,
    beforeActions,
  }: {
    address: Partial<Address>
    actions?: React.ReactNode
    beforeActions?: React.ReactNode
  }) => (
    <div data-testid={`address-item-${address.id}`}>
      <span>{address.firstName}</span>
      {beforeActions}
      {actions}
    </div>
  ),
}))

vi.mock('@/components/addresses/CreateAddressModal', () => ({
  CreateAddressModal: () => <button>Add a new address</button>,
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode
    open?: boolean
    onOpenChange?: (v: boolean) => void
  }) => {
    void open
    void onOpenChange
    return <div data-testid="dialog">{children}</div>
  },
  DialogTrigger: ({
    children,
    asChild,
  }: {
    children: React.ReactNode
    asChild?: boolean
  }) => (asChild ? children : <div data-testid="dialog-trigger">{children}</div>),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    variant: _variant,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button onClick={onClick} {...rest}>
      {children}
    </button>
  ),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { useAddresses } from '@payloadcms/plugin-ecommerce/client/react'
import { CheckoutAddresses } from '@/components/checkout/CheckoutAddresses'

const mockUseAddresses = vi.mocked(useAddresses)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeAddress = (overrides: Partial<Address> = {}): Address => ({
  id: 'addr-1',
  firstName: 'Jane',
  lastName: 'Doe',
  addressLine1: '123 Main St',
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

describe('CheckoutAddresses', () => {
  const setAddress = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // Empty addresses
  // -------------------------------------------------------------------------

  it('shows "no addresses found" message when address list is empty', () => {
    mockUseAddresses.mockReturnValue({ addresses: [] } as unknown as ReturnType<
      typeof useAddresses
    >)
    render(<CheckoutAddresses setAddress={setAddress} />)
    expect(screen.getByText(/No addresses found/i)).toBeInTheDocument()
  })

  it('shows "no addresses found" message when addresses is null', () => {
    mockUseAddresses.mockReturnValue({ addresses: null } as unknown as ReturnType<
      typeof useAddresses
    >)
    render(<CheckoutAddresses setAddress={setAddress} />)
    expect(screen.getByText(/No addresses found/i)).toBeInTheDocument()
  })

  it('shows "please add an address" message when address list is empty', () => {
    mockUseAddresses.mockReturnValue({ addresses: [] } as unknown as ReturnType<
      typeof useAddresses
    >)
    render(<CheckoutAddresses setAddress={setAddress} />)
    expect(screen.getByText(/Please add an address/i)).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // With addresses
  // -------------------------------------------------------------------------

  it('shows the heading when addresses are available', () => {
    mockUseAddresses.mockReturnValue({
      addresses: [makeAddress()],
    } as unknown as ReturnType<typeof useAddresses>)
    render(<CheckoutAddresses setAddress={setAddress} heading="Billing address" />)
    expect(screen.getByText('Billing address')).toBeInTheDocument()
  })

  it('shows the default heading "Addresses" when no heading prop is supplied', () => {
    mockUseAddresses.mockReturnValue({
      addresses: [makeAddress()],
    } as unknown as ReturnType<typeof useAddresses>)
    render(<CheckoutAddresses setAddress={setAddress} />)
    expect(screen.getByText('Addresses')).toBeInTheDocument()
  })

  it('shows the description when addresses are available', () => {
    mockUseAddresses.mockReturnValue({
      addresses: [makeAddress()],
    } as unknown as ReturnType<typeof useAddresses>)
    render(<CheckoutAddresses setAddress={setAddress} description="Pick your address." />)
    expect(screen.getByText('Pick your address.')).toBeInTheDocument()
  })

  it('shows "Select an address" button when addresses are available', () => {
    mockUseAddresses.mockReturnValue({
      addresses: [makeAddress()],
    } as unknown as ReturnType<typeof useAddresses>)
    render(<CheckoutAddresses setAddress={setAddress} />)
    expect(screen.getByRole('button', { name: /select an address/i })).toBeInTheDocument()
  })

  it('renders address items inside the dialog when dialog is opened', () => {
    const address = makeAddress({ id: 'addr-42', firstName: 'Alice' })
    mockUseAddresses.mockReturnValue({
      addresses: [address],
    } as unknown as ReturnType<typeof useAddresses>)
    render(<CheckoutAddresses setAddress={setAddress} />)

    // Open the dialog
    fireEvent.click(screen.getByRole('button', { name: /select an address/i }))
    expect(screen.getByTestId('address-item-addr-42')).toBeInTheDocument()
  })

  it('calls setAddress with the correct address when Select is clicked', () => {
    const address = makeAddress({ id: 'addr-99', firstName: 'Bob' })
    mockUseAddresses.mockReturnValue({
      addresses: [address],
    } as unknown as ReturnType<typeof useAddresses>)
    render(<CheckoutAddresses setAddress={setAddress} />)

    // Open the dialog then click Select
    fireEvent.click(screen.getByRole('button', { name: /select an address/i }))
    fireEvent.click(screen.getByRole('button', { name: /^select$/i }))
    expect(setAddress).toHaveBeenCalledWith(address)
  })
})
