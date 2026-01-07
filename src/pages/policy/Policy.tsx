import React, { useEffect, useState, useCallback, useRef } from "react";
import { ethers, Contract } from "ethers";
import {
    Shield,
    Activity,
    RefreshCw,
    CheckCircle,
    AlertCircle,
    ChevronDown,
    Loader2,
    Calculator,
    TrendingDown
} from "lucide-react";
import { useWallet } from "../../contexts/WalletContext";
import { TOKENS } from "../../utils/SwapTokens";

const CONTRACT_ADDRESS = "0x6Cc3baF9320934d4DEcAB8fdAc92F00102A58994";

const INSURANCE_ABI = [
    "function nextOrderId() view returns (uint256)",
    "function userInsurances(address user, uint256 orderId) view returns (bool isActive, uint256 coverageAmount, uint256 strikePrice, uint8 policyType, uint256 premiumPaid, uint256 insuredValue)",
    "function orders(uint256 orderId) view returns (uint256 id, address maker, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, uint256 targetPrice1e18, uint256 expiry, bool filled, bool cancelled)",
    "function calculatePremium(address token, uint256 amount, uint256 duration, uint256 threshold) view returns (uint256)"];

interface Policy {
    id: number;
    assetToken: string;
    notional: string;
    coveragePct: string;
    strikePrice: string;
    premium: string;
    status: "Active" | "Claimed" | "Expired" | "Inactive";
}

