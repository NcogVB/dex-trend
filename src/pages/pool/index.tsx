import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { ethers } from "ethers";
import { useWallet } from "../../contexts/WalletContext";

const POSITION_MANAGER_ADDRESS = "0xe4ae6F10ee1C8e2465D9975cb3325267A2025549";

// 🔹 Minimal ABI directly embedded
const POSITION_MANAGER_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
    "function positions(uint256 tokenId) view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)"
];

const ERC20_ABI = [
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)"
];

interface Position {
    tokenId: string;
    token0: string;
    token1: string;
    symbol0: string;
    symbol1: string;
    fee: number;
    liquidity: number;
    tickLower: number;
    tickUpper: number;
}

const Pool = () => {
    const { provider, account } = useWallet();
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!account || !provider) return;
        fetchPositions();
    }, [account, provider]);

    const fetchPositions = async () => {
        try {
            setLoading(true);

            const contract = new ethers.Contract(
                POSITION_MANAGER_ADDRESS,
                POSITION_MANAGER_ABI,
                provider
            );

            const balance = await contract.balanceOf(account);
            const count = Number(balance);
            if (count === 0) {
                setPositions([]);
                return;
            }

            // --- Step 1: Fetch all tokenIds in parallel ---
            const tokenIds = await Promise.all(
                Array.from({ length: count }, (_, i) => contract.tokenOfOwnerByIndex(account, i))
            );

            // --- Step 2: Fetch all positions in parallel ---
            const rawPositions = await Promise.all(
                tokenIds.map((id) => contract.positions(id))
            );

            // --- Step 3: Cache for token symbols ---
            const tokenCache = new Map();

            async function getTokenSymbol(address: any) {
                if (tokenCache.has(address)) return tokenCache.get(address);
                const tokenContract = new ethers.Contract(address, ERC20_ABI, provider);
                const symbol = await tokenContract.symbol().catch(() => "UNKNOWN");
                tokenCache.set(address, symbol);
                return symbol;
            }

            // --- Step 4: Resolve symbols in parallel ---
            const enriched = await Promise.all(
                rawPositions.map(async (pos, idx) => {
                    const [symbol0, symbol1] = await Promise.all([
                        getTokenSymbol(pos.token0),
                        getTokenSymbol(pos.token1),
                    ]);

                    return {
                        tokenId: tokenIds[idx].toString(),
                        token0: pos.token0,
                        token1: pos.token1,
                        symbol0,
                        symbol1,
                        fee: pos.fee,
                        liquidity: Number(pos.liquidity),
                        tickLower: pos.tickLower,
                        tickUpper: pos.tickUpper,
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
                                to="/removeLp"
                                className="modern-button relative z-10 w-full flex items-center justify-center space-x-2 mb-6 py-4 !bg-red-600 !text-white hover:!bg-red-700"
                            >
                                <Wallet />
                                <span>Remove Liquidity</span>
                            </Link>

                            {/* Positions */}
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
                                                        {Number(p.fee) / 10000}% fee
                                                    </div>
                                                </div>

                                                <div className="text-sm text-gray-800 font-medium mb-1">
                                                    {p.symbol0}/{p.symbol1}
                                                </div>

                                                <div className="flex flex-wrap justify-between text-xs text-gray-600">
                                                    <div>Liquidity: {p.liquidity.toString()}</div>
                                                    <div>Tick: {p.tickLower} → {p.tickUpper}</div>
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
