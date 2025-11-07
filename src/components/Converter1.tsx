import React, { useState, useEffect, useCallback } from 'react'
import { useLiquidity } from '../contexts/LiquidityContext'
import { Token } from '@uniswap/sdk-core'
import { Pool, Position } from '@uniswap/v3-sdk'
import { ethers } from 'ethers'
import {
    ERC20_ABI,
    POSITION_MANAGER_MINIMAL_ABI,
    UNISWAP_V3_POOL_ABI,
} from '../contexts/ABI'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { TOKENS } from '../utils/SwapTokens'
import { useWallet } from '../contexts/WalletContext'

interface LiquidityData {
    poolTokens: number
    usdcAmount: number
    usdtAmount: number
    shareOfPool: number
    reward: number | null
    totalPoolLiquidity: number
    currentPrice: number
    priceUSDCtoUSDT: number
    priceUSDTtoUSDC: number
}

const Converter1: React.FC = () => {
    const { provider } = useWallet()
    const { removeLiquidity } = useLiquidity()
    const [percentage, setPercentage] = useState<number>(25)
    const [tokenId, setTokenId] = useState<string>("") // Sample token ID
    const [selectedPercentage, setSelectedPercentage] = useState<
        25 | 50 | 75 | 100
    >(25)
    const [isRemovingLiquidity, setIsRemovingLiquidity] = useState(false)
    const [isEnabled, setIsEnabled] = useState<boolean>(false)
    const [liquidityData, setLiquidityData] = useState<LiquidityData>({
        poolTokens: 0,
        usdcAmount: 0,
        usdtAmount: 0,
        shareOfPool: 0,
        reward: null,
        totalPoolLiquidity: 0,
        currentPrice: 0,
        priceUSDCtoUSDT: 0,
        priceUSDTtoUSDC: 0,
    })
    const [tokenIn, setTokenIn] = useState<string>(TOKENS[0].symbol);
    const [tokenOut, setTokenOut] = useState<string>(TOKENS[1].symbol);
    // const getTokenAddress = (symbol: string): string | undefined => {
    //     return TOKENS.find(token => token.symbol === symbol)?.address;
    // };
    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(e.target.value)
        setPercentage(value)

        if (value >= 0 && value < 37.5) setSelectedPercentage(25)
        else if (value >= 37.5 && value < 62.5) setSelectedPercentage(50)
        else if (value >= 62.5 && value < 87.5) setSelectedPercentage(75)
        else setSelectedPercentage(100)
    }

    const FACTORY_ABI = [
        "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address)"
    ];
    const FACTORY_ADDRESS = "0x83DEFEcaF6079504E2DD1DE2c66DCf3046F7bDD7";
    const fetchPositionData = useCallback(async () => {
        try {
            if (!tokenId || !(window as any).ethereum) return;

            const positionManager = new ethers.Contract(
                "0xe4ae6F10ee1C8e2465D9975cb3325267A2025549",
                POSITION_MANAGER_MINIMAL_ABI,
                provider
            );
            const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);

            // 1) Read position from NFT (use BigInt/string for tokenId)
            const pos = await positionManager.positions(BigInt(tokenId));

            const token0Addr: string = pos.token0 ?? pos[2];
            const token1Addr: string = pos.token1 ?? pos[3];
            const fee: number = Number(pos.fee ?? pos[4]);
            const tickLower: number = Number(pos.tickLower ?? pos[5]);
            const tickUpper: number = Number(pos.tickUpper ?? pos[6]);
            const liquidityBI: bigint = pos.liquidity ?? pos[7];

            // 2) Get pool by exact token0/token1/fee from the NFT
            // (The NFT stores sorted token0/token1 already)
            const poolAddress: string = await factory.getPool(token0Addr, token1Addr, fee);
            if (poolAddress === ethers.ZeroAddress) {
                console.error("No pool exists for this NFT (token0/token1/fee).");
                return;
            }

            // 3) Read pool state
            const poolContract = new ethers.Contract(poolAddress, UNISWAP_V3_POOL_ABI, provider);
            const [liquidityPoolBI, slot0, , ,] = await Promise.all([
                poolContract.liquidity(),
                poolContract.slot0(),
                poolContract.fee(),     // already have 'fee' but harmless to read
                poolContract.token0(),  // already have token0Addr
                poolContract.token1(),  // already have token1Addr
            ]);
            const sqrtPriceX96 = slot0[0].toString();
            const tick = Number(slot0[1]);

            // 4) Fetch token metadata
            const [dec0, dec1, sym0, sym1] = await Promise.all([
                new ethers.Contract(token0Addr, ERC20_ABI, provider).decimals(),
                new ethers.Contract(token1Addr, ERC20_ABI, provider).decimals(),
                new ethers.Contract(token0Addr, ERC20_ABI, provider).symbol(),
                new ethers.Contract(token1Addr, ERC20_ABI, provider).symbol(),
            ]);

            const chainId = 1476;
            const token0 = new Token(chainId, ethers.getAddress(token0Addr), Number(dec0), sym0, sym0);
            const token1 = new Token(chainId, ethers.getAddress(token1Addr), Number(dec1), sym1, sym1);

            // 5) Build Pool & Position from the NFT specifics
            const pool = new Pool(token0, token1, fee, sqrtPriceX96, liquidityPoolBI.toString(), tick);
            const position = new Position({
                pool,
                liquidity: liquidityBI.toString(),
                tickLower,
                tickUpper,
            });

            // 6) Token amounts in position
            const amount0 = Number(position.amount0.toSignificant(6));
            const amount1 = Number(position.amount1.toSignificant(6));

            // 7) Prices (token0 per token1 and vice versa)
            const price0per1 = Number(pool.token0Price.toSignificant(6));
            const price1per0 = Number(pool.token1Price.toSignificant(6));

            // 8) Share of pool (best-effort render)
            const shareOfPool =
                Number(liquidityBI) > 0 && Number(liquidityPoolBI) > 0
                    ? (Number(liquidityBI) / Number(liquidityPoolBI)) * 100
                    : 0;

            // 9) Fees owed (both tokens, show as "reward" in USD-ish if you want)
            const tokensOwed0 = pos.tokensOwed0 ?? pos[10];
            const tokensOwed1 = pos.tokensOwed1 ?? pos[11];
            const reward =
                Number(tokensOwed0) / 10 ** Number(dec0) * price0per1 + // convert owed0 to token1 value
                Number(tokensOwed1) / 10 ** Number(dec1);               // already token1

            // 10) Drive the UI from the NFT’s token symbols
            setTokenIn(sym0);
            setTokenOut(sym1);

            setLiquidityData({
                poolTokens: Number(liquidityBI) / 1e18, // display-only; optional
                usdcAmount: amount1,                    // rename these keys if they’re confusing now
                usdtAmount: amount0,
                shareOfPool,
                reward: reward > 0 ? reward : null,
                totalPoolLiquidity: Number(liquidityPoolBI) / 1e18,
                currentPrice: price0per1,
                priceUSDCtoUSDT: price0per1, // 1 token0 in token1
                priceUSDTtoUSDC: price1per0, // 1 token1 in token0
            });
        } catch (err) {
            console.error("Error fetching position data:", err);
        }
    }, [tokenId]);

    useEffect(() => {
        if (tokenId) fetchPositionData()
    }, [tokenId, fetchPositionData])

    const handlePercentageSelect = (percent: 25 | 50 | 75 | 100) => {
        setSelectedPercentage(percent)
        setPercentage(percent)
    }

    const handleEnable = () => {
        setIsEnabled(true)
    }

    const handleRemove = async () => {
        if (!tokenId) {
            alert('Please enter a valid token ID')
            return
        }
        if (percentage <= 0 || percentage > 100) {
            alert('Please enter a percentage between 1 and 100')
            return
        }

        setIsRemovingLiquidity(true)
        try {
            await removeLiquidity(Number(tokenId), percentage)
            await fetchPositionData();
            alert('Liquidity removed successfully!')
            // Refresh position data
        } catch (error) {
            console.error('Error removing liquidity:', error)
            alert('Failed to remove liquidity')
        } finally {
            setIsRemovingLiquidity(false)
        }
    }

    // Calculate amounts to receive
    const wpolToReceive = (liquidityData.usdtAmount * percentage) / 100
    const usdcToReceive = (liquidityData.usdcAmount * percentage) / 100
    const totalValueUSD =
        liquidityData.usdtAmount * liquidityData.priceUSDTtoUSDC +
        liquidityData.usdcAmount
    const navigate = useNavigate()

    return (
        <div>
            <div className="flex items-center justify-center px-4 min-h-screen">
                <div className=" w-full p-[3.5px] md:rounded-[40px] rounded-[20px] max-w-[790px]">
                    <div className="bg-white relative shadow-lg border border-gray-200 w-full lg:rounded-[40px] rounded-[20px] px-[15px] lg:px-[50px] py-[20px] lg:py-[60px]">
                        {/* Tab Navigation */}
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-1 rounded-[8px] font-normal text-sm leading-[100%] px-[16px] py-[10px] transition-colors text-black hover:text-[#DC2626]"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </button>

                        {/* Header */}
                        {/* Token Selection */}
                        {/* <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Token Pair
                            </label>
                            <div className="flex gap-3">
                                <select
                                    value={tokenIn}
                                    onChange={(e) => setTokenIn(e.target.value)}
                                    className="flex-1 p-3 rounded-[8px] border border-gray-300 bg-white text-black"
                                >
                                    {TOKENS.map((t) => (
                                        <option key={t.address} value={t.symbol}>
                                            {t.symbol}
                                        </option>
                                    ))}
                                </select>
                                <span className="flex items-center font-semibold text-gray-600">→</span>
                                <select
                                    value={tokenOut}
                                    onChange={(e) => setTokenOut(e.target.value)}
                                    className="flex-1 p-3 rounded-[8px] border border-gray-300 bg-white text-black"
                                > {TOKENS.map((t) => (
                                    <option key={t.address} value={t.symbol}>
                                        {t.symbol}
                                    </option>
                                ))}
                                </select>
                            </div>
                        </div> */}

                        {/* Position ID Input */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Position Token ID
                            </label>
                            <input
                                type="text"
                                placeholder="Enter Position Token ID"
                                value={tokenId}
                                onChange={(e) => setTokenId(e.target.value)}
                                className="w-full max-w-md p-3 rounded-[8px] border border-gray-300 bg-white text-black focus:border-[#2563EB] focus:outline-none"
                            />
                        </div>
                        {/* Main Content Grid */}
                        <div className="flex flex-col lg:flex-row items-start gap-[25px] lg:gap-[51px]">
                            {/* Amount Selection */}
                            <div className="flex-1 w-full">
                                <div className="bg-[#FFFFFF66] border border-solid border-[#FFFFFF1A] rounded-[12px] px-[15px] py-[18px]">
                                    <p className="font-bold md:text-lg text-base leading-[100%] mb-[17px]">
                                        Amount to Remove
                                    </p>
                                    <p className="text-black font-bold text-[22px] leading-[31.43px] mb-2">
                                        {percentage.toFixed(1)}%
                                    </p>
                                    <input
                                        className="w-full accent-[#2563EB]"
                                        max="100"
                                        min="0"
                                        type="range"
                                        value={percentage}
                                        onChange={handleSliderChange}
                                    />
                                    <div className="mt-4 flex gap-3 percentage-radio-buttons">
                                        {[25, 50, 75, 100].map((percent) => (
                                            <div
                                                key={percent}
                                                className="flex-1"
                                            >
                                                <input
                                                    type="radio"
                                                    name="percentage"
                                                    id={`${percent}_percentage`}
                                                    className="peer hidden"
                                                    checked={
                                                        selectedPercentage ===
                                                        percent
                                                    }
                                                    onChange={() =>
                                                        handlePercentageSelect(
                                                            percent as
                                                            | 25
                                                            | 50
                                                            | 75
                                                            | 100
                                                        )
                                                    }
                                                />
                                                <label
                                                    htmlFor={`${percent}_percentage`}
                                                    className={`cursor-pointer w-full block bg-[#FFFFFF66] border border-solid border-[#FFFFFF1A] rounded-[8px] py-[5px] lg:py-[11px] text-[16px] lg:text-base font-semibold text-center transition-colors ${selectedPercentage ===
                                                        percent
                                                        ? 'border-white text-[#2a8576] bg-white'
                                                        : 'text-[#80888A] lg:text-[#1D3B5E]'
                                                        }`}
                                                >
                                                    {percent}%
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Arrow */}
                            <div className="m-auto">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="28"
                                    height="29"
                                    fill="none"
                                >
                                    <path
                                        fill="#000"
                                        d="M19.876.5H8.138C3.04.5 0 3.538 0 8.634v11.718c0 5.11 3.04 8.148 8.138 8.148h11.724C24.96 28.5 28 25.462 28 20.366V8.634C28.014 3.538 24.974.5 19.876.5Zm-7.284 21c0 .14-.028.266-.084.406a1.095 1.095 0 0 1-.574.574 1.005 1.005 0 0 1-.406.084 1.056 1.056 0 0 1-.743-.308l-4.132-4.13a1.056 1.056 0 0 1 0-1.484 1.057 1.057 0 0 1 1.485 0l2.34 2.338V7.5c0-.574.476-1.05 1.05-1.05.574 0 1.064.476 1.064 1.05v14Zm8.755-9.128a1.04 1.04 0 0 1-.743.308 1.04 1.04 0 0 1-.742-.308l-2.34-2.338V21.5c0 .574-.475 1.05-1.05 1.05-.574 0-1.05-.476-1.05-1.05v-14c0-.14.028-.266.084-.406.112-.252.308-.462.574-.574a.99.99 0 0 1 .798 0c.127.056.238.126.337.224l4.132 4.13c.406.42.406 1.092 0 1.498Z"
                                    />
                                </svg>
                            </div>

                            {/* You Will Receive */}
                            <div className="flex-1 w-full h-full">
                                <div className="bg-[#FFFFFF66] border border-solid border-[#FFFFFF1A] rounded-[12px] px-[15px] pt-[18px] pb-[28px] h-full">
                                    <p className="font-bold md:text-lg text-base leading-[100%] mb-[38px]">
                                        You will Receive
                                    </p>
                                    <div className="space-y-[28px] font-bold md:text-[22px] text-base leading-[100%]">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center space-x-2">
                                                <div className="size-[30px] bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xs">

                                                </div>
                                                <span className="font-normal text-lg leading-[100%]">
                                                    {tokenIn}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold">
                                                    {wpolToReceive.toFixed(6)}
                                                </div>
                                                <div className="text-sm text-gray-500 font-normal">
                                                    ≈ $
                                                    {(
                                                        wpolToReceive *
                                                        liquidityData.priceUSDTtoUSDC
                                                    ).toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center space-x-2">
                                                <div className="size-[30px] bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">

                                                </div>
                                                <span className="font-normal text-lg leading-[100%]">
                                                    {tokenOut}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold">
                                                    {usdcToReceive.toFixed(6)}
                                                </div>
                                                <div className="text-sm text-gray-500 font-normal">
                                                    ≈ $
                                                    {usdcToReceive.toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="border-t pt-4">
                                            <div className="flex justify-between items-center">
                                                <span className="font-normal text-lg">
                                                    Total Value:
                                                </span>
                                                <span className="font-bold text-green-600">
                                                    $
                                                    {(
                                                        wpolToReceive *
                                                        liquidityData.priceUSDTtoUSDC +
                                                        usdcToReceive
                                                    ).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Section */}
                        <div className="flex flex-col lg:flex-row items-start gap-[25px] lg:gap-[51px] mt-[40px]">
                            {/* Prices and Pool Share */}
                            <div className="flex-1 w-full">
                                <div className="bg-[#FFFFFF66] border border-solid border-[#FFFFFF1A] rounded-[12px] px-[15px] py-[18px]">
                                    <p className="font-bold md:text-lg text-base leading-[100%] mb-[34px]">
                                        Current Prices:
                                    </p>
                                    <div className="space-y-[20px]">
                                        <div className="flex justify-between items-center">
                                            <span className="font-normal text-lg leading-[100%]">
                                                1 {tokenIn} =
                                            </span>
                                            <span className="font-bold md:text-[20px] text-base leading-[100%]">
                                                {liquidityData.priceUSDTtoUSDC.toFixed(
                                                    4
                                                )}{' '}
                                                {tokenOut}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-normal text-lg leading-[100%]">
                                                1 {tokenOut} =
                                            </span>
                                            <span className="font-bold md:text-[20px] text-base leading-[100%]">
                                                {liquidityData.priceUSDCtoUSDT.toFixed(
                                                    4
                                                )}{' '}
                                                {tokenIn}
                                            </span>
                                        </div>
                                        <div className="border-t pt-4">
                                            <div className="flex justify-between items-center">
                                                <span className="font-normal text-lg leading-[100%]">
                                                    Pool Share:
                                                </span>
                                                <span className="font-bold md:text-[20px] text-base leading-[100%] text-blue-600">
                                                    {liquidityData.shareOfPool.toFixed(
                                                        4
                                                    )}
                                                    %
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="hidden lg:block opacity-20">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="28"
                                    height="29"
                                    fill="none"
                                ></svg>
                            </div>

                            {/* LP Position Details */}
                            <div className="flex-1 w-full h-full">
                                <div className="bg-[#FFFFFF66] border border-solid border-[#FFFFFF1A] rounded-[12px] px-[15px] pt-[18px] pb-[28px] h-full">
                                    <p className="font-bold md:text-lg text-base leading-[100%] mb-[20px]">
                                        Your Position Details
                                    </p>
                                    <div className="space-y-[12px]">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center space-x-2">
                                                <div className="size-[24px] bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xs">

                                                </div>
                                                <div className="size-[24px] bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">

                                                </div>
                                                <span className="font-bold md:text-lg text-base leading-[100%]">
                                                    {tokenIn}/{tokenOut} LP
                                                </span>
                                            </div>
                                            <span className="font-bold md:text-[18px] text-base leading-[100%]">
                                                #{tokenId}
                                            </span>
                                        </div>

                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="font-normal text-gray-700">
                                                    LP Tokens:
                                                </span>
                                                <span className="font-semibold">
                                                    {liquidityData.poolTokens.toFixed(
                                                        11
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-normal text-gray-700">
                                                    Pool {tokenIn}:
                                                </span>
                                                <span className="font-semibold">
                                                    {liquidityData.usdtAmount.toFixed(
                                                        6
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-normal text-gray-700">
                                                    Pool {tokenOut}:
                                                </span>
                                                <span className="font-semibold">
                                                    {liquidityData.usdcAmount.toFixed(
                                                        6
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-normal text-gray-700">
                                                    Total Value:
                                                </span>
                                                <span className="font-bold text-green-600">
                                                    ${totalValueUSD.toFixed(2)}
                                                </span>
                                            </div>
                                            {liquidityData.reward !== null &&
                                                liquidityData.reward > 0 && (
                                                    <div className="flex justify-between border-t pt-2">
                                                        <span className="font-normal text-gray-700">
                                                            Unclaimed Fees:
                                                        </span>
                                                        <span className="font-bold text-orange-600">
                                                            $
                                                            {liquidityData.reward.toFixed(
                                                                6
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-[18px] mt-[40px]">
                            <button
                                onClick={handleEnable}
                                disabled={isEnabled || !tokenId}
                                className={`rounded-[150px] px-[92px] py-[16px] font-semibold text-base leading-[17.6px] border-2 transition-colors ${isEnabled
                                    ? 'text-gray-500 bg-gray-300 border-gray-300 cursor-not-allowed'
                                    : !tokenId
                                        ? 'text-gray-400 bg-gray-200 border-gray-200 cursor-not-allowed'
                                        : 'text-white bg-[#DC2626] border-[#DC2626] hover:bg-[#DC2626]'
                                    }`}
                            >
                                Enable
                            </button>
                            <button
                                onClick={handleRemove}
                                disabled={
                                    !isEnabled ||
                                    isRemovingLiquidity ||
                                    !tokenId
                                }
                                className={`rounded-[150px] px-[92px] py-[16px] font-semibold text-base leading-[17.6px] border-2 transition-colors cursor-pointer ${!isEnabled || !tokenId
                                    ? 'text-gray-400 border-gray-300 cursor-not-allowed disabled:opacity-50 disabled:cursor-not-allowed'
                                    : 'text-[#DC2626] border-[#DC2626] hover:bg-[#DC2626] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
                                    }`}
                            >
                                {isRemovingLiquidity
                                    ? 'Removing...'
                                    : 'Remove Liquidity'}
                            </button>
                        </div>

                        {/* Status Messages */}
                        {isEnabled && (
                            <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
                                <p className="text-green-800 text-sm">
                                    ✅ Position enabled. You can now remove
                                    liquidity.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Converter1
