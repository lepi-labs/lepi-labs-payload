/**
 * Unit tests for the DeleteItemButton component.
 *
 * DeleteItemButton is a client component that calls `removeItem` from the
 * Payload ecommerce cart hook when clicked. It is disabled while the cart is
 * loading or when the item has no id.
 *
 * Dependencies mocked here:
 *   - @payloadcms/plugin-ecommerce/client/react  (useCart hook)
 */

import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import type { CartItem } from '@/components/Cart'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@payloadcms/plugin-ecommerce/client/react', () => ({
  useCart: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { useCart } from '@payloadcms/plugin-ecommerce/client/react'
import { DeleteItemButton } from '@/components/Cart/DeleteItemButton'

const mockUseCart = vi.mocked(useCart)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeItem = (overrides: Partial<CartItem> = {}): CartItem =>
  ({
    id: 'item-1',
    product: { id: 'prod-1', title: 'Test Product', slug: 'test-product' },
    variant: null,
    quantity: 1,
    ...overrides,
  } as CartItem)

const defaultCartHook = () => ({
  cart: null,
  addItem: vi.fn(),
  clearCart: vi.fn(),
  refreshCart: vi.fn(),
  removeItem: vi.fn(),
  incrementItem: vi.fn(),
  decrementItem: vi.fn(),
  isLoading: false,
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DeleteItemButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCart.mockReturnValue(defaultCartHook() as unknown as ReturnType<typeof useCart>)
  })

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  it('renders the remove button with accessible label', () => {
    render(<DeleteItemButton item={makeItem()} />)
    expect(screen.getByRole('button', { name: /remove cart item/i })).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Disabled state
  // -------------------------------------------------------------------------

  it('is enabled when item has an id and cart is not loading', () => {
    render(<DeleteItemButton item={makeItem({ id: 'item-1' })} />)
    expect(screen.getByRole('button', { name: /remove cart item/i })).not.toBeDisabled()
  })

  it('is disabled while the cart is loading', () => {
    mockUseCart.mockReturnValue({
      ...defaultCartHook(),
      isLoading: true,
    } as unknown as ReturnType<typeof useCart>)

    render(<DeleteItemButton item={makeItem()} />)
    expect(screen.getByRole('button', { name: /remove cart item/i })).toBeDisabled()
  })

  it('is disabled when item id is undefined', () => {
    render(<DeleteItemButton item={makeItem({ id: undefined })} />)
    expect(screen.getByRole('button', { name: /remove cart item/i })).toBeDisabled()
  })

  // -------------------------------------------------------------------------
  // Click / removeItem behaviour
  // -------------------------------------------------------------------------

  it('calls removeItem with the item id when clicked', () => {
    const removeItem = vi.fn()
    mockUseCart.mockReturnValue({
      ...defaultCartHook(),
      removeItem,
    } as unknown as ReturnType<typeof useCart>)

    render(<DeleteItemButton item={makeItem({ id: 'item-42' })} />)
    fireEvent.click(screen.getByRole('button', { name: /remove cart item/i }))

    expect(removeItem).toHaveBeenCalledOnce()
    expect(removeItem).toHaveBeenCalledWith('item-42')
  })

  it('does not call removeItem when button is disabled (loading)', () => {
    const removeItem = vi.fn()
    mockUseCart.mockReturnValue({
      ...defaultCartHook(),
      removeItem,
      isLoading: true,
    } as unknown as ReturnType<typeof useCart>)

    render(<DeleteItemButton item={makeItem()} />)
    fireEvent.click(screen.getByRole('button', { name: /remove cart item/i }))

    expect(removeItem).not.toHaveBeenCalled()
  })
})
