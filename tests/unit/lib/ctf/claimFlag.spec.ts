import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))

import type { Payload } from 'payload'
import config from '@payload-config'
import { getPayload } from 'payload'

import claimFlag from '@/lib/ctf/claimFlag'
import type { Ctf } from '@/payload-types'

const mockGetPayload = vi.mocked(getPayload)

const today = () => new Date().toDateString()

const makeCtf = (overrides: Partial<Ctf> = {}): Ctf => ({
  id: 'ctf-1',
  name: 'Test CTF',
  flags: [],
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

const stubPayload = (findByID: ReturnType<typeof vi.fn>, update?: ReturnType<typeof vi.fn>): Payload =>
  ({ findByID, update } as unknown as Payload)

describe('claimFlag', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    void config
  })

  it('decrements usesLeft by 1 on the matched flag and passes the full mutated CTF to update', async () => {
    const ctf = makeCtf({
      flags: [{ flagText: 'flag{a}', usesLeft: 2, claims: [] }],
    })
    const mockFindByID = vi.fn().mockResolvedValue(ctf)
    const mockUpdate = vi.fn().mockResolvedValue(ctf)
    mockGetPayload.mockResolvedValue(stubPayload(mockFindByID, mockUpdate))

    await claimFlag('ctf-1', 'flag{a}', 'alice')

    expect(mockUpdate).toHaveBeenCalledOnce()
    const updateArg = mockUpdate.mock.calls[0][0]
    expect(updateArg.id).toBe('ctf-1')
    expect(updateArg.data).toBe(ctf)
    expect(updateArg.data.flags[0].usesLeft).toBe(1)
  })

  it('appends a claim with the username and today\u2019s date to the matched flag', async () => {
    const ctf = makeCtf({
      flags: [
        {
          flagText: 'flag{a}',
          usesLeft: 1,
          claims: [{ username: 'bob', date: '2026-01-01', id: 'c1' }],
        },
      ],
    })
    const mockFindByID = vi.fn().mockResolvedValue(ctf)
    const mockUpdate = vi.fn().mockResolvedValue(ctf)
    mockGetPayload.mockResolvedValue(stubPayload(mockFindByID, mockUpdate))

    await claimFlag('ctf-1', 'flag{a}', 'alice')

    const claims = mockUpdate.mock.calls[0][0].data.flags[0].claims
    expect(claims).toHaveLength(2)
    expect(claims[0]).toEqual({ username: 'bob', date: '2026-01-01', id: 'c1' })
    expect(claims[1]).toEqual({ username: 'alice', date: today() })
  })

  it('initializes claims when the matched flag has none and records the new claim', async () => {
    const ctf = makeCtf({
      flags: [{ flagText: 'flag{a}', usesLeft: 1 }],
    })
    const mockFindByID = vi.fn().mockResolvedValue(ctf)
    const mockUpdate = vi.fn().mockResolvedValue(ctf)
    mockGetPayload.mockResolvedValue(stubPayload(mockFindByID, mockUpdate))

    await claimFlag('ctf-1', 'flag{a}', 'alice')

    const claims = mockUpdate.mock.calls[0][0].data.flags[0].claims
    expect(claims).toEqual([{ username: 'alice', date: today() }])
  })

  it('leaves non-matching flags untouched', async () => {
    const ctf = makeCtf({
      flags: [
        { flagText: 'flag{a}', usesLeft: 2, claims: [{ username: 'bob', date: 'x', id: 'c1' }] },
        { flagText: 'flag{b}', usesLeft: 3, claims: [{ username: 'carol', date: 'y', id: 'c2' }] },
      ],
    })
    const mockFindByID = vi.fn().mockResolvedValue(ctf)
    const mockUpdate = vi.fn().mockResolvedValue(ctf)
    mockGetPayload.mockResolvedValue(stubPayload(mockFindByID, mockUpdate))

    await claimFlag('ctf-1', 'flag{a}', 'alice')

    const flags = mockUpdate.mock.calls[0][0].data.flags
    expect(flags[0].usesLeft).toBe(1)
    expect(flags[1].usesLeft).toBe(3)
    expect(flags[1].claims).toEqual([{ username: 'carol', date: 'y', id: 'c2' }])
  })

  it('returns the re-read CTF rather than the pre-update document', async () => {
    const ctf = makeCtf({
      flags: [{ flagText: 'flag{a}', usesLeft: 1, claims: [] }],
    })
    const reRead = makeCtf({
      flags: [
        { flagText: 'flag{a}', usesLeft: 0, claims: [{ username: 'alice', date: today(), id: 'c1' }] },
      ],
    })
    const mockFindByID = vi.fn().mockResolvedValueOnce(ctf).mockResolvedValueOnce(reRead)
    const mockUpdate = vi.fn().mockResolvedValue(reRead)
    mockGetPayload.mockResolvedValue(stubPayload(mockFindByID, mockUpdate))

    const result = await claimFlag('ctf-1', 'flag{a}', 'alice')

    expect(result).toBe(reRead)
    expect(mockFindByID).toHaveBeenCalledTimes(2)
  })

  it('does not call update and returns null when no flag matches', async () => {
    const ctf = makeCtf({
      flags: [{ flagText: 'flag{a}', usesLeft: 1, claims: [] }],
    })
    const mockFindByID = vi.fn().mockResolvedValue(ctf)
    const mockUpdate = vi.fn()
    mockGetPayload.mockResolvedValue(stubPayload(mockFindByID, mockUpdate))

    const result = await claimFlag('ctf-1', 'flag{nope}', 'alice')

    expect(mockUpdate).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('does not call update and returns null when the only matching flag is exhausted', async () => {
    const ctf = makeCtf({
      flags: [{ flagText: 'flag{a}', usesLeft: 0, claims: [] }],
    })
    const mockFindByID = vi.fn().mockResolvedValue(ctf)
    const mockUpdate = vi.fn()
    mockGetPayload.mockResolvedValue(stubPayload(mockFindByID, mockUpdate))

    const result = await claimFlag('ctf-1', 'flag{a}', 'alice')

    expect(mockUpdate).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('throws when the CTF is not found and does not call update', async () => {
    const mockFindByID = vi.fn().mockResolvedValue(null)
    const mockUpdate = vi.fn()
    mockGetPayload.mockResolvedValue(stubPayload(mockFindByID, mockUpdate))

    await expect(claimFlag('ctf-missing', 'flag{a}', 'alice')).rejects.toThrow(
      'CTF with ID ctf-missing not found',
    )
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('looks up the CTF with overrideAccess and depth so admin-only flag fields are readable', async () => {
    const ctf = makeCtf({
      flags: [{ flagText: 'flag{a}', usesLeft: 1, claims: [] }],
    })
    const mockFindByID = vi.fn().mockResolvedValue(ctf)
    const mockUpdate = vi.fn().mockResolvedValue(ctf)
    mockGetPayload.mockResolvedValue(stubPayload(mockFindByID, mockUpdate))

    await claimFlag('ctf-1', 'flag{a}', 'alice')

    expect(mockFindByID.mock.calls[0][0]).toMatchObject({
      collection: 'ctfs',
      id: 'ctf-1',
      overrideAccess: true,
      depth: 3,
    })
  })
})
