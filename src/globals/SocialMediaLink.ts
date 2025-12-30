import type { GlobalConfig } from 'payload'


export const SocialMediaLinks: GlobalConfig = {
  slug: 'socialmedialink',
  label: 'Social Media links',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'socialMediaLinks',
      type: 'array',
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true
        },
        {
          name: 'url',
          type: 'text',
          required: true
        },
        {
          name: 'socialType',
          type: 'select',
          required: true,
          admin: {
            isClearable: true,
            isSortable: true,
          },
          options: [
            { label: 'Bluesky', value: 'bluesky' },
            { label: 'X', value: 'x' },
            { label: 'Telegram', value: 'telegram' },
            { label: 'GitHub', value: 'github' },
            { label: 'Discord', value: 'discord' }
          ]
        }

      ]
    }
  ]
}