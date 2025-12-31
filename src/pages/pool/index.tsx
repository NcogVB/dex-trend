import { useEffect, useState } from "react";
import { Wallet, Plus, Minus, Layers, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { ethers } from "ethers";
import { Token } from "@uniswap/sdk-core";
import { Pool as UniPool, Position } from "@uniswap/v3-sdk";
import { useWallet } from "../../contexts/WalletContext";

const POSITION_MANAGER_ADDRESS = "0xc2A219227E7927529D62d9922a5Ff80627dD754F";
const FACTORY_ADDRESS = "0x339A0Da8ffC7a6fc98Bf2FC53a17dEEf36F0D9c3";

const POSITION_MANAGER_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
    "function positions(uint256 tokenId) view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)"
];

const FACTORY_ABI = [
    "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"
];

const UNISWAP_V3_POOL_ABI = [
    "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
    "function liquidity() view returns (uint128)",
    "function token0() view returns (address)",
    "function token1() view returns (address)",
    "function fee() view returns (uint24)"
];

const ERC20_ABI = [
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)"
];

interface PositionInfo {
    tokenId: string;
    token0: string;
    token1: string;
    symbol0: string;
    symbol1: string;
    fee: number;
    amount0: number;
    amount1: number;
    tickLower: number;
    tickUpper: number;
}

