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
import Converter1 from './Converter1'

interface LiquidityData {
    poolTokens: number
    token0Amount: number
    token1Amount: number
    shareOfPool: number
    reward: number | null
}

// Polygon constants
const POSITION_MANAGER_ADDRESS = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'
const POOL_ADDRESS = '0x45dDa9cb7c25131DF268515131f647d726f50608'
const chainId = 137

const ConverterPool: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'exchange' | 'pool'>('pool')
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
    const [showConverter1, setShowConverter1] = useState(false)

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
                const [poolLiquidity, slot0, fee, token0Address, token1Address] =
                    await Promise.all([
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
                const token0Contract = new ethers.Contract(token0Address, ERC20_ABI, provider)
                const token1Contract = new ethers.Contract(token1Address, ERC20_ABI, provider)
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
                const valueToken0InToken1 = amount0 * parseFloat(pool.token0Price.toSignificant(6))
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

    // === Remove Liquidity ===
    const handleRemoveLiquidity = () => {
        setShowConverter1(true)
    }

    if (showConverter1) {
        return <Converter1 />
    }

    return (
        <div className="flex items-center justify-center px-4 min-h-screen">
            <div className="hero-border w-full p-[3.5px] md:rounded-[40px] rounded-[20px] max-w-[690px]">
                <div className="bg-white relative shadow-lg border border-gray-200 w-full md:rounded-[40px] rounded-[20px] px-[15px] md:px-[50px] py-[20px] md:py-[60px]">

                    {/* Tabs */}
                    <div className="relative z-10 border bg-gray-50 inline-flex px-2 py-1.5 rounded-[14px] border-solid border-gray-200 gap-2 mb-[24px]">
                        <button
                            onClick={() => setActiveTab('exchange')}
                            className={`rounded-[8px] px-[22px] py-[13px] text-sm ${activeTab === 'exchange' ? 'bg-white text-[#B91C1C] font-bold' : 'text-black'}`}
                        >
                            Exchange
                        </button>
                        <button
                            onClick={() => setActiveTab('pool')}
                            className={`rounded-[8px] px-[22px] py-[13px] text-sm ${activeTab === 'pool' ? 'bg-white text-[#B91C1C] font-bold' : 'text-black'}`}
                        >
                            Pool
                        </button>
                    </div>

                    {/* Liquidity Info */}
                    <h2 className="mb-4 font-bold text-2xl">Your Liquidity</h2>
                    <input
                        type="text"
                        placeholder="Enter Token ID To Load Values"
                        value={tokenId}
                        onChange={(e) => setTokenId(e.target.value)}
                        className="w-full mb-4 p-2 rounded-[8px] border bg-transparent text-black"
                    />

                    <div className="bg-gray-50 rounded-[12px] px-[18px] py-[22px] text-black border border-solid border-gray-200">
                        <div className="font-bold text-lg mb-4">
                            Pool Tokens: {liquidityData.poolTokens.toFixed(4)}
                        </div>
                        <div className="flex justify-between mb-2">
                            <span>Token0</span>
                            <span>{liquidityData.token0Amount.toFixed(5)}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                            <span>Token1</span>
                            <span>{liquidityData.token1Amount.toFixed(5)}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                            <span>Reward</span>
                            <span>{liquidityData.reward ? liquidityData.reward.toFixed(6) : '-'}</span>
                        </div>
                        <div className="flex justify-between mb-6">
                            <span>Position Value</span>
                            <span>{liquidityData.shareOfPool.toFixed(2)}</span>
                        </div>

                        <div className="mb-4">
                            <label className="block text-lg mb-2">Add Liquidity</label>
                            <input
                                type="number"
                                value={AddingAmount}
                                onChange={(e) => setAddingAmount(Number(e.target.value))}
                                className="w-full p-2 rounded-[8px] border bg-transparent text-black"
                            />
                        </div>

                        <button
                            onClick={handleAddLiquidity}
                            disabled={isAddingLiquidity || loading}
                            className="mt-10 w-full bg-[#DC2626] text-white rounded-full py-4"
                        >
                            {isAddingLiquidity ? 'Adding Liquidity...' : 'Add Liquidity'}
                        </button>
                    </div>
                    <button
                        onClick={handleRemoveLiquidity}
                        className="w-full bg-[#FF4C4C] text-white rounded-[150px] py-4"
                    >
                        Remove Liquidity
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ConverterPool
