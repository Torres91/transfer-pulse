'use client'

import { useState, useEffect, useCallback } from 'react'

export interface PaperBet {
  id: string
  marketId: string
  marketTitle: string
  playerName: string
  side: string
  amount: number
  potentialPayout: number
  placedAt: string
}

const STORAGE_KEY = 'tp_paper_bets'

export function usePaperBets() {
  const [bets, setBets] = useState<PaperBet[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setBets(JSON.parse(raw))
    } catch {}
    setLoaded(true)
  }, [])

  const placeBet = useCallback((bet: Omit<PaperBet, 'id' | 'placedAt'>): PaperBet => {
    const newBet: PaperBet = {
      ...bet,
      id: crypto.randomUUID(),
      placedAt: new Date().toISOString(),
    }
    setBets(prev => {
      const updated = [...prev, newBet]
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {}
      return updated
    })
    return newBet
  }, [])

  const totalStaked    = bets.reduce((s, b) => s + b.amount, 0)
  const potentialValue = bets.reduce((s, b) => s + b.potentialPayout, 0)

  return { bets, placeBet, totalStaked, potentialValue, loaded }
}
