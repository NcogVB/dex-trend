import React, { useState, useEffect, useCallback } from 'react'
import { Token } from '@uniswap/sdk-core'
import { Pool, Position } from '@uniswap/v3-sdk'
import { ethers } from 'ethers'
import {
    ERC20_ABI,
    POSITION_MANAGER_MINIMAL_ABI,
    UNISWAP_V3_POOL_ABI,
} from '../contexts/ABI'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Search, Wallet, AlertCircle } from 'lucide-react'
import { useWallet } from '../contexts/WalletContext'
import { useLiquidity } from '../hooks/useLiquidity'

// ✅ FIX 1: Corrected Factory Address (Removed extra 'A')
const POSITION_MANAGER_ADDRESS = "0xc2A219227E7927529D62d9922a5Ff80627dD754F";
const FACTORY_ADDRESS = "0x339A0Da8ffC7a6fc98Bf2FC53a17dEEf36F0D9c3";

const FACTORY_ABI = [
    "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address)"
];

interface LiquidityData {
    tokenId: string
    symbol0: string
    symbol1: string
    amount0: number
    amount1: number
    fee: number
    shareOfPool: number
    unclaimedFees0: number
    unclaimedFees1: number
    price0per1: number
    price1per0: number
}

const RemoveLiquidity: React.FC = () => {
    const { provider, account } = useWallet()
    const { removeLiquidity } = useLiquidity()
    const navigate = useNavigate()

    const [tokenId, setTokenId] = useState<string>("")
    const [percentage, setPercentage] = useState<number>(25)
    const [liquidityData, setLiquidityData] = useState<LiquidityData | null>(null)
    
    const [isFetching, setIsFetching] = useState(false)
    const [isRemoving, setIsRemoving] = useState(false)
    const [error, setError] = useState<string>("")

    const fetchPositionData = useCallback(async () => {
        if (!tokenId || !provider) return;
        
        setIsFetching(true);
        setError("");
        setLiquidityData(null);

        try {
            if (!ethers.isAddress(POSITION_MANAGER_ADDRESS) || !ethers.isAddress(FACTORY_ADDRESS)) {
                throw new Error("Invalid Contract Configuration Addresses");
            }

            const positionManager = new ethers.Contract(
                POSITION_MANAGER_ADDRESS,
                POSITION_MANAGER_MINIMAL_ABI,
                provider
            );
            const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);

            let pos;
            try {
                pos = await positionManager.positions(BigInt(tokenId));
            } catch (e) {
                console.error(e);
                throw new Error("Token ID not found or invalid.");
            }

            // ✅ FIX 2: Sanitize addresses returned from contract to prevent ENS errors
            const token0Addr = ethers.getAddress(pos.token0 || pos[2]);
            const token1Addr = ethers.getAddress(pos.token1 || pos[3]);
            
            const fee = Number(pos.fee || pos[4]);
            const tickLower = Number(pos.tickLower || pos[5]);
            const tickUpper = Number(pos.tickUpper || pos[6]);
            const liquidityBI = pos.liquidity || pos[7];

            // 3. Get Pool Address (Now safe because inputs are checksummed)
            const poolAddress = await factory.getPool(token0Addr, token1Addr, fee);
            
            if (!poolAddress || poolAddress === ethers.ZeroAddress) {
                throw new Error("Liquidity Pool does not exist for this pair.");
            }

            const poolContract = new ethers.Contract(poolAddress, UNISWAP_V3_POOL_ABI, provider);
            const token0Contract = new ethers.Contract(token0Addr, ERC20_ABI, provider);
            const token1Contract = new ethers.Contract(token1Addr, ERC20_ABI, provider);

            const [slot0, liquidityPoolBI, dec0, dec1, sym0, sym1] = await Promise.all([
                poolContract.slot0(),
                poolContract.liquidity(),
                token0Contract.decimals(),
                token1Contract.decimals(),
                token0Contract.symbol(),
                token1Contract.symbol()
            ]);

            const sqrtPriceX96 = slot0[0].toString();
            const tick = Number(slot0[1]);

            // 5. Construct SDK Objects
            const chainId = 1476; 
            const token0 = new Token(chainId, token0Addr, Number(dec0), sym0, sym0);
            const token1 = new Token(chainId, token1Addr, Number(dec1), sym1, sym1);

            const pool = new Pool(token0, token1, fee, sqrtPriceX96, liquidityPoolBI.toString(), tick);
            const position = new Position({
                pool,
                liquidity: liquidityBI.toString(),
                tickLower,
                tickUpper,
            });

            // 6. Calculate Amounts
            const amount0 = Number(position.amount0.toSignificant(6));
            const amount1 = Number(position.amount1.toSignificant(6));
            const price0per1 = Number(pool.token0Price.toSignificant(6));
            const price1per0 = Number(pool.token1Price.toSignificant(6));

            const share = Number(liquidityPoolBI) > 0 
                ? (Number(liquidityBI) / Number(liquidityPoolBI)) * 100 
                : 0;

            const tokensOwed0 = pos.tokensOwed0 || pos[10];
            const tokensOwed1 = pos.tokensOwed1 || pos[11];
            
            const fees0 = tokensOwed0 ? Number(ethers.formatUnits(tokensOwed0, dec0)) : 0;
            const fees1 = tokensOwed1 ? Number(ethers.formatUnits(tokensOwed1, dec1)) : 0;

            setLiquidityData({
                tokenId,
                symbol0: sym0,
                symbol1: sym1,
                amount0,
                amount1,
                fee,
                shareOfPool: share,
                unclaimedFees0: fees0,
                unclaimedFees1: fees1,
                price0per1,
                price1per0
            });

        } catch (err: any) {
            console.error("Error fetching position:", err);
            if (err.code === 'INVALID_ARGUMENT') {
                setError("Invalid Token ID or Network Error.");
            } else {
                setError(err.message || "Failed to fetch position data");
            }
        } finally {
            setIsFetching(false);
        }
    }, [tokenId, provider]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (tokenId && tokenId.length > 0) fetchPositionData();
        }, 800);
        return () => clearTimeout(timeout);
    }, [tokenId, fetchPositionData]);

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPercentage(Number(e.target.value));
    };

    const handleRemove = async () => {
        if (!tokenId || !liquidityData) return;
        if (percentage <= 0 || percentage > 100) {
            alert('Please select a valid percentage');
            return;
        }

        setIsRemoving(true);
        try {
            await removeLiquidity(Number(tokenId), percentage);
            alert('✅ Liquidity removed successfully!');
            await fetchPositionData();
            setPercentage(0);
        } catch (error: any) {
            console.error('Error removing liquidity:', error);
            alert(`❌ Failed to remove liquidity: ${error.reason || error.message}`);
        } finally {
            setIsRemoving(false);
        }
    };

    const receive0 = liquidityData ? (liquidityData.amount0 * percentage) / 100 : 0;
    const receive1 = liquidityData ? (liquidityData.amount1 * percentage) / 100 : 0;

    return (
        <div className="flex items-center justify-center px-4 min-h-[90vh] bg-gray-50/50">
            <div className="w-full max-w-[600px]">
                <div className="bg-white shadow-xl border border-gray-100 rounded-[32px] overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                            <span className="font-medium text-sm">Back</span>
                        </button>
                        <h2 className="text-xl font-bold text-gray-800">Remove Liquidity</h2>
                        <div className="w-8"></div>
                    </div>

                    <div className="p-8 space-y-8">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Position ID (NFT)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    placeholder="e.g. 12345"
                                    value={tokenId}
                                    onChange={(e) => setTokenId(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-500 outline-none transition-all font-mono text-lg"
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            </div>
                            {isFetching && <div className="mt-3 flex items-center gap-2 text-red-600 text-sm animate-pulse"><Loader2 className="w-4 h-4 animate-spin" /> Fetching position data...</div>}
                            {error && <div className="mt-3 flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded-lg"><AlertCircle className="w-4 h-4" /> {error}</div>}
                        </div>

                        {liquidityData && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-red-50/50 border border-red-100 rounded-2xl p-5 mb-8">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex -space-x-2">
                                                <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-bold">{liquidityData.symbol0[0]}</div>
                                                <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-[10px] font-bold">{liquidityData.symbol1[0]}</div>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800">{liquidityData.symbol0} / {liquidityData.symbol1}</h3>
                                                <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">{(liquidityData.fee / 10000).toFixed(2)}% Fee</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500">Pool Share</p>
                                            <p className="font-bold text-gray-800">{liquidityData.shareOfPool.toFixed(4)}%</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="bg-white p-3 rounded-xl border border-red-100/50">
                                            <span className="text-gray-500 block text-xs mb-1">Total {liquidityData.symbol0}</span>
                                            <span className="font-mono font-medium">{liquidityData.amount0.toFixed(6)}</span>
                                        </div>
                                        <div className="bg-white p-3 rounded-xl border border-red-100/50">
                                            <span className="text-gray-500 block text-xs mb-1">Total {liquidityData.symbol1}</span>
                                            <span className="font-mono font-medium">{liquidityData.amount1.toFixed(6)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <div className="flex justify-between items-end mb-4">
                                        <label className="text-sm font-bold text-gray-700">Amount to Remove</label>
                                        <span className="text-2xl font-bold text-red-600">{percentage}%</span>
                                    </div>
                                    <input type="range" min="0" max="100" value={percentage} onChange={handleSliderChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600" />
                                    <div className="flex justify-between gap-2 mt-4">
                                        {[25, 50, 75, 100].map((val) => (
                                            <button key={val} onClick={() => setPercentage(val)} className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${percentage === val ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{val}%</button>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 space-y-4">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">You will receive</p>
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-gray-700 text-lg">{liquidityData.symbol0}</span>
                                        <div className="text-right">
                                            <span className="font-bold text-xl block">{receive0.toFixed(6)}</span>
                                            {liquidityData.unclaimedFees0 > 0 && <span className="text-xs text-green-600 font-medium">+ {liquidityData.unclaimedFees0.toFixed(6)} Fees</span>}
                                        </div>
                                    </div>
                                    <div className="border-t border-gray-200"></div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-gray-700 text-lg">{liquidityData.symbol1}</span>
                                        <div className="text-right">
                                            <span className="font-bold text-xl block">{receive1.toFixed(6)}</span>
                                            {liquidityData.unclaimedFees1 > 0 && <span className="text-xs text-green-600 font-medium">+ {liquidityData.unclaimedFees1.toFixed(6)} Fees</span>}
                                        </div>
                                    </div>
                                </div>

                                <button onClick={handleRemove} disabled={isRemoving || percentage === 0 || !account} className={`w-full mt-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 ${isRemoving || percentage === 0 ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none" : "bg-[#DC2626] text-white hover:bg-red-700"}`}>
                                    {isRemoving ? <><Loader2 className="animate-spin w-5 h-5" /> Confirming Transaction...</> : !account ? "Connect Wallet" : percentage === 0 ? "Enter Percentage" : "Remove Liquidity"}
                                </button>
                            </div>
                        )}
                        {!liquidityData && !isFetching && !error && <div className="text-center py-10 opacity-50"><Wallet className="w-12 h-12 mx-auto mb-3 text-gray-400" /><p className="text-gray-500">Enter a Position ID to load details.</p></div>}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default RemoveLiquidity