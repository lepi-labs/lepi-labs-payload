'use client'

import { Captcha, type CaptchaRef } from '@/components/Captcha'
import { FormError } from '@/components/forms/FormError'
import { FormItem } from '@/components/forms/FormItem'
import { Message } from '@/components/Message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import React, { Fragment, useCallback, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

type FormData = {
  email: string
  hcaptchaToken: string
}

export const ForgotPasswordForm: React.FC = () => {
  const siteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const captchaRef = useRef<CaptchaRef>(null)

  const {
    formState: { errors },
    handleSubmit,
    register,
    setValue,
    watch,
  } = useForm<FormData>()

  const hcaptchaToken = watch('hcaptchaToken')
  const captchaRequired = Boolean(siteKey)

  const onSubmit = useCallback(
    async (data: FormData) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/forgot-password`,
        {
          body: JSON.stringify(data),
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
        },
      )

      if (response.ok) {
        setSuccess(true)
        setError('')
      } else {
        setError(
          'There was a problem while attempting to send you a password reset email. Please try again.',
        )
        captchaRef.current?.resetCaptcha()
        setValue('hcaptchaToken', '')
      }
    },
    [setValue],
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

            {captchaRequired && (
              <FormItem className="mb-8">
                <Captcha
                  ref={captchaRef}
                  onVerify={(token) => setValue('hcaptchaToken', token, { shouldValidate: true })}
                  onExpire={() => setValue('hcaptchaToken', '')}
                  onError={() => setValue('hcaptchaToken', '')}
                />
                {errors.hcaptchaToken && <FormError message={errors.hcaptchaToken.message} />}
              </FormItem>
            )}

            <Button
              disabled={captchaRequired && !hcaptchaToken}
              type="submit"
              variant="default"
            >
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
