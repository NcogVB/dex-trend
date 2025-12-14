// // src/context/LiquidityContext.tsx
// import React, { createContext, useContext, useCallback, useState } from "react";
// import { ethers, MaxUint256 } from "ethers";
// import { Token } from "@uniswap/sdk-core";
// import { Pool, Position, nearestUsableTick } from "@uniswap/v3-sdk";
// import { ERC20_ABI, POSITION_MANAGER_MINIMAL_ABI, UNISWAP_V3_POOL_ABI, } from "./ABI";
// import { useWallet } from "./WalletContext";

// interface AddLiquidityOpts {
//     tokenA: string;
//     tokenB: string;
//     amountA: string;
//     amountB: string;
//     fee?: number; // default 3000
// }

// interface LiquidityContextValue {
//     addLiquidity: (opts: AddLiquidityOpts) => Promise<{ txHash: string } | null>;
//     loading: boolean;
//     removeLiquidity: (tokenId: number, percentage: number) => Promise<void>;
// }

// const LiquidityContext = createContext<LiquidityContextValue | undefined>(undefined);

// export const LiquidityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//     const [loading, setLoading] = useState(false);
//     const { account, provider, signer } = useWallet();

//     const POSITION_MANAGER_ADDRESS = "0xe4ae6F10ee1C8e2465D9975cb3325267A2025549";
//     const FACTORY_ADDRESS = "0x83DEFEcaF6079504E2DD1DE2c66DCf3046F7bDD7";
//     const FACTORY_ABI = [
//         "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"
//     ];
//     const addLiquidity = useCallback(
//         async (opts: AddLiquidityOpts) => {
//             const { tokenA, tokenB, amountA, amountB, fee = 500 } = opts;
//             setLoading(true);

//             try {
//                 if (!signer || !account || !provider) {
//                     throw new Error("Wallet not connected");
//                 }

//                 // --- 1. Get pool from factory ---
//                 const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
//                 // Always query factory with sorted token addresses
//                 const [t0, t1] =
//                     tokenA.toLowerCase() < tokenB.toLowerCase()
//                         ? [tokenA, tokenB]
//                         : [tokenB, tokenA];

//                 let poolAddress = await factory.getPool(t0, t1, fee);

//                 if (poolAddress === ethers.ZeroAddress) {
//                     throw new Error(`Pool does not exist for ${t0} / ${t1} with fee ${fee}`);
//                 }


//                 // --- 2. Read pool state ---
//                 const poolContract = new ethers.Contract(poolAddress, UNISWAP_V3_POOL_ABI, provider);
//                 const [tickSpacingBN, feeBN, liquidityBN, slot0, token0Addr, token1Addr] = await Promise.all([
//                     poolContract.tickSpacing(),
//                     poolContract.fee(),
//                     poolContract.liquidity(),
//                     poolContract.slot0(),
//                     poolContract.token0(),
//                     poolContract.token1(),
//                 ]);

//                 const poolData = {
//                     tickSpacing: Number(tickSpacingBN),
//                     fee: Number(feeBN),
//                     liquidity: liquidityBN.toString(),
//                     sqrtPriceX96: slot0[0].toString(),
//                     tick: Number(slot0[1]),
//                 };

//                 // --- 3. Fetch decimals ---
//                 const [decA, decB, symA, symB] = await Promise.all([
//                     new ethers.Contract(tokenA, ERC20_ABI, provider).decimals(),
//                     new ethers.Contract(tokenB, ERC20_ABI, provider).decimals(),
//                     new ethers.Contract(tokenA, ERC20_ABI, provider).symbol(),
//                     new ethers.Contract(tokenB, ERC20_ABI, provider).symbol(),
//                 ]);

//                 const chainId = 1476;
//                 const tokenObjA = new Token(Number(chainId), tokenA, Number(decA), symA, symA);
//                 const tokenObjB = new Token(Number(chainId), tokenB, Number(decB), symB, symB);

//                 // --- 4. Token ordering ---
//                 const [addr0] = [token0Addr, token1Addr].sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1));
//                 const token0 = addr0.toLowerCase() === tokenA.toLowerCase() ? tokenObjA : tokenObjB;
//                 const token1 = addr0.toLowerCase() === tokenA.toLowerCase() ? tokenObjB : tokenObjA;

//                 // --- 5. Build Pool ---
//                 const pool = new Pool(
//                     token0,
//                     token1,
//                     poolData.fee,
//                     poolData.sqrtPriceX96,
//                     poolData.liquidity,
//                     poolData.tick
//                 );

//                 // --- 6. Parse input amounts ---
//                 const amountARaw = ethers.parseUnits(amountA, decA);
//                 const amountBRaw = ethers.parseUnits(amountB, decB);

