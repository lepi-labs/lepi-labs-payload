'use client'

import type { Media, WideCarouselBlock as WideCarouselProps } from '@/payload-types'
import { getImageProps } from 'next/image'
import type { Settings as SliderSettings } from 'react-slick'
import Slider from 'react-slick'

import 'slick-carousel/slick/slick-theme.css'
import 'slick-carousel/slick/slick.css'
import { RichText } from '../RichText'

import './widecarousel.css'

function WideCarouselCard(props: WideCarouselProps['cards'][number] & { cardHeight: number }) {

  if (!props.background || typeof props.background !== 'object') {
    throw new Error(`props.background was not an object: ${props.background}`)
  }
  const background = props.background
  if (props.mobileBackgroundOverride && typeof props.mobileBackgroundOverride !== 'object') {
    throw new Error(`props.mobileBackgroundOverride was provided but was not an object: ${props.mobileBackgroundOverride}`)
  }
  const mobileBackground = props.mobileBackgroundOverride as Media | null | undefined

  const commonImgProps = {
    sizes: '100vw',
    fill: true,
    objectFit: 'cover'
  }
  const {
    props: { srcSet: desktop },
  } = getImageProps({
    ...commonImgProps,
    src: background.url || '',
    alt: background.alt
  })
  const {
    props: { srcSet: mobile, ...rest }
  } = getImageProps({
    ...commonImgProps,
    src: (mobileBackground ? mobileBackground.url : background.url) || '',
    alt: mobileBackground ? mobileBackground.alt : background.alt
  })

  return (
    <div
      className="relative m-4 rounded-[0.8rem] overflow-hidden"
      style={{ minHeight: `calc(var(--spacing) * ${props.cardHeight})`}}
    >
      <picture>
        <source media="(min-aspect-ratio: 1/1)" srcSet={desktop} />
        <source media="(min-width: 500px)" srcSet={mobile} />
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img {...rest} />
      </picture>

      {props.text ? 
      <div
        className="absolute bottom-0 left-0 border-2 p-5 m-5 rounded-[0.8rem]"
        style={{
          backgroundColor: props.textBackgroundColor,
          borderColor: props.textBorderColor
        }}
      >
        <RichText className="carousel-richtext" data={props.text} />
      </div> : <></>
      }
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
              {...card}
              cardHeight={props.cardHeight}
            />
          </div>
        )
      })}
      </Slider>
    </div>
  )
}
