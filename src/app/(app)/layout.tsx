import type { ReactNode } from 'react'

import { AdminBar } from '@/components/AdminBar'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { Fira_Mono, Fira_Sans, Saira_Semi_Condensed } from 'next/font/google'
import './globals.css'

const FiraSans = Fira_Sans({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-sans',
})

const FiraMono = Fira_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-mono',
})

const SairaSans = Saira_Semi_Condensed({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-sans',
})

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      className={[SairaSans.variable, FiraMono.variable].filter(Boolean).join(' ')}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <InitTheme />
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
        {Boolean(process.env.UMAMI_WEBSITE_ID) &&
          <script defer src="https://cloud.umami.is/script.js" data-website-id={process.env.UMAMI_WEBSITE_ID}></script>}
      </head>
      <body>
        <Providers>
          <AdminBar />
          <LivePreviewListener />

          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
