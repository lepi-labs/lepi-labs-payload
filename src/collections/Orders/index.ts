import OrderConfirmationEmail, { OrderConfirmationEmailData } from "@/emails/orderConfirmation";
import { shippingRateField } from "@/fields/shippingRate";
import { Order, Transaction, User } from "@/payload-types";
import type { ShippingRateJSON } from "@/types/shipping";
import { CollectionOverride } from "@payloadcms/plugin-ecommerce/types";
import { render } from "react-email";

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

const sendConfirmationEmailIfCreated = async ({
  doc,
  operation,
  req: { payload, context: _context },
}: {
  doc: Order
  operation: string
  req: { payload: any; context: any }
}) => {
  // Only send email for new orders
  if (operation === 'create') {
    payload.logger.info(`New order created with ID: ${doc.id} and total: ${doc.amount}`)

    try {
      const customer = doc.customer as User
      if (!customer?.email) {
        payload.logger.error(`No customer email found for order ${doc.id}`)
        return
      }

      // Fetch the full order with all relationships populated
      const fullOrder = await payload.findByID({
        collection: 'orders',
        id: doc.id,
        depth: 2,
        overrideAccess: true,
      }) as Order

      if (!fullOrder.items?.length) {
        payload.logger.error(`No items found in order ${doc.id}`)
        return
      }

      // Prepare email data with all necessary information
      const emailData: OrderConfirmationEmailData = {
        orderId: fullOrder.id,
        orderCreatedAt: fullOrder.createdAt,
        customerName: customer.name || 'Customer',
        customerEmail: customer.email,
        items: fullOrder.items.map((item) => {
          const product = typeof item.product === 'object' ? item.product : null
          const variant = typeof item.variant === 'object' ? item.variant : null

          if (!product) {
            throw new Error(`Product not found for order item ${item.id}`)
          }

          return {
            product,
            variant,
            quantity: item.quantity,
          }
        }),
        subtotal: fullOrder.amount || 0,
        shippingRate: (fullOrder.shippingRate as ShippingRateJSON) || { cost: 0, displayName: 'Standard Shipping' },
        shippingAddress: {
          firstName: fullOrder.shippingAddress?.firstName || null,
          lastName: fullOrder.shippingAddress?.lastName || null,
          addressLine1: fullOrder.shippingAddress?.addressLine1 || null,
          addressLine2: fullOrder.shippingAddress?.addressLine2,
          city: fullOrder.shippingAddress?.city || null,
          state: fullOrder.shippingAddress?.state || null,
          postalCode: fullOrder.shippingAddress?.postalCode || null,
          country: fullOrder.shippingAddress?.country || null,
        },
      }

      // Render the email template to HTML
      const emailHtml = await render(OrderConfirmationEmail(emailData))

      // Send the confirmation email
      await payload.sendEmail({
        to: customer.email,
        subject: `Lepi Labs - Confirmation for Order #${doc.id}`,
        html: emailHtml,
      })

      payload.logger.info(`Confirmation email sent for order ${doc.id} to ${customer.email}`)
    } catch (_ignoreError) {
      payload.logger.error(`Failed to send confirmation email for order ${doc.id}: ${_ignoreError}`)
    }
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
    } catch (_ignoreError) {
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
      sendConfirmationEmailIfCreated,
    ],
  },
})