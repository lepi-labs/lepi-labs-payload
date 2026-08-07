'use client'

import { Message } from '@/components/Message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import React, { useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { FormError } from '../FormError'
import { FormItem } from '../FormItem'

type FormData = {
  username: string
}

export interface CtfUsernameFormProps {
  submitCb: (username: string) => Promise<boolean>
}

export const CtfUsernameForm: React.FC<CtfUsernameFormProps> = (props) => {
  const { submitCb } = props

  const [error, setError] = React.useState<null | string>(null)

  const {
    formState: { errors, isLoading },
    handleSubmit,
    register,
  } = useForm<FormData>()

  const onSubmit = useCallback(
    async (data: FormData) => {
      try {
        submitCb(data.username)
      } catch (_) {
        setError('There was an error submitting the flag :(')
      }
    },
    [submitCb],
  )

  return (
    <form className="" onSubmit={handleSubmit(onSubmit)}>
      <Message className="classes.message" error={error} />
      <div className="flex flex-col gap-4">
        <FormItem className="">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            type="text"
            {...register('username', { required: 'Username is required.' })}
          />
          {errors.username && <FormError message={errors.username.message} />}
        </FormItem>
        <Button disabled={isLoading} type="submit" variant="default">
          Submit username!
        </Button>
      </div>
    </form>
  )
}
