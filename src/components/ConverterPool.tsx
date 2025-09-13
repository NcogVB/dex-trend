import React, { useState, useCallback, useEffect } from 'react'
import { useLiquidity } from '../contexts/LiquidityContext'
import { ethers } from 'ethers'
import { Pool, Position } from '@uniswap/v3-sdk'
import { Token } from '@uniswap/sdk-core'
import {
    POSITION_MANAGER_MINIMAL_ABI,
    UNISWAP_V3_POOL_ABI,
} from '../contexts/ABI'
import Converter1 from './Converter1'

interface LiquidityData {
    poolTokens: number // Liquidity tokens (scaled)
    usdtAmount: number // Amount of USDT in position
    ethAmount: number // Amount of ETH in position
    shareOfPool: number // Percentage of pool owned
    reward: number | null // Uncollected fees (if any)
}

const POSITION_MANAGER_ADDRESS = '0x442d8CCae9d8dd3bc4B21494C0eD1ccF4d24F505'

const ConverterPool: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'exchange' | 'pool'>('pool')
    const { addLiquidity, loading } = useLiquidity()
    const [tokenId, setTokenId] = useState<string>('') // User inputs or fetches tokenId
    const [AddingAmount, setAddingAmount] = useState<number>(100) // Default to 100%
    const [liquidityData, setLiquidityData] = useState<LiquidityData>({
        poolTokens: 0,
        usdtAmount: 0,
        ethAmount: 0,
        shareOfPool: 0,
        reward: null,
    })
    const [isAddingToMetamask, setIsAddingToMetamask] = useState(false)
    const [isAddingLiquidity, setIsAddingLiquidity] = useState(false)

    // Fetch position and pool data to calculate amounts
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

    // Handle adding liquidity
    const handleAddLiquidity = async () => {
        setIsAddingLiquidity(true)
        try {
            await addLiquidity({
                poolAddress: '0x8269d25b908d96169b8e10D0fb12169eF42334e3',
                tokenA: '0x6082626c05B1aDbb6Dea0750788e60b83A88f41f',
                tokenB: '0x1000cCa12d1360CE757734270f8a457127A93DaA',
                amountA: AddingAmount.toString(),
                amountB: AddingAmount.toString(),
            })
            // Optionally update tokenId after minting (requires parsing mint event for tokenId)
            alert('Liquidity added successfully!')
        } catch (error) {
            console.error('Error adding liquidity:', error)
            alert('Failed to add liquidity')
        } finally {
            setIsAddingLiquidity(false)
        }
    }
    const [showConverter1, setShowConverter1] = useState(false)

    // Replace your remove liquidity button click handler
    const handleRemoveLiquidity = () => {
        setShowConverter1(true)
    }

    // Handle adding token to MetaMask
    const handleAddToMetamask = useCallback(async () => {
        setIsAddingToMetamask(true)
        try {
            if (typeof window !== 'undefined' && (window as any).ethereum) {
                await (window as any).ethereum.request({
                    method: 'wallet_watchAsset',
                    params: {
                        type: 'ERC721',
                        options: {
                            address:
                                '0x442d8CCae9d8dd3bc4B21494C0eD1ccF4d24F505', // Mock contract address
                            symbol: 'UNI-V3-POS',
                            tokenId: '1',
                            decimals: 18,
                        },
                    },
                })
            } else {
                alert(
                    'MetaMask not detected. Please install MetaMask to add tokens.'
                )
            }
        } catch (error) {
            console.error('Error adding token to MetaMask:', error)
            alert('Failed to add token to MetaMask')
        } finally {
            setIsAddingToMetamask(false)
        }
    }, [])

    const handleTabChange = (tab: 'exchange' | 'pool') => {
        setActiveTab(tab)
    }
    if (showConverter1) {
        return <Converter1 />
    }
    return (
        <div className="flex items-center justify-center px-4 min-h-screen">
            <div
                className="hero-border w-full p-[3.5px] md:rounded-[40px] rounded-[20px] max-w-[690px]"
                style={{ fontFamily: '"Noto Sans", sans-serif' }}
            >
                <div className="bg-white relative shadow-lg border border-gray-200 w-full md:rounded-[40px] rounded-[20px] px-[15px] md:px-[50px] py-[20px] md:py-[60px]">
                    <div className="relative z-10 border bg-gray-50 inline-flex px-2 py-1.5 rounded-[14px] border-solid border-gray-200 gap-2 mb-[24px]">
                        <button
                            onClick={() => handleTabChange('exchange')}
                            className={`rounded-[8px] font-normal text-sm leading-[100%] px-[22px] py-[13px] transition-all duration-200 ${
                                activeTab === 'exchange'
                                    ? 'bg-white text-[#B91C1C] font-bold'
                                    : 'text-black hover:bg-white/20'
                            }`}
                        >
                            Exchange
                        </button>
                        <button
                            onClick={() => handleTabChange('pool')}
                            className={`rounded-[8px] font-normal text-sm leading-[100%] px-[22px] py-[13px] transition-all duration-200 ${
                                activeTab === 'pool'
                                    ? 'bg-white text-[#B91C1C] font-bold'
                                    : 'text-black hover:bg-white/20'
                            }`}
                        >
                            Pool
                        </button>
                    </div>

                    <div>
                        <h2 className="mb-4 font-bold text-2xl sm:text-3xl leading-[100%] text-black">
                            Your Liquidity
                        </h2>
                        <input
                            type="text"
                            placeholder="Enter Token ID To Load Values"
                            value={tokenId}
                            onChange={(e) => setTokenId(e.target.value)}
                            className="w-full mb-4 p-2 rounded-[8px] border border-[#FFFFFF1A] bg-transparent text-black"
                        />
                        <div className="bg-gray-50 rounded-[12px] px-[18px] py-[22px] text-black border border-solid border-gray-200">
                            <div className="flex items-center space-x-2 mb-2.5">
                                <div className="size-[24px] bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold">
                                    T
                                </div>
                                <div className="size-[24px] bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                                    $
                                </div>
                                <span className="font-bold text-lg leading-[100%]">
                                    USDT - USDC
                                </span>
                            </div>
                            <div className="font-bold text-lg leading-[100%] mb-4">
                                {liquidityData.poolTokens.toFixed(11)}
                            </div>
                            <div className="flex justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                    <div className="size-[30px] bg-yellow-400 rounded-full flex items-center justify-center text-sm font-bold">
                                        T
                                    </div>
                                    <span className="font-normal text-lg leading-[100%]">
                                        USDT
                                    </span>
                                </div>
                                <span className="font-normal text-lg leading-[100%]">
                                    {liquidityData.usdtAmount.toFixed(5)}
                                </span>
                            </div>
                            <div className="flex justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                    <div className="size-[30px] bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold text-white">
                                        $
                                    </div>
                                    <span className="font-normal text-lg leading-[100%]">
                                        USDC
                                    </span>
                                </div>
                                <span className="font-normal text-lg leading-[100%]">
                                    {liquidityData.ethAmount.toFixed(10)}
                                </span>
                            </div>
                            <div className="flex justify-between mb-3 font-normal text-lg leading-[100%]">
                                <span>Reward</span>
                                <span>
                                    {liquidityData.reward
                                        ? liquidityData.reward.toFixed(6)
                                        : '-'}
                                </span>
                            </div>
                            <div className="flex justify-between mb-6 font-normal text-lg leading-[100%]">
                                <span>Share of Pool</span>
                                <span>
                                    {liquidityData.shareOfPool.toFixed(2)}%
                                </span>
                            </div>

                            <div className="mb-4">
                                <label className="block text-lg mb-2">
                                    Add Liquidity
                                </label>
                                <input
                                    type="number"
                                    value={AddingAmount}
                                    onChange={(e) =>
                                        setAddingAmount(Number(e.target.value))
                                    }
                                    className="w-full p-2 rounded-[8px] border border-[#FFFFFF1A] bg-transparent text-black"
                                />
                            </div>
                            <button
                                onClick={handleAddToMetamask}
                                disabled={isAddingToMetamask}
                                className="w-full border-2 border-solid border-[#B91C1C] text-[#B91C1C] rounded-[150px] py-4 font-medium text-lg leading-[17.6px] hover:bg-[#B91C1C] hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                                type="button"
                            >
                                {isAddingToMetamask
                                    ? 'Adding to MetaMask...'
                                    : 'Add SWAP-LP Token To Metamask'}
                            </button>
                            <button
                                onClick={handleRemoveLiquidity} // Changed this line
                                className="w-full bg-[#FF4C4C] text-white rounded-[150px] py-4 font-medium text-lg leading-[17.6px] hover:bg-[#D43F3F] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                type="button"
                            >
                                Remove Liquidity
                            </button>
                        </div>
                        <button
                            onClick={handleAddLiquidity}
                            disabled={isAddingLiquidity || loading}
                            className="mt-10 w-full bg-[#DC2626] text-white rounded-full py-4 flex items-center justify-center gap-3 font-medium text-base leading-[17.6px] hover:bg-[#B91C1C] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            type="button"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="17"
                                height="16"
                                fill="none"
                            >
                                <path
                                    stroke="#fff"
                                    strokeLinecap="round"
                                    strokeWidth="2"
                                    d="M4.5 8h4m0 0h4m-4 0V4m0 4v4"
                                />
                            </svg>
                            {isAddingLiquidity
                                ? 'Adding Liquidity...'
                                : 'Add Liquidity'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ConverterPool
