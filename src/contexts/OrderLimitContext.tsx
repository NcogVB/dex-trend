import React, { createContext, useContext, useState } from "react";
import { ethers, MaxUint256 } from "ethers";
import { useWallet } from "./WalletContext";
import ExecutorABI from "../ABI/LimitOrder.json" // ✅ ABI of LimitOrderExecutor

type CreateOrderParams = {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;      // human-readable (e.g. "100")
    amountOutMin: string;  // slippage-adjusted min
    targetSqrtPriceX96: string; // computed off-chain (as decimal ratio like "1.001")
    triggerAbove: boolean;
    ttlSeconds: number;
};

type OrderContextType = {
    createOrder: (params: CreateOrderParams) => Promise<string>;
    loading: boolean;
    error: string | null;
};

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { account, signer } = useWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // your deployed contract
    const EXECUTOR_ADDRESS = "0xB25202f5748116bC5A5e9eB3fCaBC7d5b5777996";
    const poolAddress = "0xc9e139Aa8eFAdBc814c5dD922f489875E309838a";

    /**
     * Convert a price ratio (e.g., 1.001) to targetPrice scaled by 1e18
     * The contract expects targetPrice as: (token1/token0) * 10^(decimalsIn - decimalsOut) * 1e18
     */
    const calculateTargetPrice = (priceRatio: string, decimalsIn: number, decimalsOut: number): string => {
        // Parse the price ratio
        const ratio = parseFloat(priceRatio);

        // Calculate decimal adjustment
        const decimalAdjustment = decimalsIn - decimalsOut;
        const decimalMultiplier = Math.pow(10, decimalAdjustment);

        // Target price = ratio * decimalMultiplier * 1e18
        // We use BigInt for precision
        const ratioScaled = Math.floor(ratio * 1e18); // Scale ratio by 1e18
        const targetPrice = BigInt(ratioScaled) * BigInt(decimalMultiplier);

        return targetPrice.toString();
    };

    const createOrder = async (params: CreateOrderParams): Promise<string> => {
        if (!signer || !account) {
            throw new Error("Wallet not connected");
        }

        setLoading(true);
        setError(null);

        try {
            const executor = new ethers.Contract(EXECUTOR_ADDRESS, ExecutorABI.abi, signer);

            // Get token decimals (you should fetch these dynamically from token contracts)
            const decimalsIn = 18; // USDT typically has 6 or 18 decimals - adjust accordingly
            const decimalsOut = 18; // USDC typically has 6 or 18 decimals - adjust accordingly

            // Scale amounts properly
            const amountIn = ethers.parseUnits(params.amountIn, decimalsIn);
            const amountOutMin = ethers.parseUnits(params.amountOutMin, decimalsOut);

            // Convert price ratio to targetPrice (scaled by 1e18)
            const targetPrice = calculateTargetPrice(
                params.targetSqrtPriceX96,
                decimalsIn,
                decimalsOut
            );

            console.log("📊 Order params:", {
                tokenIn: params.tokenIn,
                tokenOut: params.tokenOut,
                amountIn: amountIn.toString(),
                amountOutMin: amountOutMin.toString(),
                targetPrice: targetPrice,
                decimalsIn,
                decimalsOut,
                ttl: params.ttlSeconds
            });

            // Approve token first
            const tokenInContract = new ethers.Contract(
                params.tokenIn,
                ["function approve(address spender, uint256 amount) external returns (bool)",
                    "function allowance(address owner, address spender) view returns (uint256)"],
                signer
            );

            const currentAllowance = await tokenInContract.allowance(account, EXECUTOR_ADDRESS);

            if (currentAllowance < amountIn) {
                console.log("🔓 Approving token for unlimited allowance...");
                const approveTx = await tokenInContract.approve(EXECUTOR_ADDRESS, MaxUint256);
                await approveTx.wait();
                console.log("✅ Unlimited approval granted");
            } else {
                console.log("👌 Already approved, skipping approval");
            }

            const tx = await executor.depositAndCreateOrder(
                params.tokenIn,
                params.tokenOut,
                500, // 0.05% fee tier
                poolAddress,
                amountIn,
                amountOutMin,
                targetPrice,
                true,
                params.ttlSeconds,
                { gasLimit: 800000 }
            );

            console.log("⛽ Sent tx:", tx.hash);
            const receipt = await tx.wait();
            console.log("✅ Order created:", receipt);

            return tx.hash;
        } catch (e: any) {
            console.error("Order creation failed:", e);
            setError(e.message || "Failed to create order");
            throw e;
        } finally {
            setLoading(false);
        }
    };

    const contextValue: OrderContextType = {
        createOrder,
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