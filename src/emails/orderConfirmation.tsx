import { Product, Variant } from "@/payload-types";
import { ShippingRateJSON } from "@/types/shipping";
import { formatDateTime } from "@/utilities/formatDateTime";
import { Font, Html, Img, pixelBasedPreset, Tailwind } from "react-email";

export interface OrderConfirmationEmailData {
  orderId: string
  orderCreatedAt: string
  customerName: string
  customerEmail: string
  items: {
    product: Product
    variant: Variant | null
    quantity: number
  }[]
  subtotal: number
  shippingRate: ShippingRateJSON
  shippingAddress: {
    firstName: string | null
    lastName: string | null
    addressLine1: string | null
    addressLine2: string | null | undefined
    city: string | null
    state: string | null
    postalCode: string | null
    country: string | null
  }
}

function itemToLi(item: OrderConfirmationEmailData['items'][number]) {
  const productName = item.product.title
  const priceUSD = item.variant?.priceInUSD || item.product.priceInUSD || 0
  const variantName = item.variant?.title

  return (<li>
    <b>{productName}</b>
    {variantName && ' (' + variantName + '), '} - 
    Qty: {item.quantity}, <b>${(item.quantity * priceUSD / 100).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</b>
  </li>)
}

function getOrderLink(orderId: string) {
  return `${process.env.PAYLOAD_PUBLIC_SERVER_URL}/orders/${orderId}`
}

function formatShippingAddress(address: OrderConfirmationEmailData['shippingAddress']) {
  const { firstName, lastName, addressLine1, addressLine2, city, state, postalCode, country } = address
  return `${firstName} ${lastName}, ${addressLine1}${addressLine2 ? ', ' + addressLine2 : ''}, ${city}, ${state} ${postalCode}, ${country}`
}

export default function OrderConfirmationEmail(data: OrderConfirmationEmailData) {
  const shippingCost = data.shippingRate.cost / 100
  const subtotal = data.items.reduce((sum, item) => {
    const priceUSD = item.variant?.priceInUSD || item.product.priceInUSD || 0
    return sum + (item.quantity * priceUSD / 100)
  }, 0)

  return (
    <Html>
      <Font
        fontFamily="Saira"
        fallbackFontFamily="sans-serif"
        webFont={{
          url: "https://fonts.cdnfonts.com/s/15686/Saira-Regular.woff",
          format: "woff"
        }}
        fontWeight={400}
        fontStyle="normal"
      />
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
        }}
      >
        <Img className="w-full" src="https://lepi-labs.com/api/media/file/bluesky-header-1.png?" alt="Lepi Labs logo" />
        <h1 className="text-center">Thanks for your order!</h1>
        <hr />
        <p>Hey there, {data.customerName}! Here&apos;s the receipt for your online order ({data.orderId}),
          placed on <time dateTime={data.orderCreatedAt}>
              {formatDateTime({ date: data.orderCreatedAt, format: 'MMMM dd, yyyy' })}
            </time>.
        </p>
        <ul>
        {data.items.map(itemToLi)}
        </ul>
        <p>Subtotal: <b>${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></p>
        <p>Shipping: <b>${shippingCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>, {data.shippingRate.displayName}</p>
        <p>Total: <b>${(data.subtotal / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></p>
        <p>Shipping to {formatShippingAddress(data.shippingAddress)}</p>
        <hr />
        <p>You can view your order <a href={getOrderLink(data.orderId)}>here</a>.
          Another email with tracking information will be sent once your order has shipped.
          If you have any questions or issues, please let us know through any of our social media platforms, or by sending an inquiry to me at <a href="mailto:xenu@lepi-labs.com">xenu@lepi-labs.com</a>.
        </p>
        <p>Thanks!</p>
      </Tailwind>
    </Html>
  );
}

OrderConfirmationEmail.PreviewProps = {
  orderId: "123456",
  customerName: "Jane Doe",
  customerEmail: "jane.doe@example.com",
  orderCreatedAt: new Date().toISOString(),
  items: [
    {
      product: { id: "1", title: "Blue Widget", priceInUSD: 25.00 } as Product,
      variant: { id: "v1", title: "Large", priceInUSD: 0 } as Variant,
      quantity: 1,
    },
    {
      product: { id: "2", title: "Red Gadget", priceInUSD: 10.00 } as Product,
      variant: null,
      quantity: 2,
    },
  ],
  subtotal: 35.00,
  shippingRate: { cost: 5.00, displayName: "Standard Shipping" } as ShippingRateJSON,
  shippingAddress: {
    firstName: "Jane",
    lastName: "Doe",
    addressLine1: "123 Main St",
    addressLine2: "Apt 4B",
    city: "Anytown",
    state: "CA",
    postalCode: "12345",
    country: "USA",
  },
} as OrderConfirmationEmailData