'use server'

import config from '@payload-config'
import { getPayload } from 'payload'

/**
 * Attempts to submit a flag for a CTF, and returns whether it is valid.
 * @param ctfId The ID of the CTF
 * @param flagText The flag text to submit. Must match exactly.
 */
export default async function submitFlag(ctfId: string, flagText: string): Promise<boolean> {
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

  for (const flag of ctf.flags.filter((f) => f.usesLeft > 0)) {
    if (flag.flagText === flagText) {
      return true
    }
  }
  return false
}
