'use server'

import config from '@payload-config'
import { getPayload } from 'payload'

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL

export default async function sendDiscordWebhook(content: string) {
  const payload = await getPayload({ config })
  if (!DISCORD_WEBHOOK_URL) {
    payload.logger.warn('Tried to use Discord webhook but DISCORD_WEBHOOK_URL not set.')
    return
  }

  payload.logger.info({ content }, 'Sending Discord webhook')
  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    })
  } catch (error) {
    payload.logger.error({ error }, 'Error trying to send Discord webhook')
  }
}