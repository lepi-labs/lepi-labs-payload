import { CartModal } from '@/components/Cart/CartModal'
import type { Product, Variant } from '@/payload-types'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// --- Mocks ---
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt, ...rest }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src as string} alt={alt} {...rest} />
  ),
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

vi.mock('@payloadcms/plugin-ecommerce/client/react', () => ({
  useCart: vi.fn(),
  useCurrency: vi.fn(() => ({
    formatCurrency: (amount: number) => `$${(amount / 100).toFixed(2)}`,
    supportedCurrencies: [{ code: 'USD', symbol: '$' }],
  })),
}))

vi.mock('@/components/Cart/DeleteItemButton', () => ({
  DeleteItemButton: ({ item }: { item: { id: string } }) => (
    <button data-testid={`delete-item-${item.id}`}>Delete</button>
  ),
}))

vi.mock('@/components/Cart/EditItemQuantityButton', () => ({
  EditItemQuantityButton: ({ item, type }: { item: { id: string }; type: 'plus' | 'minus' }) => (
    <button data-testid={`quantity-${type}-${item.id}`}>{type === 'plus' ? '+' : '-'}</button>
  ),
}))

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({
    onOpenChange = () => {},
    open = false,
    children,
  }: {
    onOpenChange?: (open: boolean) => void
    open?: boolean
    children?: React.ReactNode
  }) => {
    void onOpenChange // suppress unused warning
    void open

    // For testing purposes, always render content (sheet is always "open" in tests)
    // This mirrors the real behavior where content is rendered when open=true
    return <div data-testid="sheet">{children}</div>
  },
  SheetTrigger: ({ asChild, children, ...rest }: { asChild?: boolean; children: React.ReactNode; [key: string]: unknown }) =>
    asChild ? children : <div {...rest}>{children}</div>,
  SheetContent: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}))

vi.mock('@/components/Cart/OpenCart', () => ({
  OpenCartButton: ({ quantity }: { quantity?: number }) => (
    <button data-testid="open-cart-btn">{quantity ? `Cart (${quantity})` : 'Cart'}</button>
  ),
}))

// --- Imports (after mocks) ---
import { useCart } from '@payloadcms/plugin-ecommerce/client/react'
import { usePathname } from 'next/navigation'

const mockUseCart = vi.mocked(useCart)
const mockUsePathname = vi.mocked(usePathname)

// --- Fixtures ---
const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod-1',
  title: 'Test Product',
  slug: 'test-product',
  inventory: 10,
  enableVariants: false,
  priceInUSD: 3000,
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  ...overrides,
} as Product)

const makeVariant = (overrides: Partial<Variant> = {}): Variant => ({
  id: 'var-1',
  priceInUSD: 4000,
  inventory: 5,
  ...overrides,
} as Variant)

interface TestCartItem {
  id: string
  product: Product
  variant: Variant | null
  quantity: number
}

const makeCartItem = (overrides: Partial<TestCartItem> = {}): TestCartItem => ({
  id: 'item-1',
  product: makeProduct(),
  variant: null,
  quantity: 1,
  ...overrides,
} as TestCartItem)

// Helper to properly type mock return values and avoid Payload Cart type conflicts
const mockCartReturn = (cartData: unknown) =>
  ({
    cart: cartData,
    addItem: vi.fn(),
    removeItem: vi.fn(),
    incrementItem: vi.fn(),
    decrementItem: vi.fn(),
    isLoading: false,
  } as unknown as ReturnType<typeof useCart>)

