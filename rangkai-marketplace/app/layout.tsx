import type { Metadata } from 'next'
import './globals.css'
import Header from '../components/Header'
import Footer from '../components/Footer'

export const metadata: Metadata = {
  title: 'Rangkai - Global Marketplace for Small Businesses',
  description: 'Connecting artisans and manufacturers with buyers worldwide through a decentralized, Bitcoin-native marketplace.',
  keywords: ['marketplace', 'small business', 'artisan', 'handmade', 'bitcoin', 'decentralized'],
  authors: [{ name: 'Rangkai Protocol' }],
  openGraph: {
    title: 'Rangkai - Global Marketplace for Small Businesses',
    description: 'Connecting artisans and manufacturers with buyers worldwide.',
    type: 'website',
    locale: 'en_US',
    url: 'https://rangkai.store',
    siteName: 'Rangkai',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen flex flex-col">
        {/* Header - sticky navigation */}
        <Header />
        
        {/* Main content area */}
        <main className="flex-grow">
          {children}
        </main>
        
        {/* Footer - site info and links */}
        <Footer />
      </body>
    </html>
  )
}