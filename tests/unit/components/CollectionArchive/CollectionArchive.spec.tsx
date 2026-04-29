/**
 * Unit tests for the CollectionArchive component.
 *
 * CollectionArchive renders a responsive CSS grid and maps over a `posts`
 * array.  Each object item gets a `col-span-4` wrapper div.  Non-object and
 * null entries are skipped (return null).
 *
 * The inner <Card /> is currently commented-out in the component source, so
 * these tests focus on the structural grid rather than card content.
 *
 * No external dependencies need mocking for this component.
 */

import React from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import type { Product } from '@/payload-types'
import { CollectionArchive } from '@/components/CollectionArchive'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CollectionArchive', () => {
  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  it('renders without crashing with an empty posts array', () => {
    render(<CollectionArchive posts={[]} />)
    // Container div is always rendered
    const container = document.querySelector('.container')
    expect(container).toBeInTheDocument()
  })

  it('renders a col-span-4 div for each product', () => {
    const posts = [
      makeProduct({ id: 'prod-1', title: 'Widget A' }),
      makeProduct({ id: 'prod-2', title: 'Widget B' }),
      makeProduct({ id: 'prod-3', title: 'Widget C' }),
    ]
    render(<CollectionArchive posts={posts} />)
    const cells = document.querySelectorAll('.col-span-4')
    expect(cells).toHaveLength(3)
  })

  it('renders nothing extra when posts is an empty array', () => {
    render(<CollectionArchive posts={[]} />)
    const cells = document.querySelectorAll('.col-span-4')
    expect(cells).toHaveLength(0)
  })

  it('renders the outer grid container', () => {
    render(<CollectionArchive posts={[makeProduct()]} />)
    const grid = document.querySelector('.grid')
    expect(grid).toBeInTheDocument()
  })

  it('renders one item correctly for a single product', () => {
    render(<CollectionArchive posts={[makeProduct({ id: 'solo' })]} />)
    const cells = document.querySelectorAll('.col-span-4')
    expect(cells).toHaveLength(1)
  })
})
