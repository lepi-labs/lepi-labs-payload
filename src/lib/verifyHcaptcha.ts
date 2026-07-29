const SITEVERIFY_URL = 'https://hcaptcha.com/siteverify'

export async function verifyHcaptcha(token: string, remoteip?: string): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET

  if (!secret) {
    return false
  }

  try {
    const body = new URLSearchParams({
      response: token,
      secret,
    })

    if (remoteip) {
      body.set('remoteip', remoteip)
    }

    const res = await fetch(SITEVERIFY_URL, {
      body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
    })

    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch {
    return false
  }
}
