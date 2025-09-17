import React, { useState, useEffect } from 'react'
import { useLiquidity } from '../contexts/LiquidityContext'
import { useWallet } from '../contexts/WalletContext'
import { ethers } from 'ethers'
import { Token } from '@uniswap/sdk-core'
import { Pool, Position } from '@uniswap/v3-sdk'
import {
    ERC20_ABI,
    POSITION_MANAGER_MINIMAL_ABI,
    UNISWAP_V3_POOL_ABI,
} from '../contexts/ABI'
import JoinCommunity from './JoinCommunity'
import AskExpertsSection from './AskExpertsSection'
import EarnPassiveIncomeSection from './EarnPassiveIncomeSection'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface LiquidityData {
    poolTokens: number
    token0Amount: number
    token1Amount: number
    shareOfPool: number
    reward: number | null
}

// Polygon constants
const POSITION_MANAGER_ADDRESS = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'
const POOL_ADDRESS = '0xA374094527e1673A86dE625aa59517c5dE346d32'
const chainId = 137

const ConverterPool: React.FC = () => {
    const { addLiquidity, loading } = useLiquidity()
    const { provider } = useWallet()

    const [tokenId, setTokenId] = useState<string>('')
    const [AddingAmount, setAddingAmount] = useState<number>(100)
    const [liquidityData, setLiquidityData] = useState<LiquidityData>({
        poolTokens: 0,
        token0Amount: 0,
        token1Amount: 0,
        shareOfPool: 0,
        reward: null,
    })
    const [isAddingLiquidity, setIsAddingLiquidity] = useState(false)

    // === Fetch position data from chain ===
    useEffect(() => {
        if (!tokenId || !provider) return

        const fetchPositionData = async () => {
            try {
                const posManager = new ethers.Contract(
                    POSITION_MANAGER_ADDRESS,
                    POSITION_MANAGER_MINIMAL_ABI,
                    provider
                )
                const poolContract = new ethers.Contract(
                    POOL_ADDRESS,
                    UNISWAP_V3_POOL_ABI,
                    provider
                )

                const pos = await posManager.positions(tokenId)
                const [
                    poolLiquidity,
                    slot0,
                    fee,
                    token0Address,
                    token1Address,
                ] = await Promise.all([
                    poolContract.liquidity(),
                    poolContract.slot0(),
                    poolContract.fee(),
                    poolContract.token0(),
                    poolContract.token1(),
                ])

                const liquidity = pos[7] // uint128
                const tickLower = Number(pos[5])
                const tickUpper = Number(pos[6])
                const tokensOwed0 = pos[10]
                const tokensOwed1 = pos[11]

                // Fetch decimals
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

                const token0 = new Token(chainId, token0Address, Number(dec0))
                const token1 = new Token(chainId, token1Address, Number(dec1))

                const pool = new Pool(
                    token0,
                    token1,
                    Number(fee),
                    slot0[0].toString(),
                    poolLiquidity.toString(),
                    Number(slot0[1])
                )

                const position = new Position({
                    pool,
                    liquidity: liquidity.toString(),
                    tickLower,
                    tickUpper,
                })

                const amount0 = parseFloat(position.amount0.toExact())
                const amount1 = parseFloat(position.amount1.toExact())

                // 3. Compute ratio
                const valueToken0InToken1 =
                    amount0 * parseFloat(pool.token0Price.toSignificant(6))
                const positionValue = valueToken0InToken1 + amount1
                const reward =
                    Number(tokensOwed0) / 10 ** Number(dec0) +
                    Number(tokensOwed1) / 10 ** Number(dec1)

                setLiquidityData({
                    poolTokens: Number(liquidity) / 1e18,
                    token0Amount: amount0,
                    token1Amount: amount1,
                    shareOfPool: positionValue,
                    reward: reward > 0 ? reward : null,
                })
            } catch (err) {
                console.error('Error fetching position data:', err)
            }
        }

        fetchPositionData()
    }, [tokenId, provider])

    // === Add Liquidity ===
    const handleAddLiquidity = async () => {
        setIsAddingLiquidity(true)
        try {
            await addLiquidity({
                amountA: AddingAmount.toString(),
                amountB: AddingAmount.toString(),
            })
            alert('Liquidity added successfully!')
        } catch (error) {
            console.error('Error adding liquidity:', error)
            alert('Failed to add liquidity')
        } finally {
            setIsAddingLiquidity(false)
        }
    }

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
                <div className=" w-full p-[3.5px] md:rounded-[40px] rounded-[20px] max-w-[690px]">
                    <div className="bg-white relative shadow-lg border border-gray-200 w-full md:rounded-[40px] rounded-[20px] px-[15px] md:px-[50px] py-[20px] md:py-[60px]">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-1 rounded-[8px] font-normal text-sm leading-[100%] px-[16px] py-[10px] transition-colors text-black hover:text-[#DC2626]"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </button>
                        {/* Liquidity Info */}
                        <h2 className="mb-4 font-bold text-2xl">
                            Your Liquidity
                        </h2>
                        <input
                            type="text"
                            placeholder="Enter Token ID To Load Values"
                            value={tokenId}
                            onChange={(e) => setTokenId(e.target.value)}
                            className="w-full mb-4 p-2 rounded-[8px] border bg-transparent text-black"
                        />

                        <div className="bg-gray-50 rounded-[12px] px-[18px] py-[22px] text-black border border-solid border-gray-200">
                            <div className="font-bold text-lg mb-4">
                                Pool Tokens:{' '}
                                {liquidityData.poolTokens.toFixed(4)}
                            </div>
                            <div className="flex justify-between mb-2">
                                <span>Wpol</span>
                                <span>
                                    {liquidityData.token0Amount.toFixed(5)}
                                </span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span>USDC.e</span>
                                <span>
                                    {liquidityData.token1Amount.toFixed(5)}
                                </span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span>Reward</span>
                                <span>
                                    {liquidityData.reward
                                        ? liquidityData.reward.toFixed(6)
                                        : '-'}
                                </span>
                            </div>
                            <div className="flex justify-between mb-6">
                                <span>Position Value</span>
                                <span>
                                    {liquidityData.shareOfPool.toFixed(2)}
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
                                    className="w-full p-2 rounded-[8px] border bg-transparent text-black"
                                />
                            </div>

                            <button
                                onClick={handleAddLiquidity}
                                disabled={isAddingLiquidity || loading}
                                className="mt-10 w-full bg-[#DC2626] text-white rounded-full py-4 cursor-pointer font-semibold text-lg hover:bg-[#DC2626] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isAddingLiquidity
                                    ? 'Adding Liquidity...'
                                    : 'Add Liquidity'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <section className="md:py-[90px] py-[40px] px-4">
                <h2 className="font-medium lg:text-[64px] sm:text-[48px] text-[32px] md:leading-[70.4px] leading-[50px] text-center text-[#DC2626] max-w-[514px] mx-auto">
                    How
                    <span className="text-[#DC2626]">Pool </span>Exchange Works
                </h2>
                <p className="font-normal md:text-base text-xs md:leading-[25px] text-center text-[#DC2626] max-w-[910px] mx-auto pt-[30px]">
                    Dextrend provides intuitive liquidity tools and clear
                    insights so you can add, manage, and track your positions
                    with confidence. Built for speed and clarity, optimized for
                    all devices.
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

export default ConverterPool
