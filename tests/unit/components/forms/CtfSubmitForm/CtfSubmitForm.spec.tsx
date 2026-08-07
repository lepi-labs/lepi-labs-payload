import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CtfSubmitForm } from '@/components/forms/CtfSubmitForm'

const submitCb = vi.fn<(flag: string) => Promise<boolean>>()

describe('CtfSubmitForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    submitCb.mockReset()
  })

  it('renders the Flag input and Submit button', () => {
    render(<CtfSubmitForm submitCb={submitCb} />)

    expect(screen.getByRole('textbox', { name: /flag/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
  })

  it('shows a required validation error and does not call submitCb when submitted empty', async () => {
    render(<CtfSubmitForm submitCb={submitCb} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    })

    expect(screen.getByText('Flag is required.')).toBeInTheDocument()
    expect(submitCb).not.toHaveBeenCalled()
  })

  it('calls submitCb with the entered flag on a valid submit', async () => {
    submitCb.mockResolvedValue(true)
    render(<CtfSubmitForm submitCb={submitCb} />)

    fireEvent.change(screen.getByRole('textbox', { name: /flag/i }), {
      target: { value: 'flag{abc}' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    })

    await waitFor(() => expect(submitCb).toHaveBeenCalledWith('flag{abc}'))
  })

  it('shows an error message when submitCb throws', async () => {
    submitCb.mockRejectedValueOnce(new Error('boom'))
    render(<CtfSubmitForm submitCb={submitCb} />)

    fireEvent.change(screen.getByRole('textbox', { name: /flag/i }), {
      target: { value: 'flag{abc}' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    })

    await waitFor(() =>
      expect(screen.getByText('There was an error submitting the flag :(')).toBeInTheDocument(),
    )
  })

  it('keeps the submit button enabled while the form is idle', () => {
    render(<CtfSubmitForm submitCb={submitCb} />)

    expect(screen.getByRole('button', { name: /submit/i })).toBeEnabled()
  })
})
