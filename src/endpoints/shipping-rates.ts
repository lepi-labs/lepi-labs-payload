'use server'

import getStripe from "@/utilities/getStripe"
import config from '@payload-config'
import { getPayload } from "payload"

export interface StripeShippingRate {
  id: string,
  name: string,
  price: number,
  minBusinessDays?: number,
  maxBusinessDays?: number
}

export default async function getShippingRates(): Promise<StripeShippingRate[] | null> {
  const payload = await getPayload({ config })

  const stripe = getStripe(payload)
  if (!stripe) {
    return null
  }

  const stripeRates = await stripe.shippingRates.list({ active: true })
  return stripeRates.data.map(r => {
    return {
      id: r.id,
      name: r.display_name!,
      price: r.fixed_amount!.amount,
      minBusinessDays: r.delivery_estimate?.minimum?.value,
      maxBusinessDays: r.delivery_estimate?.maximum?.value
    }
  })
}