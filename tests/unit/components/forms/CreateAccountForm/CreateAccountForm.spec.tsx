/**
 * Unit tests for the CreateAccountForm component.
 *
 * Dependencies mocked here:
 *   - @hcaptcha/react-hcaptcha  (HCaptcha widget)
 *   - @/providers/Auth          (useAuth hook)
 *   - next/navigation           (useRouter, useSearchParams)
 *   - next/link                 (Link)
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

vi.mock('@/providers/Auth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { useAuth } from '@/providers/Auth'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ReadonlyURLSearchParams } from 'next/navigation'
import { CreateAccountForm } from '@/components/forms/CreateAccountForm'

const mockUseAuth = vi.mocked(useAuth)
const mockUseRouter = vi.mocked(useRouter)
const mockUseSearchParams = vi.mocked(useSearchParams)

const mockSearchParams = (params?: string): ReadonlyURLSearchParams =>
  new URLSearchParams(params) as ReadonlyURLSearchParams

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CreateAccountForm', () => {
  const mockPush = vi.fn()
  const mockLogin = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    } as ReturnType<typeof useRouter>)
    mockUseSearchParams.mockReturnValue(mockSearchParams())
    mockUseAuth.mockReturnValue({
      user: null,
      status: undefined,
      login: mockLogin,
      logout: vi.fn(),
      create: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
      setUser: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>)

    vi.stubGlobal('fetch', vi.fn())
  })

  it('renders all form fields and the captcha widget', () => {
    render(<CreateAccountForm />)

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByTestId('hcaptcha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('shows an error when captcha is not completed before submit', async () => {
    render(<CreateAccountForm />)

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } })
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    })

    expect(
      screen.getByText(/please complete the captcha verification/i),
    ).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('submits with captcha token after captcha is completed', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', mockFetch)
    mockLogin.mockResolvedValue(undefined)

    render(<CreateAccountForm />)

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } })
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' },
    })

    // Complete the captcha
    fireEvent.click(screen.getByTestId('hcaptcha'))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledOnce()
    })

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/users/create')
    const body = JSON.parse(options.body as string)
    expect(body.hcaptchaToken).toBe('test-captcha-token')
    expect(body.email).toBe('test@example.com')
    expect(body.name).toBe('testuser')
  })

  it('displays error message from server on failed submission', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Bad Request',
      json: async () => ({ message: 'Email already in use.' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    render(<CreateAccountForm />)

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } })
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'existing@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' },
    })

    fireEvent.click(screen.getByTestId('hcaptcha'))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    })

    await waitFor(() => {
      expect(screen.getByText(/email already in use/i)).toBeInTheDocument()
    })
  })

  it('shows password mismatch validation error', async () => {
    render(<CreateAccountForm />)

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } })
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'different' },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    })

    await waitFor(() => {
      expect(screen.getByText(/the passwords do not match/i)).toBeInTheDocument()
    })
    expect(fetch).not.toHaveBeenCalled()
  })
})
