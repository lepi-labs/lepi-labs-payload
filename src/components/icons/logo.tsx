import Image from 'next/image'
import React from 'react'

export function LogoIcon(props: React.ComponentProps<'div'>) {
  return (
    <div {...props}>
      <Image src="/media/lepi-labs-notext-export.png" alt="Lepi Labs logo" width={512} height={485} />
    </div>
  )
}
