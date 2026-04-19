import { CollectionOverride } from "@payloadcms/plugin-ecommerce/types";

export const CartsCollection: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,
  fields: [
    ...defaultCollection.fields,
    {
      name: 'shippingRate',
      type: 'text',
      label: 'Shipping rate',
      // TODO do better validation
      validate: (v: unknown) => typeof v === 'string' && v.startsWith('stripe:') || 'Invalid shippingRate',
    }
  ]
})