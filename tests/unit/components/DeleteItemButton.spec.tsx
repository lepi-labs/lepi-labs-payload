/**
 * Unit tests for the DeleteItemButton component.
 *
 * DeleteItemButton is a client component that renders a small circular
 * remove button for a cart line item.  It calls `removeItem` from the
 * `useCart` hook when clicked, and is disabled when the item has no id or
 * the cart is in a loading state.
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
// Helpers
// ---------------------------------------------------------------------------

/** Build the object returned by `useCart()`. */
const defaultCartHook = () => ({
  isLoading: false,
  removeItem: vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined),
  addItem: vi.fn(),
  cart: null,
  clearCart: vi.fn(),
  refreshCart: vi.fn(),
  incrementItem: vi.fn(),
  decrementItem: vi.fn(),
})

/** Build a minimal CartItem fixture. */
const makeItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  id: 'item-1',
  product: 'prod-1',
  quantity: 1,
  ...overrides,
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DeleteItemButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCart.mockReturnValue(defaultCartHook())
  })

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  it('renders a button with aria-label "Remove cart item"', () => {
    render(<DeleteItemButton item={makeItem()} />)
    expect(screen.getByRole('button', { name: /remove cart item/i })).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Enabled / disabled state
  // -------------------------------------------------------------------------

  it('is enabled when the item has an id and cart is not loading', () => {
    render(<DeleteItemButton item={makeItem({ id: 'item-1' })} />)
    expect(screen.getByRole('button', { name: /remove cart item/i })).not.toBeDisabled()
  })

  it('is disabled when the item has no id', () => {
    render(<DeleteItemButton item={makeItem({ id: undefined })} />)
    expect(screen.getByRole('button', { name: /remove cart item/i })).toBeDisabled()
  })

  it('is disabled while the cart is loading', () => {
    mockUseCart.mockReturnValue({ ...defaultCartHook(), isLoading: true })
    render(<DeleteItemButton item={makeItem({ id: 'item-1' })} />)
    expect(screen.getByRole('button', { name: /remove cart item/i })).toBeDisabled()
  })

  it('is disabled when the item has no id AND cart is loading', () => {
    mockUseCart.mockReturnValue({ ...defaultCartHook(), isLoading: true })
    render(<DeleteItemButton item={makeItem({ id: undefined })} />)
    expect(screen.getByRole('button', { name: /remove cart item/i })).toBeDisabled()
  })

  // -------------------------------------------------------------------------
  // Click / removeItem behaviour
  // -------------------------------------------------------------------------

  it('calls removeItem with the item id when clicked', () => {
    const removeItem = vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined)
    mockUseCart.mockReturnValue({ ...defaultCartHook(), removeItem })
    render(<DeleteItemButton item={makeItem({ id: 'item-abc' })} />)
    fireEvent.click(screen.getByRole('button', { name: /remove cart item/i }))
    expect(removeItem).toHaveBeenCalledOnce()
    expect(removeItem).toHaveBeenCalledWith('item-abc')
  })

  it('does not call removeItem when the item has no id', () => {
    const removeItem = vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined)
    mockUseCart.mockReturnValue({ ...defaultCartHook(), removeItem })
    render(<DeleteItemButton item={makeItem({ id: undefined })} />)
    // Clicking a disabled button should not fire the handler
    fireEvent.click(screen.getByRole('button', { name: /remove cart item/i }))
    expect(removeItem).not.toHaveBeenCalled()
  })

  it('does not call removeItem when the cart is loading', () => {
    const removeItem = vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined)
    mockUseCart.mockReturnValue({ ...defaultCartHook(), removeItem, isLoading: true })
    render(<DeleteItemButton item={makeItem({ id: 'item-1' })} />)
    fireEvent.click(screen.getByRole('button', { name: /remove cart item/i }))
    expect(removeItem).not.toHaveBeenCalled()
  })
})
