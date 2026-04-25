import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ProviderProvider } from '@/lib/contexts/ProviderContext'
import ConditionalHeader from '@/components/layout/ConditionalHeader'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Logistics Pool - Rangkai Protocol',
  description: 'Decentralized logistics marketplace for shipping providers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ProviderProvider>
          <ConditionalHeader />
          {children}
        </ProviderProvider>
      </body>
    </html>
  )
}