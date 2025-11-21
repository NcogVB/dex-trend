"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { ethers } from "ethers";

interface WalletContextType {
    account: string | null;
    provider: ethers.Provider | null;
    signer: ethers.JsonRpcSigner | null;
    isConnected: boolean;
    isConnecting: boolean;
    chainId: number | null;
    isWrongChain: boolean;
    connectedWallet: string | null;
    isModalOpen: boolean;
    copySuccess: boolean;
    connect: () => Promise<void>;
    switchToPolygon: () => Promise<void>;
    disconnect: () => void;
    switchToSkyHigh: () => Promise<void>;
    openModal: () => void;
    closeModal: () => void;
    formatAddress: (addr: string) => string;
    copyAddress: () => Promise<void>;
    viewOnExplorer: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const SKYHIGH_CHAIN_ID = 1476;
const SKYHIGH_RPC_URL = "https://api.skyhighblockchain.com";
const SKYHIGH_EXPLORER = "https://explorer.skyhighblockchain.com";

// const POLYGON_CHAIN_ID = 137
const POLYGON_RPC = "https://polygon-rpc.com"
const POLYGON_EXPLORER = "https://polygonscan.com"

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [account, setAccount] = useState<string | null>(null);
    const [chainId, setChainId] = useState<number | null>(null);
    const [provider, setProvider] = useState<ethers.Provider | null>(null);
    const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
    const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    const isConnected = !!account && !!signer;
    const isWrongChain = isConnected && chainId !== SKYHIGH_CHAIN_ID;

    // Initialize provider and sync wallet state
    const syncWallet = async () => {
        try {
            if (!window.ethereum) {
                console.warn("No wallet found");
                return;
            }

            const ethersProvider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await ethersProvider.listAccounts();
            const network = await ethersProvider.getNetwork();

            if (accounts.length > 0) {
                const walletSigner = await ethersProvider.getSigner();
                const address = await walletSigner.getAddress();

                setProvider(ethersProvider);
                setSigner(walletSigner);
                setAccount(address);
                setChainId(Number(network.chainId));

                console.log("✅ Wallet synced:", {
                    address,
                    chainId: Number(network.chainId),
                    isCorrectChain: Number(network.chainId) === SKYHIGH_CHAIN_ID
                });
            } else {
                // Not connected - use read-only provider
                const readOnlyProvider = new ethers.JsonRpcProvider(SKYHIGH_RPC_URL, SKYHIGH_CHAIN_ID);
                setProvider(readOnlyProvider);
                setSigner(null);
                setAccount(null);
                setChainId(null);
            }
        } catch (err) {
            console.error("Failed to sync wallet:", err);
            // Fallback to read-only provider
            const readOnlyProvider = new ethers.JsonRpcProvider(SKYHIGH_RPC_URL, SKYHIGH_CHAIN_ID);
            setProvider(readOnlyProvider);
            setSigner(null);
            setAccount(null);
        }
    };

    // Connect wallet
    const connect = async () => {
        setIsConnecting(true);
        try {
            if (!window.ethereum) {
                throw new Error("No wallet found. Please install MetaMask or Trust Wallet.");
            }

            // Detect wallet type
            if (window.ethereum.isMetaMask) {
                setConnectedWallet("metamask");
            } else if (window.ethereum.isTrust) {
                setConnectedWallet("trust");
            } else {
                setConnectedWallet("unknown");
            }

            // Request accounts
            await window.ethereum.request({ method: "eth_requestAccounts" });

            // Sync wallet state
            await syncWallet();

            // Check if we need to switch chains
            const ethersProvider = new ethers.BrowserProvider(window.ethereum);
            const network = await ethersProvider.getNetwork();

            if (Number(network.chainId) !== SKYHIGH_CHAIN_ID) {
                console.log("⚠️ Wrong chain detected, switching to SkyHigh...");
                await switchToSkyHigh();
            }
        } catch (err: any) {
            console.error("Connection failed:", err);
            throw err;
        } finally {
            setIsConnecting(false);
        }
    };

