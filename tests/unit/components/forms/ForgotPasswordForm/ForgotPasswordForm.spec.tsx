import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@hcaptcha/react-hcaptcha', () => {
  const MockHCaptcha = (props: { sitekey: string }) => <div data-sitekey={props.sitekey} />
  return { default: MockHCaptcha }
})

import { ForgotPasswordForm } from '@/components/forms/ForgotPasswordForm'

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('renders the captcha widget when a site key is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_HCAPTCHA_SITE_KEY', 'test-site-key')
    render(<ForgotPasswordForm />)

    expect(screen.getByTestId('hcaptcha')).toBeInTheDocument()
  })

  it('does not render the captcha widget when no site key is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_HCAPTCHA_SITE_KEY', '')
    render(<ForgotPasswordForm />)

    expect(screen.queryByTestId('hcaptcha')).not.toBeInTheDocument()
  })

  it('disables the submit button until the captcha is solved', () => {
    vi.stubEnv('NEXT_PUBLIC_HCAPTCHA_SITE_KEY', 'test-site-key')
    render(<ForgotPasswordForm />)

    expect(screen.getByRole('button', { name: /forgot password/i })).toBeDisabled()
  })

  it('does not disable the submit button when no site key is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_HCAPTCHA_SITE_KEY', '')
    render(<ForgotPasswordForm />)

    expect(screen.getByRole('button', { name: /forgot password/i })).not.toBeDisabled()
  })
})
