/**
 * Unit tests for the EditItemQuantityButton component.
 *
 * EditItemQuantityButton renders either a "plus" or "minus" quantity button
 * for a cart line item.  The disabled logic is the most complex part:
 *
 *   - Always disabled when the item has no id
 *   - "plus" button is disabled when item.quantity >= inventory, where
 *     inventory is sourced from the resolved variant object (if present) or
 *     the resolved product object
 *   - Disabled while the cart is loading (via `isLoading`)
 *   - Enabled when inventory is undefined/null (untracked stock)
 *
 * On click, the button calls `incrementItem` (plus) or `decrementItem`
 * (minus) with the item id.
 *
 * Dependencies mocked here:
 *   - @payloadcms/plugin-ecommerce/client/react  (useCart hook)
 */

import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import type { CartItem } from '@/components/Cart'
import type { Product, Variant } from '@/payload-types'

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
import { EditItemQuantityButton } from '@/components/Cart/EditItemQuantityButton'

const mockUseCart = vi.mocked(useCart)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultCartHook = () => ({
  isLoading: false,
  incrementItem: vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined),
  decrementItem: vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined),
  addItem: vi.fn(),
  cart: null,
  clearCart: vi.fn(),
  refreshCart: vi.fn(),
  removeItem: vi.fn(),
})

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod-1',
  title: 'Test Product',
  slug: 'test-product',
  inventory: 10,
  enableVariants: false,
  priceInUSD: 29.99,
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  ...overrides,
})

const makeVariant = (overrides: Partial<Variant> = {}): Variant => ({
  id: 'var-1',
  product: 'prod-1',
  options: [],
  inventory: 5,
  priceInUSD: 19.99,
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  ...overrides,
})

