// src/context/SwapContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { ethers } from "ethers";
import SwapRouterABI from "../ABI/SwapRouter.json";

// Contract addresses
const SWAP_ROUTER_ADDRESS = "0x88F36b3c3704406f1Ae5A921a8727905f0F2bC4F";
const FACTORY_ADDRESS = "0x5830423Fb4A3010f5546D5FBF68398B11c99709D";

// Token addresses with proper configuration
const TOKENS: Record<string, { address: string; decimals: number }> = {
    USDC: { address: "0x1000cCa12d1360CE757734270f8a457127A93DaA", decimals: 18 },
    USDT: { address: "0x6082626c05B1aDbb6Dea0750788e60b83A88f41f", decimals: 18 },
};

// ABI definitions
const FACTORY_ABI = [
    "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
];

const POOL_ABI = [
    "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
    "function token0() external view returns (address)",
    "function token1() external view returns (address)",
    "function fee() external view returns (uint24)",
    "function liquidity() external view returns (uint128)",
];

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)",
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function symbol() external view returns (string)",
    "function decimals() external view returns (uint8)",
    "function name() external view returns (string)",
];

// Fee tiers
const FEE_TIERS = [500, 3000, 10000]; // 0.05%, 0.3%, 1%

interface SwapQuote {
    amountOut: string;
    priceImpact: number;
    route: string[];
    fee: number;
}

interface PoolInfo {
    address: string;
    fee: number;
    liquidity: string;
    sqrtPriceX96: string;
    token0: string;
    token1: string;
}

interface SwapContextValue {
    account: string | null;
    provider: ethers.BrowserProvider | null;
    signer: ethers.Signer | null;
    isConnected: boolean;
    isConnecting: boolean;
    connect: () => Promise<void>;
    disconnect: () => void;
    getQuote: (params: {
        fromSymbol: string;
        toSymbol: string;
        amountIn: string;
    }) => Promise<SwapQuote>;
    swapExactInputSingle: (params: {
        fromSymbol: string;
        toSymbol: string;
        amountIn: string;
        slippage: number;
    }) => Promise<any>;
    getTokenBalance: (tokenSymbol: string) => Promise<string>;
    getPoolInfo: (
        tokenA: string,
        tokenB: string,
        fee: number
    ) => Promise<PoolInfo | null>;
    getAllPoolsForPair: (
        tokenA: string,
        tokenB: string
    ) => Promise<PoolInfo[]>;
}

const SwapContext = createContext<SwapContextValue | undefined>(undefined);

