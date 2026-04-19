import { BasePayload } from "payload";
import Stripe from "stripe";

export default function getStripe(payload: BasePayload) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    payload.logger.error("Cannot fetch shipping rates without Stripe secret key")
    return null
  }
  return new Stripe(stripeSecretKey, {
    apiVersion: '2025-08-27.basil',
    appInfo: {
      name: 'Lepi Labs Payload CMS',
      url: process.env.PAYLOAD_PUBLIC_SERVER_URL
    }
  })
}