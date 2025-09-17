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
import JoinCommunity from './JoinCommunity'
import AskExpertsSection from './AskExpertsSection'
import EarnPassiveIncomeSection from './EarnPassiveIncomeSection'

interface LiquidityData {
    poolTokens: number
    WPOLAmount: number
    USDCAmount: number
    shareOfPool: number
    reward: number | null
    totalPoolLiquidity: number
    currentPrice: number
    priceWPOLtoUSDC: number
    priceUSDCtoWPOL: number
}

const Converter1: React.FC = () => {
    const { removeLiquidity } = useLiquidity()
    const [percentage, setPercentage] = useState<number>(25)
    const [tokenId, setTokenId] = useState<string>('12345') // Sample token ID
    const [selectedPercentage, setSelectedPercentage] = useState<
        25 | 50 | 75 | 100
    >(25)
    const [isRemovingLiquidity, setIsRemovingLiquidity] = useState(false)
    const [isEnabled, setIsEnabled] = useState<boolean>(false)
    const [liquidityData, setLiquidityData] = useState<LiquidityData>({
        poolTokens: 0,
        WPOLAmount: 0,
        USDCAmount: 0,
        shareOfPool: 0,
        reward: null,
        totalPoolLiquidity: 0,
        currentPrice: 0,
        priceWPOLtoUSDC: 0,
        priceUSDCtoWPOL: 0,
    })

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(e.target.value)
        setPercentage(value)

        if (value >= 0 && value < 37.5) setSelectedPercentage(25)
        else if (value >= 37.5 && value < 62.5) setSelectedPercentage(50)
        else if (value >= 62.5 && value < 87.5) setSelectedPercentage(75)
        else setSelectedPercentage(100)
    }

    // Mock function to simulate fetching real Uniswap V3 position data
    const fetchPositionData = useCallback(async () => {
        if (!tokenId || !(window as any).ethereum) return

        try {
            const provider = new ethers.BrowserProvider(
                (window as any).ethereum
            )
            const POSITION_MANAGER_ADDRESS =
                '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'

            const positionManager = new ethers.Contract(
                POSITION_MANAGER_ADDRESS,
                POSITION_MANAGER_MINIMAL_ABI,
                provider
            )

            // 1. Load position info
            const pos = await positionManager.positions(tokenId)

            const token0Address = pos[2]
            const token1Address = pos[3]
            const fee = Number(pos[4])
            const tickLower = Number(pos[5])
            const tickUpper = Number(pos[6])
            const liquidity = pos[7]
            const tokensOwed0 = pos[10]
            const tokensOwed1 = pos[11]

            // 2. Pool contract (derive instead of hardcode if needed)
            const poolContract = new ethers.Contract(
                '0xA374094527e1673A86dE625aa59517c5dE346d32', // WMATIC/USDC.e 0.3% pool
                UNISWAP_V3_POOL_ABI,
                provider
            )

            const [poolLiquidity, slot0] = await Promise.all([
                poolContract.liquidity(),
                poolContract.slot0(),
            ])

            // 3. Token metadata
            const token0Contract = new ethers.Contract(
                token0Address,
                ERC20_ABI,
                provider
            )
            const token1Contract = new ethers.Contract(
                token1Address,
                ERC20_ABI,
                provider
            )

            const [dec0, dec1] = await Promise.all([
                token0Contract.decimals(),
                token1Contract.decimals(),
            ])

            const WPOL_ADDRESS = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'
            const USDCe_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'

            const sym0 =
                token0Address.toLowerCase() === WPOL_ADDRESS.toLowerCase()
                    ? 'WPOL'
                    : 'USDC.e'
            const sym1 =
                token1Address.toLowerCase() === USDCe_ADDRESS.toLowerCase()
                    ? 'USDC.e'
                    : 'WPOL'

            const chainId = 137
            const token0 = new Token(chainId, token0Address, Number(dec0), sym0)
            const token1 = new Token(chainId, token1Address, Number(dec1), sym1)

            // 4. Pool object
            const pool = new Pool(
                token0,
                token1,
                fee,
                slot0[0].toString(),
                poolLiquidity.toString(),
                Number(slot0[1])
            )

            // 5. Position object
            const position = new Position({
                pool,
                liquidity: liquidity.toString(),
                tickLower,
                tickUpper,
            })

            // 6. Human-readable amounts
            const amount0 = parseFloat(position.amount0.toExact())
            const amount1 = parseFloat(position.amount1.toExact())

            const wpolAmount = token0.symbol === 'WPOL' ? amount0 : amount1
            const usdcAmount = token0.symbol === 'USDC.e' ? amount0 : amount1

            // 7. Prices (no /1e18!)
            const priceWPOLtoUSDC = parseFloat(
                pool.token0Price.toSignificant(6)
            )
            const priceUSDCtoWPOL = parseFloat(
                pool.token1Price.toSignificant(6)
            )

            // 8. Rewards
            const reward0 = Number(tokensOwed0) / 10 ** Number(dec0)
            const reward1 = Number(tokensOwed1) / 10 ** Number(dec1)
            const reward = reward0 + reward1

            // 9. Pool share
            const shareOfPool =
                (Number(liquidity) / Number(poolLiquidity)) * 100

            setLiquidityData({
                poolTokens: Number(liquidity) / 1e18,
                WPOLAmount: wpolAmount,
                USDCAmount: usdcAmount, // no divide by 1e18
                shareOfPool,
                reward: reward > 0 ? reward : null,
                totalPoolLiquidity: Number(poolLiquidity) / 1e18,
                currentPrice: priceWPOLtoUSDC,
                priceWPOLtoUSDC,
                priceUSDCtoWPOL,
            })

            console.log('Position data:', {
                wpolAmount,
                usdcAmount,
                priceWPOLtoUSDC,
                priceUSDCtoWPOL,
                reward,
                shareOfPool,
            })
        } catch (err) {
            console.error('Error fetching position data:', err)
        }
    }, [tokenId])

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
    const wpolToReceive = (liquidityData.WPOLAmount * percentage) / 100
    const usdcToReceive = (liquidityData.USDCAmount * percentage) / 100
    const totalValueUSD =
        liquidityData.WPOLAmount * liquidityData.priceWPOLtoUSDC +
        liquidityData.USDCAmount
    const navigate = useNavigate()

    return (
        <div>
            <div className="hero-section">
                <div className="flex-grow flex flex-col items-center px-4 pt-[40px] md:pt-[88px] container mx-auto w-full">
                    <JoinCommunity />
                    <h1 className="font-semibold text-[40px] leading-[48px] md:text-[80px] md:leading-[88px] text-center align-middle capitalize mb-3 text-[#DC2626] max-w-[720px] mx-auto">
                        <span className="text-[#B91C1C]"> Pool </span> Exchange
                        with DEX.
                    </h1>
                    <p className="text-center font-normal md:text-[17.72px] md:leading-7 text-[#767676] max-w-[700px] mb-6">
                        At our cryptocurrency token exchange platform, we offer
                        an easy-to-use token swap service that allows you to
                        seamlessly exchange one type of token for another with
                        maximum efficiency.
                    </p>
                </div>
            </div>
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
                        <h2 className="mb-4 font-bold text-xl sm:text-3xl leading-[100%] text-black">
                            Remove WPOL/USDC Liquidity
                        </h2>
                        <p className="text-black font-normal text-xl leading-[18.86px] mb-6">
                            To Receive WPOL and USDC
                        </p>

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
                                                    className={`cursor-pointer w-full block bg-[#FFFFFF66] border border-solid border-[#FFFFFF1A] rounded-[8px] py-[5px] lg:py-[11px] text-[16px] lg:text-base font-semibold text-center transition-colors ${
                                                        selectedPercentage ===
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
                                                    W
                                                </div>
                                                <span className="font-normal text-lg leading-[100%]">
                                                    WPOL
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
                                                        liquidityData.priceWPOLtoUSDC
                                                    ).toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center space-x-2">
                                                <div className="size-[30px] bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                                    $
                                                </div>
                                                <span className="font-normal text-lg leading-[100%]">
                                                    USDC
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
                                                            liquidityData.priceWPOLtoUSDC +
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
                                                1 WPOL =
                                            </span>
                                            <span className="font-bold md:text-[20px] text-base leading-[100%]">
                                                {liquidityData.priceWPOLtoUSDC.toFixed(
                                                    4
                                                )}{' '}
                                                USDC
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-normal text-lg leading-[100%]">
                                                1 USDC =
                                            </span>
                                            <span className="font-bold md:text-[20px] text-base leading-[100%]">
                                                {liquidityData.priceUSDCtoWPOL.toFixed(
                                                    4
                                                )}{' '}
                                                WPOL
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
                                                    W
                                                </div>
                                                <div className="size-[24px] bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                                    $
                                                </div>
                                                <span className="font-bold md:text-lg text-base leading-[100%]">
                                                    WPOL/USDC LP
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
                                                    Pool WPOL:
                                                </span>
                                                <span className="font-semibold">
                                                    {liquidityData.WPOLAmount.toFixed(
                                                        6
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-normal text-gray-700">
                                                    Pool USDC:
                                                </span>
                                                <span className="font-semibold">
                                                    {liquidityData.USDCAmount.toFixed(
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
                                className={`rounded-[150px] px-[92px] py-[16px] font-semibold text-base leading-[17.6px] border-2 transition-colors ${
                                    isEnabled
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
                                className={`rounded-[150px] px-[92px] py-[16px] font-semibold text-base leading-[17.6px] border-2 transition-colors cursor-pointer ${
                                    !isEnabled || !tokenId
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
            <section className="md:py-[90px] py-[40px] px-4">
                <h2 className="font-medium lg:text-[64px] sm:text-[48px] text-[32px] md:leading-[70.4px] leading-[50px] text-center text-[#DC2626] max-w-[514px] mx-auto">
                    How
                    <span className="text-[#DC2626]">Pool </span>Exchange Works
                </h2>
                <p className="font-normal md:text-base text-xs md:leading-[25px] text-center text-[#767676] max-w-[910px] mx-auto pt-[30px]">
                    Remove liquidity with confidence. Dextrend guides you every
                    step with clear controls, helpful context, and fast
                    execution designed for professional traders and newcomers
                    alike.
                </p>
                <div className="flex justify-center gap-3 md:mt-[60px] mt-[40px] items-center">
                    <a
                        href="#"
                        className="border-2 border-[#E9E9E9] md:px-[32px] px-[20px] py-[16px] rounded-[80px] font-medium text-base text-[#000000]"
                    >
                        Learn More
                    </a>
                </div>
            </section>
            <AskExpertsSection />
            <EarnPassiveIncomeSection />
        </div>
    )
}

export default Converter1
