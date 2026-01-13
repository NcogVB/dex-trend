import { useState, useCallback } from "react";
import { ethers, MaxUint256 } from "ethers";
import { useWallet } from "../contexts/WalletContext";
import ExecutorABI from "../ABI/ExchangeCoreABI.json";

const EXECUTOR_ADDRESS = "0xfad47c95A4Fa7f923Cb9d295f5a35F17A1927A86";

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
    const fetchLastOrderPriceForPair = useCallback(
        async ({ tokenIn, tokenOut }: { tokenIn: string; tokenOut: string; }) => {
            if (!signer?.provider) return "0";
            try {
                const executor = new ethers.Contract(EXECUTOR_ADDRESS, ExecutorABI, signer.provider);
                const res = await executor.lastExecutedPrice(tokenIn, tokenOut);
                const raw = (res && res.toString()) || "0";
                const fmt = ethers.formatUnits(raw, 18);
                setCurrentRate(fmt);
                return fmt;
            } catch { return "0"; }
        },
        [signer]
    );

    const createOrder = useCallback(
        async (params: {
            tokenIn: string; tokenOut: string; amountIn: string; amountOutMin: string;
            targetPrice: string; ordertype: number; ttlSeconds: number
        }) => {
            if (!signer || !account) throw new Error("Wallet not connected");
            setLoading(true);
            setError(null);

            try {
                const executor = new ethers.Contract(EXECUTOR_ADDRESS, ExecutorABI, signer);
                const tokenInContract = new ethers.Contract(params.tokenIn, ERC20_ABI, signer);
                const tokenOutContract = new ethers.Contract(params.tokenOut, ERC20_ABI, signer);

                const [decIn, decOut] = await Promise.all([
                    tokenInContract.decimals(),
                    tokenOutContract.decimals()
                ]);

                const amtInWei = ethers.parseUnits(params.amountIn, decIn);
                const amtOutWei = ethers.parseUnits(params.amountOutMin, decOut);
                const priceWei = ethers.parseUnits(params.targetPrice, 18);

                const allowance = await tokenInContract.allowance(account, EXECUTOR_ADDRESS);
                if (allowance < amtInWei) {
                    const txApp = await tokenInContract.approve(EXECUTOR_ADDRESS, MaxUint256);
                    await txApp.wait();
                }

                const tx = await executor.createSpotOrder(
                    params.tokenIn,
                    params.tokenOut,
                    amtInWei,
                    amtOutWei,
                    priceWei,
                    params.ttlSeconds,
                    params.ordertype === 0
                );

                await tx.wait();
                await fetchLastOrderPriceForPair({ tokenIn: params.tokenIn, tokenOut: params.tokenOut });
                return tx.hash;

            } catch (err: any) {
                console.error(err);
                setError(err.reason || "Transaction failed");
                throw new Error(err.reason || "Failed");
            } finally {
                setLoading(false);
            }
        },
        [signer, account]
    );

    const cancelOrder = useCallback(async ({ orderId }: { orderId: number }) => {
        if (!signer) throw new Error("No signer");
        setLoading(true);
        try {
            const executor = new ethers.Contract(EXECUTOR_ADDRESS, ExecutorABI, signer);
            const tx = await executor.cancelSpotOrder(orderId);
            await tx.wait();
            return tx.hash;
        } catch (err: any) {
            throw new Error(err.reason || "Cancel failed");
        } finally {
            setLoading(false);
        }
    }, [signer]);

    return { createOrder, cancelOrder, fetchLastOrderPriceForPair, currentRate, loading, error };
};