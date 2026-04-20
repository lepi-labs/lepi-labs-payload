# Unit Testing Guide for Agents

This document gives agents everything they need to write unit tests in this Payload CMS / Next.js project.

---

## Testing Stack

| Tool | Role |
|------|------|
| [Vitest](https://vitest.dev/) | Test runner and assertions |
| [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/) | React component rendering and querying |
| [jsdom](https://github.com/jsdom/jsdom) | Simulated browser environment (configured via Vitest) |
| [Playwright](https://playwright.dev/) | End-to-end browser tests (separate from unit tests) |

---

## Test Categories

### Unit / Integration (Vitest)
Located in `tests/int/`. Run with:
```bash
pnpm test:int
```
Config: `vitest.config.mts` — runs in jsdom, picks up `**/*.int.spec.{ts,tsx}`.

Two sub-types exist:
1. **Component tests** (`.int.spec.tsx`) – render React components in isolation, mock all external dependencies.
2. **API/Payload tests** (`.int.spec.ts`) – call the Payload Local API directly against a real (test) database.

### End-to-end (Playwright)
Located in `tests/e2e/`. Run with:
```bash
pnpm test:e2e
```
These require the full app to be running and are out of scope for this guide.

---

## File Naming and Location

| Test type | Location | Pattern |
|-----------|----------|---------|
| Component unit test | `tests/int/components/` | `ComponentName.int.spec.tsx` |
| Utility unit test | `tests/int/utilities/` | `utilityName.int.spec.ts` |
| Payload API integration | `tests/int/` | `*.int.spec.ts` |

---

## Key Dependencies That Must Be Mocked in Component Tests

Most client components in this project use hooks from Next.js, Payload plugins, or custom providers. These do **not** work inside jsdom and must be mocked with `vi.mock()`.

### 1. `@payloadcms/plugin-ecommerce/client/react`

All cart and currency hooks come from this package. Mock it per-test file:

```typescript
import { vi } from 'vitest'

vi.mock('@payloadcms/plugin-ecommerce/client/react', () => ({
  useCart: vi.fn(),
  useCurrency: vi.fn(),
}))
```

`useCart` returns:
```typescript
{
  cart: Cart | null,         // Cart from payload-types.ts
  addItem: vi.fn(),          // (args: { product: string; variant?: string }) => Promise<void>
  removeItem: vi.fn(),       // (itemId: string) => void
  incrementItem: vi.fn(),    // (itemId: string) => void
  decrementItem: vi.fn(),    // (itemId: string) => void
  isLoading: boolean,
}
```

`useCurrency` returns:
```typescript
{
  formatCurrency: (amount: number, opts?: { currency?: any }) => string,
  supportedCurrencies: Array<{ code: string; symbol: string }>,
}
```

### 2. `next/navigation`

All Next.js navigation hooks (`useRouter`, `usePathname`, `useSearchParams`) must be mocked:

```typescript
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))
```

> **Note:** `useSearchParams` in real Next.js returns a `ReadonlyURLSearchParams`. For tests, a plain `URLSearchParams` works because the interface is the same (`.get()`, `.toString()`, etc.).

### 3. `next/image`

`next/image` uses Node.js image optimisation internals that break in jsdom. Mock it with a simple `<img>`:

```typescript
vi.mock('next/image', () => ({
  default: ({ src, alt, ...rest }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src as string} alt={alt} {...rest} />
  ),
}))
```

### 4. `next/link`

`next/link` works in jsdom but prefetching warnings can appear. Mock it to a plain anchor when navigation is not under test:

```typescript
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))
```

### 5. `sonner` (toast notifications)

```typescript
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))
```

### 6. `@/providers/Auth` (custom Auth context)

```typescript
vi.mock('@/providers/Auth', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    status: undefined,
    login: vi.fn(),
    logout: vi.fn(),
    create: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    setUser: vi.fn(),
  })),
}))
```

### 7. Payload Local API (for `*.int.spec.ts` API tests only)

API integration tests do **not** mock Payload — they initialise it for real:

```typescript
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

let payload: Payload

beforeAll(async () => {
  payload = await getPayload({ config: await config })
})
```

These tests require the `DATABASE_URL` and `PAYLOAD_SECRET` env vars (set in `test.env` and loaded by `vitest.setup.ts` via `dotenv/config`).

---

## Payload Types

Generated types live in `src/payload-types.ts`. Import them directly:

```typescript
import type { Product, Variant, Cart, User } from '@/payload-types'
```

Key types used in tests:

**`Product`** – has `id`, `title`, `slug`, `inventory`, `enableVariants`, `variants.docs`, `priceInUSD`, `gallery`.

**`Variant`** – has `id`, `inventory`, `priceInUSD`, `options`.

**`Cart`** – has `id`, `items` (array of `{ product, variant, quantity, id }`), `subtotal`.

**`Cart['items'][number]`** (alias `CartItem`, exported from `src/components/Cart/index.tsx`) – a single cart line.

---

## Fixture Helpers

Keep fixture factories in the test file or a shared `tests/int/fixtures/` helper:

```typescript
// tests/int/fixtures/product.ts
import type { Product } from '@/payload-types'

export const makeProduct = (overrides: Partial<Product> = {}): Product => ({
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
```

---

## Testing Library Patterns

Use [Testing Library queries](https://testing-library.com/docs/queries/about) in priority order:
1. `getByRole` (preferred – mirrors accessibility semantics)
2. `getByLabelText`
3. `getByText`
4. `getByTestId` (last resort)

Common interactions:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'  // if installed

// Render
render(<MyComponent />)

// Query
const btn = screen.getByRole('button', { name: /add to cart/i })

// Assert
expect(btn).toBeInTheDocument()
expect(btn).toBeDisabled()

// Click
fireEvent.click(btn)

// Async
await waitFor(() => expect(mockFn).toHaveBeenCalledOnce())
```

---

## Mock Reset Between Tests

Always reset mocks in `beforeEach` to avoid state leaking between tests:

```typescript
import { beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.clearAllMocks()
})
```

---

## Common Gotchas

1. **`'use client'` directive** – client components can be imported and rendered with Testing Library in jsdom without any special handling; just mock their dependencies.

2. **`useSearchParams` wrapping** – in production Next.js, `useSearchParams` must be wrapped in a `<Suspense>`. In tests this is not needed because Next.js is mocked.

3. **`addItem` returns a Promise** – when testing toast side-effects, mock `addItem` to return `Promise.resolve()` and `await waitFor(...)` after clicking.

4. **`vi.mock` is hoisted** – `vi.mock(...)` calls are automatically hoisted to the top of the file by Vitest, so you can safely declare them anywhere.

5. **Path aliases** – all `@/...` aliases resolve correctly in tests via `vite-tsconfig-paths` plugin in `vitest.config.mts`.

6. **Image optimisation warnings** – mock `next/image` to suppress warnings from Next.js internals.

7. **Payload types not updated** – if a type is missing, run `pnpm generate:types` to regenerate `payload-types.ts`.

---

## Example: Component Test Skeleton

```typescript
// tests/int/components/MyComponent.int.spec.tsx
import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MyComponent } from '@/components/MyComponent'

// --- Mocks ---
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))

