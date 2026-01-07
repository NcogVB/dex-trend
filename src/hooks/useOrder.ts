import { useState, useCallback } from "react";
import { ethers, MaxUint256 } from "ethers";
import { useWallet } from "../contexts/WalletContext";
import ExecutorABI from "../ABI/ABI.json";

type CreateOrderParams = {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    amountOutMin: string;
    targetPrice: string;
    ttlSeconds: number;
    ordertype: number;
    insuranceType?: number;
    coveragePct?: number;
};

type CancelParams = { orderId: number; };
type FetchLastOrderParams = { tokenIn: string; tokenOut: string; };

const EXECUTOR_ADDRESS = "0x6Cc3baF9320934d4DEcAB8fdAc92F00102A58994";

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address account) view returns (uint256)"
];

export const useOrder = () => {
    const { account, signer } = useWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentRate, setCurrentRate] = useState<string>("0");

    const toPrice1e18 = (value: string) => {
        const n = parseFloat(value);
        if (isNaN(n) || n <= 0) throw new Error("Invalid price");
        return ethers.parseUnits(n.toString(), 18);
    };

    const fetchLastOrderPriceForPair = useCallback(
        async ({ tokenIn, tokenOut }: FetchLastOrderParams): Promise<string> => {
            if (!signer?.provider) return "0";
            try {
                const provider = signer.provider;
                const executor = new ethers.Contract(EXECUTOR_ADDRESS, ExecutorABI, provider);
                const res = await executor.lastExecutedPrice(tokenIn, tokenOut);

                const rawPrice = (res && typeof res === "object" && (res.price1e18 ?? res[0])) ?? "0";
                if (!rawPrice || rawPrice.toString() === "0") {
                    setCurrentRate("0");
                    return "0";
                }

                const formatted = ethers.formatUnits(rawPrice, 18);
                setCurrentRate(Number(formatted).toString());
                return Number(formatted).toString();
            } catch (err) {
                console.error("Failed fetching price:", err);
                setCurrentRate("0");
                return "0";
            }
        },
        [signer]
    );

    const createOrder = useCallback(
        async (params: CreateOrderParams): Promise<string> => {
            if (!signer || !account) throw new Error("Wallet not connected");

            setLoading(true);
            setError(null);

            try {
                const executor = new ethers.Contract(EXECUTOR_ADDRESS, ExecutorABI, signer);
                const tokenInContract = new ethers.Contract(params.tokenIn, ERC20_ABI, signer);
                const tokenOutContract = new ethers.Contract(params.tokenOut, ERC20_ABI, signer);

                const [decimalsIn, decimalsOut, walletBalance] = await Promise.all([
                    tokenInContract.decimals(),
                    tokenOutContract.decimals(),
                    tokenInContract.balanceOf(account)
                ]);

                const balanceReader = new ethers.Contract(EXECUTOR_ADDRESS, ExecutorABI, signer);
                const userData = await balanceReader.getUserAccountData(account, params.tokenIn).catch(() => ({ tokenCollateralBalance: 0n }));
                const internalBalance = BigInt(userData.tokenCollateralBalance || 0);

                const totalTradeSizeBig = ethers.parseUnits(params.amountIn, decimalsIn);
                const amountOutMinBig = ethers.parseUnits(params.amountOutMin, decimalsOut);
                const targetPrice1e18 = toPrice1e18(params.targetPrice);

                const totalAvailable = walletBalance + internalBalance;
                const isLeverage = totalTradeSizeBig > totalAvailable;

                let tx;

                if (isLeverage) {
                    const collateralAmount = totalAvailable;
                    const borrowAmount = totalTradeSizeBig - totalAvailable;

                    if (collateralAmount === BigInt(0)) throw new Error("No Collateral available");

                    if (walletBalance > 0n) {
                        const allowance = await tokenInContract.allowance(account, EXECUTOR_ADDRESS);
                        if (allowance < walletBalance) {
                            const txApprove = await tokenInContract.approve(EXECUTOR_ADDRESS, MaxUint256);
                            await txApprove.wait();
                        }
                    }

                    const insuranceTypeToSend = params.insuranceType || 1;
                    const coveragePctToSend = params.coveragePct || 2000;

                    tx = await executor.executeStrategy(
                        params.tokenIn,
                        collateralAmount,
                        borrowAmount,
                        params.tokenOut,
                        targetPrice1e18,
                        insuranceTypeToSend,
                        coveragePctToSend,
                        { gasLimit: 1500000 }
                    );

                } else {
                    if (totalTradeSizeBig > internalBalance) {
                        const amountFromWallet = totalTradeSizeBig - internalBalance;
                        const allowance = await tokenInContract.allowance(account, EXECUTOR_ADDRESS);
                        if (allowance < amountFromWallet) {
                            const txApprove = await tokenInContract.approve(EXECUTOR_ADDRESS, MaxUint256);
                            await txApprove.wait();
                        }
                    }

                    tx = await executor.createOrder(
                        params.tokenIn,
                        params.tokenOut,
                        totalTradeSizeBig,
                        amountOutMinBig,
                        targetPrice1e18,
                        params.ttlSeconds,
                        params.ordertype,
                        { gasLimit: 1000000 }
                    );
                }

                await tx.wait();

                await fetchLastOrderPriceForPair({
                    tokenIn: params.tokenIn,
                    tokenOut: params.tokenOut
                });

                return tx.hash;

            } catch (err: any) {
                console.error("Order Error:", err);
                if (err.message.includes("Low Liq")) setError("Protocol has insufficient liquidity.");
                else if (err.message.includes("user rejected")) setError("Transaction rejected.");
                else setError(err.message || "Failed to create order");
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [signer, account, fetchLastOrderPriceForPair]
    );

    const cancelOrder = useCallback(
        async (params: CancelParams) => {
            if (!signer || !account) throw new Error("Wallet not connected");
            setLoading(true);
            try {
                const executor = new ethers.Contract(EXECUTOR_ADDRESS, ExecutorABI, signer);
                const tx = await executor.cancelOrder(params.orderId);
                await tx.wait();
                return tx.hash;
            } catch (err: any) {
                console.error("Cancel Error:", err);
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