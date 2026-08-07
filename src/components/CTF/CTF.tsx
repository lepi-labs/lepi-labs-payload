'use client'

import claimFlag from '@/lib/ctf/claimFlag'
import submitFlag from '@/lib/ctf/submitFlag'
import type { Ctf, CtfBlock as CTFBlockProps } from '@/payload-types'
import { useState } from 'react'
import { CtfSubmitForm } from '../forms/CtfSubmitForm'
import { CtfUsernameForm } from '../forms/CtfUsernameForm'

export function CTF(props: CTFBlockProps) {
  const { ctf } = props
  const [flag, setFlag] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [flagState, setFlagState] = useState<'start' | 'submitted' | 'found' | 'nameSubmitted'>(
    'start',
  )

  if (typeof ctf !== 'object') {
    throw new Error('Failed to load CTF.')
  }
  const providedCtf = ctf as Ctf
  let usernames = providedCtf.flags.flatMap((f) => f.claims?.map((c) => c.username)).sort()
  if (username) {
    usernames = [username].concat(usernames as string[])
  }

  const flagSubmit = async (f: string) => {
    setFlag(f)
    const flagIsValid = await submitFlag(providedCtf.id, f)
    setFlagState(flagIsValid ? 'found' : 'submitted')
    return flagIsValid
  }

  const usernameSubmit = async (u: string) => {
    setUsername(u)
    const newCtf = await claimFlag(providedCtf.id, flag!, u)
    if (!newCtf) {
      throw new Error('There was an error submitting your username :(')
    }
    setFlagState('nameSubmitted')
    return true
  }

  let statusHeader: string
  switch (flagState) {
    case 'submitted':
      statusHeader = 'That was incorrect, try again!'
      break
    case 'found':
      statusHeader = 'You found it! Enter a username for bragging rights!'
      break
    case 'nameSubmitted':
      statusHeader = 'Submitted! Thanks for playing!'
      break
    default:
      statusHeader = 'Find the flag!'
      break
  }

  return (
    <div className="container max-w-xl mx-auto">
      <h1 className="text-center">{statusHeader}</h1>
      {flagState !== 'found' && flagState !== 'nameSubmitted' && (
        <>
          <CtfSubmitForm submitCb={flagSubmit} />
        </>
      )}
      {flagState === 'found' && (
        <>
          <CtfUsernameForm submitCb={usernameSubmit} />
        </>
      )}
      <h2 className="my-12 text-center">Wall of Fame</h2>
      <ul className="text-center">
        {usernames.map((u) => {
          return <li key={u}>{u}</li>
        })}
      </ul>
    </div>
  )
}
