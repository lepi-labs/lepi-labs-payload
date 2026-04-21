'use server'

import { Address } from "@/payload-types";
import config from '@payload-config';
import { headers as getHeaders } from 'next/headers';
import { getPayload } from "payload";

export default async function createAddress(address: Address): Promise<Address> {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) {
    throw new Error('Tried to create an address, but user was not logged in.')
  }

  return await payload.create({
    collection: 'addresses',
    data: {
      ...address,
      customer: user
    },
  })
}