'use client'

import { FormError } from '@/components/forms/FormError'
import { FormItem } from '@/components/forms/FormItem'
import { Message } from '@/components/Message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import React, { Fragment, useCallback, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

type FormData = {
  email: string
}

export const ForgotPasswordForm: React.FC = () => {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const captchaRef = useRef<HCaptcha>(null)

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<FormData>()

  const onSubmit = useCallback(
    async (data: FormData) => {
      if (!captchaToken) {
        setError('Please complete the captcha verification.')
        return
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/forgot-password-captcha`,
        {
          body: JSON.stringify({ ...data, hcaptchaToken: captchaToken }),
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
        },
      )

      captchaRef.current?.resetCaptcha()
      setCaptchaToken(null)

      if (response.ok) {
        setSuccess(true)
        setError('')
      } else {
        setError(
          'There was a problem while attempting to send you a password reset email. Please try again.',
        )
      }
    },
    [captchaToken],
  )

  return (
    <Fragment>
      {!success && (
        <React.Fragment>
          <h1 className="text-xl mb-4">Forgot Password</h1>
          <div className="prose dark:prose-invert mb-8">
            <p>
              {`Please enter your email below. You will receive an email message with instructions on
              how to reset your password.`}
            </p>
          </div>
          <form className="max-w-lg" onSubmit={handleSubmit(onSubmit)}>
            <Message className="mb-8" error={error} />

            <FormItem className="mb-8">
              <Label htmlFor="email" className="mb-2">
                Email address
              </Label>
              <Input
                id="email"
                {...register('email', { required: 'Please provide your email.' })}
                type="email"
              />
              {errors.email && <FormError message={errors.email.message} />}
            </FormItem>

            <div className="mb-8">
              <HCaptcha
                sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? '10000000-ffff-ffff-ffff-000000000001'}
                onVerify={setCaptchaToken}
                ref={captchaRef}
              />
            </div>

            <Button type="submit" variant="default">
              Forgot Password
            </Button>
          </form>
        </React.Fragment>
      )}
      {success && (
        <React.Fragment>
          <h1 className="text-xl mb-4">Request submitted</h1>
          <div className="prose dark:prose-invert">
            <p>Check your email for a link that will allow you to securely reset your password.</p>
          </div>
        </React.Fragment>
      )}
    </Fragment>
  )
}
