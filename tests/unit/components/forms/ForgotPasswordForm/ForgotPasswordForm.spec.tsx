/**
 * Unit tests for the ForgotPasswordForm component.
 *
 * Dependencies mocked here:
 *   - @hcaptcha/react-hcaptcha  (HCaptcha widget)
 *   - next/navigation           (not used by this component, but mocked for safety)
 */

import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@hcaptcha/react-hcaptcha', () => ({
  default: ({ onVerify }: { onVerify: (token: string) => void }) => (
    <button type="button" data-testid="hcaptcha" onClick={() => onVerify('test-captcha-token')}>
      Complete Captcha
    </button>
  ),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { ForgotPasswordForm } from '@/components/forms/ForgotPasswordForm'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('renders the email field, captcha widget and submit button', () => {
    render(<ForgotPasswordForm />)

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByTestId('hcaptcha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /forgot password/i })).toBeInTheDocument()
  })

  it('shows an error when captcha is not completed before submit', async () => {
    render(<ForgotPasswordForm />)

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'user@example.com' },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /forgot password/i }))
    })

    expect(
      screen.getByText(/please complete the captcha verification/i),
    ).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('submits with captcha token and shows success state', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', mockFetch)

    render(<ForgotPasswordForm />)

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'user@example.com' },
    })

    // Complete the captcha
    fireEvent.click(screen.getByTestId('hcaptcha'))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /forgot password/i }))
    })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledOnce()
    })

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/users/forgot-password-captcha')
    const body = JSON.parse(options.body as string)
    expect(body.email).toBe('user@example.com')
    expect(body.hcaptchaToken).toBe('test-captcha-token')

    await waitFor(() => {
      expect(screen.getByText(/request submitted/i)).toBeInTheDocument()
    })
  })

  it('shows error message when server request fails', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false })
    vi.stubGlobal('fetch', mockFetch)

    render(<ForgotPasswordForm />)

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'user@example.com' },
    })

    fireEvent.click(screen.getByTestId('hcaptcha'))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /forgot password/i }))
    })

    await waitFor(() => {
      expect(
        screen.getByText(/there was a problem while attempting to send you a password reset email/i),
      ).toBeInTheDocument()
    })
  })

  it('requires email to be provided', async () => {
    render(<ForgotPasswordForm />)

    // Complete the captcha but don't fill email
    fireEvent.click(screen.getByTestId('hcaptcha'))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /forgot password/i }))
    })

    await waitFor(() => {
      expect(screen.getByText(/please provide your email/i)).toBeInTheDocument()
    })
    expect(fetch).not.toHaveBeenCalled()
  })
})
