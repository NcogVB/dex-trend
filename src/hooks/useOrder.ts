import { useState, useCallback } from "react";
import { ethers, MaxUint256 } from "ethers";
import { useWallet } from "../contexts/WalletContext"; 
import ExecutorABI from "../ABI/ABI.json"; 

// --- Helper to extract clean error messages ---
const parseContractError = (error: any): string => {
    if (error?.reason) return error.reason;
    if (error?.shortMessage) return error.shortMessage;
    if (error?.data?.message) return error.data.message;
    if (error?.info?.error?.data?.message) return error.info.error.data.message;
    if (error?.message) {
        if (error.message.includes("user rejected")) return "Transaction cancelled by user.";
        const match = error.message.match(/execution reverted: (.*?)(?:"|$)/);
        if (match && match[1]) return match[1];
        return error.message;
    }
    return "An unknown error occurred.";
};

// --- Helper to clean amounts based on decimals ---
const cleanAmount = (amount: string, decimals: number) => {
    // If it's USDT (6 decimals) or similar, we want to be safe and floor it
    // But for simplicity in UI, we often trust parseUnits, 
    // however, to match contract logic, we can verify precision here.
    return ethers.parseUnits(amount, decimals);
};

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

const EXECUTOR_ADDRESS = "0x761e49A8f7e4e5E59a66F8fc7A89D05592B9adf0"; 

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

                // --- 1. Fetch Internal User Data Correctly ---
                // We need `userReserves[user][token].collateral` specifically. 
                // getUserAccountData returns (..., tokenCollateralBalance, ...) where 
                // tokenCollateralBalance = collateral + lockedCollateral.
                // We need to fetch the raw struct or calculate carefully.
                // Assuming getUserAccountData returns the sum, let's look at how your contract is set up.
                // In your NEW contract: `getUserAccountData` returns `tokenCollateralBalance` = `u.collateral + u.lockedCollateral`.
                
                // ISSUE: We only want to know `u.collateral` (Available to use), NOT `lockedCollateral`.
                // FIX: We will fetch the raw `userReserves` struct if possible, or assume `getUserAccountData` is tricky.
                // Let's use `userReserves` directly if the ABI supports it, otherwise we might over-estimate available balance.
                
                let internalFreeCollateral = 0n;
                try {
                    // Try accessing the mapping directly (most reliable)
                    const userReserve = await executor.userReserves(account, params.tokenIn);
                    // Struct: collateral, debt, lockedCollateral
                    internalFreeCollateral = userReserve[0]; // collateral is index 0
                } catch (e) {
                    console.warn("Could not fetch userReserves mapping directly, falling back to getUserAccountData");
                    const userData = await executor.getUserAccountData(account, params.tokenIn);
                    // Fallback (might be inaccurate if you have active orders):
                    internalFreeCollateral = userData.tokenCollateralBalance; 
                }

                console.log(`💰 Wallet: ${ethers.formatUnits(walletBalance, decimalsIn)}`);
                console.log(`🏦 Internal Free: ${ethers.formatUnits(internalFreeCollateral, decimalsIn)}`);

                // --- 2. Calculate Amounts ---
                let totalTradeSizeBig = cleanAmount(params.amountIn, decimalsIn);
                const amountOutMinBig = cleanAmount(params.amountOutMin, decimalsOut);
                const targetPrice1e18 = toPrice1e18(params.targetPrice);

                // --- 3. Determine if Leverage or Spot ---
                // We prioritize using Internal Balance first, then Wallet.
                const totalYourAssets = walletBalance + internalFreeCollateral;
                const isLeverage = totalTradeSizeBig > totalYourAssets;

                let tx;

                if (isLeverage) {
                    console.log("🚀 Leverage Mode");
                    
                    // You contribute ALL your assets (Internal + Wallet) as collateral
                    // NOTE: If you don't want to use 100% of wallet, you'd need logic to cap this.
                    // For now, assume User wants to use max available assets for this trade.
                    let collateralAmount = totalYourAssets; 
                    
                    // If trade size is huge, borrow is the difference
                    let borrowAmount = totalTradeSizeBig - collateralAmount;

                    // Safety Check: Borrow Amount must be positive
                    if (borrowAmount <= 0n) {
                         // Should not happen due to isLeverage check, but safety first
                         borrowAmount = 0n;
                         collateralAmount = totalTradeSizeBig;
                    }

                    // Approval Logic for the Wallet portion
                    // We only need to approve what we take from Wallet
                    const amountFromWallet = (walletBalance > 0n) ? walletBalance : 0n;
                    
                    if (amountFromWallet > 0n) {
                        const allowance = await tokenInContract.allowance(account, EXECUTOR_ADDRESS);
                        if (allowance < amountFromWallet) {
                            console.log("Approving tokens...");
                            const txApprove = await tokenInContract.approve(EXECUTOR_ADDRESS, MaxUint256);
                            await txApprove.wait();
                        }
                    }

                    const insuranceTypeToSend = params.insuranceType || 0; // Default to NONE (0)
                    const coveragePctToSend = params.coveragePct || 0;

                    // Passing: tokenIn, amountIn (YOUR contribution), borrowAmount (LOAN), ...
                    // IMPORTANT: Your `executeStrategy` expects `amountIn` to be the amount YOU transfer/supply.
                    // It expects `borrowAmount` to be the leverage.
                    // The contract does: totalCapital = amountIn + borrowAmount.
                    
                    // Note: Your contract `executeStrategy` does `transferFrom` for `amountIn`.
                    // It assumes `amountIn` comes entirely from Wallet? 
                    // WAIT. If you have Internal Balance, `executeStrategy` as written in your contract 
                    // MIGHT NOT support using Internal Balance directly for the collateral portion.
                    // Let's check contract: 
                    // `IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);`
                    // YES. `executeStrategy` ALWAYS tries to pull `amountIn` from Wallet.
                    
                    // **CRITICAL FIX**: If you have Internal Balance, you cannot use `executeStrategy` perfectly 
                    // unless you withdraw it first OR we update the contract to support internal usage in strategy.
                    
                    // WORKAROUND FOR NOW: 
                    // If user has Internal Balance, we must use `createOrder` (Spot) or 
                    // the user must Withdraw Internal Balance to Wallet first before doing Leverage.
                    // OR: We assume for Leverage, you are sending new funds from Wallet.
                    
                    // Let's assume for Leverage you are sending `amountIn` from Wallet.
                    // We will set `amountIn` = amountFromWallet.
                    // We will set `borrowAmount` = totalTradeSize - amountFromWallet.
                    // (Ignoring Internal Balance for Leverage to prevent "Transfer amount exceeds balance" error)
                    
                    const amountToPullFromWallet = totalTradeSizeBig > walletBalance ? walletBalance : totalTradeSizeBig;
                    const amountToBorrow = totalTradeSizeBig - amountToPullFromWallet;

                    console.log(`Strategy Params: In=${amountToPullFromWallet}, Borrow=${amountToBorrow}`);

                    tx = await executor.executeStrategy(
                        params.tokenIn,
                        amountToPullFromWallet,    
                        amountToBorrow,        
                        params.tokenOut,
                        targetPrice1e18,
                        insuranceTypeToSend,
                        coveragePctToSend,
                        { gasLimit: 2000000 } 
                    );

                } else {
                    console.log("✅ Spot Mode");

                    // For Spot, we CAN use Internal Balance (handled in `createOrder` contract logic)
                    // Logic:
                    // If Internal >= TradeSize -> Use Internal (0 from Wallet)
                    // If Internal < TradeSize -> Use Internal + (TradeSize - Internal) from Wallet

                    let amountFromWallet = 0n;
                    if (totalTradeSizeBig > internalFreeCollateral) {
                        amountFromWallet = totalTradeSizeBig - internalFreeCollateral;
                    }
                    
                    if (amountFromWallet > 0n) {
                        const allowance = await tokenInContract.allowance(account, EXECUTOR_ADDRESS);
                        if (allowance < amountFromWallet) {
                            console.log("Approving tokens...");
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
                const cleanMessage = parseContractError(err);
                setError(cleanMessage); 
                throw new Error(cleanMessage); 
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
                const cleanMessage = parseContractError(err);
                setError(cleanMessage);
                throw new Error(cleanMessage);
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