import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, AlertCircle } from "lucide-react";
import { Contract } from "ethers";
import { useWallet } from "../contexts/WalletContext";
import { useLiquidity } from "../hooks/useLiquidity";

const POSITION_MANAGER_ADDRESS = "0xc2A219227E7927529D62d9922a5Ff80627dD754F";
const FACTORY_ADDRESS = "0x339A0Da8ffC7a6fc98Bf2FC53a17dEEf36F0D9c3";

const PM_ABI = [
    "function positions(uint256 tokenId) view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)"
];
const POOL_ABI = ["function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16, uint16, uint16, uint8, bool)"];
const FACTORY_ABI = ["function getPool(address, address, uint24) view returns (address)"];
const ERC20_ABI = ["function symbol() view returns (string)", "function decimals() view returns (uint8)"];

const AddLiquidity = () => {
    const { tokenId } = useParams();
    const navigate = useNavigate();
    const { provider } = useWallet();
    const { increaseLiquidity, loading: txLoading } = useLiquidity();

    const [loadingData, setLoadingData] = useState(false);
    const [positionData, setPositionData] = useState<any>(null);

    // Inputs
    const [amount0, setAmount0] = useState("");
    const [amount1, setAmount1] = useState("");

    // State for Deposit Status
    const [depositStatus, setDepositStatus] = useState<"BOTH" | "ONLY0" | "ONLY1">("BOTH");

    useEffect(() => {
        if (!tokenId || !provider) return;

        const fetchPos = async () => {
            setLoadingData(true);
            try {
                const pm = new Contract(POSITION_MANAGER_ADDRESS, PM_ABI, provider);
                const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);

                // 1. Get Position Info
                const pos = await pm.positions(tokenId);
                const tickLower = Number(pos.tickLower);
                const tickUpper = Number(pos.tickUpper);

                // 2. Get Pool Info to check Current Tick
                const poolAddress = await factory.getPool(pos.token0, pos.token1, pos.fee);
                const pool = new Contract(poolAddress, POOL_ABI, provider);
                const slot0 = await pool.slot0();
                const currentTick = Number(slot0.tick);

                // 3. Determine Deposit Logic
                let status: "BOTH" | "ONLY0" | "ONLY1" = "BOTH";
                if (currentTick < tickLower) status = "ONLY0"; // Price below range -> Only Token 0 needed
                else if (currentTick >= tickUpper) status = "ONLY1"; // Price above range -> Only Token 1 needed

                setDepositStatus(status);

                // 4. Get Symbols
                const t0 = new Contract(pos.token0, ERC20_ABI, provider);
                const t1 = new Contract(pos.token1, ERC20_ABI, provider);
                const [sym0, sym1] = await Promise.all([t0.symbol(), t1.symbol()]);

                setPositionData({
                    token0: pos.token0,
                    token1: pos.token1,
                    symbol0: sym0,
                    symbol1: sym1,
                    fee: Number(pos.fee),
                    liquidity: pos.liquidity.toString()
                });
            } catch (e) {
                console.error("Failed to load position", e);
            } finally {
                setLoadingData(false);
            }
        };
        fetchPos();
    }, [tokenId, provider]);

    const handleAdd = async () => {
        if (!tokenId || !positionData) return;

        // Validation based on status
        if (depositStatus === "BOTH" && (!amount0 || !amount1)) return alert("Please enter amounts for BOTH tokens");
        if (depositStatus === "ONLY0" && !amount0) return alert(`Please enter amount for ${positionData.symbol0}`);
        if (depositStatus === "ONLY1" && !amount1) return alert(`Please enter amount for ${positionData.symbol1}`);

        try {
            await increaseLiquidity(
                tokenId,
                positionData.token0,
                positionData.token1,
                amount0,
                amount1
            );
            alert("✅ Liquidity Increased Successfully!");
            navigate("/pool");
        } catch (e: any) {
            alert("Error: " + (e.reason || e.message));
        }
    };

    if (loadingData) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-lg mx-auto mt-10 px-4">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate("/pool")} className="p-2 hover:bg-gray-100 rounded-full transition">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">
                    Increase Liquidity #{tokenId}
                </h1>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                {positionData ? (
                    <>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm font-medium">
                                <span>{positionData.symbol0} / {positionData.symbol1}</span>
                                <span className="bg-white px-2 py-0.5 rounded border border-gray-200 text-xs">
                                    {(positionData.fee / 10000).toFixed(2)}%
                                </span>
                            </div>

                            {/* Status Badge */}
                            {depositStatus === "ONLY0" && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-bold">Single Asset: {positionData.symbol0}</span>}
                            {depositStatus === "ONLY1" && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-bold">Single Asset: {positionData.symbol1}</span>}
                            {depositStatus === "BOTH" && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">In Range</span>}
                        </div>

                        {/* Explanation Alert */}
                        {depositStatus !== "BOTH" && (
                            <div className="mb-6 bg-red-50 p-3 rounded-lg border border-red-100 flex gap-2">
                                <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-700">
                                    Your position is currently <strong>Out of Range</strong>. You can only deposit
                                    <strong> {depositStatus === "ONLY0" ? positionData.symbol0 : positionData.symbol1} </strong>
                                    right now to back your position.
                                </p>
                            </div>
                        )}

                        {/* Input 0 */}
                        <div className={`mb-4 transition-opacity ${depositStatus === "ONLY1" ? "opacity-50 grayscale" : ""}`}>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-bold text-gray-600">Deposit {positionData.symbol0}</label>
                            </div>
                            <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200 p-3 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-200 transition-all">
                                <input
                                    type="number"
                                    value={amount0}
                                    onChange={e => setAmount0(e.target.value)}
                                    disabled={depositStatus === "ONLY1"}
                                    className="bg-transparent text-2xl font-bold outline-none w-full text-gray-900 placeholder-gray-300 disabled:cursor-not-allowed"
                                    placeholder={depositStatus === "ONLY1" ? "Not Required" : "0.0"}
                                />
                                <span className="font-bold text-gray-500">{positionData.symbol0}</span>
                            </div>
                        </div>

                        {/* Input 1 */}
                        <div className={`mb-6 transition-opacity ${depositStatus === "ONLY0" ? "opacity-50 grayscale" : ""}`}>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-bold text-gray-600">Deposit {positionData.symbol1}</label>
                            </div>
                            <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200 p-3 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-200 transition-all">
                                <input
                                    type="number"
                                    value={amount1}
                                    onChange={e => setAmount1(e.target.value)}
                                    disabled={depositStatus === "ONLY0"}
                                    className="bg-transparent text-2xl font-bold outline-none w-full text-gray-900 placeholder-gray-300 disabled:cursor-not-allowed"
                                    placeholder={depositStatus === "ONLY0" ? "Not Required" : "0.0"}
                                />
                                <span className="font-bold text-gray-500">{positionData.symbol1}</span>
                            </div>
                        </div>

                        <button
                            onClick={handleAdd}
                            disabled={txLoading || (depositStatus === "BOTH" && (!amount0 || !amount1))}
                            className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-all flex items-center justify-center gap-2
                                ${txLoading ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 shadow-red-200 active:scale-[0.98]"}
                            `}
                        >
                            {txLoading ? <Loader2 className="animate-spin" /> : <><Plus size={20} /> Add Liquidity</>}
                        </button>
                    </>
                ) : (
                    <div className="text-center py-10 text-gray-500">Position not found</div>
                )}
            </div>
        </div>
    );
};

export default AddLiquidity;