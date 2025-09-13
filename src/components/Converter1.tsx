import React, { useState, useEffect, useCallback } from 'react'
import { useLiquidity } from '../contexts/LiquidityContext'
import { ethers } from 'ethers'
import { Token } from '@uniswap/sdk-core'
import { Pool, Position } from '@uniswap/v3-sdk'
import { UNISWAP_V3_POOL_ABI } from '../contexts/ABI'

interface LiquidityData {
    poolTokens: number // Liquidity tokens (scaled)
    usdtAmount: number // Amount of USDT in position
    ethAmount: number // Amount of ETH in position
    shareOfPool: number // Percentage of pool owned
    reward: number | null // Uncollected fees (if any)
}
const POSITION_MANAGER_ADDRESS = '0x442d8CCae9d8dd3bc4B21494C0eD1ccF4d24F505'
const POSITION_MANAGER_MINIMAL_ABI = [
    'function positions(uint256 tokenId) view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
    'function decreaseLiquidity(tuple(uint256 tokenId, uint128 liquidity, uint256 amount0Min, uint256 amount1Min, uint256 deadline)) returns (uint256 amount0, uint256 amount1)',
    'function collect(tuple(uint256 tokenId, address recipient, uint128 amount0Max, uint128 amount1Max)) returns (uint256 amount0, uint256 amount1)',
]

