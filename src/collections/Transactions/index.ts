import { shippingRateField } from '@/fields/shippingRate';
import { Cart } from '@/payload-types';
import type { ShippingRateJSON } from '@/types/shipping';
import type { CollectionOverride } from '@payloadcms/plugin-ecommerce/types';

export const TransactionsCollection: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,
  fields: [
    ...defaultCollection.fields,
    shippingRateField,
  ],
  hooks: {
    ...defaultCollection.hooks,
    beforeChange: [
      ...(defaultCollection.hooks?.beforeChange ?? []),
      async ({ data, req, operation }) => {
        // Copy shippingRate from cart when transaction is created
        if (operation === 'create' && data.cart) {
          const cartId = typeof data.cart === 'string' ? data.cart : data.cart.id

          try {
            const cart = await req.payload.findByID({
              collection: 'carts',
              id: cartId,
              overrideAccess: true,
            }) as Cart

            if (cart.shippingRate) {
              data.shippingRate = cart.shippingRate as ShippingRateJSON
            }
          } catch (error) {
            req.payload.logger.warn(`Could not find cart ${cartId} for transaction shippingRate`)
          }
        }

        return data
      },
    ],
  },
})
