/**
 * Verifies an hCaptcha token against the hCaptcha siteverify API.
 *
 * Returns true if the token is valid, false otherwise.
 * When HCAPTCHA_SECRET_KEY is not set, verification is skipped (useful for local dev).
 */
export async function verifyHcaptcha(token: string): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET_KEY

  if (!secret) {
    return true
  }

  const body = new URLSearchParams()
  body.append('secret', secret)
  body.append('response', token)

  const response = await fetch('https://api.hcaptcha.com/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    return false
  }

  const data = (await response.json()) as { success: boolean }
  return data.success === true
}
