import OrderConfirmationEmail, { OrderConfirmationEmailData } from "@/emails/orderConfirmation";
import { Order, User } from "@/payload-types";
import { ShippingRateJSON } from "@/types/shipping";
import { render } from "react-email";

export default async function sendConfirmationEmailIfCreated({
  doc,
  operation,
  req: { payload, context: _context },
}: {
  doc: Order
  operation: string
  req: { payload: any; context: any }
}) {
  if (operation === 'create') {

    try {
      const customer = doc.customer as User
      if (!customer?.email) {
        payload.logger.error(`No customer email found for order ${doc.id}`)
        return
      }

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

      const emailHtml = await render(OrderConfirmationEmail(emailData))

      await payload.sendEmail({
        to: customer.email,
        subject: `Lepi Labs - Confirmation for Order #${doc.id}`,
        html: emailHtml,
      })

      payload.logger.info({ "order.id": doc.id, "user.id": customer.id }, `Confirmation email sent for order`)
    } catch (_ignoreError) {
      payload.logger.error(`Failed to send confirmation email for order ${doc.id}: ${_ignoreError}`)
    }
  }
}
