import { useContext } from 'react'
import {
    WalletContext,
    type WalletContextType,
} from '../contexts/WalletContext'

export const useWallet = (): WalletContextType => {
    const context = useContext(WalletContext)
    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider')
    }
    return context
}
