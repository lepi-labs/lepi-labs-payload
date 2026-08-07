import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/ctf/submitFlag', () => ({ default: vi.fn() }))
vi.mock('@/lib/ctf/claimFlag', () => ({ default: vi.fn() }))

import { CTF } from '@/components/CTF/CTF'
import claimFlag from '@/lib/ctf/claimFlag'
import submitFlag from '@/lib/ctf/submitFlag'
import type { Ctf, CtfBlock } from '@/payload-types'

const mockSubmitFlag = vi.mocked(submitFlag)
const mockClaimFlag = vi.mocked(claimFlag)

const makeCtf = (overrides: Partial<Ctf> = {}): Ctf => ({
  id: 'ctf-1',
  name: 'Test CTF',
  flags: [],
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

const makeBlock = (ctf: Ctf['id'] | Ctf): CtfBlock => ({
  ctf,
  blockType: 'ctf',
})

const submitFlagForm = async (value: string) => {
  fireEvent.change(screen.getByRole('textbox', { name: /flag/i }), {
    target: { value },
  })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
  })
}

const submitUsernameForm = async (value: string) => {
  fireEvent.change(screen.getByRole('textbox', { name: /username/i }), {
    target: { value },
  })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
  })
}

describe('CTF', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSubmitFlag.mockReset()
    mockClaimFlag.mockReset()
  })

  it('throws when the ctf prop is not a populated CTF object', () => {
    expect(() => render(<CTF {...makeBlock('ctf-id')} />)).toThrow('Failed to load CTF.')
  })

  it('renders the initial "Find the flag!" state with only the submit form', () => {
    render(<CTF {...makeBlock(makeCtf())} />)

    expect(screen.getByText('Find the flag!')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /flag/i })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /username/i })).not.toBeInTheDocument()
  })

  it('transitions to the incorrect state when the flag does not match', async () => {
    mockSubmitFlag.mockResolvedValueOnce(false)
    render(<CTF {...makeBlock(makeCtf())} />)

    await submitFlagForm('flag{nope}')

    await waitFor(() =>
      expect(screen.getByText('That was incorrect, try again!')).toBeInTheDocument(),
    )
    expect(mockSubmitFlag).toHaveBeenCalledWith('ctf-1', 'flag{nope}')
    expect(screen.getByRole('textbox', { name: /flag/i })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /username/i })).not.toBeInTheDocument()
  })

  it('transitions to the found state and shows the username form when the flag matches', async () => {
    mockSubmitFlag.mockResolvedValueOnce(true)
    render(<CTF {...makeBlock(makeCtf())} />)

    await submitFlagForm('flag{test}')

    await waitFor(() =>
      expect(
        screen.getByText('You found it! Enter a username for bragging rights!'),
      ).toBeInTheDocument(),
    )
    expect(mockSubmitFlag).toHaveBeenCalledWith('ctf-1', 'flag{test}')
    expect(screen.getByRole('textbox', { name: /username/i })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /flag/i })).not.toBeInTheDocument()
  })

  it('transitions to nameSubmitted when a username is submitted after a valid flag', async () => {
    mockSubmitFlag.mockResolvedValueOnce(true)
    mockClaimFlag.mockResolvedValueOnce(makeCtf())
    render(<CTF {...makeBlock(makeCtf())} />)

    await submitFlagForm('flag{test}')
    await waitFor(() =>
      expect(
        screen.getByText('You found it! Enter a username for bragging rights!'),
      ).toBeInTheDocument(),
    )
    await submitUsernameForm('newuser')

    await waitFor(() =>
      expect(screen.getByText('Submitted! Thanks for playing!')).toBeInTheDocument(),
    )
    expect(mockClaimFlag).toHaveBeenCalledWith('ctf-1', 'flag{test}', 'newuser')
  })

  it('stays in the found state and surfaces an error when claimFlag returns null', async () => {
    mockSubmitFlag.mockResolvedValueOnce(true)
    mockClaimFlag.mockResolvedValueOnce(null)
    render(<CTF {...makeBlock(makeCtf())} />)

    await submitFlagForm('flag{test}')
    await waitFor(() =>
      expect(
        screen.getByText('You found it! Enter a username for bragging rights!'),
      ).toBeInTheDocument(),
    )
    await submitUsernameForm('newuser')

    await waitFor(() =>
      expect(screen.getByText('There was an error submitting the flag :(')).toBeInTheDocument(),
    )
    expect(
      screen.getByText('You found it! Enter a username for bragging rights!'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Submitted! Thanks for playing!')).not.toBeInTheDocument()
  })

  it('renders the Wall of Fame with sorted usernames from existing claims', () => {
    const ctf = makeCtf({
      flags: [
        { flagText: 'flag{a}', usesLeft: 1, claims: [{ username: 'bob', date: 'x', id: 'c1' }] },
        { flagText: 'flag{b}', usesLeft: 1, claims: [{ username: 'alice', date: 'y', id: 'c2' }] },
      ],
    })
    render(<CTF {...makeBlock(ctf)} />)

    const items = screen.getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual(['alice', 'bob'])
  })

  it('prepends the just-submitted username to the Wall of Fame', async () => {
    mockSubmitFlag.mockResolvedValueOnce(true)
    mockClaimFlag.mockResolvedValueOnce(makeCtf())
    const ctf = makeCtf({
      flags: [
        { flagText: 'flag{a}', usesLeft: 1, claims: [{ username: 'bob', date: 'x', id: 'c1' }] },
      ],
    })
    render(<CTF {...makeBlock(ctf)} />)

    await submitFlagForm('flag{test}')
    await waitFor(() =>
      expect(
        screen.getByText('You found it! Enter a username for bragging rights!'),
      ).toBeInTheDocument(),
    )
    await submitUsernameForm('newuser')

    await waitFor(() => {
      const items = screen.getAllByRole('listitem')
      expect(items.map((li) => li.textContent)).toEqual(['newuser', 'bob'])
    })
  })

  it('does not render empty Wall of Fame entries when a flag has no claims', () => {
    const ctf = makeCtf({
      flags: [
        { flagText: 'flag{a}', usesLeft: 1, claims: [{ username: 'alice', date: 'x', id: 'c1' }] },
        { flagText: 'flag{b}', usesLeft: 1 },
      ],
    })
    render(<CTF {...makeBlock(ctf)} />)

    const items = screen.getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual(['alice'])
  })
})
