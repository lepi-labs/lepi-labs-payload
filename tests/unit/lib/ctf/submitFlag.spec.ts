import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))

import type { Payload } from 'payload'
import config from '@payload-config'
import { getPayload } from 'payload'

import submitFlag from '@/lib/ctf/submitFlag'
import type { Ctf } from '@/payload-types'

const mockGetPayload = vi.mocked(getPayload)

const makeCtf = (overrides: Partial<Ctf> = {}): Ctf => ({
  id: 'ctf-1',
  name: 'Test CTF',
  flags: [],
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

const stubPayload = (findByID: ReturnType<typeof vi.fn>): Payload =>
  ({ findByID } as unknown as Payload)

describe('submitFlag', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    void config
  })

  it('returns true when a flag with usesLeft > 0 exactly matches the flag text', async () => {
    const ctf = makeCtf({
      flags: [{ flagText: 'flag{correct}', usesLeft: 1, claims: [] }],
    })
    const mockFindByID = vi.fn().mockResolvedValue(ctf)
    mockGetPayload.mockResolvedValue(stubPayload(mockFindByID))

    const result = await submitFlag('ctf-1', 'flag{correct}')

    expect(result).toBe(true)
  })

  it('returns false when no flag matches the flag text', async () => {
    const ctf = makeCtf({
      flags: [{ flagText: 'flag{correct}', usesLeft: 1, claims: [] }],
    })
    const mockFindByID = vi.fn().mockResolvedValue(ctf)
    mockGetPayload.mockResolvedValue(stubPayload(mockFindByID))

    const result = await submitFlag('ctf-1', 'flag{wrong}')

    expect(result).toBe(false)
  })

  it('returns false when the matching flag has been exhausted (usesLeft === 0)', async () => {
    const ctf = makeCtf({
      flags: [{ flagText: 'flag{correct}', usesLeft: 0, claims: [] }],
    })
    const mockFindByID = vi.fn().mockResolvedValue(ctf)
    mockGetPayload.mockResolvedValue(stubPayload(mockFindByID))

    const result = await submitFlag('ctf-1', 'flag{correct}')

    expect(result).toBe(false)
  })

  it('returns false when the flag text differs only in case (exact string compare)', async () => {
    const ctf = makeCtf({
      flags: [{ flagText: 'FLAG{secret}', usesLeft: 1, claims: [] }],
    })
    const mockFindByID = vi.fn().mockResolvedValue(ctf)
    mockGetPayload.mockResolvedValue(stubPayload(mockFindByID))

    const result = await submitFlag('ctf-1', 'flag{secret}')

    expect(result).toBe(false)
  })

  it('returns false when the submitted text is only a substring of the flag', async () => {
    const ctf = makeCtf({
      flags: [{ flagText: 'flag{full-secret}', usesLeft: 1, claims: [] }],
    })
    const mockFindByID = vi.fn().mockResolvedValue(ctf)
    mockGetPayload.mockResolvedValue(stubPayload(mockFindByID))

    const result = await submitFlag('ctf-1', 'flag{full}')

    expect(result).toBe(false)
  })

  it('returns false when the CTF has no flags', async () => {
    const ctf = makeCtf({ flags: [] })
    const mockFindByID = vi.fn().mockResolvedValue(ctf)
    mockGetPayload.mockResolvedValue(stubPayload(mockFindByID))

    const result = await submitFlag('ctf-1', 'flag{anything}')

    expect(result).toBe(false)
  })

  it('returns true when one of several flags matches while the others do not', async () => {
    const ctf = makeCtf({
      flags: [
        { flagText: 'flag{one}', usesLeft: 1, claims: [] },
        { flagText: 'flag{two}', usesLeft: 1, claims: [] },
      ],
    })
    const mockFindByID = vi.fn().mockResolvedValue(ctf)
    mockGetPayload.mockResolvedValue(stubPayload(mockFindByID))

    const result = await submitFlag('ctf-1', 'flag{two}')

    expect(result).toBe(true)
  })

  it('throws when the CTF is not found', async () => {
    const mockFindByID = vi.fn().mockResolvedValue(null)
    mockGetPayload.mockResolvedValue(stubPayload(mockFindByID))

    await expect(submitFlag('ctf-missing', 'flag{x}')).rejects.toThrow(
      'CTF with ID ctf-missing not found',
    )
  })

  it('looks up the CTF with overrideAccess and depth so admin-only flag fields are readable', async () => {
    const ctf = makeCtf({
      flags: [{ flagText: 'flag{a}', usesLeft: 1, claims: [] }],
    })
    const mockFindByID = vi.fn().mockResolvedValue(ctf)
    mockGetPayload.mockResolvedValue(stubPayload(mockFindByID))

    await submitFlag('ctf-1', 'flag{a}')

    expect(mockFindByID).toHaveBeenCalledOnce()
    expect(mockFindByID.mock.calls[0][0]).toMatchObject({
      collection: 'ctfs',
      id: 'ctf-1',
      overrideAccess: true,
      depth: 3,
    })
  })
})
