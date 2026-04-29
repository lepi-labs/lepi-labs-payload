/**
 * Unit tests for the EditItemQuantityButton component.
 *
 * EditItemQuantityButton is a client component that renders an increment (+)
 * or decrement (−) button for a cart item. Key behaviours tested:
 *
 *   - Renders the correct accessible label based on `type` prop
 *   - Calls `incrementItem` / `decrementItem` on click
 *   - Disables the plus button when quantity has reached inventory limit
 *   - Disables both buttons while the cart is loading
 *   - Disables both buttons when item has no id
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
// Fixtures
// ---------------------------------------------------------------------------

const makeProduct = (overrides: Partial<Product> = {}): Product =>
  ({
    id: 'prod-1',
    title: 'Test Product',
    slug: 'test-product',
    inventory: 10,
    enableVariants: false,
    priceInUSD: 29.99,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  } as Product)

const makeVariant = (overrides: Partial<Variant> = {}): Variant =>
  ({
    id: 'var-1',
    product: 'prod-1',
    options: [],
    inventory: 5,
    priceInUSD: 19.99,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  } as Variant)

const makeItem = (overrides: Partial<CartItem> = {}): CartItem =>
  ({
    id: 'item-1',
    product: makeProduct(),
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

describe('EditItemQuantityButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCart.mockReturnValue(defaultCartHook() as unknown as ReturnType<typeof useCart>)
  })

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  it('renders the increase button with accessible label', () => {
    render(<EditItemQuantityButton type="plus" item={makeItem()} />)
    expect(screen.getByRole('button', { name: /increase item quantity/i })).toBeInTheDocument()
  })

  it('renders the decrease button with accessible label', () => {
    render(<EditItemQuantityButton type="minus" item={makeItem()} />)
    expect(screen.getByRole('button', { name: /reduce item quantity/i })).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Enabled state
  // -------------------------------------------------------------------------

  it('plus button is enabled when quantity is below product inventory', () => {
    const item = makeItem({ product: makeProduct({ inventory: 5 }), quantity: 3 })
    render(<EditItemQuantityButton type="plus" item={item} />)
    expect(screen.getByRole('button', { name: /increase item quantity/i })).not.toBeDisabled()
  })

  it('minus button is enabled when item has an id and cart is not loading', () => {
    render(<EditItemQuantityButton type="minus" item={makeItem()} />)
    expect(screen.getByRole('button', { name: /reduce item quantity/i })).not.toBeDisabled()
  })

  // -------------------------------------------------------------------------
  // Disabled state – inventory cap
  // -------------------------------------------------------------------------

  it('plus button is disabled when quantity equals product inventory', () => {
    const product = makeProduct({ inventory: 3 })
    const item = makeItem({ product, quantity: 3 })
    render(<EditItemQuantityButton type="plus" item={item} />)
    expect(screen.getByRole('button', { name: /increase item quantity/i })).toBeDisabled()
  })

  it('plus button is disabled when quantity exceeds product inventory', () => {
    const product = makeProduct({ inventory: 2 })
    const item = makeItem({ product, quantity: 5 })
    render(<EditItemQuantityButton type="plus" item={item} />)
    expect(screen.getByRole('button', { name: /increase item quantity/i })).toBeDisabled()
  })

  it('plus button uses variant inventory when variant is present', () => {
    const variant = makeVariant({ inventory: 2 })
    const item = makeItem({ product: makeProduct({ inventory: 10 }), variant, quantity: 2 })
    render(<EditItemQuantityButton type="plus" item={item} />)
    expect(screen.getByRole('button', { name: /increase item quantity/i })).toBeDisabled()
  })

  it('plus button is enabled when quantity is below variant inventory', () => {
    const variant = makeVariant({ inventory: 5 })
    const item = makeItem({ product: makeProduct({ inventory: 10 }), variant, quantity: 3 })
    render(<EditItemQuantityButton type="plus" item={item} />)
    expect(screen.getByRole('button', { name: /increase item quantity/i })).not.toBeDisabled()
  })

  it('minus button is not affected by inventory cap', () => {
    const product = makeProduct({ inventory: 1 })
    const item = makeItem({ product, quantity: 1 })
    render(<EditItemQuantityButton type="minus" item={item} />)
    expect(screen.getByRole('button', { name: /reduce item quantity/i })).not.toBeDisabled()
  })

  // -------------------------------------------------------------------------
  // Disabled state – loading / missing id
  // -------------------------------------------------------------------------

  it('plus button is disabled while cart is loading', () => {
    mockUseCart.mockReturnValue({
      ...defaultCartHook(),
      isLoading: true,
    } as unknown as ReturnType<typeof useCart>)

    render(<EditItemQuantityButton type="plus" item={makeItem()} />)
    expect(screen.getByRole('button', { name: /increase item quantity/i })).toBeDisabled()
  })

  it('minus button is disabled while cart is loading', () => {
    mockUseCart.mockReturnValue({
      ...defaultCartHook(),
      isLoading: true,
    } as unknown as ReturnType<typeof useCart>)

    render(<EditItemQuantityButton type="minus" item={makeItem()} />)
    expect(screen.getByRole('button', { name: /reduce item quantity/i })).toBeDisabled()
  })

  it('plus button is disabled when item has no id', () => {
    render(<EditItemQuantityButton type="plus" item={makeItem({ id: undefined })} />)
    expect(screen.getByRole('button', { name: /increase item quantity/i })).toBeDisabled()
  })

  it('minus button is disabled when item has no id', () => {
    render(<EditItemQuantityButton type="minus" item={makeItem({ id: undefined })} />)
    expect(screen.getByRole('button', { name: /reduce item quantity/i })).toBeDisabled()
  })

  // -------------------------------------------------------------------------
  // Click / hook calls
  // -------------------------------------------------------------------------

  it('calls incrementItem with the item id when plus button is clicked', () => {
    const incrementItem = vi.fn()
    mockUseCart.mockReturnValue({
      ...defaultCartHook(),
      incrementItem,
    } as unknown as ReturnType<typeof useCart>)

    const item = makeItem({ id: 'item-99', product: makeProduct({ inventory: 10 }), quantity: 1 })
    render(<EditItemQuantityButton type="plus" item={item} />)
    fireEvent.click(screen.getByRole('button', { name: /increase item quantity/i }))

    expect(incrementItem).toHaveBeenCalledOnce()
    expect(incrementItem).toHaveBeenCalledWith('item-99')
  })

  it('calls decrementItem with the item id when minus button is clicked', () => {
    const decrementItem = vi.fn()
    mockUseCart.mockReturnValue({
      ...defaultCartHook(),
      decrementItem,
    } as unknown as ReturnType<typeof useCart>)

    const item = makeItem({ id: 'item-99' })
    render(<EditItemQuantityButton type="minus" item={item} />)
    fireEvent.click(screen.getByRole('button', { name: /reduce item quantity/i }))

    expect(decrementItem).toHaveBeenCalledOnce()
    expect(decrementItem).toHaveBeenCalledWith('item-99')
  })

  it('does not call incrementItem when plus button is disabled (at inventory cap)', () => {
    const incrementItem = vi.fn()
    mockUseCart.mockReturnValue({
      ...defaultCartHook(),
      incrementItem,
    } as unknown as ReturnType<typeof useCart>)

    const product = makeProduct({ inventory: 2 })
    const item = makeItem({ product, quantity: 2 })
    render(<EditItemQuantityButton type="plus" item={item} />)
    fireEvent.click(screen.getByRole('button', { name: /increase item quantity/i }))

    expect(incrementItem).not.toHaveBeenCalled()
  })
})
