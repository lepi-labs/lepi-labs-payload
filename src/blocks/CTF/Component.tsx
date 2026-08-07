import React from 'react'

import { CTF } from '@/components/CTF/CTF'
import type { CtfBlock as CtfBlockProps } from '@/payload-types'

export const CtfBlock: React.FC<CtfBlockProps> = (props) => {
  return <CTF {...props} />
}