/** Build a CartItem whose product/variant fields are resolved objects. */
const makeItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  id: 'item-1',
  product: makeProduct(),
  quantity: 1,
  ...overrides,
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EditItemQuantityButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCart.mockReturnValue(defaultCartHook())
  })

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  it('renders an "Increase item quantity" button for type="plus"', () => {
    render(<EditItemQuantityButton type="plus" item={makeItem()} />)
    expect(screen.getByRole('button', { name: /increase item quantity/i })).toBeInTheDocument()
  })

  it('renders a "Reduce item quantity" button for type="minus"', () => {
    render(<EditItemQuantityButton type="minus" item={makeItem()} />)
    expect(screen.getByRole('button', { name: /reduce item quantity/i })).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Disabled when item has no id
  // -------------------------------------------------------------------------

  it('is disabled for type="plus" when item has no id', () => {
    render(<EditItemQuantityButton type="plus" item={makeItem({ id: undefined })} />)
    expect(screen.getByRole('button', { name: /increase item quantity/i })).toBeDisabled()
  })

  it('is disabled for type="minus" when item has no id', () => {
    render(<EditItemQuantityButton type="minus" item={makeItem({ id: undefined })} />)
    expect(screen.getByRole('button', { name: /reduce item quantity/i })).toBeDisabled()
  })

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  it('is disabled while the cart is loading', () => {
    mockUseCart.mockReturnValue({ ...defaultCartHook(), isLoading: true })
    render(<EditItemQuantityButton type="plus" item={makeItem()} />)
    expect(screen.getByRole('button', { name: /increase item quantity/i })).toBeDisabled()
  })

  // -------------------------------------------------------------------------
  // "plus" disabled – product inventory (no variant)
  // -------------------------------------------------------------------------

  it('plus is disabled when quantity equals product inventory', () => {
    const product = makeProduct({ inventory: 3 })
    const item = makeItem({ product, quantity: 3 })
    render(<EditItemQuantityButton type="plus" item={item} />)
    expect(screen.getByRole('button', { name: /increase item quantity/i })).toBeDisabled()
  })

  it('plus is disabled when quantity exceeds product inventory', () => {
    const product = makeProduct({ inventory: 2 })
    const item = makeItem({ product, quantity: 5 })
    render(<EditItemQuantityButton type="plus" item={item} />)
    expect(screen.getByRole('button', { name: /increase item quantity/i })).toBeDisabled()
  })

  it('plus is enabled when quantity is below product inventory', () => {
    const product = makeProduct({ inventory: 5 })
    const item = makeItem({ product, quantity: 3 })
    render(<EditItemQuantityButton type="plus" item={item} />)
    expect(screen.getByRole('button', { name: /increase item quantity/i })).not.toBeDisabled()
  })

  it('plus is enabled when product inventory is null (untracked)', () => {
    const product = makeProduct({ inventory: null })
    const item = makeItem({ product, quantity: 99 })
    render(<EditItemQuantityButton type="plus" item={item} />)
    expect(screen.getByRole('button', { name: /increase item quantity/i })).not.toBeDisabled()
  })

  it('plus is enabled when product inventory is undefined', () => {
    const product = makeProduct({ inventory: undefined })
    const item = makeItem({ product, quantity: 99 })
    render(<EditItemQuantityButton type="plus" item={item} />)
    expect(screen.getByRole('button', { name: /increase item quantity/i })).not.toBeDisabled()
  })

  // -------------------------------------------------------------------------
  // "plus" disabled – variant inventory (when variant is resolved object)
  // -------------------------------------------------------------------------

  it('plus is disabled when quantity equals variant inventory', () => {
    const variant = makeVariant({ inventory: 2 })
    const item = makeItem({ variant, quantity: 2 })
    render(<EditItemQuantityButton type="plus" item={item} />)
    expect(screen.getByRole('button', { name: /increase item quantity/i })).toBeDisabled()
  })

  it('plus is enabled when quantity is below variant inventory', () => {
    const variant = makeVariant({ inventory: 5 })
    const item = makeItem({ variant, quantity: 3 })
    render(<EditItemQuantityButton type="plus" item={item} />)
    expect(screen.getByRole('button', { name: /increase item quantity/i })).not.toBeDisabled()
  })

  it('plus is enabled when variant inventory is null', () => {
    const variant = makeVariant({ inventory: null })
    const item = makeItem({ variant, quantity: 10 })
    render(<EditItemQuantityButton type="plus" item={item} />)
    expect(screen.getByRole('button', { name: /increase item quantity/i })).not.toBeDisabled()
  })

  // -------------------------------------------------------------------------
  // "minus" is never disabled based on inventory
  // -------------------------------------------------------------------------

  it('minus is enabled even when quantity equals inventory', () => {
    const product = makeProduct({ inventory: 1 })
    const item = makeItem({ product, quantity: 1 })
    render(<EditItemQuantityButton type="minus" item={item} />)
    expect(screen.getByRole('button', { name: /reduce item quantity/i })).not.toBeDisabled()
  })

  // -------------------------------------------------------------------------
  // Click / incrementItem / decrementItem behaviour
  // -------------------------------------------------------------------------

  it('calls incrementItem with the item id when the "plus" button is clicked', () => {
    const incrementItem = vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined)
    mockUseCart.mockReturnValue({ ...defaultCartHook(), incrementItem })
    const item = makeItem({ id: 'item-xyz', quantity: 1, product: makeProduct({ inventory: 10 }) })
    render(<EditItemQuantityButton type="plus" item={item} />)
    fireEvent.click(screen.getByRole('button', { name: /increase item quantity/i }))
    expect(incrementItem).toHaveBeenCalledOnce()
    expect(incrementItem).toHaveBeenCalledWith('item-xyz')
  })

  it('calls decrementItem with the item id when the "minus" button is clicked', () => {
    const decrementItem = vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined)
    mockUseCart.mockReturnValue({ ...defaultCartHook(), decrementItem })
    const item = makeItem({ id: 'item-xyz', quantity: 2 })
    render(<EditItemQuantityButton type="minus" item={item} />)
    fireEvent.click(screen.getByRole('button', { name: /reduce item quantity/i }))
    expect(decrementItem).toHaveBeenCalledOnce()
    expect(decrementItem).toHaveBeenCalledWith('item-xyz')
  })

  it('does not call incrementItem when the plus button is disabled (at max inventory)', () => {
    const incrementItem = vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined)
    mockUseCart.mockReturnValue({ ...defaultCartHook(), incrementItem })
    const product = makeProduct({ inventory: 2 })
    const item = makeItem({ product, quantity: 2 })
    render(<EditItemQuantityButton type="plus" item={item} />)
    fireEvent.click(screen.getByRole('button', { name: /increase item quantity/i }))
    expect(incrementItem).not.toHaveBeenCalled()
  })

  it('does not call decrementItem when item has no id', () => {
    const decrementItem = vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined)
    mockUseCart.mockReturnValue({ ...defaultCartHook(), decrementItem })
    render(<EditItemQuantityButton type="minus" item={makeItem({ id: undefined })} />)
    fireEvent.click(screen.getByRole('button', { name: /reduce item quantity/i }))
    expect(decrementItem).not.toHaveBeenCalled()
  })
})
