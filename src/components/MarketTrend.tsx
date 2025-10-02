import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { TOKENS } from '../utils/SwapTokens';

interface Token {
    symbol: string;
    name: string;
    address: string;
    img: string;
}

interface PoolData {
    id: number;
    name: string;
    symbol: string;
    price: string;
    change: string;
    changeType: 'positive' | 'negative';
    icon: string;
    liquidity: string;
    tokenAddress: string;
}


const USDT_ADDRESS = "0x188D71EE19cB9976213BBa3867ED5EdAA04e6E78";
const FACTORY_ADDRESS = "0x83DEFEcaF6079504E2DD1DE2c66DCf3046F7bDD7"; // Replace with actual factory address
const RPC_URL = "https://api.skyhighblockchain.com";
const FIXED_FEE = 500;

const FACTORY_ABI = [
    "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"
];

const POOL_ABI = [
    "function liquidity() external view returns (uint128)",
    "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
    "function token0() external view returns (address)",
    "function token1() external view returns (address)"
];

const MarketTrend: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string>('All');
    const [poolsData, setPoolsData] = useState<PoolData[]>([]);
    const [loading, setLoading] = useState(true);
    const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);

    useEffect(() => {
        const rpcProvider = new ethers.JsonRpcProvider(RPC_URL);
        setProvider(rpcProvider);
    }, []);

    useEffect(() => {
        if (provider && activeTab === 'All') {
            fetchTopPools();
        }
    }, [provider, activeTab]);

    const fetchTopPools = async () => {
        if (!provider) return;

        setLoading(true);
        try {
            const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
            const poolDataPromises: Promise<PoolData | null>[] = [];

            // Get all token pairs with USDT (excluding USDT itself)
            const otherTokens = TOKENS.filter(t => t.address.toLowerCase() !== USDT_ADDRESS.toLowerCase());

            for (const token of otherTokens) {
                poolDataPromises.push(fetchPoolData(factory, token, provider));
            }

            const results = await Promise.all(poolDataPromises);
            const validPools = results.filter((p): p is PoolData => p !== null);

            // Sort by liquidity (descending) and take top 10
            const sortedPools = validPools.sort((a, b) => {
                const liquidityA = parseFloat(a.liquidity);
                const liquidityB = parseFloat(b.liquidity);
                return liquidityB - liquidityA;
            }).slice(0, 10);

            // Add sequential IDs
            const poolsWithIds = sortedPools.map((pool, index) => ({
                ...pool,
                id: index + 1
            }));

            setPoolsData(poolsWithIds);
        } catch (error) {
            console.error("Error fetching pools:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPoolData = async (
        factory: ethers.Contract,
        token: Token,
        provider: ethers.JsonRpcProvider
    ): Promise<PoolData | null> => {
        try {
            const poolAddress = await factory.getPool(token.address, USDT_ADDRESS, FIXED_FEE);

            if (poolAddress === ethers.ZeroAddress) {
                return null;
            }

            const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);
            const [slot0, liquidity, token0] = await Promise.all([
                poolContract.slot0(),
                poolContract.liquidity(),
                poolContract.token0()
            ]);

            // Calculate price (token/USDT)
            const sqrtPriceX96 = BigInt(slot0.sqrtPriceX96);
            const priceX192 = sqrtPriceX96 * sqrtPriceX96;
            const rawPrice = Number(priceX192) / Number(1n << 192n);

            // Adjust price based on token order (both have 18 decimals)
            const price = token0.toLowerCase() === token.address.toLowerCase()
                ? rawPrice
                : 1 / rawPrice;

            // Format liquidity
            const liquidityValue = Number(liquidity) / 1e18;

            // Mock 24h change (you'd fetch this from price history)
            const mockChange = (Math.random() * 10 - 5).toFixed(2);
            const changeType = parseFloat(mockChange) >= 0 ? 'positive' : 'negative';

            return {
                id: 0, // Will be set later
                name: token.name,
                symbol: `${token.symbol}/USDT`,
                price: `$${price.toFixed(4)}`,
                change: `${mockChange}%`,
                changeType,
                icon: token.img,
                liquidity: liquidityValue.toFixed(2),
                tokenAddress: token.address
            };
        } catch (error) {
            console.error(`Error fetching pool for ${token.symbol}:`, error);
            return null;
        }
    };

    const tabs = ['All', 'DeFi', 'Innovation', 'POS', 'POW', 'Storage'];

    const renderCryptoItem = (crypto: PoolData) => (
        <div
            key={crypto.id}
            className="flex items-center min-h-[72px] hover:bg-gray-50 transition-colors duration-200"
        >
            <div className="p-2.5 w-full max-w-[60px] text-[#535862] font-normal flex items-center justify-center">
                {crypto.id}
            </div>
            <div className="p-2.5 w-full max-w-[350px]">
                <div className="flex items-center gap-[30px]">
                    <img
                        className="size-[36px] min-w-[36px] rounded-full object-cover"
                        src={crypto.icon}
                        alt={crypto.name}
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/36';
                        }}
                    />
                    <h4 className="font-medium text-[#181D27]">
                        {crypto.name}{' '}
                        <span className="text-[#717171] font-normal">
                            {crypto.symbol}
                        </span>
                    </h4>
                </div>
            </div>
            <div className="p-2.5 w-full max-w-[200px] flex items-center gap-2">
                <h4 className="font-medium text-[#181D27]">{crypto.price}</h4>
            </div>
            <div className="p-2.5 w-full max-w-[200px]">
                <div
                    className={`flex items-center gap-2 rounded-[33px] w-max p-[4px_8px] ${crypto.changeType === 'positive'
                            ? 'bg-[#FEF2F2]'
                            : 'bg-[#FEF3F2]'
                        }`}
                >
                    <span
                        className={`size-[6px] min-w-[6px] rounded-full ${crypto.changeType === 'positive'
                                ? 'bg-[#2563EB]'
                                : 'bg-[#1E3A8A]'
                            }`}
                    ></span>
                    <h4
                        className={`font-medium ${crypto.changeType === 'positive'
                                ? 'text-[#2563EB]'
                                : 'text-[#1E3A8A]'
                            }`}
                    >
                        {crypto.change}
                    </h4>
                </div>
            </div>
            <div className="p-2.5 w-full max-w-[250px]">
                <h4 className="font-medium text-[#181D27]">
                    ${crypto.liquidity}
                </h4>
            </div>
            <div className="p-2.5 w-full max-w-[150px]">
                <button className="text-base font-normal text-[#000000] p-[10px_30px] rounded-[33px] border-[2px] border-[#E9E9E9] inline-block hover:bg-gray-50 hover:border-gray-300 transition-colors duration-200">
                    Trade
                </button>
            </div>
        </div>
    );

    return (
        <section className="lg:py-[150px] md:py-[100px] py-[50px]">
            <div className="w-full max-w-[1300px] mx-auto px-4">
                <div className="flex items-center justify-between gap-3 mb-12">
                    <h2 className="md:text-[49px] text-base text-[#DC2626] font-medium">
                        Market Trend
                    </h2>
                    <a
                        href="#"
                        className="text-base font-normal text-[#000000] md:p-[16px_35px] p-[10px_25px] rounded-[33px] border-[2px] border-[#E9E9E9]"
                    >
                        View more
                    </a>
                </div>
                <div className="bg-[#fff] border border-[#E9EAEB] rounded-[28px] overflow-hidden shadow-[0px_20px_33px_0px_#0000000D] w-full max-w-[1160px] mx-auto">
                    <div className="overflow-x-auto">
                        <div className="min-w-[1156px]">
                            <div className="w-full max-w-6xl mx-auto p-4">
                                {/* Tab Navigation */}
                                <div className="flex border-b border-[#E5E5E5] mb-4 text-[#717171] py-5">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`px-4 py-2 font-medium transition-colors ${activeTab === tab
                                                    ? 'text-[#DC2626] border-b-2 border-[#DC2626]'
                                                    : 'hover:text-gray-900'
                                                }`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>

                                {/* Content */}
                                <div className="text-sm font-medium text-[#181D27] divide-y divide-[#E5E5E5]">
                                    {/* Table Header */}
                                    <div className="flex items-center min-h-[50px] bg-gray-50 font-semibold text-[#535862] text-xs uppercase">
                                        <div className="p-2.5 w-full max-w-[60px] flex items-center justify-center">
                                            #
                                        </div>
                                        <div className="p-2.5 w-full max-w-[350px]">
                                            Name
                                        </div>
                                        <div className="p-2.5 w-full max-w-[200px]">
                                            Price
                                        </div>
                                        <div className="p-2.5 w-full max-w-[200px]">
                                            24h Change
                                        </div>
                                        <div className="p-2.5 w-full max-w-[250px]">
                                            Liquidity
                                        </div>
                                        <div className="p-2.5 w-full max-w-[150px]">
                                            Action
                                        </div>
                                    </div>

                                    {/* Table Body */}
                                    <div className="divide-y divide-[#E5E5E5]">
                                        {loading ? (
                                            <div className="flex items-center justify-center min-h-[200px] text-[#535862]">
                                                <p>Loading top liquidity pairs...</p>
                                            </div>
                                        ) : activeTab === 'All' ? (
                                            poolsData.length > 0 ? (
                                                poolsData.map(renderCryptoItem)
                                            ) : (
                                                <div className="flex items-center justify-center min-h-[200px] text-[#535862]">
                                                    <p>No pools found</p>
                                                </div>
                                            )
                                        ) : (
                                            <div className="flex items-center justify-center min-h-[200px] text-[#535862]">
                                                <p>Category data coming soon</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default MarketTrend;