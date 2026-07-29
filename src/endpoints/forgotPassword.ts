import type { Endpoint } from 'payload'
import { APIError } from 'payload'

import { verifyHcaptcha } from '@/utilities/verifyHcaptcha'

/**
 * Custom endpoint for forgot-password that verifies hCaptcha before triggering the
 * password reset email. Delegates to Payload's built-in forgotPassword operation
 * after successful captcha verification.
 */
export const forgotPasswordEndpoint: Endpoint = {
  path: '/forgot-password-captcha',
  method: 'post',
  handler: async (req) => {
    const rawBody = await req.json?.()
    const body = (rawBody ?? {}) as { email?: string; hcaptchaToken?: string }
    const { email, hcaptchaToken } = body

    if (!hcaptchaToken || typeof hcaptchaToken !== 'string') {
      throw new APIError('hCaptcha token is required.', 400)
    }

    const captchaValid = await verifyHcaptcha(hcaptchaToken)
    if (!captchaValid) {
      throw new APIError('hCaptcha verification failed. Please try again.', 400)
    }

    if (!email || typeof email !== 'string') {
      throw new APIError('Email is required.', 400)
    }

    try {
      await req.payload.forgotPassword({
        collection: 'users',
        data: { email },
        req,
      })
    } catch (_) {
      // Swallow errors to avoid leaking whether the email address exists
    }

    return Response.json({ message: 'Password reset email sent.' })
  },
}
