// src/context/SwapContext.tsx
import React, { createContext, useContext } from "react";
import { ethers } from "ethers";
import { useWallet } from "./WalletContext"; // Adjust the import path as needed
import { TOKENS } from "../utils/Constants";
import { ERC20_ABI } from "./ABI";
import SwapRouterABI from "../ABI/SwapRouter.json";

// Fee tiers for Uniswap V3

interface SwapQuote {
    amountOut: string;
    priceImpact: number;
    route: string[];
    fee: number;
}
interface PoolInfo {
    address: string;
    fee: number;
    liquidity: string;
    sqrtPriceX96: string;
    token0: string;
    token1: string;
}

interface SwapContextValue {
    getQuote: (params: {
        fromSymbol: keyof typeof TOKENS; // This will now be "WPOL" | "USDC"
        toSymbol: keyof typeof TOKENS;
        amountIn: string;
    }) => Promise<SwapQuote>;
    swapExactInputSingle: (params: {
        fromSymbol: keyof typeof TOKENS;
        toSymbol: keyof typeof TOKENS;
        amountIn: string;
        slippageTolerance: number;
    }) => Promise<any>;
    getTokenBalance: (tokenSymbol: keyof typeof TOKENS) => Promise<string>;
}

const SwapContext = createContext<SwapContextValue | undefined>(undefined);

export const SwapProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const { account, provider, signer } = useWallet();
    const SWAP_ROUTER_ADDRESS = "0x459A438Fbe3Cb71f2F8e251F181576d5a035Faef";
    const FACTORY_ADDRESS = "0x83DEFEcaF6079504E2DD1DE2c66DCf3046F7bDD7";
    const FACTORY_ABI = [
        "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
    ];
    const POOL_ABI = [
        "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
        "function token0() external view returns (address)",
        "function token1() external view returns (address)",
        "function fee() external view returns (uint24)",
        "function liquidity() external view returns (uint128)",
    ];
    const getPoolInfo = async (
        tokenA: string,
        tokenB: string,
        fee: number
    ): Promise<PoolInfo | null> => {
        if (!provider) throw new Error("Provider not connected");

        try {
            const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
            const poolAddress = await factory.getPool(tokenA, tokenB, fee);

            if (poolAddress === ethers.ZeroAddress) {
                return null;
            }
            console.log(`Found pool at ${poolAddress} for fee ${fee}`);
            const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);
            const [slot0Data, liquidity, token0, token1] = await Promise.all([
                poolContract.slot0(),
                poolContract.liquidity(),
                poolContract.token0(),
                poolContract.token1(),
            ]);

            return {
                address: poolAddress,
                fee,
                liquidity: liquidity.toString(),
                sqrtPriceX96: slot0Data.sqrtPriceX96.toString(),
                token0,
                token1,
            };
        } catch (error) {
            console.error(`Error getting pool info for fee ${fee}:`, error);
            return null;
        }
    };

    const getAllPoolsForPair = async (
        tokenA: string,
        tokenB: string
    ): Promise<PoolInfo[]> => {
        const pools: PoolInfo[] = [];
        const poolInfo = await getPoolInfo(tokenA, tokenB, 500);
        if (poolInfo && BigInt(poolInfo.liquidity) > 0n) {
            pools.push(poolInfo);
        }
        return pools.sort(
            (a, b) => Number(BigInt(b.liquidity) - BigInt(a.liquidity))
        );
    };

    const getQuote = async ({
        fromSymbol,
        toSymbol,
        amountIn,
    }: {
        fromSymbol: keyof typeof TOKENS;
        toSymbol: keyof typeof TOKENS;
        amountIn: string;
    }): Promise<SwapQuote> => {
        if (!provider) throw new Error("Provider not connected");

        const tokenInInfo = TOKENS[fromSymbol];
        const tokenOutInfo = TOKENS[toSymbol];
        if (!tokenInInfo || !tokenOutInfo) throw new Error("Token not configured");

        const pools = await getAllPoolsForPair(tokenInInfo.address, tokenOutInfo.address);
        if (pools.length === 0) throw new Error("No liquidity pools found");

        const bestPool = pools[0];
        const sqrtPriceX96 = BigInt(bestPool.sqrtPriceX96);

        // ✅ Convert sqrtPriceX96 to price with decimals adjustment
        const numerator = sqrtPriceX96 * sqrtPriceX96; // Q128.192
        const denominator = 1n << 192n;

        const rawPrice = Number(numerator) / Number(denominator);
        const price =
            bestPool.token0.toLowerCase() === tokenInInfo.address.toLowerCase()
                ? rawPrice * 10 ** (tokenInInfo.decimals - tokenOutInfo.decimals)
                : (1 / rawPrice) * 10 ** (tokenInInfo.decimals - tokenOutInfo.decimals);

        // Calculate output amount
        const inputAmount = parseFloat(amountIn);
        const outputAmount = inputAmount * price;

        return {
            amountOut: outputAmount.toString(),
            priceImpact: 0.0, // you can later compute real impact from pool reserves
            route: [fromSymbol, toSymbol],
            fee: bestPool.fee,
        };
    };


    const swapExactInputSingle = async ({
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
        if (!signer || !account) throw new Error("Wallet not connected");

        const tokenInInfo = TOKENS[fromSymbol];
        const tokenOutInfo = TOKENS[toSymbol];
        if (!tokenInInfo || !tokenOutInfo) throw new Error("Token not configured");

        const tokenInContract = new ethers.Contract(
            tokenInInfo.address,
            ERC20_ABI,
            signer
        );
        const router = new ethers.Contract(
            SWAP_ROUTER_ADDRESS,
            SwapRouterABI.abi,
            signer
        );

        const amtInWei = ethers.parseUnits(amountIn, tokenInInfo.decimals);
        const currentAllowance = await tokenInContract.allowance(
            account,
            SWAP_ROUTER_ADDRESS
        );

        if (currentAllowance < amtInWei) {
            console.log("Approving token spend...");
            const approveTx = await tokenInContract.approve(
                SWAP_ROUTER_ADDRESS,
                amtInWei
            );
            const receipt = await approveTx.wait();
            if (!receipt || receipt.status !== 1) {
                throw new Error("Token approval failed");
            }
            console.log("Token approval successful");
        }

        const quote = await getQuote({ fromSymbol, toSymbol, amountIn });
        const amountOutWei = ethers.parseUnits(
            quote.amountOut,
            tokenOutInfo.decimals
        );

        const minOutWei = (amountOutWei * BigInt(100 - slippageTolerance)) / BigInt(100);
        const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

        const params = {
            tokenIn: tokenInInfo.address,
            tokenOut: tokenOutInfo.address,
            fee: quote.fee,
            recipient: account,
            deadline,
            amountIn: amtInWei,
            amountOutMinimum: minOutWei,
            sqrtPriceLimitX96: 0n,
        };

        console.log("Executing swap...");
        const tx = await router.exactInputSingle(params, { gasLimit: 300000 });
        const receipt = await tx.wait();
        console.log("Swap successful:", receipt);
        return receipt;
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
                swapExactInputSingle,
                getTokenBalance,
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