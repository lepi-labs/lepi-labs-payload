import type { Endpoint } from 'payload'
import type { User } from '@/payload-types'
import { APIError } from 'payload'

import { verifyHcaptcha } from '@/utilities/verifyHcaptcha'

type CreateUserData = Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'collection'>

/**
 * Custom endpoint for user creation that verifies hCaptcha before creating the account.
 *
 * Accepts the same body as the built-in Payload user creation endpoint, plus an
 * additional `hcaptchaToken` field which is verified before the user is created.
 */
export const createUserEndpoint: Endpoint = {
  path: '/create',
  method: 'post',
  handler: async (req) => {
    const rawBody = await req.json?.()
    const body = (rawBody ?? {}) as Record<string, unknown>
    const { hcaptchaToken, name, email, password } = body

    if (!hcaptchaToken || typeof hcaptchaToken !== 'string') {
      throw new APIError('hCaptcha token is required.', 400)
    }

    const captchaValid = await verifyHcaptcha(hcaptchaToken)
    if (!captchaValid) {
      throw new APIError('hCaptcha verification failed. Please try again.', 400)
    }

    const userData: Partial<CreateUserData> & { password?: string } = {}
    if (typeof name === 'string') userData.name = name
    if (typeof email === 'string') userData.email = email
    if (typeof password === 'string') userData.password = password

    const doc = await req.payload.create({
      collection: 'users',
      data: userData as CreateUserData,
      overrideAccess: false,
      req,
    })

    return Response.json(doc, { status: 201 })
  },
}
