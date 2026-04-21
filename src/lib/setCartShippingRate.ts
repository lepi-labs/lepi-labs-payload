'use server'

import type { ShippingRateJSON } from '@/types/shipping'
import getStripe from '@/utilities/getStripe'
import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from "payload"

export default async function setCartShippingRate(cartId: string, shippingRateId: string): Promise<void> {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  const cart = await payload.findByID({
    collection: 'carts',
    id: cartId,
    overrideAccess: true,
    depth: 2,
  })
  if (!cart) {
    throw new Error(`Cart with ID ${cartId} not found`)
  }
  if (typeof cart.customer === 'object' && cart.customer?.id !== user?.id) {
    throw new Error(`User does not have permission to modify cart ${cartId}`)
  }
  payload.logger.debug(`Setting shipping rate for cart ${cartId} to ${shippingRateId}`)

  // Fetch full rate details from Stripe
  const stripe = getStripe(payload)
  if (!stripe) {
    throw new Error('Unable to load Stripe')
  }

  const stripeRate = await stripe.shippingRates.retrieve(shippingRateId)
  if (!stripeRate) {
    throw new Error(`Shipping rate ${shippingRateId} not found in Stripe`)
  }

  const cost = stripeRate.fixed_amount?.amount
  if (typeof cost !== 'number') {
    throw new Error(`Shipping rate ${shippingRateId} has no valid amount`)
  }

  // Extract delivery estimate with fallback defaults
  const minDays = stripeRate.delivery_estimate?.minimum?.value ?? 0
  const maxDays = stripeRate.delivery_estimate?.maximum?.value ?? 0

  // Build the structured shipping rate object
  const shippingRate: ShippingRateJSON = {
    provider: 'stripe',
    providerId: shippingRateId,
    cost,
    displayName: stripeRate.display_name || shippingRateId,
    minDays,
    maxDays,
  }

  await payload.update({
    collection: 'carts',
    id: cartId,
    data: {
      shippingRate
    }
  })
}