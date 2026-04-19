import { shippingRateField } from "@/fields/shippingRate";
import { CollectionOverride } from "@payloadcms/plugin-ecommerce/types";

export const CartsCollection: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,
  fields: [
    ...defaultCollection.fields,
    shippingRateField,
  ]
})