//                 const amounts =
//                     addr0.toLowerCase() === tokenA.toLowerCase()
//                         ? { amount0: amountARaw.toString(), amount1: amountBRaw.toString() }
//                         : { amount0: amountBRaw.toString(), amount1: amountARaw.toString() };

//                 // --- 7. Choose tick range ---
//                 const spacing = poolData.tickSpacing;
//                 const currentTick = poolData.tick;
//                 const baseTick = nearestUsableTick(currentTick, spacing);
//                 const tickLower = baseTick - spacing * 2;
//                 const tickUpper = baseTick + spacing * 2;

//                 // --- 8. Build Position ---
//                 const position = Position.fromAmounts({
//                     pool,
//                     tickLower,
//                     tickUpper,
//                     amount0: amounts.amount0,
//                     amount1: amounts.amount1,
//                     useFullPrecision: true,
//                 });

//                 const amount0Desired = position.mintAmounts.amount0;
//                 const amount1Desired = position.mintAmounts.amount1;

//                 // --- 9. Approvals ---
//                 const tokenAContract = new ethers.Contract(tokenA, ERC20_ABI, signer);
//                 const tokenBContract = new ethers.Contract(tokenB, ERC20_ABI, signer);

//                 const [allowanceA, allowanceB] = await Promise.all([
//                     tokenAContract.allowance(account, POSITION_MANAGER_ADDRESS),
//                     tokenBContract.allowance(account, POSITION_MANAGER_ADDRESS),
//                 ]);

//                 if (BigInt(allowanceA.toString()) < BigInt(amount0Desired.toString())) {
//                     await (await tokenAContract.approve(POSITION_MANAGER_ADDRESS, MaxUint256)).wait();
//                 }
//                 if (BigInt(allowanceB.toString()) < BigInt(amount1Desired.toString())) {
//                     await (await tokenBContract.approve(POSITION_MANAGER_ADDRESS, MaxUint256)).wait();
//                 }

//                 // --- 10. Mint params ---
//                 const mintParams = {
//                     token0: token0.address,
//                     token1: token1.address,
//                     fee: poolData.fee,
//                     tickLower,
//                     tickUpper,
//                     amount0Desired: amount0Desired.toString(),
//                     amount1Desired: amount1Desired.toString(),
//                     amount0Min: "0",
//                     amount1Min: "0",
//                     recipient: account,
//                     deadline: Math.floor(Date.now() / 1000) + 600,
//                 };

//                 const positionManager = new ethers.Contract(
//                     POSITION_MANAGER_ADDRESS,
//                     POSITION_MANAGER_MINIMAL_ABI,
//                     signer
//                 );

//                 const tx = await positionManager.mint(mintParams, { gasLimit: 1_200_000 });
//                 const receipt = await tx.wait();
//                 if (receipt.status !== 1) {
//                     throw new Error(`Mint failed: ${receipt.transactionHash}`);
//                 }

//                 return { txHash: receipt.transactionHash };
//             } finally {
//                 setLoading(false);
//             }
//         },
//         [account, provider, signer]
//     );

//     // === removeLiquidity unchanged ===
//     const removeLiquidity = async (tokenId: number, percentage: number) => {
//         const provider = new ethers.BrowserProvider((window as any).ethereum);
//         const signer = await provider.getSigner();
//         const user = await signer.getAddress();

//         const positionManager = new ethers.Contract(
//             POSITION_MANAGER_ADDRESS,
//             POSITION_MANAGER_MINIMAL_ABI,
//             signer
//         );

//         const pos = await positionManager.positions(tokenId);
//         const liquidity = pos[7];
//         const liquidityToRemove = (liquidity * BigInt(percentage)) / BigInt(100);

//         const tx1 = await positionManager.decreaseLiquidity({
//             tokenId,
//             liquidity: liquidityToRemove,
//             amount0Min: 0,
//             amount1Min: 0,
//             deadline: Math.floor(Date.now() / 1000) + 600,
//         });
//         await tx1.wait();

//         const MAX_UINT128 = (2n ** 128n - 1n).toString();
//         const tx2 = await positionManager.collect({
//             tokenId,
//             recipient: user,
//             amount0Max: MAX_UINT128,
//             amount1Max: MAX_UINT128,
//         });
//         await tx2.wait();

//         console.log("Liquidity removed and tokens collected");
//     };

//     return (
//         <LiquidityContext.Provider value={{ addLiquidity, loading, removeLiquidity }}>
//             {children}
//         </LiquidityContext.Provider>
//     );
// };

// export const useLiquidity = () => {
//     const ctx = useContext(LiquidityContext);
//     if (!ctx) throw new Error("useLiquidity must be used within LiquidityProvider");
//     return ctx;
// };
