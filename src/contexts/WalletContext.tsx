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
    switchToBSC: () => Promise<void>;
    disconnect: () => void;
    switchToSkyHigh: () => Promise<void>;
    openModal: () => void;
    closeModal: () => void;
    formatAddress: (addr: string) => string;
    copyAddress: () => Promise<void>;
    viewOnExplorer: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const CHAINS = {
    SKYHIGH: { id: 1476, rpc: "https://api.skyhighblockchain.com", explorer: "https://explorer.skyhighblockchain.com", name: "SkyHigh Blockchain", symbol: "SKY" },
    POLYGON: { id: 137, rpc: "https://polygon-rpc.com", explorer: "https://polygonscan.com", name: "Polygon Mainnet", symbol: "MATIC" },
    BSC: { id: 56, rpc: "https://bsc-dataseed1.binance.org/", explorer: "https://bscscan.com", name: "Binance Smart Chain", symbol: "BNB" }
};

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
    const isWrongChain = isConnected && chainId !== CHAINS.SKYHIGH.id;

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
                console.log("✅ Wallet synced:", { address, chainId: Number(network.chainId) });
            } else {
                const readOnlyProvider = new ethers.JsonRpcProvider(CHAINS.SKYHIGH.rpc, CHAINS.SKYHIGH.id);
                setProvider(readOnlyProvider);
                setSigner(null);
                setAccount(null);
                setChainId(null);
            }
        } catch (err) {
            console.error("Failed to sync wallet:", err);
            const readOnlyProvider = new ethers.JsonRpcProvider(CHAINS.SKYHIGH.rpc, CHAINS.SKYHIGH.id);
            setProvider(readOnlyProvider);
            setSigner(null);
            setAccount(null);
        }
    };

    const connect = async () => {
        setIsConnecting(true);
        try {
            if (!window.ethereum) throw new Error("No wallet found. Please install MetaMask or Trust Wallet.");

            if (window.ethereum.isMetaMask) setConnectedWallet("metamask");
            else if (window.ethereum.isTrust) setConnectedWallet("trust");
            else setConnectedWallet("unknown");

            await window.ethereum.request({ method: "eth_requestAccounts" });
            await syncWallet();

            const ethersProvider = new ethers.BrowserProvider(window.ethereum);
            const network = await ethersProvider.getNetwork();
            if (Number(network.chainId) !== CHAINS.SKYHIGH.id) {
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

    const disconnect = () => {
        setAccount(null);
        setSigner(null);
        setChainId(null);
        setConnectedWallet(null);
        const readOnlyProvider = new ethers.JsonRpcProvider(CHAINS.SKYHIGH.rpc, CHAINS.SKYHIGH.id);
        setProvider(readOnlyProvider);
    };

    const switchChain = async (chain: typeof CHAINS.SKYHIGH | typeof CHAINS.POLYGON | typeof CHAINS.BSC) => {
        try {
            if (!window.ethereum) throw new Error("No wallet found");
            await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: `0x${chain.id.toString(16)}` }],
            });
            await syncWallet();
        } catch (err: any) {
            if (err.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: "wallet_addEthereumChain",
                        params: [{
                            chainId: `0x${chain.id.toString(16)}`,
                            chainName: chain.name,
                            rpcUrls: [chain.rpc],
                            nativeCurrency: { name: chain.symbol, symbol: chain.symbol, decimals: 18 },
                            blockExplorerUrls: [chain.explorer],
                        }],
                    });
                    await syncWallet();
                } catch (addErr) {
                    console.error(`Failed to add ${chain.name}:`, addErr);
                    throw addErr;
                }
            } else {
                throw err;
            }
        }
    };

    const switchToSkyHigh = () => switchChain(CHAINS.SKYHIGH);
    const switchToPolygon = () => switchChain(CHAINS.POLYGON);
    const switchToBSC = () => switchChain(CHAINS.BSC);

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    const formatAddress = (addr: string): string => {
        if (!addr) return "";
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

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

    const viewOnExplorer = () => {
        if (account) {
            window.open(`${CHAINS.SKYHIGH.explorer}/address/${account}`, "_blank");
        }
    };

    useEffect(() => {
        if (!window.ethereum) return;

        const handleAccountsChanged = (accounts: string[]) => {
            if (accounts.length === 0) disconnect();
            else syncWallet();
        };

        const handleChainChanged = () => syncWallet();

        window.ethereum.on("accountsChanged", handleAccountsChanged);
        window.ethereum.on("chainChanged", handleChainChanged);
        syncWallet();

        return () => {
            window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
            window.ethereum?.removeListener("chainChanged", handleChainChanged);
        };
    }, []);

    const value: WalletContextType = {
        account, provider, signer, isConnected, isConnecting, chainId, isWrongChain,
        connectedWallet, isModalOpen, copySuccess, connect, disconnect, switchToSkyHigh,
        openModal, switchToBSC, closeModal, formatAddress, switchToPolygon, copyAddress,
        viewOnExplorer,
    };

    return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = (): WalletContextType => {
    const context = useContext(WalletContext);
    if (!context) throw new Error("useWallet must be used within a WalletProvider");
    return context;
};

declare global {
    interface Window {
        ethereum?: any;
    }
}