// contexts/WalletContext.tsx
import React, {
    createContext,
    useState,
    useEffect,
    type ReactNode,
} from 'react'

// Define wallet types
export type WalletType = 'metamask' | 'walletconnect' | null

// Define the context interface
export interface WalletContextType {
    // State
    isConnected: boolean
    address: string | null
    walletType: WalletType
    isConnecting: boolean
    error: string | null

    // Actions
    connectMetaMask: () => Promise<void>
    connectWalletConnect: () => Promise<void>
    disconnect: () => void

    // Modal state
    isModalOpen: boolean
    openModal: () => void
    closeModal: () => void
}

// Create context
export const WalletContext = createContext<WalletContextType | undefined>(undefined)

// Provider props interface
interface WalletProviderProps {
    children: ReactNode
}

// Wallet provider component
export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
    const [isConnected, setIsConnected] = useState<boolean>(false)
    const [address, setAddress] = useState<string | null>(null)
    const [walletType, setWalletType] = useState<WalletType>(null)
    const [isConnecting, setIsConnecting] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false)

    // Check if user has a connected wallet on app load
    useEffect(() => {
        checkConnection()
    }, [])

    // Check existing connection
    const checkConnection = async (): Promise<void> => {
        try {
            // Check MetaMask connection
            if (typeof window !== 'undefined' && window.ethereum) {
                const accounts = await window.ethereum.request({
                    method: 'eth_accounts',
                })
                if (accounts.length > 0) {
                    setAddress(accounts[0])
                    setIsConnected(true)
                    setWalletType('metamask')

                    // Store in localStorage for persistence
                    localStorage.setItem('walletConnected', 'true')
                    localStorage.setItem('walletType', 'metamask')
                    localStorage.setItem('walletAddress', accounts[0])
                }
            }

            // Check WalletConnect connection (you can expand this based on your WalletConnect setup)
            const savedWalletType = localStorage.getItem('walletType')
            const savedAddress = localStorage.getItem('walletAddress')
            const isWalletConnected = localStorage.getItem('walletConnected')

            if (
                isWalletConnected === 'true' &&
                savedAddress &&
                savedWalletType === 'walletconnect'
            ) {
                setAddress(savedAddress)
                setIsConnected(true)
                setWalletType('walletconnect')
            }
        } catch (err) {
            console.error('Error checking wallet connection:', err)
        }
    }

    // Connect to MetaMask
    const connectMetaMask = async (): Promise<void> => {
        if (typeof window === 'undefined' || !window.ethereum) {
            setError(
                'MetaMask is not installed. Please install MetaMask to continue.'
            )
            return
        }

        setIsConnecting(true)
        setError(null)

        try {
            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts',
            })

            if (accounts.length > 0) {
                setAddress(accounts[0])
                setIsConnected(true)
                setWalletType('metamask')
                setIsModalOpen(false)

                // Store in localStorage
                localStorage.setItem('walletConnected', 'true')
                localStorage.setItem('walletType', 'metamask')
                localStorage.setItem('walletAddress', accounts[0])

                // Listen for account changes
                window.ethereum.on('accountsChanged', handleAccountsChanged)
                window.ethereum.on('chainChanged', handleChainChanged)
            }
        } catch (err: any) {
            if (err.code === 4001) {
                setError('Please connect to MetaMask.')
            } else {
                setError('An error occurred while connecting to MetaMask.')
            }
            console.error('MetaMask connection error:', err)
        } finally {
            setIsConnecting(false)
        }
    }

    // Connect to WalletConnect (basic implementation - you may need to expand based on your needs)
    const connectWalletConnect = async (): Promise<void> => {
        setIsConnecting(true)
        setError(null)

        try {
            console.log(
                'WalletConnect integration needed - implement based on your requirements'
            )

            setTimeout(() => {
                const simulatedAddress =
                    '0x1234567890123456789012345678901234567890'
                setAddress(simulatedAddress)
                setIsConnected(true)
                setWalletType('walletconnect')
                setIsModalOpen(false)

                localStorage.setItem('walletConnected', 'true')
                localStorage.setItem('walletType', 'walletconnect')
                localStorage.setItem('walletAddress', simulatedAddress)

                setIsConnecting(false)
            }, 2000)
        } catch (err: any) {
            setError('An error occurred while connecting to WalletConnect.')
            console.error('WalletConnect connection error:', err)
            setIsConnecting(false)
        }
    }

    // Handle account changes
    const handleAccountsChanged = (accounts: string[]): void => {
        if (accounts.length === 0) {
            disconnect()
        } else {
            setAddress(accounts[0])
            localStorage.setItem('walletAddress', accounts[0])
        }
    }

    // Handle chain changes
    const handleChainChanged = (): void => {
        // Reload the page to avoid stale state
        window.location.reload()
    }

    const disconnect = (): void => {
        setIsConnected(false)
        setAddress(null)
        setWalletType(null)
        setError(null)

        localStorage.removeItem('walletConnected')
        localStorage.removeItem('walletType')
        localStorage.removeItem('walletAddress')

        if (typeof window !== 'undefined' && window.ethereum) {
            window.ethereum.removeListener(
                'accountsChanged',
                handleAccountsChanged
            )
            window.ethereum.removeListener('chainChanged', handleChainChanged)
        }
    }

    // Modal controls
    const openModal = (): void => {
        setIsModalOpen(true)
        setError(null)
    }

    const closeModal = (): void => {
        setIsModalOpen(false)
        setError(null)
        setIsConnecting(false)
    }

    // Context value
    const value: WalletContextType = {
        isConnected,
        address,
        walletType,
        isConnecting,
        error,
        connectMetaMask,
        connectWalletConnect,
        disconnect,
        isModalOpen,
        openModal,
        closeModal,
    }

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    )
}

declare global {
    interface Window {
        ethereum?: any
    }
}
