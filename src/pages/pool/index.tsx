import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { ethers } from "ethers";
import { Token } from "@uniswap/sdk-core";
import { Pool as UniPool, Position } from "@uniswap/v3-sdk";
import { useWallet } from "../../contexts/WalletContext";

const POSITION_MANAGER_ADDRESS = "0xe4ae6F10ee1C8e2465D9975cb3325267A2025549";
const FACTORY_ADDRESS = "0x83DEFEcaF6079504E2DD1DE2c66DCf3046F7bDD7";

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

                    // ✅ Hard safeguard against undefined decimals
                    const dec0 = Number.isFinite(data0.decimals) ? data0.decimals : 18;
                    const dec1 = Number.isFinite(data1.decimals) ? data1.decimals : 18;

                    const chainId = 1476;
                    const token0Obj = new Token(
                        chainId,
                        ethers.getAddress(token0),
                        dec0,
                        data0.symbol,
                        data0.symbol
                    );
                    const token1Obj = new Token(
                        chainId,
                        ethers.getAddress(token1),
                        dec1,
                        data1.symbol,
                        data1.symbol
                    );

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

            setPositions(enriched);
        } catch (err) {
            console.error("Error fetching positions:", err);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div>
            <div className="hero-section">
                <div className="flex-grow flex flex-col items-center px-4 pt-[40px] md:pt-[88px] container mx-auto w-full">
                    <div className="modern-card mt-[56px] w-full max-w-[690px] mx-auto px-4">
                        <div className="w-full px-[20px] md:px-[40px] py-[30px] md:py-[40px]">
                            {/* Tabs */}
                            <div className="relative z-10 bg-[#F8F8F8] inline-flex px-2 py-1.5 rounded-[8px] border border-[#E5E5E5] mb-6 gap-1">
                                <Link
                                    to="/swap"
                                    className="rounded-[6px] text-[#888888] font-medium text-sm px-[20px] py-[10px] cursor-pointer hover:text-[#333333] transition-colors"
                                >
                                    Exchange
                                </Link>
                                <Link
                                    to="/pool"
                                    className="rounded-[6px] bg-white text-[#DC2626] font-semibold text-sm px-[20px] py-[10px] cursor-pointer shadow-sm"
                                >
                                    Pool
                                </Link>
                            </div>

                            {/* Buttons */}
                            <Link
                                to="/addlp"
                                className="modern-button relative z-10 w-full flex items-center justify-center space-x-2 mb-6 py-4 !bg-red-600 !text-white hover:!bg-red-700"
                            >
                                <Wallet />
                                <span>Add Liquidity</span>
                            </Link>

                            <Link
                                to="/removelp"
                                className="modern-button relative z-10 w-full flex items-center justify-center space-x-2 mb-6 py-4 !bg-red-600 !text-white hover:!bg-red-700"
                            >
                                <Wallet />
                                <span>Remove Liquidity</span>
                            </Link>

                            {/* Positions */}
                            <div className="relative z-10 modern-card p-6 text-center">
                                {loading ? (
                                    <p className="text-gray-500">Loading positions...</p>
                                ) : positions.length > 0 ? (
                                    <div className="max-h-[420px] overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                        {positions.map((p) => (
                                            <div
                                                key={p.tokenId}
                                                className="border border-gray-200 rounded-lg p-3 bg-gray-50 text-left shadow-sm hover:shadow-md transition-all duration-200"
                                            >
                                                <div className="flex justify-between items-center mb-1">
                                                    <div className="font-semibold text-red-600 text-sm">
                                                        #{p.tokenId}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {(Number(p.fee) / 10000).toFixed(2)}% fee
                                                    </div>
                                                </div>

                                                <div className="text-sm text-gray-800 font-medium mb-2">
                                                    {p.symbol0}/{p.symbol1}
                                                </div>

                                                <div className="flex flex-col text-xs text-gray-700 space-y-1">
                                                    <div>
                                                        {p.symbol0}:{" "}
                                                        <span className="font-semibold">
                                                            {p.amount0.toFixed(6)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        {p.symbol1}:{" "}
                                                        <span className="font-semibold">
                                                            {p.amount1.toFixed(6)}
                                                        </span>
                                                    </div>
                                                    <div className="text-gray-500">
                                                        Tick range: {p.tickLower} → {p.tickUpper}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-[#333333] font-semibold text-xl leading-7 max-w-[380px] mx-auto">
                                        {account
                                            ? "No active liquidity positions found."
                                            : "Connect your wallet to view positions."}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Pool;
