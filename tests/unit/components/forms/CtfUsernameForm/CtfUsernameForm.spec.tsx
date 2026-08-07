import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CtfUsernameForm } from '@/components/forms/CtfUsernameForm'

const submitCb = vi.fn<(username: string) => Promise<boolean>>()

describe('CtfUsernameForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    submitCb.mockReset()
  })

  it('renders the Username input and Submit button', () => {
    render(<CtfUsernameForm submitCb={submitCb} />)

    expect(screen.getByRole('textbox', { name: /username/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
  })

  it('shows a required validation error and does not call submitCb when submitted empty', async () => {
    render(<CtfUsernameForm submitCb={submitCb} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    })

    expect(screen.getByText('Username is required.')).toBeInTheDocument()
    expect(submitCb).not.toHaveBeenCalled()
  })

  it('rejects usernames shorter than 3 characters and does not call submitCb', async () => {
    render(<CtfUsernameForm submitCb={submitCb} />)

    fireEvent.change(screen.getByRole('textbox', { name: /username/i }), {
      target: { value: 'ab' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    })

    expect(screen.getByText('Username must be at least 3 characters.')).toBeInTheDocument()
    expect(submitCb).not.toHaveBeenCalled()
  })

  it('rejects usernames longer than 64 characters and does not call submitCb', async () => {
    render(<CtfUsernameForm submitCb={submitCb} />)

    fireEvent.change(screen.getByRole('textbox', { name: /username/i }), {
      target: { value: 'a'.repeat(65) },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    })

    expect(screen.getByText('Username must be at most 64 characters.')).toBeInTheDocument()
    expect(submitCb).not.toHaveBeenCalled()
  })

  it('calls submitCb with the entered username on a valid submit', async () => {
    submitCb.mockResolvedValue(true)
    render(<CtfUsernameForm submitCb={submitCb} />)

    fireEvent.change(screen.getByRole('textbox', { name: /username/i }), {
      target: { value: 'newuser' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    })

    await waitFor(() => expect(submitCb).toHaveBeenCalledWith('newuser'))
  })

  it('shows an error message when submitCb throws', async () => {
    submitCb.mockRejectedValueOnce(new Error('boom'))
    render(<CtfUsernameForm submitCb={submitCb} />)

    fireEvent.change(screen.getByRole('textbox', { name: /username/i }), {
      target: { value: 'newuser' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    })

    await waitFor(() =>
      expect(screen.getByText('There was an error submitting the flag :(')).toBeInTheDocument(),
    )
  })

  it('keeps the submit button enabled while the form is idle', () => {
    render(<CtfUsernameForm submitCb={submitCb} />)

    expect(screen.getByRole('button', { name: /submit/i })).toBeEnabled()
  })
})
