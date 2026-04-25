import { Transaction } from "@/payload-types"
import { ShippingRateJSON } from "@/types/shipping"

export default async function populateShippingRateFromTransaction({
  data,
  req,
  operation,
}: {
  data: any
  req: any
  operation: 'create' | 'update'
}) {
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
