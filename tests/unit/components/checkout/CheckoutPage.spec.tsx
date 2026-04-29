/**
 * Unit tests for the CheckoutPage component.
 *
 * CheckoutPage is a complex client component that orchestrates:
 *   - Cart display and empty-cart guard
 *   - Contact information (logged-in vs. guest flow)
 *   - Address selection (billing + shipping)
 *   - Shipping rate selection
 *   - Payment initiation via Stripe / Payload ecommerce plugin
 *
 * The tests focus on the most important rendered states so that the suite
 * stays maintainable without mocking every internal sub-component's logic.
 *
 * Dependencies mocked:
 *   - @payloadcms/plugin-ecommerce/client/react  (useCart, useAddresses, usePayments)
 *   - @/providers/Auth                           (useAuth)
 *   - @/providers/Theme                          (useTheme)
 *   - @stripe/react-stripe-js                   (Elements)
 *   - @stripe/stripe-js                         (loadStripe)
 *   - next/navigation                            (useRouter)
 *   - next/link
 *   - @/endpoints/shipping-rates                (default export)
 *   - @/lib/setCartShippingRate                 (default export)
 *   - @/components/Media
 *   - @/components/Price
 *   - @/components/Message
 *   - @/components/addresses/AddressItem
 *   - @/components/addresses/CreateAddressModal
 *   - @/components/checkout/CheckoutAddresses
 *   - @/components/forms/CheckoutForm
 *   - @/components/LoadingSpinner
 *   - sonner
 */

import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { Cart, User } from '@/payload-types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@payloadcms/plugin-ecommerce/client/react', () => ({
  useCart: vi.fn(),
  useAddresses: vi.fn(),
  usePayments: vi.fn(),
}))

vi.mock('@/providers/Auth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/providers/Theme', () => ({
  useTheme: vi.fn(),
}))

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="stripe-elements">{children}</div>
  ),
}))

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve({})),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock('@/endpoints/shipping-rates', () => ({
  default: vi.fn(),
}))

vi.mock('@/lib/setCartShippingRate', () => ({
  default: vi.fn(),
}))

vi.mock('@/components/Media', () => ({
  Media: () => <div data-testid="media" />,
}))

vi.mock('@/components/Price', () => ({
  Price: ({ amount, className }: { amount: number; className?: string }) => (
    <span className={className} data-testid="price">
      {amount}
    </span>
  ),
}))

vi.mock('@/components/Message', () => ({
  Message: ({ error }: { error?: string }) => <div data-testid="message">{error}</div>,
}))

vi.mock('@/components/addresses/AddressItem', () => ({
  AddressItem: ({
    address,
    actions,
  }: {
    address: { firstName?: string; id?: string }
    actions?: React.ReactNode
  }) => (
    <div data-testid={`address-item-${address.id}`}>
      <span>{address.firstName}</span>
      {actions}
    </div>
  ),
}))

vi.mock('@/components/addresses/CreateAddressModal', () => ({
  CreateAddressModal: ({ callback }: { callback?: (a: unknown) => void }) => (
    <button onClick={() => callback?.({})}>Add a new address</button>
  ),
}))

vi.mock('@/components/checkout/CheckoutAddresses', () => ({
  CheckoutAddresses: ({
    heading,
    setAddress,
  }: {
    heading?: string
    setAddress: (a: unknown) => void
  }) => (
    <div>
      <span>{heading ?? 'Addresses'}</span>
      <button onClick={() => setAddress({ id: 'addr-mock' })}>Choose address</button>
    </div>
  ),
}))

vi.mock('@/components/forms/CheckoutForm', () => ({
  CheckoutForm: () => <div data-testid="checkout-form" />,
}))

vi.mock('@/components/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner" />,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({
    id,
    checked,
    onCheckedChange,
    disabled: _disabled,
  }: {
    id?: string
    checked?: boolean
    onCheckedChange?: (v: boolean) => void
    disabled?: boolean
  }) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      readOnly
    />
  ),
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ htmlFor, children }: { htmlFor?: string; children?: React.ReactNode }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    asChild,
    variant: _variant,
    className: _className,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean; variant?: string }) => {
    if (asChild && React.isValidElement(children)) {
      return children
    }
    return (
      <button onClick={onClick} disabled={disabled} {...rest}>
        {children}
      </button>
    )
  },
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { useAddresses, useCart, usePayments } from '@payloadcms/plugin-ecommerce/client/react'
import { useAuth } from '@/providers/Auth'
import { useTheme } from '@/providers/Theme'
import getShippingRates from '@/endpoints/shipping-rates'
import { CheckoutPage } from '@/components/checkout/CheckoutPage'

const mockUseCart = vi.mocked(useCart)
const mockUseAddresses = vi.mocked(useAddresses)
const mockUsePayments = vi.mocked(usePayments)
const mockUseAuth = vi.mocked(useAuth)
const mockUseTheme = vi.mocked(useTheme)
const mockGetShippingRates = vi.mocked(getShippingRates)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

type CartMock = ReturnType<typeof useCart>['cart']

const makeCartItem = (overrides = {}) => ({
  id: 'item-1',
  product: {
    id: 'prod-1',
    title: 'Test Product',
    priceInUSD: 1999,
    gallery: [],
    meta: null,
  },
  variant: null,
  quantity: 1,
  ...overrides,
})

