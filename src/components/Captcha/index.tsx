'use client'

import HCaptcha from '@hcaptcha/react-hcaptcha'
import React, { forwardRef, useImperativeHandle, useRef } from 'react'

export type CaptchaRef = {
  resetCaptcha: () => void
}

type CaptchaProps = {
  onVerify: (token: string) => void
  onExpire?: () => void
  onError?: () => void
}

export const Captcha = forwardRef<CaptchaRef, CaptchaProps>(function Captcha(
  { onVerify, onExpire, onError },
  ref,
) {
  const captchaRef = useRef<HCaptcha>(null)
  const siteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY

  useImperativeHandle(ref, () => ({
    resetCaptcha: () => {
      captchaRef.current?.resetCaptcha()
    },
  }))

  if (!siteKey) {
    return null
  }

  return (
    <div data-testid="hcaptcha">
      <HCaptcha
        ref={captchaRef}
        sitekey={siteKey}
        size="normal"
        theme="light"
        onVerify={(token) => {
          if (token) onVerify(token)
        }}
        onExpire={onExpire}
        onError={() => {
          onError?.()
        }}
      />
    </div>
  )
})
