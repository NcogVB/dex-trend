import React, { createContext, useContext, useState, useCallback } from "react";
import { ethers, MaxUint256 } from "ethers";
import { useWallet } from "./WalletContext";
import ExecutorABI from "../ABI/LimitOrder.json";

type CreateOrderParams = {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    amountOutMin: string;
    targetPrice: string;
    ttlSeconds: number;
    ordertype: number;     // 0 = BUY, 1 = SELL
};

type cancelParams = {
    orderId: number;
};

type fetchLastOrderParams = {
    tokenIn: string;
    tokenOut: string;
};

type OrderContextType = {
    createOrder: (params: CreateOrderParams) => Promise<string>;
    cancelOrder: (params: cancelParams) => Promise<string>;
    fetchLastOrderPriceForPair: (params: fetchLastOrderParams) => Promise<string>;
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
    const [currentRate, setCurrentRate] = useState<string>("0");

    const EXECUTOR_ADDRESS = "0x34f92941C90Bba6c72fdD44F636BB3683E3fD2c5";

    // Convert numeric price to uint256 scaled to 1e18
    const toPrice1e18 = (value: string) => {
        const n = parseFloat(value);
        if (isNaN(n) || n <= 0) throw new Error("Invalid price");
        return ethers.parseUnits(n.toString(), 18);
    };

    // =====================================================================
    // 📌 FETCH LAST ORDER PRICE FOR SPECIFIC PAIR
    // =====================================================================
    const fetchLastOrderPriceForPair = useCallback(
        async ({ tokenIn, tokenOut }: fetchLastOrderParams): Promise<string> => {
            if (!signer?.provider) return "0";

            try {
                const provider = signer.provider as ethers.Provider;
                const executor = new ethers.Contract(EXECUTOR_ADDRESS, ExecutorABI.abi, provider);

                const nextIdBN = await executor.nextOrderId();
                const nextId = Number(nextIdBN);

                if (nextId <= 1) {
                    setCurrentRate("0");
                    return "0";
                }

                // walk backwards and return LAST matching order
                for (let id = nextId - 1; id >= 1; id--) {
                    const ord = await executor.getOrder(id);

                    const inAddr = ord.tokenIn.toLowerCase();
                    const outAddr = ord.tokenOut.toLowerCase();

                    const matchA =
                        inAddr === tokenIn.toLowerCase() &&
                        outAddr === tokenOut.toLowerCase();

                    const matchB =
                        inAddr === tokenOut.toLowerCase() &&
                        outAddr === tokenIn.toLowerCase();

                    if (matchA || matchB) {
                        const formatted = ethers.formatUnits(ord.targetPrice1e18, 18);
                        setCurrentRate(formatted);
                        return formatted;
                    }
                }

                // no matching orders
                setCurrentRate("0");
                return "0";

            } catch (err) {
                console.error("⚠️ Failed fetching pair price:", err);
                setCurrentRate("0");
                return "0";
            }
        },
        [signer]
    );

    // =====================================================================
    // 📌 CREATE ORDER
    // =====================================================================
    const createOrder = async (params: CreateOrderParams): Promise<string> => {
        if (!signer || !account) throw new Error("Wallet not connected");

        setLoading(true);
        setError(null);

        try {
            const executor = new ethers.Contract(EXECUTOR_ADDRESS, ExecutorABI.abi, signer);

            const tokenInContract = new ethers.Contract(params.tokenIn, ERC20_ABI, signer);
            const tokenOutContract = new ethers.Contract(params.tokenOut, ERC20_ABI, signer);

            const [decimalsIn, decimalsOut] = await Promise.all([
                tokenInContract.decimals(),
                tokenOutContract.decimals(),
            ]);

            const amountIn = ethers.parseUnits(params.amountIn, decimalsIn);
            const amountOutMin = ethers.parseUnits(params.amountOutMin, decimalsOut);

            const targetPrice1e18 = toPrice1e18(params.targetPrice);

            // approve tokenIn if needed
            const allowance = await tokenInContract.allowance(account, EXECUTOR_ADDRESS);
            if (allowance < amountIn) {
                const txApprove = await tokenInContract.approve(EXECUTOR_ADDRESS, MaxUint256);
                await txApprove.wait();
            }

            const tx = await executor.depositAndCreateOrder(
                params.tokenIn,
                params.tokenOut,
                ethers.ZeroAddress,
                amountIn,
                amountOutMin,
                targetPrice1e18,
                params.ttlSeconds,
                params.ordertype,
                { gasLimit: 800000 }
            );

            await tx.wait();

            // refresh rate for pair
            await fetchLastOrderPriceForPair({
                tokenIn: params.tokenIn,
                tokenOut: params.tokenOut
            });

            return tx.hash;

        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // =====================================================================
    // 📌 CANCEL ORDER
    // =====================================================================
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
        fetchLastOrderPriceForPair,
        currentRate,
        loading,
        error
    };

    return <OrderContext.Provider value={contextValue}>{children}</OrderContext.Provider>;
};

export function useOrder() {
    const ctx = useContext(OrderContext);
    if (!ctx) throw new Error("useOrder must be used within OrderProvider");
    return ctx;
}
