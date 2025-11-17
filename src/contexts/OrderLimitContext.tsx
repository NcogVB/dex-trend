import React, { createContext, useContext, useState, useCallback } from "react";
import { ethers, MaxUint256 } from "ethers";
import { useWallet } from "./WalletContext";
import ExecutorABI from "../ABI/LimitOrder.json"

type CreateOrderParams = {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;      // human-readable (e.g. "100")
    amountOutMin: string;  // human-readable with slippage
    targetSqrtPriceX96: string; // decimal ratio like "1.001"
    triggerAbove: boolean;
    ttlSeconds: number;
    ordertype: number;
};

type cancelParams = {
    orderId: number;
};

type OrderContextType = {
    createOrder: (params: CreateOrderParams) => Promise<string>;
    cancelOrder: (params: cancelParams) => Promise<string>;
    fetchTokenRatio: (tokenA: string, tokenB: string) => Promise<string>;
    poolAddress: string | null;
    currentRate: string;
    loading: boolean;
    error: string | null;
};

const OrderContext = createContext<OrderContextType | undefined>(undefined);

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)",
];

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { account, signer } = useWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [poolAddress, setPoolAddress] = useState<string | null>(null);
    const [currentRate, setCurrentRate] = useState<string>("0.00000000");

    const EXECUTOR_ADDRESS = "0x519c11Bb3e09F89E5393c8F10A26c0D2B9b8d188";
    const FACTORY_ADDRESS = "0x83DEFEcaF6079504E2DD1DE2c66DCf3046F7bDD7";

    const FACTORY_ABI = [
        "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
    ];
    "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"
    /**
     * Convert a price ratio (e.g., "1.001") to targetPrice scaled by 1e18
     * Formula: ratio * 10^(decimalsIn - decimalsOut) * 1e18
     */
    const calculateTargetPrice = (
        priceRatio: string,
        decimalsIn: number,
        decimalsOut: number
    ): string => {
        // Clean the input
        const cleanRatio = priceRatio.trim();
        const ratio = parseFloat(cleanRatio);

        if (isNaN(ratio) || ratio <= 0) {
            throw new Error(`Invalid price ratio: "${priceRatio}"`);
        }

        console.log(`🔢 Calculating targetPrice: ratio=${ratio}, decimalsIn=${decimalsIn}, decimalsOut=${decimalsOut}`);

        // Calculate decimal adjustment
        const decimalAdjustment = decimalsIn - decimalsOut;

        // Convert ratio to a string with enough precision, then to BigInt
        // Multiply by 1e18 to match contract expectation
        const SCALE = 1e18;
        const scaledRatio = ratio * SCALE;

        // Convert to BigInt (remove any decimals)
        let targetPriceBigInt = BigInt(Math.floor(scaledRatio));

        // Apply decimal adjustment
        if (decimalAdjustment > 0) {
            targetPriceBigInt = targetPriceBigInt * BigInt(10 ** decimalAdjustment);
        } else if (decimalAdjustment < 0) {
            targetPriceBigInt = targetPriceBigInt / BigInt(10 ** Math.abs(decimalAdjustment));
        }

        console.log(`✅ Target price calculated: ${targetPriceBigInt.toString()}`);
        return targetPriceBigInt.toString();
    };


    // 🔹 Fetch live ratio directly from Executor contract
    const fetchTokenRatio = useCallback(
        async (tokenA: string, tokenB: string): Promise<string> => {
            try {
                if (!tokenA || !tokenB) throw new Error("Missing token addresses");

                // ✅ Always use a valid provider (connected or fallback)
                const rpcProvider =
                    signer?.provider
                        ? (signer.provider as ethers.Provider)
                        : new ethers.JsonRpcProvider("https://api.skyhighblockchain.com", 1476);

                // ✅ Step 1: Get pool address
                const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, rpcProvider);
                const pool = await factory.getPool(tokenA, tokenB, 500);

                if (!pool || pool === ethers.ZeroAddress) {
                    console.warn("⚠️ No pool found for", tokenA, tokenB);
                    setPoolAddress(null);
                    setCurrentRate("0");
                    return "0";
                }

                // console.log("✅ Pool found:", pool);
                setPoolAddress(pool);

                // ✅ Step 2: Get ratio
                const executor = new ethers.Contract(EXECUTOR_ADDRESS, ExecutorABI.abi, rpcProvider);

                let ratio;
                let rate;

                try {
                    ratio = await executor.getTokenRatio(pool, tokenA, tokenB);
                    const ratioValue = parseFloat(ethers.formatUnits(ratio, 18));
                    rate = ratioValue.toFixed(12);
                } catch (err: any) {
                    console.warn("🔁 Trying reversed order…", err.message);
                    const reverse = await executor.getTokenRatio(pool, tokenB, tokenA);
                    const ratioValue = parseFloat(ethers.formatUnits(reverse, 18));
                    rate = ratioValue > 0 ? (1 / ratioValue).toFixed(12) : "0";
                }

                // ✅ Save usable number (not "0.00000000")
                setCurrentRate(rate);
                // console.log("✅ Final rate:", rate);
                return rate;
            } catch (err) {
                console.error("❌ Failed to fetch pool/ratio:", err);
                setPoolAddress(null);
                setCurrentRate("0");
                return "0";
            }
        },
        [signer]
    );


    // 🔹 Order creation logic
    const createOrder = async (params: CreateOrderParams): Promise<string> => {
        if (!signer || !account) throw new Error("Wallet not connected");
        setLoading(true);
        setError(null);

        try {
            const executor = new ethers.Contract(EXECUTOR_ADDRESS, ExecutorABI.abi, signer);

            const tokenInContract = new ethers.Contract(params.tokenIn, ERC20_ABI, signer);
            const tokenOutContract = new ethers.Contract(params.tokenOut, ERC20_ABI, signer);

            const [decimalsIn, decimalsOut] = await Promise.all([
                tokenInContract.decimals(),  // ✅ Fetches actual decimals
                tokenOutContract.decimals()   // ✅ Fetches actual decimals
            ]);

            console.log(`📊 Token decimals: ${params.tokenIn}=${decimalsIn}, ${params.tokenOut}=${decimalsOut}`);

            // Scale amounts using correct decimals
            const amountIn = ethers.parseUnits(params.amountIn, decimalsIn);
            const amountOutMin = ethers.parseUnits(params.amountOutMin, decimalsOut);

            // Convert price ratio to targetPrice with proper decimal handling
            const targetPriceString = calculateTargetPrice(
                params.targetSqrtPriceX96,
                decimalsIn,
                decimalsOut
            );
            const targetPrice = BigInt(String(targetPriceString));

            // Fetch pool address from factory
            const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);
            const poolAddress = await factory.getPool(params.tokenIn, params.tokenOut, 500);

            if (!poolAddress || poolAddress === ethers.ZeroAddress) {
                throw new Error("Pool does not exist for this token pair");
            }

            console.log("📊 Order params:", {
                tokenIn: params.tokenIn,
                tokenOut: params.tokenOut,
                amountIn: amountIn.toString(),
                amountOutMin: amountOutMin.toString(),
                targetPrice: targetPrice.toString(),
                targetPriceRatio: params.targetSqrtPriceX96,
                poolAddress,
                ttl: params.ttlSeconds,
                decimalsIn,
                decimalsOut
            });

            // Approve token if needed
            const currentAllowance = await tokenInContract.allowance(account, EXECUTOR_ADDRESS);

            if (currentAllowance < amountIn) {
                console.log("🔓 Approving token...");
                const approveTx = await tokenInContract.approve(EXECUTOR_ADDRESS, MaxUint256);
                await approveTx.wait();
                console.log("✅ Approval done");
            }

            const tx = await executor.depositAndCreateOrder(
                params.tokenIn,
                params.tokenOut,
                poolAddress,
                amountIn,
                amountOutMin,
                targetPrice,
                params.triggerAbove,
                params.ttlSeconds,
                params.ordertype,
                { gasLimit: 800000 }
            );

            await tx.wait();
            return tx.hash;
        } catch (e: any) {
            console.error("❌ Order creation failed:", e);
            setError(e.message);
            throw e;
        } finally {
            setLoading(false);
        }
    };

    // 🔹 Cancel order
    const cancelOrder = async (params: cancelParams) => {
        if (!signer || !account) throw new Error("Wallet not connected");
        setLoading(true);
        try {
            const executor = new ethers.Contract(EXECUTOR_ADDRESS, ExecutorABI.abi, signer);
            const tx = await executor.cancelOrder(params.orderId);
            await tx.wait();
            return tx.hash;
        } finally {
            setLoading(false);
        }
    };

    const contextValue: OrderContextType = {
        createOrder,
        cancelOrder,
        fetchTokenRatio,
        poolAddress,
        currentRate,
        loading,
        error,
    };

    return <OrderContext.Provider value={contextValue}>{children}</OrderContext.Provider>;
};

export function useOrder() {
    const ctx = useContext(OrderContext);
    if (!ctx) throw new Error("useOrder must be used within OrderProvider");
    return ctx;
}
