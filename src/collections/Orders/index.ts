import { shippingRateField } from "@/fields/shippingRate";
import { Order, Transaction } from "@/payload-types";
import type { ShippingRateJSON } from "@/types/shipping";
import { CollectionOverride } from "@payloadcms/plugin-ecommerce/types";

const updateShipmentDates = ({
  data,
  originalDoc,
}: {
  data: any
  originalDoc?: Order
}) => {
  const currentStatus = data.shipmentStatus
  const previousStatus = originalDoc?.shipmentStatus

  // Automatically set dateShipped when status changes to in-transit
  if (currentStatus === 'in-transit' && previousStatus !== 'in-transit' && !data.dateShipped) {
    data.dateShipped = new Date()
  }

  // Automatically set dateDelivered when status changes to delivered
  if (currentStatus === 'delivered' && previousStatus !== 'delivered' && !data.dateDelivered) {
    data.dateDelivered = new Date()
  }

  return data
}

const handleCreatedOrder = ({
  doc,
  previousDoc,
  req: { payload, context },
}: {
  doc: Order
  previousDoc: Order | null
  req: { payload: any; context: any }
}) => {
  if (previousDoc === null) {
    payload.logger.info(`New order created with ID: ${doc.id} and total: ${doc.amount}`)
  }
}

const populateShippingRateFromTransaction = async ({
  data,
  req,
  operation,
}: {
  data: any
  req: any
  operation: 'create' | 'update'
}) => {
  // Copy shippingRate from the first transaction when order is created
  if (operation === 'create' && data.transactions && data.transactions.length > 0) {
    const firstTransactionId = typeof data.transactions[0] === 'string'
      ? data.transactions[0]
      : data.transactions[0].id

    try {
      const transaction = await req.payload.findByID({
        collection: 'transactions',
        id: firstTransactionId,
        overrideAccess: true,
      }) as Transaction

      if (transaction.shippingRate) {
        data.shippingRate = transaction.shippingRate as ShippingRateJSON
      }
    } catch (error) {
      req.payload.logger.warn(`Could not find transaction ${firstTransactionId} for order shippingRate`)
    }
  }

  return data
}

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
      handleCreatedOrder,
    ],
  },
})