    // Disconnect wallet
    const disconnect = () => {
        setAccount(null);
        setSigner(null);
        setChainId(null);
        setConnectedWallet(null);
        const readOnlyProvider = new ethers.JsonRpcProvider(SKYHIGH_RPC_URL, SKYHIGH_CHAIN_ID);
        setProvider(readOnlyProvider);
    };

    // Modal controls
    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    // Format address
    const formatAddress = (addr: string): string => {
        if (!addr) return "";
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    // Copy address to clipboard
    const copyAddress = async () => {
        if (account) {
            try {
                await navigator.clipboard.writeText(account);
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
            } catch (err) {
                console.error("Copy failed:", err);
            }
        }
    };

    // View address on block explorer
    const viewOnExplorer = () => {
        if (account) {
            window.open(`${SKYHIGH_EXPLORER}/address/${account}`, "_blank");
        }
    };

    // Switch to SkyHigh chain
    const switchToSkyHigh = async () => {
        try {
            if (!window.ethereum) throw new Error("No wallet found");

            await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: `0x${SKYHIGH_CHAIN_ID.toString(16)}` }],
            });

            // Re-sync after switch
            await syncWallet();
        } catch (err: any) {
            // Chain not added - try to add it
            if (err.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: "wallet_addEthereumChain",
                        params: [
                            {
                                chainId: `0x${SKYHIGH_CHAIN_ID.toString(16)}`,
                                chainName: "SkyHigh Blockchain",
                                rpcUrls: [SKYHIGH_RPC_URL],
                                nativeCurrency: {
                                    name: "SkyHigh",
                                    symbol: "SKY",
                                    decimals: 18,
                                },
                                blockExplorerUrls: ["https://explorer.skyhighblockchain.com"],
                            },
                        ],
                    });
                    await syncWallet();
                } catch (addErr) {
                    console.error("Failed to add SkyHigh chain:", addErr);
                    throw addErr;
                }
            } else {
                throw err;
            }
        }
    };

    // Listen for account and chain changes
    useEffect(() => {
        if (!window.ethereum) return;

        const handleAccountsChanged = (accounts: string[]) => {
            if (accounts.length === 0) {
                disconnect();
            } else {
                syncWallet();
            }
        };

        const handleChainChanged = () => {
            syncWallet();
        };

        window.ethereum.on("accountsChanged", handleAccountsChanged);
        window.ethereum.on("chainChanged", handleChainChanged);

        // Initial sync
        syncWallet();

        return () => {
            window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
            window.ethereum?.removeListener("chainChanged", handleChainChanged);
        };
    }, []);
    const switchToPolygon = async () => {
        try {
            if (!window.ethereum) throw new Error("No wallet found");

            await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: "0x89" }] // 137 hex
            });

            await syncWallet();
        } catch (err: any) {
            if (err.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: "wallet_addEthereumChain",
                        params: [
                            {
                                chainId: "0x89",
                                chainName: "Polygon Mainnet",
                                rpcUrls: [POLYGON_RPC],
                                nativeCurrency: {
                                    name: "MATIC",
                                    symbol: "MATIC",
                                    decimals: 18
                                },
                                blockExplorerUrls: [POLYGON_EXPLORER]
                            }
                        ]
                    });
                    await syncWallet();
                } catch (addErr) {
                    console.error("Failed to add Polygon:", addErr);
                }
            } else {
                console.error(err);
            }
        }
    };


    const value: WalletContextType = {
        account,
        provider,
        signer,
        isConnected,
        isConnecting,
        chainId,
        isWrongChain,
        connectedWallet,
        isModalOpen,
        copySuccess,
        connect,
        disconnect,
        switchToSkyHigh,
        openModal,
        closeModal,
        formatAddress,
        switchToPolygon,
        copyAddress,
        viewOnExplorer,
    };

    return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = (): WalletContextType => {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error("useWallet must be used within a WalletProvider");
    }
    return context;
};

// Type declaration for window.ethereum
declare global {
    interface Window {
        ethereum?: any;
    }
}