export const SwapProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
    const [signer, setSigner] = useState<ethers.Signer | null>(null);
    const [account, setAccount] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    // Check if MetaMask is available
    const isMetaMaskAvailable = () => {
        return typeof window !== 'undefined' &&
            typeof (window as any).ethereum !== 'undefined' &&
            (window as any).ethereum.isMetaMask;
    };

    // Initialize connection
    const initializeConnection = async (providerInstance: ethers.BrowserProvider) => {
        try {
            const signerInstance = await providerInstance.getSigner();
            const address = await signerInstance.getAddress();

            setProvider(providerInstance);
            setSigner(signerInstance);
            setAccount(address);
            setIsConnected(true);

            console.log("Wallet connected successfully:", {
                address,
                provider: !!providerInstance,
                signer: !!signerInstance
            });

            return { provider: providerInstance, signer: signerInstance, address };
        } catch (error) {
            console.error("Failed to initialize connection:", error);
            throw error;
        }
    };

    // Connect wallet function
    const connect = async () => {
        if (!isMetaMaskAvailable()) {
            throw new Error("MetaMask is not installed. Please install MetaMask to continue.");
        }

        if (isConnecting) {
            console.log("Connection already in progress...");
            return;
        }

        setIsConnecting(true);

        try {
            const ethereum = (window as any).ethereum;

            // Request account access
            const accounts = await ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (!accounts || accounts.length === 0) {
                throw new Error("No accounts returned from MetaMask");
            }

            // Create provider
            const providerInstance = new ethers.BrowserProvider(ethereum);

            // Verify network connection
            const network = await providerInstance.getNetwork();
            console.log("Connected to network:", network);

            // Initialize connection
            await initializeConnection(providerInstance);

        } catch (error: any) {
            console.error("Connection failed:", error);

            // Reset states on error
            setProvider(null);
            setSigner(null);
            setAccount(null);
            setIsConnected(false);

            // Handle specific errors
            if (error.code === 4001) {
                throw new Error("Please connect to MetaMask to continue.");
            } else if (error.code === -32002) {
                throw new Error("MetaMask connection request is already pending. Please check MetaMask.");
            } else {
                throw new Error(error.message || "Failed to connect wallet");
            }
        } finally {
            setIsConnecting(false);
        }
    };

    // Disconnect wallet
    const disconnect = () => {
        setProvider(null);
        setSigner(null);
        setAccount(null);
        setIsConnected(false);
        console.log("Wallet disconnected");
    };

    // Handle account changes
    const handleAccountsChanged = async (accounts: string[]) => {
        console.log("Accounts changed:", accounts);

        if (accounts.length === 0) {
            // User disconnected
            disconnect();
        } else if (accounts[0] !== account) {
            // Account switched
            try {
                if (provider) {
                    await initializeConnection(provider);
                }
            } catch (error) {
                console.error("Failed to handle account change:", error);
                disconnect();
            }
        }
    };

    // Handle chain changes
    const handleChainChanged = (chainId: string) => {
        console.log("Chain changed to:", chainId);
        // Reload the page or reinitialize connection as needed
        window.location.reload();
    };

    // Handle disconnect
    const handleDisconnect = () => {
        console.log("MetaMask disconnected");
        disconnect();
    };

    // Auto-connect on page load
    useEffect(() => {
        const autoConnect = async () => {
            if (!isMetaMaskAvailable()) {
                console.log("MetaMask not available");
                return;
            }

            try {
                const ethereum = (window as any).ethereum;
                const accounts = await ethereum.request({ method: 'eth_accounts' });

                if (accounts && accounts.length > 0) {
                    console.log("Auto-connecting to existing session...");
                    const providerInstance = new ethers.BrowserProvider(ethereum);
                    await initializeConnection(providerInstance);
                }
            } catch (error) {
                console.error("Auto-connect failed:", error);
            }
        };

        autoConnect();
    }, []);

    // Setup event listeners
    useEffect(() => {
        if (!isMetaMaskAvailable()) return;

        const ethereum = (window as any).ethereum;

        // Add event listeners
        ethereum.on('accountsChanged', handleAccountsChanged);
        ethereum.on('chainChanged', handleChainChanged);
        ethereum.on('disconnect', handleDisconnect);

        // Cleanup event listeners
        return () => {
            if (ethereum.removeListener) {
                ethereum.removeListener('accountsChanged', handleAccountsChanged);
                ethereum.removeListener('chainChanged', handleChainChanged);
                ethereum.removeListener('disconnect', handleDisconnect);
            }
        };
    }, [account, provider]);

    const getPoolInfo = async (
        tokenA: string,
        tokenB: string,
        fee: number
    ): Promise<PoolInfo | null> => {
        if (!provider) throw new Error("Provider not connected");

        try {
            const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
            const poolAddress = await factory.getPool(tokenA, tokenB, fee);

            if (poolAddress === ethers.ZeroAddress) {
                return null;
            }

            const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);
            const [slot0Data, liquidity, token0, token1] = await Promise.all([
                poolContract.slot0(),
                poolContract.liquidity(),
                poolContract.token0(),
                poolContract.token1(),
            ]);

            return {
                address: poolAddress,
                fee,
                liquidity: liquidity.toString(),
                sqrtPriceX96: slot0Data.sqrtPriceX96.toString(),
                token0,
                token1,
            };
        } catch (error) {
            console.error(`Error getting pool info for fee ${fee}:`, error);
            return null;
        }
    };

    const getAllPoolsForPair = async (
        tokenA: string,
        tokenB: string
    ): Promise<PoolInfo[]> => {
        const pools: PoolInfo[] = [];
        for (const fee of FEE_TIERS) {
            const poolInfo = await getPoolInfo(tokenA, tokenB, fee);
            if (poolInfo && BigInt(poolInfo.liquidity) > 0n) {
                pools.push(poolInfo);
            }
        }
        return pools.sort(
            (a, b) => Number(BigInt(b.liquidity) - BigInt(a.liquidity))
        );
    };

    const getTokenBalance = async (tokenSymbol: string): Promise<string> => {
        if (!provider || !account) throw new Error("Wallet not connected");

        const tokenInfo = TOKENS[tokenSymbol];
        if (!tokenInfo) throw new Error(`Token ${tokenSymbol} not configured`);

        try {
            const tokenContract = new ethers.Contract(
                tokenInfo.address,
                ERC20_ABI,
                provider
            );
            const balance = await tokenContract.balanceOf(account);
            return ethers.formatUnits(balance, tokenInfo.decimals);
        } catch (error) {
            console.error(`Error getting balance for ${tokenSymbol}:`, error);
            return "0";
        }
    };

    // Manual quote from pool sqrtPriceX96
    const getQuote = async ({
        fromSymbol,
        toSymbol,
        amountIn,
    }: {
        fromSymbol: string;
        toSymbol: string;
        amountIn: string;
    }): Promise<SwapQuote> => {
        if (!provider) throw new Error("Provider not connected");

        const tokenInInfo = TOKENS[fromSymbol];
        const tokenOutInfo = TOKENS[toSymbol];
        if (!tokenInInfo || !tokenOutInfo) throw new Error("Token not configured");

        const pools = await getAllPoolsForPair(
            tokenInInfo.address,
            tokenOutInfo.address
        );

        if (pools.length === 0) throw new Error("No liquidity pools found");

        const bestPool = pools[0];

        // Compute price from sqrtPriceX96
        // Price = (sqrtPriceX96 ** 2) / 2**192 (token1/token0)
        const sqrtPriceX96 = BigInt(bestPool.sqrtPriceX96);
        const priceX192 = sqrtPriceX96 * sqrtPriceX96;
        const price = Number(priceX192 >> 192n);

        // For stable pair assume 1:1, fallback approximate
        const inputAmount = parseFloat(amountIn);
        const outputAmount = inputAmount * (price === 0 ? 1 : price);

        return {
            amountOut: outputAmount.toString(),
            priceImpact: 0.1, // dummy simplified
            route: [fromSymbol, toSymbol],
            fee: bestPool.fee,
        };
    };

    const swapExactInputSingle = async ({
        fromSymbol,
        toSymbol,
        amountIn,
        slippage,
    }: {
        fromSymbol: string;
        toSymbol: string;
        amountIn: string;
        slippage: number;
    }) => {
        if (!signer || !account) throw new Error("Wallet not connected");

        const tokenInInfo = TOKENS[fromSymbol];
        const tokenOutInfo = TOKENS[toSymbol];
        if (!tokenInInfo || !tokenOutInfo) throw new Error("Token not configured");

        const tokenInContract = new ethers.Contract(
            tokenInInfo.address,
            ERC20_ABI,
            signer
        );
        const router = new ethers.Contract(
            SWAP_ROUTER_ADDRESS,
            SwapRouterABI.abi,
            signer
        );

        const amtInWei = ethers.parseUnits(amountIn, tokenInInfo.decimals);
        const currentAllowance = await tokenInContract.allowance(
            account,
            SWAP_ROUTER_ADDRESS
        );

        if (currentAllowance < amtInWei) {
            console.log("Approving token spend...");
            const approveTx = await tokenInContract.approve(
                SWAP_ROUTER_ADDRESS,
                amtInWei
            );
            const receipt = await approveTx.wait();
            if (!receipt || receipt.status !== 1) {
                throw new Error("Token approval failed");
            }
            console.log("Token approval successful");
        }

        const quote = await getQuote({ fromSymbol, toSymbol, amountIn });
        const amountOutWei = ethers.parseUnits(
            quote.amountOut,
            tokenOutInfo.decimals
        );

        const minOutWei = (amountOutWei * BigInt(100 - slippage)) / BigInt(100);
        const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

        const params = {
            tokenIn: tokenInInfo.address,
            tokenOut: tokenOutInfo.address,
            fee: quote.fee,
            recipient: account,
            deadline,
            amountIn: amtInWei,
            amountOutMinimum: minOutWei,
            sqrtPriceLimitX96: 0n,
        };

        console.log("Executing swap...");
        const tx = await router.exactInputSingle(params, { gasLimit: 300000 });
        const receipt = await tx.wait();
        console.log("Swap successful:", receipt);
        return receipt;
    };

    return (
        <SwapContext.Provider
            value={{
                account,
                provider,
                signer,
                isConnected,
                isConnecting,
                connect,
                disconnect,
                getQuote,
                swapExactInputSingle,
                getTokenBalance,
                getPoolInfo,
                getAllPoolsForPair,
            }}
        >
            {children}
        </SwapContext.Provider>
    );
};

export const useSwap = () => {
    const ctx = useContext(SwapContext);
    if (!ctx) throw new Error("useSwap must be used inside SwapProvider");
    return ctx;
};