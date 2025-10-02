import React, { createContext, useContext, useState } from "react";
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
};

type cancelParams = {
    orderId: number
}
type OrderContextType = {
    createOrder: (params: CreateOrderParams) => Promise<string>;
    cancelOrder: (params: cancelParams) => Promise<string>;
    loading: boolean;
    error: string | null;
};

const OrderContext = createContext<OrderContextType | undefined>(undefined);

// ERC20 ABI for fetching decimals
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)"
];

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { account, signer } = useWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const EXECUTOR_ADDRESS = "0x10e9c43B9Fbf78ca0d83515AE36D360110e4331d";
    const FACTORY_ADDRESS = "0x83DEFEcaF6079504E2DD1DE2c66DCf3046F7bDD7";
    const FACTORY_ABI = [
        "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"
    ];
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

    const createOrder = async (params: CreateOrderParams): Promise<string> => {
        if (!signer || !account) {
            throw new Error("Wallet not connected");
        }

        setLoading(true);
        setError(null);

        try {
            const executor = new ethers.Contract(EXECUTOR_ADDRESS, ExecutorABI.abi, signer);

            // Fetch decimals for both tokens
            const [decimalsIn, decimalsOut] = await Promise.all([
                18,
                18
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
            const tokenInContract = new ethers.Contract(params.tokenIn, ERC20_ABI, signer);
            const currentAllowance = await tokenInContract.allowance(account, EXECUTOR_ADDRESS);

            if (currentAllowance < amountIn) {
                console.log("🔓 Approving token...");
                const approveTx = await tokenInContract.approve(EXECUTOR_ADDRESS, MaxUint256);
                await approveTx.wait();
                console.log("✅ Approval done");
            }

            // Create order
            const tx = await executor.depositAndCreateOrder(
                params.tokenIn,
                params.tokenOut,
                500, // 0.05% fee tier
                poolAddress,
                amountIn,
                amountOutMin,
                targetPrice,
                params.triggerAbove,
                params.ttlSeconds,
                { gasLimit: 800000 }
            );

            console.log("⛽ Sent tx:", tx.hash);
            const receipt = await tx.wait();
            console.log("✅ Order created in block:", receipt.blockNumber);

            return tx.hash;
        } catch (e: any) {
            console.error("❌ Order creation failed:", e);
            const errorMsg = e.message || "Failed to create order";
            setError(errorMsg);
            throw e;
        } finally {
            setLoading(false);
        }
    };

    const cancelOrder = async (params: cancelParams) => {
        if (!signer || !account) {
            throw new Error("Wallet not connected");
        }
        setLoading(true);
        const executor = new ethers.Contract(EXECUTOR_ADDRESS, ExecutorABI.abi, signer);

        try {
            const tx = await executor.cancelOrder(params.orderId)
            console.log("⛽ Sent tx:", tx.hash);
            const receipt = await tx.wait();
            console.log("✅ Order cancelled in block:", receipt.blockNumber);
            return tx.hash;
        } catch (error) {
            console.log(error)
        }
    }
    const contextValue: OrderContextType = {
        createOrder,
        cancelOrder,
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