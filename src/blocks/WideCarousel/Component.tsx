import React from 'react'

import { WideCarousel } from '@/components/ui/widecarousel'
import type { WideCarouselBlock as WideCarouselProps } from '@/payload-types'

export const WideCarouselBlock: React.FC<WideCarouselProps> = (props) => {
  return (
    <div className="container my-16">
      <WideCarousel {...props} />
    </div>
  )
}