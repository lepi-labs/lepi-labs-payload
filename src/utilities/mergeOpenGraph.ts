import type { Metadata } from 'next'

const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  description: 'Makers of electronic art and devices in the furry community.',
  images: [
    {
      url: 'https://lepi-labs.com/api/media/file/bluesky-header-1.png',
    },
  ],
  siteName: 'Lepi Labs',
  title: 'Lepi Labs',
}

export const mergeOpenGraph = (og?: Partial<Metadata['openGraph']>): Metadata['openGraph'] => {
  return {
    ...defaultOpenGraph,
    ...og,
    images: og?.images ? og.images : defaultOpenGraph.images,
  }
}
