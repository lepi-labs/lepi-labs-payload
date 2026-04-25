import { shippingRateField } from "@/fields/shippingRate";
import { CollectionOverride } from "@payloadcms/plugin-ecommerce/types";

import logOrderCreation from "./hooks/logCreation";
import populateShippingRateFromTransaction from "./hooks/populateShippingRateFromTransaction";
import sendConfirmationEmailIfCreated from "./hooks/sendConfirmationEmailOnCreate";
import updateShipmentDates from "./hooks/updateShipmentDates";

export const OrdersCollection: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,
  fields: [
    ...defaultCollection.fields,
    shippingRateField,
    {
      name: 'shipmentStatus',
      type: 'select',
      options: [
        { label: 'Not Yet Shipped', value: 'not-yet-shipped' },
        { label: 'In Transit', value: 'in-transit' },
        { label: 'Delivered', value: 'delivered' },
      ],
      defaultValue: 'not-yet-shipped',
    },
    {
      name: 'dateShipped',
      type: 'date',
      admin: {
        description: 'Automatically set when shipment status changes to "In Transit"',
      },
    },
    {
      name: 'dateDelivered',
      type: 'date',
      admin: {
        description: 'Automatically set when shipment status changes to "Delivered"',
      },
    },
    {
      name: 'trackingNumber',
      type: 'text',
    },
    {
      name: 'trackingUrl',
      type: 'text',
    },
  ],
  hooks: {
    ...defaultCollection.hooks,
    beforeChange: [
      ...(defaultCollection.hooks?.beforeChange ?? []),
      updateShipmentDates,
      populateShippingRateFromTransaction,
    ],
    afterChange: [
      ...(defaultCollection.hooks?.afterChange ?? []),
      sendConfirmationEmailIfCreated,
      logOrderCreation,
    ],
  },
})