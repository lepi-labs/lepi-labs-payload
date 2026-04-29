/**
 * Unit tests for the ConfirmOrder component.
 *
 * ConfirmOrder is a client component that:
 *   1. Reads cart state (to guard against empty carts)
 *   2. Reads the payment_intent and email query params
 *   3. Calls confirmOrder('stripe', ...) and redirects to the order page
 *   4. Redirects to "/" when no payment_intent param is found
 *
 * Dependencies mocked:
 *   - @payloadcms/plugin-ecommerce/client/react  (useCart, usePayments)
 *   - next/navigation                            (useSearchParams, useRouter)
 *   - @/components/LoadingSpinner
 */

import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

import type { Cart } from '@/payload-types'
import type { ReadonlyURLSearchParams } from 'next/navigation'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@payloadcms/plugin-ecommerce/client/react', () => ({
  useCart: vi.fn(),
  usePayments: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(),
}))

vi.mock('@/components/LoadingSpinner', () => ({
  LoadingSpinner: ({ className }: { className?: string }) => (
    <div data-testid="loading-spinner" className={className} />
  ),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { useCart, usePayments } from '@payloadcms/plugin-ecommerce/client/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ConfirmOrder } from '@/components/checkout/ConfirmOrder'

const mockUseCart = vi.mocked(useCart)
const mockUsePayments = vi.mocked(usePayments)
const mockUseSearchParams = vi.mocked(useSearchParams)
const mockUseRouter = vi.mocked(useRouter)

/** Cast a plain URLSearchParams to the read-only type expected by Next.js. */
const mockSearchParams = (params?: string): ReadonlyURLSearchParams =>
  new URLSearchParams(params) as ReadonlyURLSearchParams

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

type CartMock = ReturnType<typeof useCart>['cart']

const makeCart = (
  overrides: Partial<Omit<Cart, 'items'>> & { items?: NonNullable<Cart['items']> } = {},
): CartMock =>
  ({
    id: 'cart-1',
    items: [{ id: 'item-1', product: 'prod-1', quantity: 1 }],
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  }) as unknown as CartMock

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ConfirmOrder', () => {
  const mockPush = vi.fn()
  const mockConfirmOrder = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseRouter.mockReturnValue({ push: mockPush } as unknown as ReturnType<typeof useRouter>)
    mockConfirmOrder.mockResolvedValue({})
    mockUsePayments.mockReturnValue({
      confirmOrder: mockConfirmOrder,
    } as unknown as ReturnType<typeof usePayments>)
    mockUseCart.mockReturnValue({
      cart: makeCart(),
    } as unknown as ReturnType<typeof useCart>)
    mockUseSearchParams.mockReturnValue(mockSearchParams('payment_intent=pi_123&email=test@example.com'))
  })

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  it('renders the "Confirming Order" heading', () => {
    render(<ConfirmOrder />)
    expect(screen.getByText('Confirming Order')).toBeInTheDocument()
  })

  it('renders the loading spinner', () => {
    render(<ConfirmOrder />)
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Redirect when no payment_intent
  // -------------------------------------------------------------------------

  it('redirects to "/" when no payment_intent param is present', async () => {
    mockUseSearchParams.mockReturnValue(mockSearchParams())
    render(<ConfirmOrder />)
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'))
  })

  // -------------------------------------------------------------------------
  // confirmOrder called with correct args
  // -------------------------------------------------------------------------

  it('calls confirmOrder with "stripe" and the payment intent ID', async () => {
    mockConfirmOrder.mockResolvedValue({ orderID: 'order-abc' })
    render(<ConfirmOrder />)
    await waitFor(() =>
      expect(mockConfirmOrder).toHaveBeenCalledWith('stripe', {
        additionalData: { paymentIntentID: 'pi_123' },
      }),
    )
  })

  it('navigates to the order page after confirmOrder resolves', async () => {
    mockConfirmOrder.mockResolvedValue({ orderID: 'order-xyz' })
    mockUseSearchParams.mockReturnValue(
      mockSearchParams('payment_intent=pi_abc&email=user@example.com'),
    )
    render(<ConfirmOrder />)
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith('/shop/order/order-xyz?email=user@example.com'),
    )
  })

  it('does not redirect to order page when confirmOrder returns no orderID', async () => {
    mockConfirmOrder.mockResolvedValue({})
    render(<ConfirmOrder />)
    await waitFor(() => expect(mockConfirmOrder).toHaveBeenCalledOnce())
    // router.push should NOT have been called (no redirect)
    expect(mockPush).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Empty cart guard
  // -------------------------------------------------------------------------

  it('does not call confirmOrder when the cart is empty', async () => {
    mockUseCart.mockReturnValue({
      cart: makeCart({ items: [] }),
    } as unknown as ReturnType<typeof useCart>)
    render(<ConfirmOrder />)
    // Give effects time to run
    await waitFor(() => {
      expect(mockConfirmOrder).not.toHaveBeenCalled()
    })
  })

  it('does not call confirmOrder when cart is null', async () => {
    mockUseCart.mockReturnValue({
      cart: null,
    } as unknown as ReturnType<typeof useCart>)
    render(<ConfirmOrder />)
    await waitFor(() => {
      expect(mockConfirmOrder).not.toHaveBeenCalled()
    })
  })
})
