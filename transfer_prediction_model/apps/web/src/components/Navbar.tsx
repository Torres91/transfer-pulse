'use client'

import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { usePaperBets } from '@/hooks/usePaperBets'

export function Navbar() {
  const { bets, totalStaked, loaded } = usePaperBets()

  return (
    <header className="border-b border-bg-border bg-bg-primary/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-accent-green flex items-center justify-center">
              <span className="text-bg-primary text-xs font-black">TP</span>
            </div>
            <span className="font-bold text-text-primary text-lg tracking-tight">
              Transfer<span className="text-accent-green">Pulse</span>
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/" className="text-text-primary font-medium hover:text-accent-green transition-colors">
              Markets
            </Link>
            {/* Paper portfolio — shown when bets exist */}
            {loaded && bets.length > 0 && (
              <button className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors">
                My Bets
                <span className="text-xs bg-accent-green text-bg-primary font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {bets.length}
                </span>
              </button>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Paper trading badge with running total */}
            {loaded && bets.length > 0 ? (
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-accent-amber bg-accent-amber/10 border border-accent-amber/20 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-pulse" />
                {bets.length} bet{bets.length !== 1 ? 's' : ''} · {totalStaked} MATIC
              </span>
            ) : (
              <span className="hidden sm:flex items-center gap-1 text-xs text-accent-amber bg-accent-amber/10 border border-accent-amber/20 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-pulse" />
                Paper Trading
              </span>
            )}

            <ConnectButton
              accountStatus="avatar"
              chainStatus="none"
              showBalance={false}
            />
          </div>
        </div>
      </div>
    </header>
  )
}
