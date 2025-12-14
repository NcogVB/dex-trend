import { useState, useCallback } from "react";
import { ethers, MaxUint256 } from "ethers";
import { useWallet } from "../contexts/WalletContext"; // Adjust path
import ExecutorABI from "../ABI/LimitOrder.json"; // Adjust path

type CreateOrderParams = {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    amountOutMin: string;
    targetPrice: string;
    ttlSeconds: number;
    ordertype: number;    // 0 = BUY, 1 = SELL
};

type CancelParams = {
    orderId: number;
};

type FetchLastOrderParams = {
    tokenIn: string;
    tokenOut: string;
};

const EXECUTOR_ADDRESS = "0x14e904F5FfA5748813859879f8cA20e487F407D8";

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)",
];

export const useOrder = () => {
    const { account, signer } = useWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentRate, setCurrentRate] = useState<string>("0");

    // Helper: Convert numeric price to uint256 scaled to 1e18
    const toPrice1e18 = (value: string) => {
        const n = parseFloat(value);
        if (isNaN(n) || n <= 0) throw new Error("Invalid price");
        return ethers.parseUnits(n.toString(), 18);
    };

    // =====================================================================
    // 📌 FETCH LAST EXECUTED ORDER PRICE FOR SPECIFIC PAIR
    // =====================================================================
    const fetchLastOrderPriceForPair = useCallback(
        async ({ tokenIn, tokenOut }: FetchLastOrderParams): Promise<string> => {
            if (!signer?.provider) return "0";

            try {
                // Ensure we are using a provider (signer.provider is usually sufficient)
                const provider = signer.provider; 
                const executor = new ethers.Contract(EXECUTOR_ADDRESS, ExecutorABI.abi, provider);

                const res = await executor.getLastExecutedPrice(tokenIn, tokenOut);

                // Handle potential different return types (array vs object)
                const rawPrice = (res && typeof res === "object" && (res.price1e18 ?? res[0])) ?? "0";

                if (!rawPrice || rawPrice.toString() === "0") {
                    setCurrentRate("0");
                    return "0";
                }

                const formatted = ethers.formatUnits(rawPrice, 18);
                // console.log("Fetched last executed price for pair:", formatted);
                
                // You can choose to format/round this string here if needed for UI
                const normalized = Number(formatted).toString(); 

                setCurrentRate(normalized);
                return normalized;
            } catch (err) {
                console.error("⚠️ Failed fetching executed pair price:", err);
                setCurrentRate("0");
                return "0";
            }
        },
        [signer]
    );

    // =====================================================================
    // 📌 CREATE ORDER
    // =====================================================================
    const createOrder = useCallback(
        async (params: CreateOrderParams): Promise<string> => {
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

                // --- Approve Token In ---
                const allowance = await tokenInContract.allowance(account, EXECUTOR_ADDRESS);
                if (allowance < amountIn) {
                    const txApprove = await tokenInContract.approve(EXECUTOR_ADDRESS, MaxUint256);
                    await txApprove.wait();
                }

                // --- Create Order Transaction ---
                const tx = await executor.depositAndCreateOrder(
                    params.tokenIn,
                    params.tokenOut,
                    amountIn,
                    amountOutMin,
                    targetPrice1e18,
                    params.ttlSeconds,
                    params.ordertype,
                    { gasLimit: 800000 }
                );

                await tx.wait();

                // Refresh the rate immediately after order creation (optional but good UX)
                await fetchLastOrderPriceForPair({
                    tokenIn: params.tokenIn,
                    tokenOut: params.tokenOut
                });

                return tx.hash;

            } catch (err: any) {
                console.error("Create Order Error:", err);
                setError(err.message || "Failed to create order");
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [signer, account, fetchLastOrderPriceForPair]
    );

    // =====================================================================
    // 📌 CANCEL ORDER
    // =====================================================================
    const cancelOrder = useCallback(
        async (params: CancelParams) => {
            if (!signer || !account) throw new Error("Wallet not connected");

            setLoading(true);
            setError(null);

            try {
                const executor = new ethers.Contract(EXECUTOR_ADDRESS, ExecutorABI.abi, signer);
                const tx = await executor.cancelOrder(params.orderId);
                await tx.wait();
                return tx.hash;
            } catch (err: any) {
                console.error("Cancel Order Error:", err);
                setError(err.message || "Failed to cancel order");
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [signer, account]
    );

    return {
        createOrder,
        cancelOrder,
        fetchLastOrderPriceForPair,
        currentRate,
        loading,
        error
    };
};