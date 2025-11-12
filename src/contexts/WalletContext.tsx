"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { ethers } from "ethers";
import {
    useAccount,
    useDisconnect,
    useSwitchChain,
    useConnect,
    useChainId,
    useWalletClient,
} from "wagmi";

type WalletType = "metamask" | "trust" | null;

interface WalletContextType {
    account: string | null;
    provider: ethers.Provider | null;
    signer: ethers.JsonRpcSigner | null;
    isConnected: boolean;
    isConnecting: boolean;
    connectedWallet: WalletType;
    isModalOpen: boolean;
    connect: (walletType?: "metamask" | "trust") => Promise<void>;
    disconnect: () => void;
    switchToSkyHigh: () => Promise<void>;
    openModal: () => void;
    closeModal: () => void;
    formatAddress: (addr: string) => string;
    copyAddress: () => Promise<void>;
    viewOnExplorer: () => void;
    copySuccess: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
    children: ReactNode;
}

// 🛰 SkyHigh Chain Config
const SKYHIGH_CHAIN_ID = 1476;
const SKYHIGH_RPC_URL = "https://api.skyhighblockchain.com";
const SKYHIGH_EXPLORER = "https://explorer.skyhighblockchain.com";

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
    const { address, isConnecting, isConnected } = useAccount();
    const { disconnect } = useDisconnect();
    const { switchChainAsync } = useSwitchChain();
    const { connectAsync, connectors } = useConnect();
    const { data: walletClient } = useWalletClient();
    const chainId = useChainId();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [provider, setProvider] = useState<ethers.Provider>(
        new ethers.JsonRpcProvider(SKYHIGH_RPC_URL, SKYHIGH_CHAIN_ID)
    );
    const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
    const [connectedWallet, setConnectedWallet] = useState<WalletType>(null);

    // 🚀 Maintain signer sync with wagmi’s walletClient
    useEffect(() => {
        const syncSigner = async () => {
            if (!isConnected || !walletClient) {
                setSigner(null);
                setProvider(new ethers.JsonRpcProvider(SKYHIGH_RPC_URL, SKYHIGH_CHAIN_ID));
                return;
            }

            try {
                // Wrap wagmi’s walletClient in ethers
                const ethersProvider = new ethers.BrowserProvider(walletClient as any, SKYHIGH_CHAIN_ID);
                const ethersSigner = await ethersProvider.getSigner();
                setProvider(ethersProvider);
                setSigner(ethersSigner);
            } catch (err) {
                console.error("Failed to set signer from walletClient:", err);
                setProvider(new ethers.JsonRpcProvider(SKYHIGH_RPC_URL, SKYHIGH_CHAIN_ID));
                setSigner(null);
            }
        };

        syncSigner();
    }, [walletClient, isConnected]);

    // ⚙️ Force SkyHigh chain on connect
    const connect = async (walletType?: "metamask" | "trust") => {
        try {
            let connectorToUse = connectors[0];
            if (walletType) {
                const match = connectors.find((c) =>
                    walletType === "metamask"
                        ? c.id.toLowerCase().includes("meta")
                        : c.id.toLowerCase().includes("trust")
                );
                if (match) connectorToUse = match;
                setConnectedWallet(walletType);
            }

            if (!connectorToUse) throw new Error("No wallet connector available");

            const res = await connectAsync({
                connector: connectorToUse,
                chainId: SKYHIGH_CHAIN_ID,
            });

            // ✅ Fixed: use res.chainId instead of res.chain.id
            if (res.chainId !== SKYHIGH_CHAIN_ID) {
                await switchChainAsync({ chainId: SKYHIGH_CHAIN_ID });
            }

        } catch (err) {
            console.error("Connection failed:", err);
            throw err;
        }
    };

    // 🧭 Manual switch
    const switchToSkyHigh = async () => {
        try {
            if (chainId !== SKYHIGH_CHAIN_ID) {
                await switchChainAsync({ chainId: SKYHIGH_CHAIN_ID });
            }
        } catch (err) {
            console.error("Failed to switch to SkyHigh chain:", err);
        }
    };

    const formatAddress = (addr: string): string =>
        `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    const copyAddress = async () => {
        if (address) {
            try {
                await navigator.clipboard.writeText(address);
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
            } catch (err) {
                console.error("Copy failed:", err);
            }
        }
    };

    const viewOnExplorer = () => {
        if (address) {
            window.open(`${SKYHIGH_EXPLORER}/address/${address}`, "_blank");
        }
    };

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
        switchToSkyHigh,
        openModal,
        closeModal,
        formatAddress,
        copyAddress,
        viewOnExplorer,
        copySuccess,
    };

    return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = (): WalletContextType => {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error("useWallet must be used within a WalletProvider");
    }
    return context;
};
