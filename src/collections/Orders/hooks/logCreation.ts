import { Order } from "@/payload-types";
import sendDiscordWebhook from "@/utilities/discordWebhook";
import { CollectionAfterChangeHook } from "payload";

const logOrderCreation: CollectionAfterChangeHook<Order> = async ({ doc, operation, req }) => {
  if (operation === 'create') {
    req.payload.logger.info({ "order.id": doc.id, "user.id": req.user?.id }, 'Order created')
    if (doc.amount) {
      const amount = (doc.amount / 100).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
      await sendDiscordWebhook(`New order (id: ${doc.id}) created, **$${amount}**`)
    }
  }
}
export default logOrderCreation
