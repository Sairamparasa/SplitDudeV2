import type { Metadata } from 'next'
import './globals.css'
import Providers from './providers'

export const metadata: Metadata = {
  title: 'SplitDude | Premium Expense Sharing',
  description: 'A modern, glassmorphic expense-sharing platform inspired by Splitwise.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="antialiased selection:bg-brand-accent selection:text-white">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
