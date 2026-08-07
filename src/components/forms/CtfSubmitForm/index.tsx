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
  flag: string
}

export interface CtfSubmitFormProps {
  submitCb: (flag: string) => Promise<boolean>
}

export const CtfSubmitForm: React.FC<CtfSubmitFormProps> = (props) => {
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
        submitCb(data.flag)
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
          <Label htmlFor="flag">Flag</Label>
          <Input id="flag" type="text" {...register('flag', { required: 'Flag is required.' })} />
          {errors.flag && <FormError message={errors.flag.message} />}
        </FormItem>
        <Button disabled={isLoading} type="submit" variant="default">
          Submit!
        </Button>
      </div>
    </form>
  )
}
