import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import { SwapProvider } from './contexts/SwapContext.tsx'
import { LiquidityProvider } from './contexts/LiquidityContext.tsx'
import { OrderProvider } from './contexts/OrderLimitContext.tsx'
import { WalletProvider } from './contexts/WalletContext.tsx'
import { BridgeProvider } from './contexts/Bridge.tsx'
import { polygon, arbitrum } from "wagmi/chains";
import { http } from 'viem'
import { createConfig, WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LendingBorrowingProvider } from './contexts/LendingBorrowingContext.tsx'

const config = createConfig({
    chains: [polygon, arbitrum],
    transports: {
        [polygon.id]: http(),
        [arbitrum.id]: http(),
    },
});

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <WagmiProvider config={config}>
                <QueryClientProvider client={queryClient}>
                    <WalletProvider>
                        <SwapProvider>
                            <LendingBorrowingProvider>
                                <LiquidityProvider>
                                    <BridgeProvider>
                                        <OrderProvider>
                                            <App />
                                        </OrderProvider>
                                    </BridgeProvider>
                                </LiquidityProvider>
                            </LendingBorrowingProvider>
                        </SwapProvider>
                    </WalletProvider>
                </QueryClientProvider>
            </WagmiProvider>
        </BrowserRouter>
    </StrictMode>
)
