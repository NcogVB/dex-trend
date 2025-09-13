// contexts/WalletContext.tsx
"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { ethers } from 'ethers'

declare global {
    interface Window {
        ethereum?: any
        trustWallet?: any
    }
}

type WalletType = 'metamask' | 'trust' | null

interface WalletContextType {
    // State
    account: string | null
    provider: ethers.BrowserProvider | null
    signer: ethers.JsonRpcSigner | null
    isConnected: boolean
    isConnecting: boolean
    connectedWallet: WalletType
    isModalOpen: boolean

    // Actions
    connect: (walletType: "metamask" | "trust") => Promise<void>
    disconnect: () => void
    switchToPolygon: () => Promise<void>
    openModal: () => void
    closeModal: () => void

    // Utils
    formatAddress: (addr: string) => string
    copyAddress: () => Promise<void>
    viewOnExplorer: () => void
    copySuccess: boolean
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

// Polygon mainnet configuration
const POLYGON_CHAIN_ID = 137
const POLYGON_NETWORK = {
    chainId: `0x${POLYGON_CHAIN_ID.toString(16)}`,
    chainName: "Polygon Mainnet",
    nativeCurrency: {
        name: "MATIC",
        symbol: "MATIC",
        decimals: 18
    },
    rpcUrls: ["https://polygon-rpc.com"],
    blockExplorerUrls: ["https://polygonscan.com"]
}

interface WalletProviderProps {
    children: ReactNode
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
    const [account, setAccount] = useState<string | null>(null)
    const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
    const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null)
    const [isConnecting, setIsConnecting] = useState(false)
    const [connectedWallet, setConnectedWallet] = useState<WalletType>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [copySuccess, setCopySuccess] = useState(false)

    // Store detected providers
    const [metaMaskProvider, setMetaMaskProvider] = useState<any>(null)
    const [trustWalletProvider, setTrustWalletProvider] = useState<any>(null)

    const isConnected = !!account && !!connectedWallet

    // Format address
    const formatAddress = (addr: string): string =>
        `${addr.slice(0, 6)}...${addr.slice(-4)}`

    // Listen for EIP-6963 announcements
    useEffect(() => {
        const handleAnnounce = (event: any) => {
            const p = event.detail.provider
            if (p.isMetaMask) setMetaMaskProvider(p)
            if (p.isTrust) setTrustWalletProvider(p)
        }

        window.addEventListener("eip6963:announceProvider", handleAnnounce)
        window.dispatchEvent(new Event("eip6963:requestProvider"))

        return () => {
            window.removeEventListener("eip6963:announceProvider", handleAnnounce)
        }
    }, [])

