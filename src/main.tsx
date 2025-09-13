import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import { SwapProvider } from './contexts/SwapContext.tsx'
import { LiquidityProvider } from './contexts/LiquidityContext.tsx'
import { OrderProvider } from './contexts/OrderLimitContext.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <SwapProvider>
                <LiquidityProvider>
                    <OrderProvider>
                        <App />
                    </OrderProvider>
                </LiquidityProvider>
            </SwapProvider>
        </BrowserRouter>
    </StrictMode>
)
