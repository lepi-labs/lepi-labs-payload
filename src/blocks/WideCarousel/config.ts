import { lexicalEditor } from '@payloadcms/richtext-lexical'
import type { Block } from 'payload'

export const WideCarousel: Block = {
  slug: 'widecarousel',
  interfaceName: 'WideCarouselBlock',
  fields: [
    {
      name: 'cardHeight',
      type: 'number',
      min: 10,
      defaultValue: 10,
      required: true
    },
    {
      name: 'cards',
      type: 'array',
      required: true,
      minRows: 2,
      fields: [
        {
          name: 'background',
          type: 'upload',
          relationTo: 'media',
          label: 'Background'
        },
        {
          name: 'text',
          type: 'richText',
          label: 'Text',
          editor: lexicalEditor({})
        },
        {
          name: 'link',
          type: 'text',
          label: 'Link',
          required: true
        }
      ]
    }
  ]
}