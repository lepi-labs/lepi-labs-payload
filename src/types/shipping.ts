/**
 * Structured shipping rate information stored in cart
 * Captures provider, rate ID, cost, and delivery estimate at the moment of selection
 */
export type ShippingRateJSON = {
  /** Payment/shipping provider identifier (e.g., 'stripe') */
  provider: string
  /** Provider's rate ID (e.g., Stripe shipping rate ID) */
  providerId: string
  /** Shipping cost in cents */
  cost: number
  /** Human-readable rate name (e.g., "Standard Shipping") */
  displayName: string
  /** Minimum business days to ship */
  minDays: number
  /** Maximum business days to ship */
  maxDays: number
}
