// src/context/SwapContext.tsx
import React, { createContext, useContext, useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "./WalletContext"; // Adjust the import path as needed
import { FEE_TIERS, QUOTER_ADDRESS, SWAP_ROUTER_ADDRESS, TOKENS } from "../utils/Constants";
import { ERC20_ABI, QUOTER_ABI, SWAP_ROUTER_ABI } from "./ABI";

// Fee tiers for Uniswap V3

interface SwapQuote {
    amountOut: string;
    priceImpact: number;
    route: string[];
    gasEstimate: string;
    fee: number;
}

interface SwapContextValue {
    getQuote: (params: {
        fromSymbol: keyof typeof TOKENS; // This will now be "WPOL" | "USDC"
        toSymbol: keyof typeof TOKENS;
        amountIn: string;
    }) => Promise<SwapQuote>;
    executeSwap: (params: {
        fromSymbol: keyof typeof TOKENS;
        toSymbol: keyof typeof TOKENS;
        amountIn: string;
        slippageTolerance: number;
    }) => Promise<any>;
    getTokenBalance: (tokenSymbol: keyof typeof TOKENS) => Promise<string>;
    isLoading: boolean;
}

const SwapContext = createContext<SwapContextValue | undefined>(undefined);

export const SwapProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const { account, provider, signer } = useWallet();
    const [isLoading, setIsLoading] = useState(false);

    const getQuote = async ({
        fromSymbol,
        toSymbol,
        amountIn,
    }: {
        fromSymbol: keyof typeof TOKENS;
        toSymbol: keyof typeof TOKENS;
        amountIn: string;
    }): Promise<SwapQuote> => {
        if (!provider) {
            throw new Error("Provider not connected");
        }

        setIsLoading(true);

        try {
            const tokenIn = TOKENS[fromSymbol];
            const tokenOut = TOKENS[toSymbol];
            const amountInWei = ethers.parseUnits(amountIn, tokenIn.decimals);

            const quoter = new ethers.Contract(QUOTER_ADDRESS, QUOTER_ABI, provider);

            let bestQuote: any = null;
            let bestFee = 0;

            for (const fee of FEE_TIERS) {
                try {
                    // Encode path: tokenIn -> tokenOut with fee
                    const path = ethers.solidityPacked(
                        ["address", "uint24", "address"],
                        [tokenIn.address, fee, tokenOut.address]
                    );

                    const result = await quoter.quoteExactInput.staticCall(path, amountInWei);

                    const [amountOut] = result;
                    if (!bestQuote || amountOut > bestQuote.amountOut) {
                        bestQuote = result;
                        bestFee = fee;
                    }
                } catch (error) {
                    console.log(`No pool found for fee tier ${fee}`);
                }
            }

            if (!bestQuote) {
                throw new Error("No liquidity pool found for this pair");
            }

            const amountOut = ethers.formatUnits(bestQuote[0], tokenOut.decimals);

            // Simple price impact calculation
            const inputValue = parseFloat(amountIn);
            const outputValue = parseFloat(amountOut);
            const priceImpact = Math.abs((outputValue / inputValue - 1)) * 100;

            return {
                amountOut,
                priceImpact,
                route: [fromSymbol, toSymbol],
                gasEstimate: bestQuote[3]?.toString() || "200000",
                fee: bestFee,
            };
        } catch (error) {
            console.error("Quote error:", error);
            throw new Error("Failed to get quote");
        } finally {
            setIsLoading(false);
        }
    };


    const executeSwap = async ({
        fromSymbol,
        toSymbol,
        amountIn,
        slippageTolerance,
    }: {
        fromSymbol: keyof typeof TOKENS;
        toSymbol: keyof typeof TOKENS;
        amountIn: string;
        slippageTolerance: number;
    }) => {
        if (!signer || !account) {
            throw new Error("Wallet not connected");
        }

        setIsLoading(true);

        try {
            const tokenIn = TOKENS[fromSymbol];
            const tokenOut = TOKENS[toSymbol];
            const amountInWei = ethers.parseUnits(amountIn, tokenIn.decimals);

            // Get quote first to determine the best fee tier
            const quote = await getQuote({ fromSymbol, toSymbol, amountIn });
            const amountOutWei = ethers.parseUnits(quote.amountOut, tokenOut.decimals);

            const slippageMultiplier = (100 - slippageTolerance) / 100;
            const amountOutMin = BigInt(Math.floor(Number(amountOutWei) * slippageMultiplier));

            // Check and approve token if necessary
            const tokenContract = new ethers.Contract(tokenIn.address, ERC20_ABI, signer);
            const currentAllowance = await tokenContract.allowance(account, SWAP_ROUTER_ADDRESS);

            if (currentAllowance < amountInWei) {
                console.log("Approving token spend...");
                const approveTx = await tokenContract.approve(SWAP_ROUTER_ADDRESS, amountInWei);
                const approveReceipt = await approveTx.wait();

                if (!approveReceipt || approveReceipt.status !== 1) {
                    throw new Error("Token approval failed");
                }
                console.log("Token approval successful");
            }

            // Execute swap
            const swapRouter = new ethers.Contract(SWAP_ROUTER_ADDRESS, SWAP_ROUTER_ABI, signer);

            const params = {
                tokenIn: tokenIn.address,
                tokenOut: tokenOut.address,
                fee: quote.fee,
                recipient: account,
                amountIn: amountInWei,
                amountOutMinimum: amountOutMin,
                sqrtPriceLimitX96: 0n, // No price limit
            };

            console.log("Executing swap with params:", {
                ...params,
                amountIn: amountIn,
                amountOutMinimum: ethers.formatUnits(amountOutMin, tokenOut.decimals),
                slippageTolerance: `${slippageTolerance}%`
            });

            const swapTx = await swapRouter.exactInputSingle(params, {
                gasLimit: 300000, // Set appropriate gas limit
            });

            const receipt = await swapTx.wait();
            console.log("Swap successful:", receipt);
            return receipt;

        } catch (error) {
            console.error("Swap error:", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const getTokenBalance = async (tokenSymbol: keyof typeof TOKENS): Promise<string> => {
        if (!provider || !account) {
            throw new Error("Wallet not connected");
        }

        try {
            const token = TOKENS[tokenSymbol];
            const tokenContract = new ethers.Contract(token.address, ERC20_ABI, provider);
            const balance = await tokenContract.balanceOf(account);
            return ethers.formatUnits(balance, token.decimals);
        } catch (error) {
            console.error(`Error getting balance for ${tokenSymbol}:`, error);
            return "0";
        }
    };

    return (
        <SwapContext.Provider
            value={{
                getQuote,
                executeSwap,
                getTokenBalance,
                isLoading,
            }}
        >
            {children}
        </SwapContext.Provider>
    );
};

export const useSwap = () => {
    const context = useContext(SwapContext);
    if (!context) {
        throw new Error("useSwap must be used within a SwapProvider");
    }
    return context;
};