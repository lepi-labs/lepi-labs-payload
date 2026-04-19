import { Cart } from "@/payload-types";
import getStripe from "@/utilities/getStripe";
import { stripeAdapter } from "@payloadcms/plugin-ecommerce/payments/stripe";
import { PaymentAdapter } from "@payloadcms/plugin-ecommerce/types";
import { InitiatePaymentReturnType } from "node_modules/@payloadcms/plugin-ecommerce/dist/payments/adapters/stripe";
import { Cart as DefaultCart } from "node_modules/@payloadcms/plugin-ecommerce/dist/types";

export const stripeAdapterWithShipping: PaymentAdapter = {
  ...stripeAdapter({
    secretKey: process.env.STRIPE_SECRET_KEY!,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
    appInfo: {
      name: 'Lepi Labs Payload CMS',
      url: process.env.PAYLOAD_PUBLIC_SERVER_URL
    }
  }),

  initiatePayment: async ({
    data,
    req,
    transactionsSlug,
  }): Promise<InitiatePaymentReturnType> => {
    const cartId = data.cart.id
    const payload = req.payload
    const cart = await payload.findByID({
      collection: 'carts',
      id: cartId,
      overrideAccess: true,
    }) as Cart

    const shippingRateStr = cart.shippingRate
    if (!shippingRateStr) {
      throw new Error(`Tried to create a payment intent for cart ${cart.id} with no shipping rate set.`)
    }
    const shippingRateId = shippingRateStr.replace('stripe:', '')
    const stripe = getStripe(req.payload)
    if (!stripe) {
      throw new Error('Unable to load Stripe')
    }
    const rate = (await stripe.shippingRates.retrieve(shippingRateId)).fixed_amount?.amount
    if (!rate) {
      throw new Error(`Tried to get shipping rate ${shippingRateId} but had no amount.`)
    }
    const cartWithShipping = {
      ...cart,
      subtotal: cart.subtotal! + rate
    } as DefaultCart

    return (await stripeAdapter({
      secretKey: process.env.STRIPE_SECRET_KEY!,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
      appInfo: {
        name: 'Lepi Labs Payload CMS',
        url: process.env.PAYLOAD_PUBLIC_SERVER_URL
      }
    }).initiatePayment({
      data: { ...data, cart: cartWithShipping },
      req,
      transactionsSlug 
    })) as InitiatePaymentReturnType
  }
}