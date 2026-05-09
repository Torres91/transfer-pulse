'use client'

import { WagmiProvider as WagmiBase, createConfig, http } from 'wagmi'
import { polygon, polygonMumbai } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, getDefaultConfig, darkTheme, connectorsForWallets } from '@rainbow-me/rainbowkit'
import { metaMaskWallet, coinbaseWallet, rainbowWallet } from '@rainbow-me/rainbowkit/wallets'
import '@rainbow-me/rainbowkit/styles.css'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

// If no projectId, only offer injected wallets (MetaMask etc.) — no WalletConnect QR
const config = projectId
  ? getDefaultConfig({
      appName:    'TransferPulse',
      projectId,
      chains:     [polygon, polygonMumbai],
      transports: {
        [polygon.id]:       http(),
        [polygonMumbai.id]: http(),
      },
      ssr: true,
    })
  : createConfig({
      chains:     [polygon, polygonMumbai],
      connectors: connectorsForWallets(
        [{ groupName: 'Wallets', wallets: [metaMaskWallet, coinbaseWallet] }],
        { appName: 'TransferPulse', projectId: 'demo' },
      ),
      transports: {
        [polygon.id]:       http(),
        [polygonMumbai.id]: http(),
      },
      ssr: true,
    })

const queryClient = new QueryClient()

export function WagmiProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiBase config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor:           '#00e096',
            accentColorForeground: '#050b14',
            borderRadius:          'medium',
            fontStack:             'system',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiBase>
  )
}
