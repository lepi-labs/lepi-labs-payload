import { Order } from "@/payload-types";
import { CollectionOverride } from "@payloadcms/plugin-ecommerce/types";
import { CollectionAfterChangeHook } from "payload";

const handleCreatedOrder: CollectionAfterChangeHook<Order> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (previousDoc === null) {
    payload.logger.info(`New order created with ID: ${doc.id} and total: ${doc.amount}`)

  }
}

export const OrdersCollection: CollectionOverride = ({ defaultCollection }) => ({
  ...defaultCollection,
  hooks: {
    ...defaultCollection.hooks,
    afterChange: [
      ...(defaultCollection.hooks?.afterChange ?? []),
      handleCreatedOrder,
    ],
  }
})