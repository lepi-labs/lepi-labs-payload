import { Order } from "@/payload-types";
import { Font, Hr, Html, Img, pixelBasedPreset, Tailwind } from "react-email";

export interface OrderConfirmationEmailOptions {
  order: Order
}

// need to show:
// customer name
// order id
// date received
// each item with variant and amount
// tax
// shipping
// total
// shipping address
// link to view order

function itemToLi(item: NonNullable<Order['items']>[number]) {
  let priceUSD
  let productName
  if (typeof item.product === 'string') {
    productName = item.product
  } else if (typeof item.product === 'object') {
    productName = item.product?.title
    priceUSD = item.product?.priceInUSD
  }
  let variantName
  if (typeof item.variant === 'string') {
    variantName = item.variant
  } else if (typeof item.variant === 'object') {
    variantName = item.variant?.title
    priceUSD = item.variant?.priceInUSD
  }
  if (!priceUSD) {
    priceUSD = 0
  }

  return (<li>
    <b>{productName}</b>
    {variantName && ' (' + variantName + '), '} - 
    Qty: {item.quantity}, <b>${(item.quantity * priceUSD).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</b>
  </li>)
}

export default function OrderConfirmationEmail(opts: OrderConfirmationEmailOptions) {
  opts = {
    order: {
      id: '8293874',
      updatedAt: '12345',
      createdAt: '12345',
      customer: 'Xenu',
      items: [
        {
          id: '1234',
          quantity: 1,
          product: {
            id: '1234',
            slug: 'synth-badge',
            updatedAt: '12345',
            createdAt: '12345',
            title: 'Synth badge',
            priceInUSD: 30
          }
        },
        {
          id: '1235',
          quantity: 1,
          product: {
            id: '1235',
            slug: 'rgb-protogen-badge',
            updatedAt: '12345',
            createdAt: '12345',
            title: 'RGB protogen badge',
            priceInUSD: 35,
          },
          variant: {
            id: '1235',
            product: 'rgb-protogen-badge',
            title: 'Love',
            options: [],
            updatedAt: '12345',
            createdAt: '12345',
            priceInUSD: 35
          }
        }
      ]
    }
  }


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
        <Hr />
        <p>Hey there, {opts.order.customer?.toString()}! Here&apos;s the receipt for your online order ({opts.order.id}),
          placed on {opts.order.createdAt}.
        </p>
        <ul>
        {opts.order.items?.map(itemToLi)}
        </ul>
        <p>Subtotal: <b>$35.00</b></p>
        <p>Tax: <b>TODO</b></p>
      </Tailwind>
    </Html>
  );
}