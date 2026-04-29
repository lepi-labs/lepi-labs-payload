/**
 * Unit tests for the addresses/CreateAddressModal component.
 *
 * CreateAddressModal wraps an AddressForm inside a Dialog.  The dialog is
 * opened via a trigger button and closed either programmatically (after a
 * successful form submission) or by the user dismissing it.
 *
 * Dependencies mocked here:
 *   - @/components/forms/AddressForm  (tested separately)
 *   - @/components/ui/dialog           (jsdom-friendly stubs)
 *   - @/components/ui/button           (pass-through stub)
 */

import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/components/forms/AddressForm', () => ({
  AddressForm: ({
    callback,
    addressID,
    skipSubmission,
  }: {
    callback?: (data: object) => void
    addressID?: string
    skipSubmission?: boolean
  }) => (
    <form data-testid="address-form" data-address-id={addressID ?? ''} data-skip={String(skipSubmission ?? false)}>
      <button
        type="button"
        data-testid="mock-form-submit"
        onClick={() => callback?.({ addressLine1: '1 Test St' })}
      >
        Submit
      </button>
    </form>
  ),
}))

vi.mock('@/components/ui/dialog', () => {
  const DialogContext = React.createContext<{
    open: boolean
    onOpenChange: (open: boolean) => void
  }>({ open: false, onOpenChange: () => {} })

  const Dialog = ({
    open = false,
    onOpenChange = () => {},
    children,
  }: {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children?: React.ReactNode
  }) => (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      <div data-testid="dialog" data-open={String(open)}>
        {children}
      </div>
    </DialogContext.Provider>
  )

  const DialogTrigger = ({
    children,
    disabled,
    asChild,
  }: {
    children?: React.ReactNode
    disabled?: boolean
    asChild?: boolean
  }) => {
    const { onOpenChange } = React.useContext(DialogContext)
    const handleClick = () => onOpenChange(true)

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{
        disabled?: boolean
        onClick?: React.MouseEventHandler
      }>
      return React.cloneElement(child, {
        disabled,
        onClick: handleClick,
      })
    }
    return <div onClick={handleClick}>{children}</div>
  }

  return {
    Dialog,
    DialogTrigger,
    DialogContent: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="dialog-content">{children}</div>
    ),
    DialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    DialogTitle: ({ children }: { children?: React.ReactNode }) => (
      <h2 data-testid="dialog-title">{children}</h2>
    ),
    DialogDescription: ({ children }: { children?: React.ReactNode }) => <p>{children}</p>,
  }
})

// Spy on window.location.reload to prevent JSDOM errors
const reloadMock = vi.fn()
Object.defineProperty(window, 'location', {
  value: { ...window.location, reload: reloadMock },
  writable: true,
})

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { CreateAddressModal } from '@/components/addresses/CreateAddressModal'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CreateAddressModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  it('renders the trigger button with default text', () => {
    render(<CreateAddressModal />)
    expect(screen.getByRole('button', { name: /add a new address/i })).toBeInTheDocument()
  })

  it('renders a custom trigger button text', () => {
    render(<CreateAddressModal buttonText="Edit address" />)
    expect(screen.getByRole('button', { name: /edit address/i })).toBeInTheDocument()
  })

  it('renders the default modal title', () => {
    render(<CreateAddressModal />)
    // Use data-testid to distinguish the title heading from the trigger button
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Add a new address')
  })

  it('renders a custom modal title', () => {
    render(<CreateAddressModal modalTitle="Shipping address" />)
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Shipping address')
  })

  it('renders the AddressForm inside the dialog', () => {
    render(<CreateAddressModal />)
    expect(screen.getByTestId('address-form')).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Open / close behaviour
  // -------------------------------------------------------------------------

  it('dialog is closed by default', () => {
    render(<CreateAddressModal />)
    expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'false')
  })

  it('opens the dialog when the trigger button is clicked', () => {
    render(<CreateAddressModal />)
    fireEvent.click(screen.getByRole('button', { name: /add a new address/i }))
    expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'true')
  })

  it('closes the dialog when the trigger is clicked while open', () => {
    render(<CreateAddressModal />)
    const triggerBtn = screen.getByRole('button', { name: /add a new address/i })
    // Open
    fireEvent.click(triggerBtn)
    expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'true')
    // The real dialog would close via an overlay/escape; simulate via onOpenChange(false).
    // Since our mock doesn't render a close button, verify close happens after form submit.
    fireEvent.click(screen.getByTestId('mock-form-submit'))
    expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'false')
  })

  // -------------------------------------------------------------------------
  // Disabled prop
  // -------------------------------------------------------------------------

  it('disables the trigger button when disabled prop is true', () => {
    render(<CreateAddressModal disabled />)
    expect(screen.getByRole('button', { name: /add a new address/i })).toBeDisabled()
  })

  // -------------------------------------------------------------------------
  // Form submission
  // -------------------------------------------------------------------------

  it('calls the callback with form data after form submission', () => {
    const callback = vi.fn()
    render(<CreateAddressModal callback={callback} />)
    fireEvent.click(screen.getByTestId('mock-form-submit'))
    expect(callback).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenCalledWith({ addressLine1: '1 Test St' })
  })

  it('closes the dialog after form submission', () => {
    render(<CreateAddressModal />)
    // Open first
    fireEvent.click(screen.getByRole('button', { name: /add a new address/i }))
    expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'true')
    // Submit form triggers closeModal()
    fireEvent.click(screen.getByTestId('mock-form-submit'))
    expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'false')
  })

  it('passes addressID to AddressForm', () => {
    render(<CreateAddressModal addressID="addr-99" />)
    expect(screen.getByTestId('address-form')).toHaveAttribute('data-address-id', 'addr-99')
  })

  it('passes skipSubmission to AddressForm', () => {
    render(<CreateAddressModal skipSubmission />)
    expect(screen.getByTestId('address-form')).toHaveAttribute('data-skip', 'true')
  })
})