const Converter1: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'exchange' | 'pool'>('pool')
    const { removeLiquidity } = useLiquidity()
    const [percentage, setPercentage] = useState<number>(25)
    const [tokenId, setTokenId] = useState<string>('') // User inputs or fetches tokenId
    const [selectedPercentage, setSelectedPercentage] = useState<
        25 | 50 | 75 | 100
    >(25)
    const [isRemovingLiquidity, setIsRemovingLiquidity] = useState(false)
    const [liquidityData, setLiquidityData] = useState<LiquidityData>({
        poolTokens: 0,
        usdtAmount: 0,
        ethAmount: 0,
        shareOfPool: 0,
        reward: null,
    })
    const [isEnabled, setIsEnabled] = useState<boolean>(false)

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(e.target.value)
        setPercentage(value)

        // Update radio button selection based on slider
        if (value >= 0 && value < 37.5) setSelectedPercentage(25)
        else if (value >= 37.5 && value < 62.5) setSelectedPercentage(50)
        else if (value >= 62.5 && value < 87.5) setSelectedPercentage(75)
        else setSelectedPercentage(100)
    }

    const fetchPositionData = useCallback(async () => {
        if (!tokenId || !(window as any).ethereum) return

        try {
            const provider = new ethers.BrowserProvider(
                (window as any).ethereum
            )

            const positionManager = new ethers.Contract(
                POSITION_MANAGER_ADDRESS,
                POSITION_MANAGER_MINIMAL_ABI,
                provider
            )

            const poolAddress = '0x8269d25b908d96169b8e10D0fb12169eF42334e3' // From addLiquidity call
            const poolContract = new ethers.Contract(
                poolAddress,
                UNISWAP_V3_POOL_ABI,
                provider
            )

            // Fetch position and pool data
            const [positionData, poolData] = await Promise.all([
                positionManager.positions(tokenId),
                Promise.all([
                    poolContract.liquidity(),
                    poolContract.slot0(),
                    poolContract.fee(),
                    poolContract.token0(),
                    poolContract.token1(),
                ]),
            ])

            const [liquidity, tokensOwed0, tokensOwed1] = positionData.slice(7) // Extract relevant fields
            const [poolLiquidity, slot0, fee, token0Address, token1Address] =
                poolData

            // Create Token objects (assuming chainId 11155111 from context)
            const chainId = 11155111
            const token0 = new Token(chainId, token0Address, 18, 'USDT', 'USDT')
            const token1 = new Token(chainId, token1Address, 18, 'ETH', 'ETH')

            // Create Pool object
            const pool = new Pool(
                token0,
                token1,
                Number(fee),
                slot0[0].toString(),
                poolLiquidity.toString(),
                Number(slot0[1])
            )

            // Create Position object
            const position = new Position({
                pool,
                liquidity: liquidity.toString(),
                tickLower: Number(positionData[5]),
                tickUpper: Number(positionData[6]),
            })

            // Calculate amounts
            const amount0 = Number(
                position.amount0.toSignificant(6, { groupSeparator: '' })
            )
            const amount1 = Number(
                position.amount1.toSignificant(6, { groupSeparator: '' })
            )
            const usdtAmount = token0.symbol === 'usdc' ? amount0 : amount1
            const ethAmount = token1.symbol === 'usdt' ? amount1 : amount0
            const shareOfPool =
                (Number(liquidity) / Number(poolLiquidity)) * 100

            // Estimate rewards (uncollected fees)
            const reward =
                Number(tokensOwed0) / 1e18 + Number(tokensOwed1) / 1e18 // Simplified, adjust based on feeGrowth

            setLiquidityData({
                poolTokens: Number(liquidity) / 1e18, // Scale for display
                usdtAmount,
                ethAmount,
                shareOfPool,
                reward: reward > 0 ? reward : null,
            })
        } catch (error) {
            console.error('Error fetching position data:', error)
        }
    }, [tokenId])

    // Fetch data when tokenId changes
    useEffect(() => {
        if (tokenId) fetchPositionData()
    }, [tokenId, fetchPositionData])
    const handlePercentageSelect = (percent: 25 | 50 | 75 | 100) => {
        setSelectedPercentage(percent)
        setPercentage(percent)
    }

    const handleEnable = () => {
        setIsEnabled(true)
        // In real app, this would trigger wallet connection/approval
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

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="container mx-auto px-4">
                <div
                    className="hero-border w-full p-[3.5px] lg:rounded-[40px] rounded-[20px]"
                    style={{
                        background: `radial-gradient(98% 49.86% at 100.03% 100%, #33a36d 0%, rgba(51, 163, 109, 0.05) 100%), 
                        radial-gradient(24.21% 39.21% at 0% 0%, rgba(255, 255, 255, 0.81) 0%, rgba(255, 255, 255, 0.19) 100%), 
                        radial-gradient(21.19% 40.1% at 100.03% 0%, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 100%)`,
                    }}
                >
                    <div className="bg-white relative shadow-lg border border-gray-200 w-full lg:rounded-[40px] rounded-[20px] px-[15px] lg:px-[50px] py-[20px] lg:py-[60px]">
                        <div className="relative z-10 border bg-gray-50 inline-flex px-2 py-1.5 rounded-[14px] border-solid border-gray-200 gap-2 mb-[24px]">
                            <button
                                onClick={() => setActiveTab('exchange')}
                                className={`rounded-[8px] font-normal text-sm leading-[100%] px-[22px] py-[13px] transition-colors ${
                                    activeTab === 'exchange'
                                        ? 'bg-white text-[#B91C1C] font-bold'
                                        : 'text-black'
                                }`}
                            >
                                Exchange
                            </button>
                            <button
                                onClick={() => setActiveTab('pool')}
                                className={`rounded-[8px] font-normal text-sm leading-[100%] px-[22px] py-[13px] transition-colors ${
                                    activeTab === 'pool'
                                        ? 'bg-white text-[#B91C1C] font-bold'
                                        : 'text-black'
                                }`}
                            >
                                Pool
                            </button>
                        </div>

                        <h2 className="mb-4 font-bold text-xl sm:text-3xl leading-[100%] text-black">
                            Remove USDT/USDC Liquidity
                        </h2>
                        <p className="text-black font-normal text-xl leading-[18.86px] mb-10">
                            To Receive USDT and USDC
                        </p>

                        <div className="flex flex-col lg:flex-row items-start gap-[25px] lg:gap-[51px]">
                            <div className="flex-1 w-full">
                                <div className="bg-[#FFFFFF66] border border-solid border-[#FFFFFF1A] rounded-[12px] px-[15px] py-[18px]">
                                    <p className="font-bold md:text-lg text-base leading-[100%] mb-[17px]">
                                        Amount
                                    </p>
                                    <p className="text-black font-bold text-[22px] leading-[31.43px] mb-2">
                                        {percentage.toFixed(3)}%
                                    </p>
                                    <input
                                        className="w-full accent-[#B91C1C]"
                                        max="100"
                                        min="0"
                                        type="range"
                                        value={percentage}
                                        onChange={handleSliderChange}
                                    />
                                    <div className="mt-4 flex gap-3 percentage-redio-buttons">
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

                            <div className="flex-1 w-full h-full">
                                <div className="bg-[#FFFFFF66] border border-solid border-[#FFFFFF1A] rounded-[12px] px-[15px] pt-[18px] pb-[28px] h-full">
                                    <p className="font-bold md:text-lg text-base leading-[100%] mb-[38px]">
                                        You will Receive
                                    </p>
                                    <div className="space-y-[28px] font-bold md:text-[22px] text-base leading-[100%]">
                                        <div className="flex justify-between">
                                            <div className="flex items-center space-x-2">
                                                <div className="size-[30px] bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                                    USDT
                                                </div>
                                                <span className="font-normal text-lg leading-[100%]">
                                                    USDT
                                                </span>
                                            </div>
                                            <span>
                                                {(
                                                    (liquidityData.usdtAmount *
                                                        percentage) /
                                                    100
                                                ).toFixed(6)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <div className="flex items-center space-x-2">
                                                <div className="size-[30px] bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                                    USDC
                                                </div>
                                                <span className="font-normal text-lg leading-[100%]">
                                                    USDC
                                                </span>
                                            </div>
                                            <span>
                                                {(
                                                    (liquidityData.ethAmount *
                                                        percentage) /
                                                    100
                                                ).toFixed(6)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row items-start gap-[25px] lg:gap-[51px] mt-[40px]">
                            <div className="flex-1 w-full">
                                <div className="bg-[#FFFFFF66] border border-solid border-[#FFFFFF1A] rounded-[12px] px-[15px] py-[18px]">
                                    <p className="font-bold md:text-lg text-base leading-[100%] mb-[34px]">
                                        Prices and Pool Share:
                                    </p>
                                    <div className="space-y-[28px]">
                                        <div className="flex justify-between">
                                            <span className="font-normal text-lg leading-[100%]">
                                                1 USDT =
                                            </span>
                                            <span className="font-bold md:text-[22px] text-base leading-[100%]">
                                                {liquidityData.ethAmount.toFixed(
                                                    5
                                                )}{' '}
                                                ETH
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-normal text-lg leading-[100%]">
                                                1 USDC =
                                            </span>
                                            <span className="font-bold md:text-[22px] text-base leading-[100%]">
                                                {liquidityData.usdtAmount.toFixed(
                                                    5
                                                )}
                                                USDT
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="hidden lg:block">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="28"
                                    height="29"
                                    fill="none"
                                ></svg>
                            </div>

                            <div className="flex-1 w-full h-full">
                                <div className="bg-[#FFFFFF66] border border-solid border-[#FFFFFF1A] rounded-[12px] px-[15px] pt-[18px] pb-[28px] h-full">
                                    <p className="font-bold md:text-lg text-base leading-[100%] mb-[20px]">
                                        LP Tokens in your Wallet
                                    </p>
                                    <div className="space-y-[8px]">
                                        <div className="flex justify-between">
                                            <div className="flex items-center space-x-2 mb-2.5">
                                                <div className="size-[24px] bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                                    U
                                                </div>
                                                <div className="size-[24px] bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                                    $
                                                </div>
                                                <span className="font-bold md:text-lg text-base leading-[100%]">
                                                    USDT - USDC
                                                </span>
                                            </div>
                                            <span className="font-bold md:text-[22px] text-base leading-[100%]">
                                                {liquidityData.poolTokens.toFixed(
                                                    11
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-normal text-lg leading-[100%]">
                                                Share of Pool:
                                            </span>
                                            <span>
                                                {liquidityData.shareOfPool.toFixed(
                                                    2
                                                )}
                                                %
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-normal text-lg leading-[100%]">
                                                Pool USDT:
                                            </span>
                                            <span>
                                                {liquidityData.usdtAmount.toFixed(
                                                    5
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-normal text-lg leading-[100%]">
                                                Pool USDC:
                                            </span>
                                            <span>
                                                {liquidityData.ethAmount.toFixed(
                                                    5
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Enter Position Token ID"
                                    value={tokenId}
                                    onChange={(e) => setTokenId(e.target.value)}
                                    className="w-full mb-4 p-2 rounded-[8px] border border-[#FFFFFF1A] bg-transparent text-black"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-[18px] mt-[40px]">
                            <button
                                onClick={handleEnable}
                                disabled={isEnabled}
                                className={`rounded-[150px] p-[16px_92px] font-semibold text-base leading-[17.6px] border-2 transition-colors ${
                                    isEnabled
                                        ? 'text-gray-500 bg-gray-300 border-gray-300 cursor-not-allowed'
                                        : 'text-white bg-[#DC2626] border-[#DC2626] hover:bg-[#B91C1C]'
                                }`}
                            >
                                {isEnabled ? 'Enabled' : 'Enable'}
                            </button>
                            <button
                                onClick={handleRemove}
                                disabled={!isEnabled}
                                className={`rounded-[150px] p-[16px_92px] font-semibold text-base leading-[17.6px] border-2 transition-colors ${
                                    !isEnabled
                                        ? 'text-gray-400 border-gray-300 cursor-not-allowed'
                                        : 'text-[#DC2626] border-[#DC2626] hover:bg-[#DC2626] hover:text-white'
                                }`}
                            >
                                {isRemovingLiquidity ? 'Removing..' : 'Remove'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Converter1
