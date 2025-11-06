import React, { createContext, useContext, useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "./WalletContext";
import ExecutorABI from "../ABI/LimitOrder.json"

interface CreateOrderParams {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;       // user input, converted to units
    targetPrice: string;    // plain human price, converted to 1e18 in createOrder()
    triggerAbove: boolean;
    ttlSeconds: number;
    ordertype: number;      // 0=BUY, 1=SELL
}

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

    const EXECUTOR_ADDRESS = "0x8eA4661007b475Bfbb16e10186E896d6723C3655";
    const FACTORY_ADDRESS = "0x83DEFEcaF6079504E2DD1DE2c66DCf3046F7bDD7";
    const FACTORY_ABI = [
        "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"
    ];
    const createOrder = async (params: CreateOrderParams): Promise<string> => {
        if (!signer || !account) {
            throw new Error("Wallet not connected");
        }

        setLoading(true);
        setError(null);

        try {
            const executor = new ethers.Contract(EXECUTOR_ADDRESS, ExecutorABI, signer);

            // Fetch decimals for tokens (you can fetch dynamically if needed)
            const [decimalsIn, decimalsOut] = await Promise.all([18, 18]);

            console.log(`📊 Token decimals: ${params.tokenIn}=${decimalsIn}, ${params.tokenOut}=${decimalsOut}`);

            // Scale input amounts
            const amountIn = ethers.parseUnits(params.amountIn, decimalsIn);

            // 🧮 targetPrice is now just the user-input ratio (quote per base)
            // Example: if 1 ETH = 2000 USDC, targetPrice = 2000 * 1e18
            const targetPrice = ethers.parseUnits(params.targetPrice, 18);

            // Fetch pool from Uniswap factory
            const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);
            const poolAddress = await factory.getPool(params.tokenIn, params.tokenOut, 500);

            if (!poolAddress || poolAddress === ethers.ZeroAddress) {
                throw new Error("Pool does not exist for this token pair");
            }

            console.log("📊 Order params:", {
                tokenIn: params.tokenIn,
                tokenOut: params.tokenOut,
                amountIn: amountIn.toString(),
                targetPrice: targetPrice.toString(),
                triggerAbove: params.triggerAbove,
                ttlSeconds: params.ttlSeconds,
                ordertype: params.ordertype,
                poolAddress,
            });

            // Approve if needed
            const tokenInContract = new ethers.Contract(params.tokenIn, ERC20_ABI, signer);
            const currentAllowance = await tokenInContract.allowance(account, EXECUTOR_ADDRESS);

            if (currentAllowance < amountIn) {
                console.log("🔓 Approving token...");
                const approveTx = await tokenInContract.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
                await approveTx.wait();
                console.log("✅ Approval done");
            }

            // ✅ Create order (no amountOutMin, no sqrt)
            const tx = await executor.depositAndCreateOrder(
                params.tokenIn,
                params.tokenOut,
                poolAddress,
                amountIn,
                targetPrice,
                params.triggerAbove,
                params.ttlSeconds,
                params.ordertype,
                { gasLimit: 1_000_000 }
            );

            console.log("⛽ Sent tx:", tx.hash);
            const receipt = await tx.wait();
            console.log("✅ Order created in block:", receipt.blockNumber);

            return tx.hash;
        } catch (e: any) {
            console.error("❌ Order creation failed:", e);
            setError(e.message || "Failed to create order");
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
        const executor = new ethers.Contract(EXECUTOR_ADDRESS, ExecutorABI, signer);

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