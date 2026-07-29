import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@hcaptcha/react-hcaptcha', () => {
  const MockHCaptcha = (props: { sitekey: string }) => <div data-sitekey={props.sitekey} />
  return { default: MockHCaptcha }
})

vi.mock('@/providers/Auth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}))

import { CreateAccountForm } from '@/components/forms/CreateAccountForm'
import { useAuth } from '@/providers/Auth'
import { useSearchParams } from 'next/navigation'

import type { ReadonlyURLSearchParams } from 'next/navigation'

const mockUseAuth = vi.mocked(useAuth)
const mockUseSearchParams = vi.mocked(useSearchParams)

const mockSearchParams = (params?: string): ReadonlyURLSearchParams =>
  new URLSearchParams(params) as ReadonlyURLSearchParams

describe('CreateAccountForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    mockUseAuth.mockReturnValue({ login: vi.fn() } as unknown as ReturnType<typeof useAuth>)
    mockUseSearchParams.mockReturnValue(mockSearchParams())
  })

  it('renders the captcha widget when a site key is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_HCAPTCHA_SITE_KEY', 'test-site-key')
    render(<CreateAccountForm />)

    expect(screen.getByTestId('hcaptcha')).toBeInTheDocument()
  })

  it('does not render the captcha widget when no site key is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_HCAPTCHA_SITE_KEY', '')
    render(<CreateAccountForm />)

    expect(screen.queryByTestId('hcaptcha')).not.toBeInTheDocument()
  })

  it('disables the submit button until the captcha is solved', () => {
    vi.stubEnv('NEXT_PUBLIC_HCAPTCHA_SITE_KEY', 'test-site-key')
    render(<CreateAccountForm />)

    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled()
  })

  it('does not disable the submit button when no site key is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_HCAPTCHA_SITE_KEY', '')
    render(<CreateAccountForm />)

    expect(screen.getByRole('button', { name: /create account/i })).not.toBeDisabled()
  })
})
