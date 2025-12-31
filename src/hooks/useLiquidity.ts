import { useState, useCallback } from "react";
import { ethers, MaxUint256 } from "ethers";
import { Token } from "@uniswap/sdk-core";
import { Pool, Position, nearestUsableTick } from "@uniswap/v3-sdk";
import { useWallet } from "../contexts/WalletContext";
import { ERC20_ABI, POSITION_MANAGER_MINIMAL_ABI, UNISWAP_V3_POOL_ABI } from "../contexts/ABI";

interface AddLiquidityOpts {
    tokenA: string;
    tokenB: string;
    amountA: string;
    amountB: string;
    fee?: number; // default 3000 (0.3%)
}

export const useLiquidity = () => {
    const [loading, setLoading] = useState(false);
    const { account, provider, signer } = useWallet();

    const POSITION_MANAGER_ADDRESS = "0xc2A219227E7927529D62d9922a5Ff80627dD754F";
    const FACTORY_ADDRESS = "0x339A0Da8ffC7a6fc98Bf2FC53a17dEEf36F0D9c3";
    const FACTORY_ABI = [
        "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"
    ];

    // ==========================================
    // 📌 ADD LIQUIDITY
    // ==========================================
    const addLiquidity = useCallback(
        async (opts: AddLiquidityOpts) => {
            const { tokenA, tokenB, amountA, amountB, fee = 500 } = opts;
            setLoading(true);

            try {
                if (!signer || !account || !provider) {
                    throw new Error("Wallet not connected");
                }

                // ✅ FIX: Sanitize Inputs immediately
                // This converts "0xabc..." -> "0xAbC..."
                // Prevents "network does not support ENS" error on custom chains
                const cleanTokenA = ethers.getAddress(tokenA);
                const cleanTokenB = ethers.getAddress(tokenB);
                const cleanAccount = ethers.getAddress(account);

                // --- 1. Get pool from factory ---
                const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);

                // Use CLEAN addresses for sorting
                const [t0, t1] = cleanTokenA.toLowerCase() < cleanTokenB.toLowerCase()
                    ? [cleanTokenA, cleanTokenB]
                    : [cleanTokenB, cleanTokenA];

                let poolAddress = await factory.getPool(t0, t1, fee);

                if (poolAddress === ethers.ZeroAddress) {
                    throw new Error(`Pool does not exist for ${t0} / ${t1} with fee ${fee}`);
                }

                // --- 2. Read pool state ---
                const poolContract = new ethers.Contract(poolAddress, UNISWAP_V3_POOL_ABI, provider);
                const [tickSpacingBN, feeBN, liquidityBN, slot0, token0Addr, token1Addr] = await Promise.all([
                    poolContract.tickSpacing(),
                    poolContract.fee(),
                    poolContract.liquidity(),
                    poolContract.slot0(),
                    poolContract.token0(),
                    poolContract.token1(),
                ]);

                const poolData = {
                    tickSpacing: Number(tickSpacingBN),
                    fee: Number(feeBN),
                    liquidity: liquidityBN.toString(),
                    sqrtPriceX96: slot0[0].toString(),
                    tick: Number(slot0[1]),
                };

                // --- 3. Fetch decimals (Use CLEAN tokens) ---
                const [decA, decB, symA, symB] = await Promise.all([
                    new ethers.Contract(cleanTokenA, ERC20_ABI, provider).decimals(),
                    new ethers.Contract(cleanTokenB, ERC20_ABI, provider).decimals(),
                    new ethers.Contract(cleanTokenA, ERC20_ABI, provider).symbol(),
                    new ethers.Contract(cleanTokenB, ERC20_ABI, provider).symbol(),
                ]);

                const chainId = 1476;
                // Use CLEAN tokens in SDK objects
                const tokenObjA = new Token(Number(chainId), cleanTokenA, Number(decA), symA, symA);
                const tokenObjB = new Token(Number(chainId), cleanTokenB, Number(decB), symB, symB);

                // --- 4. Token ordering ---
                const [addr0] = [token0Addr, token1Addr].sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1));

                // Compare logic using CLEAN addresses
                const isToken0A = addr0.toLowerCase() === cleanTokenA.toLowerCase();
                const token0 = isToken0A ? tokenObjA : tokenObjB;
                const token1 = isToken0A ? tokenObjB : tokenObjA;

                // --- 5. Build Pool ---
                const pool = new Pool(
                    token0,
                    token1,
                    poolData.fee,
                    poolData.sqrtPriceX96,
                    poolData.liquidity,
                    poolData.tick
                );

                // --- 6. Parse input amounts ---
                const amountARaw = ethers.parseUnits(amountA, decA);
                const amountBRaw = ethers.parseUnits(amountB, decB);

                const amounts = isToken0A
                    ? { amount0: amountARaw.toString(), amount1: amountBRaw.toString() }
                    : { amount0: amountBRaw.toString(), amount1: amountARaw.toString() };

                // --- 7. Choose tick range ---
                const spacing = poolData.tickSpacing;
                const currentTick = poolData.tick;
                const baseTick = nearestUsableTick(currentTick, spacing);
                const tickLower = baseTick - spacing * 2;
                const tickUpper = baseTick + spacing * 2;

                // --- 8. Build Position ---
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

                // --- 9. Approvals (Use CLEAN tokens and CLEAN account) ---
                const tokenAContract = new ethers.Contract(cleanTokenA, ERC20_ABI, signer);
                const tokenBContract = new ethers.Contract(cleanTokenB, ERC20_ABI, signer);

                const [allowanceA, allowanceB] = await Promise.all([
                    tokenAContract.allowance(cleanAccount, POSITION_MANAGER_ADDRESS),
                    tokenBContract.allowance(cleanAccount, POSITION_MANAGER_ADDRESS),
                ]);

                if (BigInt(allowanceA.toString()) < BigInt(amount0Desired.toString())) {
                    await (await tokenAContract.approve(POSITION_MANAGER_ADDRESS, MaxUint256)).wait();
                }
                if (BigInt(allowanceB.toString()) < BigInt(amount1Desired.toString())) {
                    await (await tokenBContract.approve(POSITION_MANAGER_ADDRESS, MaxUint256)).wait();
                }

                // --- 10. Mint params ---
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
                    recipient: cleanAccount, // Use CLEAN account
                    deadline: Math.floor(Date.now() / 1000) + 600,
                };

                const positionManager = new ethers.Contract(
                    POSITION_MANAGER_ADDRESS,
                    POSITION_MANAGER_MINIMAL_ABI,
                    signer
                );

                const tx = await positionManager.mint(mintParams, { gasLimit: 1_200_000 });
                const receipt = await tx.wait();

                if (receipt.status !== 1) {
                    throw new Error(`Mint failed: ${receipt.transactionHash}`);
                }

                return { txHash: receipt.transactionHash };
            } catch (err: any) {
                console.error("Add Liquidity Error:", err);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [account, provider, signer]
    );

    // ==========================================
    // 📌 REMOVE LIQUIDITY
    // ==========================================
    const removeLiquidity = useCallback(
        async (tokenId: number, percentage: number) => {
            if (!signer || !account) return;
            setLoading(true);

            try {
                // Ensure we use the clean account address for collection
                const cleanAccount = ethers.getAddress(account);

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
                    recipient: cleanAccount, // Use Clean Account
                    amount0Max: MAX_UINT128,
                    amount1Max: MAX_UINT128,
                });
                await tx2.wait();

                console.log("Liquidity removed and tokens collected");
            } catch (err) {
                console.error("Remove Liquidity Error:", err);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [account, signer]
    );

    const increaseLiquidity = useCallback(async (
        tokenId: string,
        token0: string, // Address of Token 0 (Sorted)
        token1: string, // Address of Token 1 (Sorted)
        amount0: string,
        amount1: string
    ) => {
        if (!signer || !account) return;
        setLoading(true);
        try {
            // 1. Safe Parse Amounts (Handle empty string or 0)
            const contract0 = new ethers.Contract(token0, ERC20_ABI, signer);
            const contract1 = new ethers.Contract(token1, ERC20_ABI, signer);

            const dec0 = await contract0.decimals();
            const dec1 = await contract1.decimals();

            // Default to '0' if empty
            const val0 = amount0 || "0";
            const val1 = amount1 || "0";

            const amt0Wei = ethers.parseUnits(val0, dec0);
            const amt1Wei = ethers.parseUnits(val1, dec1);

            // If In-Range, BOTH must be > 0. If Out-of-Range, only one is needed.
            // We proceed regardless, letting the contract take what it needs.

            // 2. Approvals (Only if amount > 0)
            if (amt0Wei > 0n) {
                const allow0 = await contract0.allowance(account, POSITION_MANAGER_ADDRESS);
                if (allow0 < amt0Wei) await (await contract0.approve(POSITION_MANAGER_ADDRESS, MaxUint256)).wait();
            }

            if (amt1Wei > 0n) {
                const allow1 = await contract1.allowance(account, POSITION_MANAGER_ADDRESS);
                if (allow1 < amt1Wei) await (await contract1.approve(POSITION_MANAGER_ADDRESS, MaxUint256)).wait();
            }

            // 3. Execute
            const posManager = new ethers.Contract(POSITION_MANAGER_ADDRESS, POSITION_MANAGER_MINIMAL_ABI, signer);

            const tx = await posManager.increaseLiquidity({
                tokenId,
                amount0Desired: amt0Wei,
                amount1Desired: amt1Wei,
                amount0Min: 0,
                amount1Min: 0,
                deadline: Math.floor(Date.now() / 1000) + 600,
            });

            await tx.wait();
            return tx;
        } catch (err) {
            console.error(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [account, signer]);

    return {
        loading,
        addLiquidity,
        removeLiquidity,
        increaseLiquidity
    };
};