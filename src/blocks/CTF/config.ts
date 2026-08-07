import { Block } from 'payload'

export const Ctf: Block = {
  slug: 'ctf',
  interfaceName: 'CtfBlock',
  fields: [
    {
      name: 'ctf',
      label: 'CTF',
      type: 'relationship',
      hasMany: false,
      relationTo: 'ctfs',
    },
  ],
}
