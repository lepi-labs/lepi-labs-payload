'use server'

import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from "payload"
import getStripe from '@/utilities/getStripe'
import type { ShippingRateJSON } from '@/types/shipping'

export default async function setCartShippingRate(cartId: string, shippingRateId: string): Promise<void> {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  const cart = user?.cart?.docs?.find(c => typeof c === 'object' && c.id === cartId)
  if (!cart) {
    throw new Error(`Cart with ID ${cartId} not found for user ${user?.id}`)
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