const makeCart = (overrides: Record<string, unknown> = {}): CartMock =>
  ({
    id: 'cart-1',
    items: [makeCartItem()],
    subtotal: 1999,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  }) as unknown as CartMock

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  email: 'user@example.com',
  collection: 'users',
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  ...overrides,
} as User)

const shippingRate = { id: 'rate-1', name: 'Standard', price: 500, minBusinessDays: 3, maxBusinessDays: 5 }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultAuthHook = (): ReturnType<typeof useAuth> =>
  ({ user: null, status: undefined, login: vi.fn(), logout: vi.fn() } as unknown as ReturnType<
    typeof useAuth
  >)

const defaultCartHook = (cartOverrides = {}): ReturnType<typeof useCart> =>
  ({
    cart: makeCart(cartOverrides),
    addItem: vi.fn(),
    removeItem: vi.fn(),
    isLoading: false,
  }) as unknown as ReturnType<typeof useCart>

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue(defaultAuthHook())
    mockUseTheme.mockReturnValue({ theme: 'light' } as unknown as ReturnType<typeof useTheme>)
    mockUseCart.mockReturnValue(defaultCartHook())
    mockUseAddresses.mockReturnValue({
      addresses: [],
    } as unknown as ReturnType<typeof useAddresses>)
    mockUsePayments.mockReturnValue({
      initiatePayment: vi.fn(),
    } as unknown as ReturnType<typeof usePayments>)
    mockGetShippingRates.mockResolvedValue([shippingRate])
  })

  // -------------------------------------------------------------------------
  // Empty cart guard
  // -------------------------------------------------------------------------

  it('shows "Your cart is empty." when cart has no items', () => {
    mockUseCart.mockReturnValue({
      cart: makeCart({ items: [] }),
    } as unknown as ReturnType<typeof useCart>)
    render(<CheckoutPage />)
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument()
  })

  it('shows "Continue shopping" link when cart is empty', () => {
    mockUseCart.mockReturnValue({
      cart: makeCart({ items: [] }),
    } as unknown as ReturnType<typeof useCart>)
    render(<CheckoutPage />)
    const link = screen.getByRole('link', { name: /continue shopping/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/search')
  })

  it('shows "Your cart is empty." when cart is null', () => {
    mockUseCart.mockReturnValue({
      cart: null,
    } as unknown as ReturnType<typeof useCart>)
    render(<CheckoutPage />)
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Contact section
  // -------------------------------------------------------------------------

  it('renders the Contact heading when cart has items', () => {
    render(<CheckoutPage />)
    expect(screen.getByRole('heading', { name: /contact/i })).toBeInTheDocument()
  })

  it('shows login link when user is not authenticated', () => {
    render(<CheckoutPage />)
    const loginLink = screen.getByRole('link', { name: /log in/i })
    expect(loginLink).toBeInTheDocument()
    expect(loginLink).toHaveAttribute('href', '/login')
  })

  it('shows create account link when user is not authenticated', () => {
    render(<CheckoutPage />)
    const createLink = screen.getByRole('link', { name: /create an account/i })
    expect(createLink).toBeInTheDocument()
    expect(createLink).toHaveAttribute('href', '/create-account')
  })

  it('shows user email when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: makeUser({ email: 'shopper@example.com' }),
    } as unknown as ReturnType<typeof useAuth>)
    render(<CheckoutPage />)
    expect(screen.getByText('shopper@example.com')).toBeInTheDocument()
  })

  it('shows logout link when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: makeUser(),
    } as unknown as ReturnType<typeof useAuth>)
    render(<CheckoutPage />)
    const logoutLink = screen.getByRole('link', { name: /log out/i })
    expect(logoutLink).toHaveAttribute('href', '/logout')
  })

  // -------------------------------------------------------------------------
  // Cart summary
  // -------------------------------------------------------------------------

  it('renders the "Your cart" heading in the sidebar', () => {
    render(<CheckoutPage />)
    expect(screen.getByRole('heading', { name: /your cart/i })).toBeInTheDocument()
  })

  it('renders cart item titles', () => {
    render(<CheckoutPage />)
    expect(screen.getByText('Test Product')).toBeInTheDocument()
  })

  it('renders quantity for cart items', () => {
    render(<CheckoutPage />)
    expect(screen.getByText(/x.*1|1.*x/i)).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Shipping rates
  // -------------------------------------------------------------------------

  it('renders shipping rate options after they load', async () => {
    render(<CheckoutPage />)
    // The shipping rate radio input has value="Standard" - use getByDisplayValue
    await waitFor(() => expect(screen.getByDisplayValue('Standard')).toBeInTheDocument())
  })

  it('shows error message when shipping rates fail to load', async () => {
    mockGetShippingRates.mockResolvedValue(null)
    render(<CheckoutPage />)
    await waitFor(() =>
      expect(
        screen.getByText(/Sorry, there was an error fetching shipping rates/i),
      ).toBeInTheDocument(),
    )
  })

  // -------------------------------------------------------------------------
  // Go to payment button
  // -------------------------------------------------------------------------

  it('renders the "Go to payment" button', () => {
    render(<CheckoutPage />)
    expect(screen.getByRole('button', { name: /go to payment/i })).toBeInTheDocument()
  })

  it('"Go to payment" button is disabled when no billing address or shipping rate is selected', () => {
    render(<CheckoutPage />)
    expect(screen.getByRole('button', { name: /go to payment/i })).toBeDisabled()
  })
})
