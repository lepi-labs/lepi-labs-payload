'use client'

import type { Media, WideCarouselBlock as WideCarouselProps } from '@/payload-types'
import NextImage from 'next/image'
import type { Settings as SliderSettings } from 'react-slick'
import Slider from 'react-slick'

import 'slick-carousel/slick/slick-theme.css'
import 'slick-carousel/slick/slick.css'
import { RichText } from '../RichText'

function WideCarouselCard(props: {
  media: Media,
  richText: any,
  cardHeight: number
}) {
  const src = `${process.env.NEXT_PUBLIC_SERVER_URL}${props.media.url}`

  return (
    <div
      className="relative m-4 rounded-[0.8rem] overflow-hidden"
      style={{ minHeight: `calc(var(--spacing) * ${props.cardHeight})`}}
    >
      <NextImage
        src={src}
        alt={props.media.alt}
        fill={true} objectFit="cover"
      />
      <div className="absolute bottom-0 left-0 m-10">
        <RichText data={props.richText} />
      </div>
    </div>
  )
}

export function WideCarousel(props: WideCarouselProps) {
  const settings: SliderSettings = {
    dots: true,
    infinite: true,
    slidesToShow: 1,
    autoplay: true,
    autoplaySpeed: 10000,
    pauseOnHover: true
  }

  return (
    <div className="slider-container">
      <Slider {...settings}>
      {props.cards.map(card => {
        return (
          <div key={card.id}>
            <WideCarouselCard
              media={card.background as Media}
              richText={card.text}
              cardHeight={props.cardHeight}
            />
          </div>
        )
      })}
      </Slider>
    </div>
  )
}