vi.mock('@payloadcms/plugin-ecommerce/client/react', () => ({
  useCart: vi.fn(),
}))

// --- Imports (after mocks) ---
import { useCart } from '@payloadcms/plugin-ecommerce/client/react'

const mockUseCart = vi.mocked(useCart)

describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCart.mockReturnValue({
      cart: null,
      addItem: vi.fn().mockResolvedValue(undefined),
      removeItem: vi.fn(),
      incrementItem: vi.fn(),
      decrementItem: vi.fn(),
      isLoading: false,
    })
  })

  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
```

---

## Vitest Configuration Notes

The Vitest config (`vitest.config.mts`) is set up with:

- **`environment: 'jsdom'`** – simulated browser DOM for React component tests
- **`globals: true`** – makes Vitest globals (`describe`, `it`, `expect`, `beforeEach`, `afterEach`, `vi`) available without explicit imports. This is **required** for `@testing-library/jest-dom` to extend the global `expect`.
- **`setupFiles: ['./vitest.setup.ts']`** – runs before each test file; imports `dotenv/config`, extends `expect` with `@testing-library/jest-dom` matchers, and registers `afterEach(cleanup)`.
- **`include: ['tests/int/**/*.int.spec.{ts,tsx}']`** – picks up both TypeScript and TSX spec files.

You may still import `{ describe, it, expect, vi, ... }` explicitly from `'vitest'` in test files — explicit imports and globals coexist correctly.

---

```bash
# All Vitest (unit + integration)
pnpm test:int

# Watch mode during development
pnpm exec vitest --config ./vitest.config.mts

# Single file
pnpm exec vitest run tests/int/components/AddToCart.int.spec.tsx
```
