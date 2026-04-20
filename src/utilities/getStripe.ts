import { BasePayload } from "payload";
import Stripe from "stripe";

export default function getStripe(payload: BasePayload) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    payload.logger.error("Cannot fetch shipping rates without Stripe secret key")
    return null
  }
  return new Stripe(stripeSecretKey, {
    /* @ts-expect-error setting apiVersion to null will use version configured in account */
    apiVersion: null,
    appInfo: {
      name: 'Lepi Labs Payload CMS',
      url: process.env.PAYLOAD_PUBLIC_SERVER_URL
    }
  })
}