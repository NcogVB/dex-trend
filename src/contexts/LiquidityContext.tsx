// src/context/LiquidityContext.tsx
import React, { createContext, useContext, useCallback, useState } from "react";
import { ethers } from "ethers";
import { MaxUint256 } from "ethers";
import { Token } from "@uniswap/sdk-core";
import { Pool, Position, nearestUsableTick } from "@uniswap/v3-sdk";
import {
    ERC20_ABI,
    POSITION_MANAGER_MINIMAL_ABI,
    UNISWAP_V3_POOL_ABI,
} from "./ABI";
import { useWallet } from "./WalletContext";

interface LiquidityContextValue {
    addLiquidity: (opts: {
        amountA: string;
        amountB: string;
    }) => Promise<{ txHash: string } | null>;
    loading: boolean;
    removeLiquidity: (tokenId: number, percentage: number) => Promise<void>;
}

const LiquidityContext = createContext<LiquidityContextValue | undefined>(
    undefined
);

export const LiquidityProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [loading, setLoading] = useState(false);
    const { account, provider, signer } = useWallet();

    // === Constants for WPOL/USDC.e 0.05% Pool on Polygon ===
    const POSITION_MANAGER_ADDRESS =
        "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"; // official NFT position manager
    const POOL_ADDRESS = "0x45dDa9cb7c25131DF268515131f647d726f50608"; // WPOL/USDC.e 0.05% Uniswap V3 pool on Polygon
    const WPOL_ADDRESS = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
    const USDCe_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"; 
    console.log("WalletContext:", { account, signer, provider });
    console.log("Liquidity signer:", signer);

    const addLiquidity = useCallback(
        async (opts: { amountA: string; amountB: string }) => {
            const { amountA, amountB } = opts;
            setLoading(true);

            try {
                if (!(window as any).ethereum)
                    throw new Error("Wallet not connected (window.ethereum missing)");
                if (!signer || !account) {
                    throw new Error("Wallet not connected - signer or account missing");
                }
                const poolContract = new ethers.Contract(
                    POOL_ADDRESS,
                    UNISWAP_V3_POOL_ABI,
                    provider
                );

                // 1) Read pool state
                const [tickSpacingBN, feeBN, liquidityBN, slot0] = await Promise.all([
                    poolContract.tickSpacing(),
                    poolContract.fee(),
                    poolContract.liquidity(),
                    poolContract.slot0(),
                ]);

                const poolData = {
                    tickSpacing: Number(tickSpacingBN),
                    fee: Number(feeBN),
                    liquidity: liquidityBN.toString(),
                    sqrtPriceX96: slot0[0].toString(),
                    tick: Number(slot0[1]),
                };

                console.log("Pool data:", poolData);

                // 2) Fetch token decimals from ERC20
                const tokenAContract = new ethers.Contract(
                    WPOL_ADDRESS,
                    ERC20_ABI,
                    signer
                );
                const tokenBContract = new ethers.Contract(
                    USDCe_ADDRESS,
                    ERC20_ABI,
                    signer
                );


                const chainId = 137; // Polygon mainnet
                const [decimalsA, decimalsB] = await Promise.all([
                    tokenAContract.decimals(),
                    tokenBContract.decimals(),
                ]);

                const tokenObjA = new Token(chainId, WPOL_ADDRESS, Number(decimalsA), "WPOL", "Wrapped POL");
                const tokenObjB = new Token(chainId, USDCe_ADDRESS, Number(decimalsB), "USDC.e", "USD Coin (bridged)");


                // 3) Order tokens correctly
                const [addr0] = [WPOL_ADDRESS, USDCe_ADDRESS].sort((a, b) =>
                    a.toLowerCase() < b.toLowerCase() ? -1 : 1
                );
                const token0 =
                    addr0.toLowerCase() === WPOL_ADDRESS.toLowerCase()
                        ? tokenObjA
                        : tokenObjB;
                const token1 =
                    addr0.toLowerCase() === WPOL_ADDRESS.toLowerCase()
                        ? tokenObjB
                        : tokenObjA;

                // 4) Build pool object
                const pool = new Pool(
                    token0,
                    token1,
                    poolData.fee,
                    poolData.sqrtPriceX96,
                    poolData.liquidity,
                    poolData.tick
                );

                // 5) Convert input amounts to raw units
                const amountARaw = ethers.parseUnits(amountA, decimalsA);
                const amountBRaw = ethers.parseUnits(amountB, decimalsB);

                const amounts =
                    addr0.toLowerCase() === WPOL_ADDRESS.toLowerCase()
                        ? { amount0: amountARaw.toString(), amount1: amountBRaw.toString() }
                        : { amount0: amountBRaw.toString(), amount1: amountARaw.toString() };

                // 6) Compute ticks
                const spacing = poolData.tickSpacing;
                const currentTick = poolData.tick;
                const baseTick = nearestUsableTick(currentTick, spacing);
                const tickLower = baseTick - spacing * 200;
                const tickUpper = baseTick + spacing * 200;


                // 7) Build Position
                const position = Position.fromAmounts({
                    pool,
                    tickLower,
                    tickUpper,
                    amount0: amounts.amount0,
                    amount1: amounts.amount1,
                    useFullPrecision: true,
                });

                const amount0Desired = position.mintAmounts.amount0;
                const amount1Desired = position.mintAmounts.amount1;

                // Map amounts back to WPOL/USDC.e order
                const amountADesiredForCall =
                    addr0.toLowerCase() === WPOL_ADDRESS.toLowerCase()
                        ? BigInt(amount0Desired.toString())
                        : BigInt(amount1Desired.toString());
                const amountBDesiredForCall =
                    addr0.toLowerCase() === WPOL_ADDRESS.toLowerCase()
                        ? BigInt(amount1Desired.toString())
                        : BigInt(amount0Desired.toString());

                console.log("Desired amounts:", {
                    amountADesiredForCall: amountADesiredForCall.toString(),
                    amountBDesiredForCall: amountBDesiredForCall.toString(),
                });

                // 8) Check allowances & approve
                const [allowanceA, allowanceB] = await Promise.all([
                    tokenAContract.allowance(account, POSITION_MANAGER_ADDRESS),
                    tokenBContract.allowance(account, POSITION_MANAGER_ADDRESS),
                ]);

                if (BigInt(allowanceA.toString()) < amountADesiredForCall) {
                    const tx = await tokenAContract.approve(POSITION_MANAGER_ADDRESS, MaxUint256);
                    await tx.wait();
                }
                if (BigInt(allowanceB.toString()) < amountBDesiredForCall) {
                    const tx = await tokenBContract.approve(POSITION_MANAGER_ADDRESS, MaxUint256);
                    await tx.wait();
                }

                // 9) Mint params
                const mintParams = {
                    token0: token0.address,
                    token1: token1.address,
                    fee: poolData.fee,
                    tickLower,
                    tickUpper,
                    amount0Desired: amount0Desired.toString(),
                    amount1Desired: amount1Desired.toString(),
                    amount0Min: "0",
                    amount1Min: "0",
                    recipient: account,
                    deadline: Math.floor(Date.now() / 1000) + 600,
                };
                console.log("Final amounts that will be used:", {
                    token0: ethers.formatUnits(amount0Desired.toString(), decimalsA),
                    token1: ethers.formatUnits(amount1Desired.toString(), decimalsB),
                });

                const positionManager = new ethers.Contract(
                    POSITION_MANAGER_ADDRESS,
                    POSITION_MANAGER_MINIMAL_ABI,
                    signer
                );

                console.log("Minting with params:", mintParams);

                const tx = await positionManager.mint(mintParams, {
                    gasLimit: 1_500_000,
                });
                const receipt = await tx.wait();

                if (receipt.status !== 1) {
                    throw new Error(`Mint failed: ${receipt.transactionHash}`);
                }

                console.log("Mint success:", receipt.transactionHash);
                return { txHash: receipt.transactionHash };
            } finally {
                setLoading(false);
            }
        },
        [signer, account, provider]
    );

    const removeLiquidity = async (tokenId: number, percentage: number) => {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const user = await signer.getAddress();

        const positionManager = new ethers.Contract(
            POSITION_MANAGER_ADDRESS,
            POSITION_MANAGER_MINIMAL_ABI,
            signer
        );

        const pos = await positionManager.positions(tokenId);
        const liquidity = pos[7];
        const liquidityToRemove = (liquidity * BigInt(percentage)) / BigInt(100);

        const tx1 = await positionManager.decreaseLiquidity({
            tokenId,
            liquidity: liquidityToRemove,
            amount0Min: 0,
            amount1Min: 0,
            deadline: Math.floor(Date.now() / 1000) + 600,
        });
        await tx1.wait();

        const MAX_UINT128 = (2n ** 128n - 1n).toString();

        const tx2 = await positionManager.collect({
            tokenId,
            recipient: user,
            amount0Max: MAX_UINT128,
            amount1Max: MAX_UINT128,
        });
        await tx2.wait();

        console.log("Liquidity removed & tokens collected");
    };

    return (
        <LiquidityContext.Provider value={{ addLiquidity, loading, removeLiquidity }}>
            {children}
        </LiquidityContext.Provider>
    );
};

export const useLiquidity = () => {
    const ctx = useContext(LiquidityContext);
    if (!ctx)
        throw new Error("useLiquidity must be used within LiquidityProvider");
    return ctx;
};
