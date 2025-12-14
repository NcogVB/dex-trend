import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import { WalletProvider } from './contexts/WalletContext.tsx'
import { polygon, arbitrum } from "wagmi/chains";
import { http } from 'viem'
import { createConfig, WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

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
                                            <App />
                    </WalletProvider>
                </QueryClientProvider>
            </WagmiProvider>
        </BrowserRouter>
    </StrictMode>
)