const PolicyDashboard: React.FC = () => {
    const { account, provider } = useWallet();

    const [policies, setPolicies] = useState<Policy[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [calcForm, setCalcForm] = useState({
        assetToken: "",
        amount: "",
        leverage: "0",
        coverage: "100"
    });
    const [calculatedPremium, setCalculatedPremium] = useState<string | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    const [isAssetOpen, setIsAssetOpen] = useState(false);
    const assetRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: any) {
            if (assetRef.current && !assetRef.current.contains(event.target)) setIsAssetOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchPolicies = useCallback(async () => {
        if (!provider || !account) return;
        setRefreshing(true);

        try {
            const contract = new Contract(CONTRACT_ADDRESS, INSURANCE_ABI, provider);
            // 1. Get nextOrderId (max possible ID)
            const nextId = await contract.nextOrderId();
            const count = Number(nextId);
            const foundPolicies: Policy[] = [];

            // 2. Loop through all Order IDs to find user's policies
            // Note: In production with many orders, you'd want an event indexer (The Graph) instead of looping.
            for (let i = 1; i < count; i++) {
                try {
                    // Check if this order ID has an insurance policy for the user
                    const policy = await contract.userInsurances(account, i);

                    // If premium was paid OR it is active, it's a valid policy
                    if (policy.premiumPaid > 0n || policy.isActive) {
                        // Fetch the order details to get the token info
                        const order = await contract.orders(i);

                        foundPolicies.push({
                            id: i,
                            assetToken: order.tokenIn, // The asset being protected
                            notional: ethers.formatUnits(policy.insuredValue, 18),
                            coveragePct: (Number(policy.coverageAmount) / 100).toFixed(0), // BPS (2000) -> % (20)
                            strikePrice: ethers.formatUnits(policy.strikePrice, 18),
                            premium: ethers.formatUnits(policy.premiumPaid, 18),
                            status: policy.isActive ? "Active" : "Inactive" // Simplified status logic
                        });
                    }
                } catch (e) {
                    // Ignore errors for IDs that don't belong to user or have no policy
                }
            }

            setPolicies(foundPolicies.reverse()); // Show newest first

        } catch (err) {
            console.error("Policy fetch error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [account, provider]);
    useEffect(() => {
        fetchPolicies();
    }, [fetchPolicies]);
    const handleCalculate = async () => {
        if (!provider || !calcForm.assetToken || !calcForm.amount) return;
        setIsCalculating(true);
        try {
            const contract = new Contract(CONTRACT_ADDRESS, INSURANCE_ABI, provider);

            // 1. Calculate Total Position Size (Collateral + Leverage)
            const amountWei = ethers.parseUnits(calcForm.amount, 18);
            const leverageWei = ethers.parseUnits(calcForm.leverage || "0", 18);
            const totalNotional = amountWei + leverageWei;

            // 2. Prepare Params
            // Duration: 30 days (2592000 seconds) - matching contract default
            const duration = 2592000;

            // Threshold: Coverage % converted to BPS (e.g. 20% -> 2000)
            const coverageBps = Number(calcForm.coverage) * 100;

            // 3. Call Contract
            const prem = await contract.calculatePremium(
                calcForm.assetToken,
                totalNotional,
                duration,
                coverageBps
            );

            // 4. Format Result (Premium is returned in USDT decimals usually, check contract)
            // Assuming contract returns 1e18 or 1e6 based on logic. 
            // The previous contract update returned 1e6 (USDT). Safe to format based on USDT decimals (6).
            setCalculatedPremium(ethers.formatUnits(prem, 6));
        } catch (e) {
            console.error("Calculation Error:", e);
            setCalculatedPremium("Error");
        } finally {
            setIsCalculating(false);
        }
    };
    const getTokenInfo = (addr: string) => TOKENS.find(t => t.address.toLowerCase() === addr.toLowerCase());

    return (
        <div className="flex justify-center w-full px-4 py-8">
            <div className="w-full max-w-6xl space-y-8">

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Shield className="text-red-600 fill-red-50" />
                            Insurance Hub
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Manage your active protection plans</p>
                    </div>
                    <button
                        onClick={fetchPolicies}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                    >
                        <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                        Refresh
                    </button>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">

                    <div className="lg:col-span-1">
                        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sticky top-24">
                            <div className="mb-6 pb-4 border-b border-gray-100">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Calculator className="w-5 h-5 text-red-600" /> Premium Calculator
                                </h2>
                                <p className="text-xs text-gray-500 mt-1">Estimate cost before trading</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5 relative" ref={assetRef}>
                                    <label className="text-xs font-semibold text-gray-500 ml-1">Asset</label>
                                    <button onClick={() => setIsAssetOpen(!isAssetOpen)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm flex justify-between items-center outline-none focus:ring-2 focus:ring-red-500/20 transition-all">
                                        <span className={!calcForm.assetToken ? "text-gray-400" : "text-gray-700 font-bold flex items-center gap-2"}>
                                            {calcForm.assetToken ? (
                                                <>
                                                    <img src={getTokenInfo(calcForm.assetToken)?.img} className="w-5 h-5 rounded-full" alt="" />
                                                    {getTokenInfo(calcForm.assetToken)?.symbol}
                                                </>
                                            ) : "Select Asset"}
                                        </span>
                                        <ChevronDown size={16} className="text-gray-400" />
                                    </button>
                                    {isAssetOpen && (
                                        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden max-h-48 overflow-y-auto">
                                            {TOKENS.map((t) => (
                                                <div key={t.address} onClick={() => { setCalcForm({ ...calcForm, assetToken: t.address }); setIsAssetOpen(false); }} className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 flex items-center gap-2 border-b border-gray-50">
                                                    <img src={t.img} className="w-5 h-5 rounded-full" alt="" /> {t.symbol}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 ml-1">My Collateral</label>
                                    <input type="number" value={calcForm.amount} onChange={(e) => setCalcForm({ ...calcForm, amount: e.target.value })} placeholder="0.00" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/20 transition-all" />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 ml-1">Borrow Amt</label>
                                        <input type="number" value={calcForm.leverage} onChange={(e) => setCalcForm({ ...calcForm, leverage: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500/20" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 ml-1">Coverage %</label>
                                        <input type="number" value={calcForm.coverage} onChange={(e) => setCalcForm({ ...calcForm, coverage: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500/20" />
                                    </div>
                                </div>

                                <button onClick={handleCalculate} disabled={isCalculating || !calcForm.assetToken} className="w-full mt-4 bg-gray-900 hover:bg-black text-white font-semibold py-3.5 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
                                    {isCalculating ? <Loader2 size={16} className="animate-spin" /> : "Calculate Cost"}
                                </button>

                                {calculatedPremium && (
                                    <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4 text-center animate-in fade-in slide-in-from-bottom-2">
                                        <p className="text-xs text-red-500 font-medium uppercase">Estimated Premium</p>
                                        <p className="text-2xl font-black text-gray-900 mt-1">{parseFloat(calculatedPremium).toFixed(4)} <span className="text-sm font-normal text-gray-500">USDT</span></p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                <h3 className="font-bold text-gray-800">My Policies</h3>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Shield size={14} /> Total Protected: {policies.length}
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                                        <tr>
                                            <th className="px-5 py-3 font-medium">Asset</th>
                                            <th className="px-5 py-3 font-medium">Coverage</th>
                                            <th className="px-5 py-3 font-medium">Strike Price</th>
                                            <th className="px-5 py-3 font-medium">Premium Paid</th>
                                            <th className="px-5 py-3 font-medium text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loading ? (
                                            <tr><td colSpan={5} className="p-8 text-center text-gray-400">Loading records...</td></tr>
                                        ) : policies.length === 0 ? (
                                            <tr><td colSpan={5} className="p-12 text-center">
                                                <div className="bg-gray-50 inline-flex p-4 rounded-full mb-3">
                                                    <Shield className="w-8 h-8 text-gray-300" />
                                                </div>
                                                <p className="text-gray-500 font-medium">No active policies</p>
                                                <p className="text-xs text-gray-400 mt-1">Policies appear here after opening insured trades</p>
                                            </td></tr>
                                        ) : policies.map((p) => {
                                            const asset = getTokenInfo(p.assetToken);

                                            let status;
                                            if (p.status === "Claimed") status = <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold"><CheckCircle size={10} /> Paid</span>;
                                            else if (p.status === "Inactive") status = <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs font-bold"><AlertCircle size={10} /> Inactive</span>;
                                            else status = <span className="inline-flex items-center gap-1 bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-bold"><Activity size={10} /> Active</span>;

                                            return (
                                                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <img src={asset?.img} className="w-8 h-8 rounded-full shadow-sm" alt="" />
                                                            <div>
                                                                <div className="font-bold text-gray-800">{asset?.symbol || "UNK"}</div>
                                                                <div className="text-[10px] text-gray-400">Order #{p.id}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="font-medium text-gray-700">{parseFloat(p.notional).toFixed(2)} units</div>
                                                        <div className="text-xs text-blue-600 font-medium">{p.coveragePct}% Covered</div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="font-medium text-gray-800">${parseFloat(p.strikePrice).toFixed(2)}</div>
                                                        <div className="text-xs text-gray-400 flex items-center gap-1"><TrendingDown size={10} /> Protection Level</div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="font-medium text-red-600">-${parseFloat(p.premium).toFixed(4)}</div>
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        {status}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default PolicyDashboard;