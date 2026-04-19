'use server'

import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from "payload"

export default async function setCartShippingRate(cartId: string, shippingRateId: string): Promise<void> {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  const cart = user?.cart?.docs?.find(c => typeof c === 'object' && c.id === cartId)
  if (!cart) {
    throw new Error(`Cart with ID ${cartId} not found for user ${user?.id}`)
  }

  payload.logger.debug(`Setting shipping rate for cart ${cartId} to stripe:${shippingRateId}`)

  await payload.update({
    collection: 'carts',
    id: cartId,
    data: {
      shippingRate: 'stripe:' + shippingRateId
    }
  })
}