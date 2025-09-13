// src/context/LiquidityContext.tsx
import React, { createContext, useContext, useCallback, useState } from "react";
import { ethers } from "ethers";
import { MaxUint256 } from "ethers";
import { Token } from "@uniswap/sdk-core";
import { Pool, Position, nearestUsableTick } from "@uniswap/v3-sdk";
import { ERC20_ABI, POSITION_MANAGER_MINIMAL_ABI, UNISWAP_V3_POOL_ABI } from "./ABI";

interface LiquidityContextValue {
    addLiquidity: (opts: {
        poolAddress: string;
        tokenA: string;
        tokenB: string;
        amountA: string; // human string like "100"
        amountB: string; // human string like "100"
        fee?: number; // optional, will be validated with pool
    }) => Promise<{ txHash: string } | null>;
    loading: boolean;
    removeLiquidity: (tokenId: number, percentage: number) => Promise<void>;
}

const LiquidityContext = createContext<LiquidityContextValue | undefined>(undefined);

export const LiquidityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [loading, setLoading] = useState(false);

    /**
     * addLiquidity
     * - poolAddress: UniswapV3 pool address (e.g. USDT-USDC 0.05% pool)
     * - tokenA / tokenB: token addresses (any order)
     * - amountA / amountB: human amounts (strings), decimals will be fetched
     *
     * returns { txHash } on success, null on failure (errors are thrown)
     */
    const addLiquidity = useCallback(async (opts: {
        poolAddress: string;
        tokenA: string;
        tokenB: string;
        amountA: string;
        amountB: string;
        fee?: number;
    }) => {
        const { poolAddress, tokenA, tokenB, amountA, amountB } = opts;
        setLoading(true);

        try {
            if (!(window as any).ethereum) throw new Error("Wallet not connected (window.ethereum missing)");

            // Provider & signer
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();
            const signerAddress = await signer.getAddress();

            // Contracts: pool, tokens, position manager address from env
            const POSITION_MANAGER_ADDRESS = "0x442d8CCae9d8dd3bc4B21494C0eD1ccF4d24F505";
            if (!POSITION_MANAGER_ADDRESS) throw new Error("POSITION_MANAGER_ADDRESS not set in env (REACT_APP_POSITION_MANAGER_ADDRESS)");

            const poolContract = new ethers.Contract(poolAddress, UNISWAP_V3_POOL_ABI, provider);

            // 1) Read pool data (tickSpacing, fee, liquidity, slot0)
            const [tickSpacingBN, feeBN, liquidityBN, slot0] = await Promise.all([
                poolContract.tickSpacing(),
                poolContract.fee(),
                poolContract.liquidity(),
                poolContract.slot0()
            ]);

            const poolData = {
                tickSpacing: Number(tickSpacingBN),
                fee: Number(feeBN),
                liquidity: liquidityBN.toString(),
                sqrtPriceX96: slot0[0].toString(),
                tick: Number(slot0[1]),
            };

            console.log("poolData", poolData);

            // 2) Resolve token decimals and build ERC20 contracts with signer (for allowance/approve)
            const tokenAContract = new ethers.Contract(tokenA, ERC20_ABI, signer);
            const tokenBContract = new ethers.Contract(tokenB, ERC20_ABI, signer);


            const chainId = 11155111;

            const tokenObjA = new Token(chainId, tokenA, 18, "usdc", "usdc");
            const tokenObjB = new Token(chainId, tokenB, 18, "usdt", "usdt");

            // 4) Determine token0/token1 order required by Uniswap V3
            const [addr0] = [tokenA, tokenB].sort((a, b) =>
                a.toLowerCase() < b.toLowerCase() ? -1 : 1
            );

            const token0 = addr0.toLowerCase() === tokenA.toLowerCase() ? tokenObjA : tokenObjB;
            const token1 = addr0.toLowerCase() === tokenA.toLowerCase() ? tokenObjB : tokenObjA;

            // 5) Build Pool (sdk expects sqrtPriceX96 as a string or bigint)
            const pool = new Pool(
                token0,
                token1,
                poolData.fee,
                poolData.sqrtPriceX96,
                poolData.liquidity,
                poolData.tick
            );

            // 6) Parse desired amounts (human -> base units)
            const amount0Raw = ethers.parseUnits(amountA, 18); // BigInt
            const amount1Raw = ethers.parseUnits(amountB, 18); // BigInt

            // If token order swapped, we must assign amounts accordingly for Position.fromAmounts
            const amounts = addr0.toLowerCase() === tokenA.toLowerCase()
                ? { amount0: amount0Raw.toString(), amount1: amount1Raw.toString() }
                : { amount0: amount1Raw.toString(), amount1: amount0Raw.toString() };

            // 7) Compute ticks aligned to tickSpacing
            const spacing = poolData.tickSpacing;
            const currentTick = poolData.tick;
            const baseTick = nearestUsableTick(currentTick, spacing);
            const tickLower = baseTick - spacing * 2;
            const tickUpper = baseTick + spacing * 2;

            // 8) Build Position using SDK to compute mint amounts precisely
            const position = Position.fromAmounts({
                pool,
                tickLower,
                tickUpper,
                amount0: amounts.amount0,
                amount1: amounts.amount1,
                useFullPrecision: true,
            });

            const amount0Desired = position.mintAmounts.amount0; // BigInt-like string
            const amount1Desired = position.mintAmounts.amount1;

            // 9) Figure out which desired amount corresponds to tokenA/tokenB
            let amountADesiredForCall: bigint;
            let amountBDesiredForCall: bigint;
            if (addr0.toLowerCase() === tokenA.toLowerCase()) {
                amountADesiredForCall = BigInt(amount0Desired.toString());
                amountBDesiredForCall = BigInt(amount1Desired.toString());
            } else {
                amountADesiredForCall = BigInt(amount1Desired.toString());
                amountBDesiredForCall = BigInt(amount0Desired.toString());
            }

            console.log("Desired amounts (A, B):", amountADesiredForCall.toString(), amountBDesiredForCall.toString());
            console.log("Tick range:", tickLower, tickUpper);

            // 10) Check balances and allowances
            const [balanceA, balanceB, allowanceA, allowanceB] = await Promise.all([
                tokenAContract.balanceOf(signerAddress),
                tokenBContract.balanceOf(signerAddress),
                tokenAContract.allowance(signerAddress, POSITION_MANAGER_ADDRESS),
                tokenBContract.allowance(signerAddress, POSITION_MANAGER_ADDRESS),
            ]);

            // warn if not enough balance
            if (BigInt(balanceA.toString()) < amountADesiredForCall || BigInt(balanceB.toString()) < amountBDesiredForCall) {
                console.warn("Signer may not have enough balance for desired mint amounts. Balances:", balanceA.toString(), balanceB.toString());
                // We continue — the call simulation will catch reverts, but it's helpful to warn
            }

            // approve if necessary
            if (BigInt(allowanceA.toString()) < amountADesiredForCall) {
                const tx = await tokenAContract.approve(POSITION_MANAGER_ADDRESS, MaxUint256);
                console.log("Approving token A...", tx.hash);
                await tx.wait();
            } else {
                console.log("Allowance for tokenA already sufficient");
            }
            if (BigInt(allowanceB.toString()) < amountBDesiredForCall) {
                const tx = await tokenBContract.approve(POSITION_MANAGER_ADDRESS, MaxUint256);
                console.log("Approving token B...", tx.hash);
                await tx.wait();
            } else {
                console.log("Allowance for tokenB already sufficient");
            }

            // 11) Build mint params (match your addLiquidity.cjs structure)
            const mintParams = {
                token0: token0.address,
                token1: token1.address,
                fee: poolData.fee,
                tickLower,
                tickUpper,
                amount0Desired: token0.address.toLowerCase() === tokenA.toLowerCase() ? amountADesiredForCall.toString() : amountBDesiredForCall.toString(),
                amount1Desired: token1.address.toLowerCase() === tokenB.toLowerCase() ? amountBDesiredForCall.toString() : amountADesiredForCall.toString(),
                amount0Min: "0",
                amount1Min: "0",
                recipient: signerAddress,
                deadline: Math.floor(Date.now() / 1000) + 600,
            };

            console.log("Mint params prepared:", mintParams);

            // 12) PositionManager contract (use signer)
            const positionManager = new ethers.Contract(POSITION_MANAGER_ADDRESS, POSITION_MANAGER_MINIMAL_ABI, signer);

            // 13) Simulate via callStatic.mint to surface revert reasons
            try {
                // callStatic will throw with revert reason if simulation fails
                console.log("Simulating mint via callStatic...");
                // Note: ethers v6 supports positionManager.callStatic?.mint(...) or positionManager.callStatic.mint(...)
                // Using (positionManager as any).callStatic.mint to be safe in some bundlers.
                if (!(positionManager as any).callStatic || !(positionManager as any).callStatic.mint) {
                    // fallback: try call via provider.call
                    const calldata = positionManager.interface.encodeFunctionData("mint", [mintParams]);
                    await provider.call({ to: POSITION_MANAGER_ADDRESS, data: calldata, from: signerAddress });
                } else {
                    await (positionManager as any).callStatic.mint(mintParams);
                }
                console.log("Simulation passed.");
            } catch (simErr: any) {
                console.error("Simulation failed (callStatic):", simErr);
                // Surface helpful message
                throw new Error(`Simulation failed: ${simErr?.reason || simErr?.message || JSON.stringify(simErr)}`);
            }

            // 14) Actual mint tx
            console.log("Sending mint transaction...");
            const tx = await positionManager.mint(mintParams, {
                gasLimit: 1200000,
            });
            console.log("Sent mint tx:", tx.hash);
            const receipt = await tx.wait();
            if (receipt.status !== 1) {
                throw new Error(`Mint transaction failed: ${receipt.transactionHash}`);
            }

            console.log("Mint successful:", receipt.transactionHash);
            return { txHash: receipt.transactionHash };
        } catch (err: any) {
            console.error("addLiquidity error:", err);
            // Re-throw so UI can show message; caller may catch
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);
    const removeLiquidity = async (tokenId: number, percentage: number) => {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const user = await signer.getAddress();

        const positionManager = new ethers.Contract(
            "0x442d8CCae9d8dd3bc4B21494C0eD1ccF4d24F505",
            POSITION_MANAGER_MINIMAL_ABI,
            signer
        );

        // 1. Fetch position info
        const pos = await positionManager.positions(tokenId);
        const liquidity = pos[7]; // uint128 liquidity
        const liquidityToRemove = (liquidity * BigInt(percentage)) / BigInt(100);

        // 2. Decrease liquidity
        const tx1 = await positionManager.decreaseLiquidity({
            tokenId,
            liquidity: liquidityToRemove,
            amount0Min: 0,
            amount1Min: 0,
            deadline: Math.floor(Date.now() / 1000) + 600
        });
        await tx1.wait();
        const MAX_UINT128 = (2n ** 128n - 1n).toString();
        // 3. Collect tokens
        const tx2 = await positionManager.collect({
            tokenId,
            recipient: user,
            amount0Max: MAX_UINT128,
            amount1Max: MAX_UINT128
        });
        await tx2.wait();

        console.log("Liquidity removed and tokens collected");
    };


    return (
        <LiquidityContext.Provider value={{ addLiquidity, loading, removeLiquidity }}>
            {children}
        </LiquidityContext.Provider>
    );
};

export const useLiquidity = () => {
    const ctx = useContext(LiquidityContext);
    if (!ctx) throw new Error("useLiquidity must be used within LiquidityProvider");
    return ctx;
};