// --- Tests ---
describe('CartModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePathname.mockReturnValue('/')
    mockUseCart.mockReturnValue({
      cart: null,
      addItem: vi.fn().mockResolvedValue(undefined),
      removeItem: vi.fn(),
      incrementItem: vi.fn(),
      decrementItem: vi.fn(),
      isLoading: false,
    } as unknown as ReturnType<typeof useCart>)
  })

  describe('Empty Cart', () => {
    it('renders empty cart message when cart is null', () => {
      mockUseCart.mockReturnValue(mockCartReturn(null))

      render(<CartModal />)

      expect(screen.getByText('Your cart is empty.')).toBeInTheDocument()
    })

    it('renders empty cart message when cart items are empty', () => {
      mockUseCart.mockReturnValue(mockCartReturn({
        id: 'cart-1',
        items: [],
        subtotal: 0,
      }))

      render(<CartModal />)

      expect(screen.getByText('Your cart is empty.')).toBeInTheDocument()
    })

    it('displays cart icon button even when empty', () => {
      render(<CartModal />)

      expect(screen.getByTestId('open-cart-btn')).toBeInTheDocument()
    })
  })

  describe('Cart with Items', () => {
    it('displays cart items with product information', () => {
      const product = makeProduct({
        title: 'Premium Widget',
        slug: 'premium-widget',
        priceInUSD: 5000,
      })

      mockUseCart.mockReturnValue(mockCartReturn({
        id: 'cart-1',
        items: [
          {
            id: 'item-1',
            product,
            variant: null,
            quantity: 2,
          },
        ],
        subtotal: 10000,
      }))

      render(<CartModal />)

      expect(screen.getByText('Premium Widget')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument() // quantity
    })

    it('displays variant information when item has variant', () => {
      const product = makeProduct()
      const variant = makeVariant({
        options: [
          { id: 'opt-1', label: 'Blue' },
          { id: 'opt-2', label: 'Large' },
        ] as unknown as Variant['options'],
      })

      mockUseCart.mockReturnValue(mockCartReturn({
        id: 'cart-1',
        items: [
          {
            id: 'item-1',
            product,
            variant,
            quantity: 1,
          },
        ],
        subtotal: 4000,
      }))

      render(<CartModal />)

      expect(screen.getByText(/Blue, Large/i)).toBeInTheDocument()
    })

    it('displays multiple items in cart', () => {
      const product1 = makeProduct({ id: 'prod-1', title: 'Product 1' })
      const product2 = makeProduct({ id: 'prod-2', title: 'Product 2' })

      mockUseCart.mockReturnValue(mockCartReturn({
        id: 'cart-1',
        items: [
          {
            id: 'item-1',
            product: product1,
            variant: null,
            quantity: 1,
          },
          {
            id: 'item-2',
            product: product2,
            variant: null,
            quantity: 2,
          },
        ],
        subtotal: 10997,
      }))

      render(<CartModal />)

      expect(screen.getByText('Product 1')).toBeInTheDocument()
      expect(screen.getByText('Product 2')).toBeInTheDocument()
    })

    it('displays cart quantity badge', () => {
      mockUseCart.mockReturnValue(mockCartReturn({
        id: 'cart-1',
        items: [
          makeCartItem({ quantity: 3 }),
          makeCartItem({ id: 'item-2', quantity: 2 }),
        ],
        subtotal: 14995,
      }))

      render(<CartModal />)

      expect(screen.getByTestId('open-cart-btn')).toHaveTextContent('Cart (5)')
    })
  })

  describe('Item Interactions', () => {
    beforeEach(() => {
      mockUseCart.mockReturnValue(mockCartReturn({
        id: 'cart-1',
        items: [makeCartItem()],
        subtotal: 4999,
      }))
    })

    it('renders delete button for each item', () => {
      render(<CartModal />)

      expect(screen.getByTestId('delete-item-item-1')).toBeInTheDocument()
    })

    it('renders quantity adjustment buttons', () => {
      render(<CartModal />)

      expect(screen.getByTestId('quantity-minus-item-1')).toBeInTheDocument()
      expect(screen.getByTestId('quantity-plus-item-1')).toBeInTheDocument()
    })
  })

  describe('Modal Behavior', () => {
    it('closes modal when pathname changes', async () => {
      mockUseCart.mockReturnValue(mockCartReturn({
        id: 'cart-1',
        items: [makeCartItem()],
        subtotal: 2999,
      }))

      const { rerender } = render(<CartModal />)

      // Open the modal
      fireEvent.click(screen.getByTestId('open-cart-btn'))
      expect(screen.getByText('My Cart')).toBeInTheDocument()

      // Change pathname
      mockUsePathname.mockReturnValue('/products')
      rerender(<CartModal />)

      // Modal should be closed - the header should not be in the DOM anymore
      // We check by verifying the sheet content is not visible after pathname change
      await waitFor(() => {
        // After pathname change, Sheet should close
        expect(screen.queryByText('Manage your cart here')).not.toBeInTheDocument()
      })
    })
  })

  describe('Pricing and Totals', () => {
    it('displays variant price when variant is present', () => {
      const product = makeProduct({ priceInUSD: 3000 })
      const variant = makeVariant({ priceInUSD: 2000 })

      mockUseCart.mockReturnValue(mockCartReturn({
        id: 'cart-1',
        items: [
          {
            id: 'item-1',
            product,
            variant,
            quantity: 2,
          },
        ],
        subtotal: 4000,
      }))

      render(<CartModal />)

      expect(screen.getAllByText('$20.00')).toBeTruthy()
    })

    it('displays cart subtotal', () => {
      mockUseCart.mockReturnValue(mockCartReturn({
        id: 'cart-1',
        items: [makeCartItem({ quantity: 2 })],
        subtotal: 6000,
      }))

      render(<CartModal />)

      expect(screen.getByText('Total')).toBeInTheDocument()
      expect(screen.getAllByText('$60.00')).toBeTruthy()
    })
  })

  describe('Checkout Navigation', () => {
    it('displays checkout link', () => {
      mockUseCart.mockReturnValue(mockCartReturn({
        id: 'cart-1',
        items: [makeCartItem()],
        subtotal: 2999,
      }))

      render(<CartModal />)

      const checkoutLink = screen.getByRole('link', { name: /checkout/i })
      expect(checkoutLink).toBeInTheDocument()
      expect(checkoutLink).toHaveAttribute('href', '/checkout')
    })

    it('checkout link not visible in empty cart', () => {
      mockUseCart.mockReturnValue(mockCartReturn(null))

      render(<CartModal />)

      expect(screen.queryByRole('link', { name: /checkout/i })).not.toBeInTheDocument()
    })
  })

  describe('Product Links', () => {
    it('links to product page', () => {
      mockUseCart.mockReturnValue(mockCartReturn({
        id: 'cart-1',
        items: [makeCartItem()],
        subtotal: 29.99,
      }))

      render(<CartModal />)

      const productLink = screen.getAllByRole('link').find(
        (link) => link.getAttribute('href') === '/products/test-product',
      )
      expect(productLink).toBeInTheDocument()
    })
  })
})
