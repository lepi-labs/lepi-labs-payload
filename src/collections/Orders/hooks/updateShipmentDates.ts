import { Order } from "@/payload-types"

export default function updateShipmentDates({
  data,
  originalDoc,
}: {
  data: any
  originalDoc?: Order
}) {
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