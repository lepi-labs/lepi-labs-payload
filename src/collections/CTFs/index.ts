import { adminOnly } from '@/access/adminOnly'
import { publicAccess } from '@/access/publicAccess'
import { checkRole } from '@/access/utilities'
import { CollectionConfig } from 'payload'

export const CTFs: CollectionConfig = {
  slug: 'ctfs',
  labels: {
    singular: 'CTF',
    plural: 'CTFs',
  },
  access: {
    admin: ({ req: { user } }) => checkRole(['admin'], user),
    create: adminOnly,
    delete: adminOnly,
    read: publicAccess,
    update: adminOnly,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'flags',
      type: 'array',
      required: true,
      labels: {
        singular: 'Flag',
        plural: 'Flags',
      },
      fields: [
        {
          name: 'flagText',
          type: 'text',
          required: true,
          access: {
            read: ({ req: { user } }) => {
              return Boolean(user?.roles?.includes('admin'))
            },
          },
        },
        {
          name: 'usesLeft',
          type: 'number',
          defaultValue: 1,
          min: 0,
          required: true,
          access: {
            read: ({ req: { user } }) => {
              return Boolean(user?.roles?.includes('admin'))
            },
          },
        },
        {
          name: 'claims',
          type: 'array',
          fields: [
            {
              name: 'username',
              type: 'text',
              required: true,
              minLength: 3,
              maxLength: 64,
            },
            {
              name: 'date',
              type: 'date',
              required: true,
            },
          ],
        },
      ],
    },
  ],
}
