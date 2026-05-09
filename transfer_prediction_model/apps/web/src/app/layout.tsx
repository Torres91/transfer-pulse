import type { Metadata } from 'next'
import './globals.css'
import { WagmiProvider } from '@/providers/WagmiProvider'
import { Navbar } from '@/components/Navbar'

export const metadata: Metadata = {
  title:       'TransferPulse — Football Transfer Prediction Markets',
  description: 'Bet on football transfer rumours. 3-source verified markets. Powered by Polygon.',
  openGraph: {
    title:       'TransferPulse',
    description: 'Football transfer prediction markets — bet on who signs where.',
    type:        'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <WagmiProvider>
          <div className="min-h-screen bg-bg-primary">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </main>
          </div>
        </WagmiProvider>
      </body>
    </html>
  )
}