    // Switch to Polygon network
    const switchToPolygon = async (eth?: any) => {
        const ethereumProvider = eth || (connectedWallet === "metamask" ? metaMaskProvider : trustWalletProvider)
        if (!ethereumProvider) throw new Error("No wallet connected")

        try {
            await ethereumProvider.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: POLYGON_NETWORK.chainId }]
            })
        } catch (switchError: any) {
            if (switchError.code === 4902) {
                await ethereumProvider.request({
                    method: "wallet_addEthereumChain",
                    params: [POLYGON_NETWORK]
                })
            } else {
                throw switchError
            }
        }
    }

    // Connect to wallet
    const connect = async (walletType: "metamask" | "trust") => {
        setIsConnecting(true)
        try {
            const eth = walletType === "metamask" ? metaMaskProvider : trustWalletProvider
            if (!eth) throw new Error(`${walletType} provider not found`)

            // Switch to Polygon network
            await switchToPolygon(eth)

            // Request account access
            await eth.request({ method: "eth_requestAccounts" })

            const ethersProvider = new ethers.BrowserProvider(eth)
            const ethersSigner = await ethersProvider.getSigner()
            const address = await ethersSigner.getAddress()

            // Verify we're on Polygon
            const network = await ethersProvider.getNetwork()
            if (Number(network.chainId) !== POLYGON_CHAIN_ID) {
                throw new Error("Please switch to Polygon network")
            }

            setProvider(ethersProvider)
            setSigner(ethersSigner)
            setAccount(address)
            setConnectedWallet(walletType)

            // Persist connection preference
            localStorage.setItem("preferredWallet", walletType)

            console.log(`Connected to ${walletType}:`, address)
        } catch (error: any) {
            console.error('Connection failed:', error)

            // Handle specific error cases
            if (error.code === 4001) {
                alert('Connection rejected by user')
            } else if (error.code === -32002) {
                alert('Connection request already pending. Please check your wallet.')
            } else {
                alert(`Failed to connect: ${error.message}`)
            }
            throw error
        } finally {
            setIsConnecting(false)
        }
    }

    // Disconnect wallet
    const disconnect = () => {
        localStorage.removeItem("preferredWallet")
        setAccount(null)
        setProvider(null)
        setSigner(null)
        setConnectedWallet(null)
    }

    // Modal controls
    const openModal = () => setIsModalOpen(true)
    const closeModal = () => setIsModalOpen(false)

    // Copy address to clipboard
    const copyAddress = async () => {
        if (account) {
            try {
                await navigator.clipboard.writeText(account)
                setCopySuccess(true)
                setTimeout(() => setCopySuccess(false), 2000)
            } catch (err) {
                console.error('Failed to copy address:', err)
            }
        }
    }

    // Open address in block explorer (Polygonscan)
    const viewOnExplorer = () => {
        if (account) {
            const explorerUrl = `https://polygonscan.com/address/${account}`
            window.open(explorerUrl, '_blank')
        }
    }

    // Auto-reconnect on page load
    useEffect(() => {
        const autoConnect = async () => {
            const preferred = localStorage.getItem("preferredWallet") as "metamask" | "trust" | null
            if (!preferred) return

            const eth = preferred === "metamask" ? metaMaskProvider : trustWalletProvider
            if (!eth) return

            try {
                const accounts = await eth.request({ method: "eth_accounts" })
                if (!accounts || accounts.length === 0) return

                const chainId = await eth.request({ method: "eth_chainId" })
                if (chainId !== POLYGON_NETWORK.chainId) {
                    await switchToPolygon(eth)
                }

                const ethersProvider = new ethers.BrowserProvider(eth)
                const ethersSigner = await ethersProvider.getSigner()
                const address = await ethersSigner.getAddress()

                setProvider(ethersProvider)
                setSigner(ethersSigner)
                setAccount(address)
                setConnectedWallet(preferred)
            } catch (error) {
                console.error('Auto-reconnect failed:', error)
                // Clear invalid saved connection
                localStorage.removeItem("preferredWallet")
            }
        }

        if (metaMaskProvider || trustWalletProvider) {
            autoConnect()
        }
    }, [metaMaskProvider, trustWalletProvider])

    // Handle account/chain changes
    useEffect(() => {
        if (!connectedWallet) return

        const eth = connectedWallet === "metamask" ? metaMaskProvider : trustWalletProvider
        if (!eth) return

        const handleAccountsChanged = async (accounts: string[]) => {
            if (!accounts || accounts.length === 0) {
                disconnect()
            } else {
                const newAccount = accounts[0]
                setAccount(newAccount)

                // Update signer for new account
                if (provider) {
                    const newSigner = await provider.getSigner()
                    setSigner(newSigner)
                }
            }
        }

        const handleChainChanged = (chainId: string) => {
            if (chainId !== POLYGON_NETWORK.chainId) {
                console.log('Chain changed from Polygon, disconnecting...')
                disconnect()
            } else {
                // Reload to refresh provider state
                window.location.reload()
            }
        }

        const handleDisconnect = () => {
            disconnect()
        }

        // Add event listeners
        eth.on("accountsChanged", handleAccountsChanged)
        eth.on("chainChanged", handleChainChanged)
        eth.on("disconnect", handleDisconnect)

        return () => {
            // Clean up event listeners
            eth.removeListener("accountsChanged", handleAccountsChanged)
            eth.removeListener("chainChanged", handleChainChanged)
            eth.removeListener("disconnect", handleDisconnect)
        }
    }, [connectedWallet, metaMaskProvider, trustWalletProvider, provider])

    const value: WalletContextType = {
        // State
        account,
        provider,
        signer,
        isConnected,
        isConnecting,
        connectedWallet,
        isModalOpen,

        // Actions
        connect,
        disconnect,
        switchToPolygon: async () => {
            const eth = connectedWallet === "metamask" ? metaMaskProvider : trustWalletProvider
            if (!eth) throw new Error("No wallet connected")
            await switchToPolygon(eth)
        },
        openModal,
        closeModal,

        // Utils
        formatAddress,
        copyAddress,
        viewOnExplorer,
        copySuccess,
    }

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    )
}

// Custom hook to use wallet context
export const useWallet = (): WalletContextType => {
    const context = useContext(WalletContext)
    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider')
    }
    return context
}

// Export types for use in other components
export type { WalletType }