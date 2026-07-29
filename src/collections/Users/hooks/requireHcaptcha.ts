import type { CollectionBeforeOperationHook } from 'payload'
import { APIError } from 'payload'

import { checkRole } from '@/access/utilities'
import { verifyHcaptcha } from '@/lib/verifyHcaptcha'

const PROTECTED_OPERATIONS = ['create', 'forgotPassword'] as const

export const requireHcaptcha: CollectionBeforeOperationHook<'users'> = async ({
  operation,
  req,
}) => {
  if (!PROTECTED_OPERATIONS.includes(operation as (typeof PROTECTED_OPERATIONS)[number])) {
    return
  }

  if (process.env.NODE_ENV !== 'production') {
    return
  }

  if (operation === 'create' && checkRole(['admin'], req.user)) {
    return
  }

  if (
    operation === 'create' &&
    (await req.payload.count({ collection: 'users', req })).totalDocs === 0
  ) {
    return
  }

  const token = req.data?.hcaptchaToken

  if (!token) {
    throw new APIError('Captcha verification failed', 403)
  }

  const remoteip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    undefined

  const ok = await verifyHcaptcha(token, remoteip)

  if (!ok) {
    throw new APIError('Captcha verification failed', 403)
  }
}