const Pool = () => {
    const { provider, account } = useWallet();
    const [positions, setPositions] = useState<PositionInfo[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!account || !provider) return;
        fetchPositions();
    }, [account, provider]);

    const fetchPositions = async () => {
        try {
            setLoading(true);

            const positionManager = new ethers.Contract(
                POSITION_MANAGER_ADDRESS,
                POSITION_MANAGER_ABI,
                provider
            );
            const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);

            const balance = await positionManager.balanceOf(account);
            const count = Number(balance);
            if (count === 0) {
                setPositions([]);
                return;
            }

            const tokenIds = await Promise.all(
                Array.from({ length: count }, (_, i) =>
                    positionManager.tokenOfOwnerByIndex(account, i)
                )
            );

            const rawPositions = await Promise.all(
                tokenIds.map((id) => positionManager.positions(id))
            );

            // Cache for token metadata
            const tokenCache = new Map<string, { symbol: string; decimals: number }>();

            async function getTokenData(address: string) {
                if (tokenCache.has(address)) return tokenCache.get(address)!;

                const tokenContract = new ethers.Contract(address, ERC20_ABI, provider);

                let symbol = "UNKNOWN";
                let decimals = 18; // default fallback

                try {
                    const sym = await tokenContract.symbol();
                    if (sym && typeof sym === "string") symbol = sym;
                } catch (err) {
                    console.warn("⚠️ Symbol fetch failed for", address);
                }

                try {
                    const dec = await tokenContract.decimals();
                    if (dec !== null && dec !== undefined && !isNaN(Number(dec))) {
                        decimals = Number(dec);
                    }
                } catch (err) {
                    console.warn("⚠️ Decimals fetch failed for", address, "— defaulting to 18");
                }

                tokenCache.set(address, { symbol, decimals });
                return { symbol, decimals };
            }

            const enriched = await Promise.all(
                rawPositions.map(async (pos, idx) => {
                    const token0Addr = pos.token0;
                    const token1Addr = pos.token1;
                    const fee = Number(pos.fee);
                    const tickLower = Number(pos.tickLower);
                    const tickUpper = Number(pos.tickUpper);
                    const liquidityBN = pos.liquidity;

                    const poolAddress = await factory.getPool(token0Addr, token1Addr, fee);
                    if (poolAddress === ethers.ZeroAddress) {
                        return {
                            tokenId: tokenIds[idx].toString(),
                            token0: token0Addr,
                            token1: token1Addr,
                            symbol0: "UNKNOWN",
                            symbol1: "UNKNOWN",
                            fee,
                            amount0: 0,
                            amount1: 0,
                            tickLower,
                            tickUpper,
                        };
                    }

                    const poolContract = new ethers.Contract(
                        poolAddress,
                        UNISWAP_V3_POOL_ABI,
                        provider
                    );

                    const [slot0, poolLiquidity, token0, token1, poolFee] = await Promise.all([
                        poolContract.slot0(),
                        poolContract.liquidity(),
                        poolContract.token0(),
                        poolContract.token1(),
                        poolContract.fee(),
                    ]);

                    const [data0, data1] = await Promise.all([
                        getTokenData(token0),
                        getTokenData(token1),
                    ]);

                    const dec0 = Number.isFinite(data0.decimals) ? data0.decimals : 18;
                    const dec1 = Number.isFinite(data1.decimals) ? data1.decimals : 18;

                    const chainId = 1476;
                    const token0Obj = new Token(chainId, ethers.getAddress(token0), dec0, data0.symbol, data0.symbol);
                    const token1Obj = new Token(chainId, ethers.getAddress(token1), dec1, data1.symbol, data1.symbol);

                    const pool = new UniPool(
                        token0Obj,
                        token1Obj,
                        Number(poolFee),
                        slot0[0].toString(),
                        poolLiquidity.toString(),
                        Number(slot0[1])
                    );

                    const position = new Position({
                        pool,
                        liquidity: liquidityBN.toString(),
                        tickLower,
                        tickUpper,
                    });

                    let amount0 = 0;
                    let amount1 = 0;

                    try {
                        amount0 = Number(position.amount0.toSignificant(6));
                        amount1 = Number(position.amount1.toSignificant(6));
                    } catch (err) {
                        console.warn("⚠️ Failed to compute amounts for position", tokenIds[idx].toString());
                    }

                    return {
                        tokenId: tokenIds[idx].toString(),
                        token0: token0Addr,
                        token1: token1Addr,
                        symbol0: data0.symbol,
                        symbol1: data1.symbol,
                        fee,
                        amount0,
                        amount1,
                        tickLower,
                        tickUpper,
                    };
                })
            );
            const validPositions = enriched.filter((p): p is PositionInfo => {
                if (p === null) return false;
                // Keep if at least one token amount is greater than 0
                return p.amount0 > 0 || p.amount1 > 0;
            });
            setPositions(validPositions);
        } catch (err) {
            console.error("Error fetching positions:", err);
        } finally {
            setLoading(false);
        }
    };

    const SkeletonLoader = () => (
        <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 bg-gray-100 rounded-xl w-full border border-gray-200" />
            ))}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50/50">
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                {/* Header Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                    {/* Navigation Pills */}
                    <div className="flex justify-center mb-8">
                        <div className="inline-flex bg-gray-100/80 p-1.5 rounded-xl border border-gray-200">
                            <Link
                                to="/swap"
                                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
                            >
                                Swap
                            </Link>
                            <Link
                                to="/pool"
                                className="px-6 py-2.5 rounded-lg bg-white text-red-600 font-bold text-sm shadow-sm ring-1 ring-black/5"
                            >
                                Pool
                            </Link>
                        </div>
                    </div>

                    {/* Action Buttons Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <Link
                            to="/addlp"
                            className="flex flex-col items-center justify-center p-4 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl border border-red-200 transition-all duration-200 group"
                        >
                            <div className="bg-white p-2.5 rounded-full mb-2 shadow-sm group-hover:scale-110 transition-transform">
                                <Plus size={20} className="text-red-600" />
                            </div>
                            <span className="font-bold text-sm">New Position</span>
                        </Link>

                        <Link
                            to="/removelp"
                            className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-200 transition-all duration-200 group"
                        >
                            <div className="bg-white p-2.5 rounded-full mb-2 shadow-sm group-hover:scale-110 transition-transform">
                                <Minus size={20} className="text-gray-600" />
                            </div>
                            <span className="font-bold text-sm">Remove Liquidity</span>
                        </Link>
                    </div>
                </div>

                {/* Positions Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Layers size={18} className="text-red-500" />
                            Your Positions
                        </h3>
                        {positions.length > 0 && !loading && (
                            <span className="bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
                                {positions.length}
                            </span>
                        )}
                    </div>

                    <div className="p-6">
                        {!account ? (
                            <div className="text-center py-12">
                                <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Wallet className="w-8 h-8 text-orange-500" />
                                </div>
                                <h4 className="text-gray-900 font-bold mb-1">Wallet Not Connected</h4>
                                <p className="text-gray-500 text-sm mb-4">Connect your wallet to view your liquidity positions.</p>
                            </div>
                        ) : loading ? (
                            <SkeletonLoader />
                        ) : positions.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200">
                                    <AlertCircle className="w-8 h-8 text-gray-400" />
                                </div>
                                <h4 className="text-gray-900 font-bold mb-1">No Active Positions</h4>
                                <p className="text-gray-500 text-sm mb-6">You don't have any liquidity positions yet.</p>
                                <Link
                                    to="/addlp"
                                    className="inline-flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-red-700 transition"
                                >
                                    <Plus size={16} />
                                    Create Your First Position
                                </Link>
                            </div>
                        ) : (
                            /* POSITIONS LIST */
                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                                {positions.map((p) => (
                                    <div
                                        key={p.tokenId}
                                        className="relative bg-white border border-gray-200 rounded-xl p-5 hover:border-red-200 hover:shadow-md transition-all duration-200"
                                    >
                                        {/* Position Header */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex -space-x-2">
                                                    <div className="w-9 h-9 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                                                        {p.symbol0[0]}
                                                    </div>
                                                    <div className="w-9 h-9 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                                                        {p.symbol1[0]}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 flex items-center gap-2">
                                                        {p.symbol0} / {p.symbol1}
                                                        <span className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded border border-gray-200">
                                                            {(Number(p.fee) / 10000).toFixed(2)}%
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-green-600 font-medium flex items-center gap-1 mt-0.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                        In Range
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-mono text-gray-400 block">ID: #{p.tokenId}</span>
                                            </div>
                                        </div>

                                        {/* Liquidity Info */}
                                        <div className="grid grid-cols-2 gap-4 bg-gray-50/50 rounded-lg p-3 border border-gray-100">
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-bold mb-1">
                                                    {p.symbol0} Deposit
                                                </p>
                                                <p className="font-mono font-medium text-gray-800 text-sm">
                                                    {p.amount0.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-bold mb-1">
                                                    {p.symbol1} Deposit
                                                </p>
                                                <p className="font-mono font-medium text-gray-800 text-sm">
                                                    {p.amount1.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Tick Range Info */}
                                        <div className="mt-3 flex justify-between items-center text-[11px] text-gray-400 font-medium px-1">
                                            <span>Min Tick: {p.tickLower}</span>
                                            <span className="text-gray-300">|</span>
                                            <span>Max Tick: {p.tickUpper}</span>
                                        </div>

                                        {/* ACTIONS FOOTER */}
                                        <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
                                            {/* Increase Liquidity Button */}
                                            <Link
                                                to={`/addlp/${p.tokenId}`}
                                                className="flex items-center justify-center gap-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 py-2.5 rounded-lg text-xs font-bold transition-all active:scale-[0.98]"
                                            >
                                                <Plus size={14} />
                                                Increase Liquidity
                                            </Link>

                                            {/* Remove Liquidity Button */}
                                            <Link
                                                to={`/removelp/${p.tokenId}`}
                                                className="flex items-center justify-center gap-2 bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 py-2.5 rounded-lg text-xs font-bold transition-all active:scale-[0.98]"
                                            >
                                                <Minus size={14} />
                                                Remove Liquidity
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Pool;