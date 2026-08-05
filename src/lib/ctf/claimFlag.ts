'use server'

import { Ctf } from '@/payload-types'
import config from '@payload-config'
import { getPayload } from 'payload'

/**
 * Attempts to claim a flag.
 * @param ctfId The ID of the CTF
 * @param flagText The flag text to claim. Must match exactly.
 * @param username The username of the user claiming the flag
 * @returns The updated CTF, if the operation was successful. null otherwise.
 */
export default async function claimFlag(
  ctfId: string,
  flagText: string,
  username: string,
): Promise<Ctf | null> {
  const payload = await getPayload({ config })

  const ctf = await payload.findByID({
    collection: 'ctfs',
    id: ctfId,
    overrideAccess: true,
    depth: 3,
  })
  if (!ctf) {
    throw new Error(`CTF with ID ${ctfId} not found`)
  }

  let foundFlag: Ctf['flags'][number] | undefined
  for (const flag of ctf.flags.filter((f) => f.usesLeft > 0)) {
    if (flag.flagText === flagText) {
      foundFlag = flag
      break
    }
  }
  if (!foundFlag) {
    return null
  }

  foundFlag.claims?.push({
    username: username,
    date: new Date().toDateString(),
  })
  foundFlag.usesLeft--
  await payload.update({
    collection: 'ctfs',
    id: ctf.id,
    data: ctf,
  })
  const newCtf = await payload.findByID({
    collection: 'ctfs',
    id: ctf.id,
  })
  return newCtf
}
