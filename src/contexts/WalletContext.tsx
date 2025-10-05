// contexts/WalletContext.tsx
"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import type { ReactNode } from "react"
import { ethers } from "ethers"
import {
    useAccount,
    useDisconnect,
    useSwitchChain,
    useConnect,
    useChainId,
} from "wagmi"

type WalletType = "metamask" | "trust" | null

interface WalletContextType {
    account: string | null
    provider: ethers.Provider | null
    signer: ethers.JsonRpcSigner | null
    isConnected: boolean
    isConnecting: boolean
    connectedWallet: WalletType
    isModalOpen: boolean
    connect: (walletType?: "metamask" | "trust") => Promise<void>
    disconnect: () => void
    switchToPolygon: () => Promise<void>
    openModal: () => void
    closeModal: () => void
    formatAddress: (addr: string) => string
    copyAddress: () => Promise<void>
    viewOnExplorer: () => void
    copySuccess: boolean
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

interface WalletProviderProps {
    children: ReactNode
}

// Chain configuration
const CHAIN_ID = 1476
const RPC_URL = "https://api.skyhighblockchain.com"

// ✅ Provider selector
function getInjectedProvider(walletType?: WalletType): any | null {
    if (typeof window === "undefined") return null
    const w = window as any

    // Multi-provider injection
    if (w.ethereum?.providers) {
        if (walletType === "metamask") {
            return w.ethereum.providers.find((p: any) => p.isMetaMask)
        }
        if (walletType === "trust") {
            return w.ethereum.providers.find((p: any) => p.isTrust)
        }
        return w.ethereum.providers[0]
    }

    // Single provider injection
    if (walletType === "metamask" && w.ethereum?.isMetaMask) return w.ethereum
    if (walletType === "trust" && w.ethereum?.isTrust) return w.ethereum

    // Fallback
    return w.ethereum ?? null
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
    const { address, isConnecting, isConnected } = useAccount()
    const { disconnect } = useDisconnect()
    const { switchChainAsync } = useSwitchChain()
    const { connectAsync, connectors } = useConnect()
    const chainId = useChainId()

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [copySuccess, setCopySuccess] = useState(false)
    // ✅ Initialize provider immediately with fallback RPC
    const [provider, setProvider] = useState<ethers.Provider | null>(
        () => new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID)
    )
    const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null)
    const [connectedWallet, setConnectedWallet] = useState<WalletType>(null)

    // Initialize provider & signer
    useEffect(() => {
        const setup = async () => {
            try {
                if (!address) {
                    // ✅ Always maintain a read-only provider for contract calls
                    const fallbackProvider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID)
                    setProvider(fallbackProvider)
                    setSigner(null)
                    return
                }

                const raw = getInjectedProvider(connectedWallet ?? undefined)
                if (!raw) {
                    console.warn("No injected provider found, using fallback")
                    const fallbackProvider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID)
                    setProvider(fallbackProvider)
                    setSigner(null)
                    return
                }

                // ✅ Create BrowserProvider with proper network
                const browserProvider = new ethers.BrowserProvider(raw, CHAIN_ID)

                // ✅ Get the underlying provider for read operations
                const readProvider = browserProvider.provider || browserProvider

                // Get signer for write operations
                const s = await browserProvider.getSigner()

                setProvider(readProvider as ethers.Provider)
                setSigner(s)

            } catch (err) {
                console.error("Failed to init provider/signer:", err)
                // ✅ Fallback to read-only provider on error
                const fallbackProvider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID)
                setProvider(fallbackProvider)
                setSigner(null)
            }
        }
        setup()
    }, [address, connectedWallet, chainId])

    const formatAddress = (addr: string): string =>
        `${addr.slice(0, 6)}...${addr.slice(-4)}`

    const connect = async (walletType?: "metamask" | "trust") => {
        try {
            let connectorToUse = connectors[0]
            if (walletType) {
                const match = connectors.find((c) =>
                    walletType === "metamask"
                        ? c.id.toLowerCase().includes("meta")
                        : c.id.toLowerCase().includes("trust")
                )
                if (match) connectorToUse = match
                setConnectedWallet(walletType)
            }

            if (!connectorToUse) throw new Error("No wallet connector available")

            // ✅ Force connect to custom chain
            await connectAsync({
                connector: connectorToUse,
                chainId: CHAIN_ID,
            })

            // ✅ Verify and switch if needed
            if (chainId !== CHAIN_ID) {
                await switchChainAsync({ chainId: CHAIN_ID })
            }

        } catch (err) {
            console.error("Connection failed:", err)
            throw err
        }
    }

    const switchToPolygon = async () => {
        if (chainId !== CHAIN_ID) {
            await switchChainAsync({ chainId: CHAIN_ID })
        }
    }

    const openModal = () => setIsModalOpen(true)
    const closeModal = () => setIsModalOpen(false)

    const copyAddress = async () => {
        if (address) {
            try {
                await navigator.clipboard.writeText(address)
                setCopySuccess(true)
                setTimeout(() => setCopySuccess(false), 2000)
            } catch (err) {
                console.error("Failed to copy address:", err)
            }
        }
    }

    const viewOnExplorer = () => {
        if (address) {
            window.open(`https://polygonscan.com/address/${address}`, "_blank")
        }
    }

    const value: WalletContextType = {
        account: address ?? null,
        provider,
        signer,
        isConnected,
        isConnecting,
        connectedWallet,
        isModalOpen,
        connect,
        disconnect,
        switchToPolygon,
        openModal,
        closeModal,
        formatAddress,
        copyAddress,
        viewOnExplorer,
        copySuccess,
    }

    return (
        <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
    )
}

export const useWallet = (): WalletContextType => {
    const context = useContext(WalletContext)
    if (context === undefined) {
        throw new Error("useWallet must be used within a WalletProvider")
    }
    return context
}

export type { WalletType }