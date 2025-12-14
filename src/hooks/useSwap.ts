import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../contexts/WalletContext"; // Adjust path
import { ERC20_ABI } from "../contexts/ABI"; // Adjust path to where your ABI export is
import SwapRouterABI from "../ABI/SwapRouter.json"; // Adjust path
import { TOKENS } from "../utils/SwapTokens"; // Adjust path

// Types
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

export const useSwap = () => {
    const { account, provider, signer } = useWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    // ------------------ Helpers -------------------
    const findToken = useCallback((symbol: string) => {
        const token = TOKENS.find((t) => t.symbol === symbol);
        if (!token) throw new Error(`Token ${symbol} not found`);
        return token;
    }, []);

    const getPoolInfo = useCallback(async (
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

            // console.log(`Found pool at ${poolAddress} for fee ${fee}`);
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
    }, [provider]);

    const getAllPoolsForPair = useCallback(async (
        tokenA: string,
        tokenB: string
    ): Promise<PoolInfo[]> => {
        const pools: PoolInfo[] = [];
        // Currently only checking fee tier 500 (0.05%). Add 3000 or 10000 if needed.
        const poolInfo = await getPoolInfo(tokenA, tokenB, 500);
        if (poolInfo && BigInt(poolInfo.liquidity) > 0n) {
            pools.push(poolInfo);
        }
        return pools.sort(
            (a, b) => Number(BigInt(b.liquidity) - BigInt(a.liquidity))
        );
    }, [getPoolInfo]);

    // ------------------ Quote -------------------
    const getQuote = useCallback(async ({
        fromSymbol,
        toSymbol,
        amountIn,
    }: {
        fromSymbol: string;
        toSymbol: string;
        amountIn: string;
    }): Promise<SwapQuote> => {
        if (!provider) throw new Error("Provider not connected");

        const tokenInInfo = findToken(fromSymbol);
        const tokenOutInfo = findToken(toSymbol);

        const pools = await getAllPoolsForPair(tokenInInfo.address, tokenOutInfo.address);
        if (pools.length === 0) throw new Error("No liquidity pools found");

        const bestPool = pools[0];
        const sqrtPriceX96 = BigInt(bestPool.sqrtPriceX96);

        // Convert sqrtPriceX96 to price
        const numerator = sqrtPriceX96 * sqrtPriceX96;
        const denominator = 1n << 192n;
        const rawPrice = Number(numerator) / Number(denominator);

        const price =
            bestPool.token0.toLowerCase() === tokenInInfo.address.toLowerCase()
                ? rawPrice * 10 ** ((18) - (18)) // assuming 18 decimals for both, adjust if needed
                : (1 / rawPrice) * 10 ** ((18) - (18));

        const inputAmount = parseFloat(amountIn);
        const outputAmount = inputAmount * price;

        return {
            amountOut: outputAmount.toString(),
            priceImpact: 0.0, // placeholder
            route: [fromSymbol, toSymbol],
            fee: bestPool.fee,
        };
    }, [provider, findToken, getAllPoolsForPair]);

    // ------------------ Swap -------------------
    const swapExactInputSingle = useCallback(async ({
        fromSymbol,
        toSymbol,
        amountIn,
        slippageTolerance,
    }: {
        fromSymbol: string;
        toSymbol: string;
        amountIn: string;
        slippageTolerance: number;
    }) => {
        if (!signer || !account) throw new Error("Wallet not connected");

        setLoading(true);
        setError(null);

        try {
            const tokenInInfo = findToken(fromSymbol);
            const tokenOutInfo = findToken(toSymbol);

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

            const amtInWei = ethers.parseUnits(amountIn, 18);
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
            const amountOutWei = ethers.parseUnits(quote.amountOut, 18);

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

        } catch (err: any) {
            console.error("Swap Error:", err);
            setError(err.message || "Swap failed");
            throw err;
        } finally {
            setLoading(false);
        }
    }, [signer, account, findToken, getQuote]);

    // ------------------ Balance -------------------
    const getTokenBalance = useCallback(async (tokenSymbol: string): Promise<string> => {
        if (!provider || !account) {
            // throw new Error("Wallet not connected"); // Optional: return '0' instead of throwing
            return "0";
        }

        try {
            const token = findToken(tokenSymbol);
            const tokenContract = new ethers.Contract(token.address, ERC20_ABI, provider);
            const balance = await tokenContract.balanceOf(account);
            const decimals = 18;
            return ethers.formatUnits(balance, decimals);
        } catch (error) {
            console.error(`Error getting balance for ${tokenSymbol}:`, error);
            return "0";
        }
    }, [provider, account, findToken]);

    return {
        getQuote,
        swapExactInputSingle,
        getTokenBalance,
        loading,
        error
    };
};