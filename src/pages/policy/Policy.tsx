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
    Coins,
    Calendar,
    Clock,
} from "lucide-react";
import { useWallet } from "../../contexts/WalletContext";
import { TOKENS } from "../../utils/SwapTokens";

const CONTRACT_ADDRESS = "0x761e49A8f7e4e5E59a66F8fc7A89D05592B9adf0";

const INSURANCE_ABI = [
    "function policyCounter() view returns (uint256)",
    "function policies(uint256) view returns (uint256 id, address holder, address assetToken, address quoteToken, uint256 notional, uint256 coverageDuration, uint256 thresholdPercentage, uint256 premium, uint256 purchaseTime, uint256 expiryTime, uint256 strikePrice, bool claimed, bool active)",
    "function calculatePremium(address token, uint256 collateral, uint256 borrowed, uint256 duration, uint256 coveragePct) view returns (uint256)",
    "function submitClaim(uint256 _policyId) external",
    "function getPrice(address token) view returns (uint256)"
];

interface Policy {
    id: number;
    assetToken: string;
    notional: string;
    coveragePct: string;
    strikePrice: string;
    premium: string;
    purchaseTime: number;
    expiry: number;
    status: "Active" | "Claimed" | "Expired" | "Inactive";
    currentPrice: string;
}

const PolicyDashboard: React.FC = () => {
    const { account, provider, signer } = useWallet();

    const [policies, setPolicies] = useState<Policy[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [claimingId, setClaimingId] = useState<number | null>(null);

    const [calcForm, setCalcForm] = useState({
        assetToken: "",
        amount: "",
        leverage: "0",
        coverage: "100",
        duration: "30"
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
            const counter = await contract.policyCounter().catch(() => 0n);
            const count = Number(counter);
            const foundPolicies: Policy[] = [];

            for (let i = count; i >= 1; i--) {
                try {
                    const p = await contract.policies(i);

                    if (p.holder.toLowerCase() === account.toLowerCase()) {
                        const priceRaw = await contract.getPrice(p.assetToken).catch(() => 0n);

                        let status: "Active" | "Claimed" | "Expired" | "Inactive" = "Inactive";
                        const now = Math.floor(Date.now() / 1000);

                        if (p.claimed) status = "Claimed";
                        else if (!p.active) status = "Inactive";
                        else if (Number(p.expiryTime) < now) status = "Expired";
                        else status = "Active";

                        foundPolicies.push({
                            id: i,
                            assetToken: p.assetToken,
                            notional: ethers.formatUnits(p.notional, 18),
                            coveragePct: (Number(p.thresholdPercentage) / 100).toFixed(0),
                            strikePrice: ethers.formatUnits(p.strikePrice, 18),
                            premium: ethers.formatUnits(p.premium, 18),
                            purchaseTime: Number(p.purchaseTime),
                            expiry: Number(p.expiryTime),
                            status: status,
                            currentPrice: ethers.formatUnits(priceRaw, 18)
                        });
                    }
                } catch (e) {
                    console.warn(`Failed to fetch policy ${i}`, e);
                }
            }
            setPolicies(foundPolicies);
        } catch (err) {
            console.error("Fetch Error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [account, provider]);

    useEffect(() => {
        fetchPolicies();
    }, [fetchPolicies]);

    const handleClaim = async (policyId: number) => {
        if (!signer) return alert("Connect Wallet");
        setClaimingId(policyId);
        try {
            const contract = new Contract(CONTRACT_ADDRESS, INSURANCE_ABI, signer);
            const tx = await contract.submitClaim(policyId);
            await tx.wait();
            alert("Claim Successful! Payout sent to wallet.");
            fetchPolicies();
        } catch (err: any) {
            console.error(err);
            const msg = err.reason || err.message || "Claim Failed";
            alert("Error: " + msg);
        } finally {
            setClaimingId(null);
        }
    };

    const handleCalculate = async () => {
        if (!provider || !calcForm.assetToken || !calcForm.amount) return;
        setIsCalculating(true);
        try {
            const contract = new Contract(CONTRACT_ADDRESS, INSURANCE_ABI, provider);
            const decimals = 18;
            const amountWei = ethers.parseUnits(calcForm.amount, decimals);
            const leverageWei = ethers.parseUnits(calcForm.leverage || "0", decimals);

            const durationSeconds = Number(calcForm.duration) * 86400;
            const coverageBps = Number(calcForm.coverage) * 100;

            const prem = await contract.calculatePremium(
                calcForm.assetToken,
                amountWei,      // Collateral
                leverageWei,    // Borrowed
                durationSeconds,
                coverageBps
            );
            setCalculatedPremium(ethers.formatUnits(prem, 18));
        } catch (e) {
            console.error("Calculation Error:", e);
            setCalculatedPremium(null);
            alert("Calculation failed. Check token address or network.");
        } finally {
            setIsCalculating(false);
        }
    };

    const getTokenInfo = (addr: string) => TOKENS.find(t => t.address.toLowerCase() === addr.toLowerCase());

    const getPayoutAmount = (p: Policy) => {
        const strike = parseFloat(p.strikePrice);
        const current = parseFloat(p.currentPrice);
        const amount = parseFloat(p.notional);
        if (current >= strike) return 0;
        return (strike - current) * amount;
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    return (
        <div className="flex justify-center w-full px-4 py-6 md:py-8 font-sans text-gray-700">
            <div className="w-full max-w-6xl space-y-6 md:space-y-8">

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Shield className="text-red-600 fill-red-50 w-6 h-6 md:w-8 md:h-8" />
                            Insurance Hub
                        </h1>
                        <p className="text-xs md:text-sm text-gray-500 mt-1">Manage your active protection plans</p>
                    </div>
                    <button
                        onClick={fetchPolicies}
                        disabled={refreshing}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition shadow-sm w-full md:w-auto"
                    >
                        <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                        {refreshing ? "Refreshing..." : "Refresh"}
                    </button>
                </div>

                {/* Stacks vertically on mobile (flex-col-reverse ensures Calculator is below policies if desired, or keep as grid) */}
                <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 md:gap-8">

                    {/* CALCULATOR COLUMN */}
                    <div className="order-2 lg:order-1 lg:col-span-1">
                        {/* Removed 'sticky' on mobile to save screen space, only sticky on lg screens */}
                        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 md:p-6 lg:sticky lg:top-24">
                            <div className="mb-5 md:mb-6 pb-4 border-b border-gray-100">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Calculator className="w-5 h-5 text-red-600" /> Premium Calculator
                                </h2>
                                <p className="text-xs text-gray-500 mt-1">Estimate cost before trading</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5 relative" ref={assetRef}>
                                    <label className="text-xs font-semibold text-gray-500 ml-1">Asset</label>
                                    <button onClick={() => setIsAssetOpen(!isAssetOpen)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm flex justify-between items-center outline-none focus:ring-2 focus:ring-red-500/20 transition-all">
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
                                                <div key={t.address} onClick={() => { setCalcForm({ ...calcForm, assetToken: t.address }); setIsAssetOpen(false); }} className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 flex items-center gap-2 border-b border-gray-50 last:border-0">
                                                    <img src={t.img} className="w-5 h-5 rounded-full" alt="" /> {t.symbol}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 ml-1">My Collateral</label>
                                    <input type="number" value={calcForm.amount} onChange={(e) => setCalcForm({ ...calcForm, amount: e.target.value })} placeholder="0.00" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/20 transition-all" />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 ml-1">Borrow Amt</label>
                                        <input type="number" value={calcForm.leverage} onChange={(e) => setCalcForm({ ...calcForm, leverage: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/20" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 ml-1">Coverage %</label>
                                        <input type="number" value={calcForm.coverage} onChange={(e) => setCalcForm({ ...calcForm, coverage: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/20" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 ml-1">Duration (Days)</label>
                                    <input type="number" value={calcForm.duration} onChange={(e) => setCalcForm({ ...calcForm, duration: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/20" />
                                </div>

                                <button onClick={handleCalculate} disabled={isCalculating || !calcForm.assetToken} className="w-full mt-4 bg-gray-900 hover:bg-black text-white font-medium py-3.5 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-sm active:scale-95">
                                    {isCalculating ? <Loader2 size={16} className="animate-spin" /> : "Calculate Cost"}
                                </button>

                                {calculatedPremium && (
                                    <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4 text-center animate-in fade-in slide-in-from-bottom-2">
                                        <p className="text-xs text-red-500 font-medium uppercase">Estimated Premium</p>
                                        <p className="text-xl font-bold text-gray-900 mt-1">{parseFloat(calculatedPremium).toFixed(4)} <span className="text-sm font-medium text-gray-500">USDT</span></p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* POLICY LIST COLUMN */}
                    <div className="order-1 lg:order-2 lg:col-span-2">
                        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[300px] md:min-h-[400px]">
                            <div className="px-5 py-4 md:px-6 md:py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                <h3 className="font-bold text-gray-800 text-sm md:text-base">My Policies</h3>
                                <div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                                    <Shield size={14} /> <span className="hidden md:inline">Total Protected:</span> {policies.length}
                                </div>
                            </div>

                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 text-xs uppercase">
                                        <tr>
                                            <th className="px-4 py-3 md:px-6 md:py-4 font-medium whitespace-nowrap">Policy Details</th>
                                            <th className="px-4 py-3 md:px-6 md:py-4 font-medium whitespace-nowrap">Pricing</th>
                                            <th className="px-4 py-3 md:px-6 md:py-4 font-medium whitespace-nowrap hidden sm:table-cell">Timeline</th>
                                            <th className="px-4 py-3 md:px-6 md:py-4 font-medium text-right whitespace-nowrap">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {loading ? (
                                            <tr><td colSpan={4} className="p-12 text-center text-gray-400 flex justify-center"><Loader2 className="animate-spin" /></td></tr>
                                        ) : policies.length === 0 ? (
                                            <tr><td colSpan={4} className="p-8 md:p-12 text-center">
                                                <div className="bg-gray-50 inline-flex p-4 rounded-full mb-3 border border-gray-100">
                                                    <Shield className="w-8 h-8 text-gray-300" />
                                                </div>
                                                <p className="text-gray-500 font-medium text-sm">No active policies</p>
                                                <p className="text-xs text-gray-400 mt-1">Open a leveraged trade with insurance to see it here.</p>
                                            </td></tr>
                                        ) : policies.map((p) => {
                                            const asset = getTokenInfo(p.assetToken);
                                            const payout = getPayoutAmount(p);
                                            const isClaimable = payout > 0 && p.status === "Active";

                                            return (
                                                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                                                    <td className="px-4 py-3 md:px-6 md:py-4">
                                                        <div className="flex items-center gap-3">
                                                            <img src={asset?.img} className="w-8 h-8 md:w-9 md:h-9 rounded-full shadow-sm bg-white shrink-0" alt="" />
                                                            <div>
                                                                <div className="font-bold text-gray-800 text-sm md:text-base flex items-center gap-2">
                                                                    {asset?.symbol || "UNK"}
                                                                    <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded border border-gray-200">#{p.id}</span>
                                                                </div>
                                                                <div className="text-[10px] md:text-[11px] text-gray-400 font-medium mt-0.5">Amt: {parseFloat(p.notional).toFixed(2)}</div>
                                                                <div className="text-[10px] md:text-[11px] text-blue-500 font-medium bg-blue-50 px-1.5 py-0.5 rounded w-fit mt-1 whitespace-nowrap">
                                                                    {p.coveragePct}% Covered
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-3 md:px-6 md:py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex justify-between items-center w-24 md:w-32">
                                                                <span className="text-[10px] md:text-[11px] text-gray-400">Strike:</span>
                                                                <span className="font-bold text-gray-700 text-xs md:text-sm">${parseFloat(p.strikePrice).toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center w-24 md:w-32">
                                                                <span className="text-[10px] md:text-[11px] text-gray-400">Curr:</span>
                                                                <span className={`font-bold text-xs md:text-sm ${isClaimable ? "text-red-500" : "text-gray-700"}`}>
                                                                    ${parseFloat(p.currentPrice).toFixed(2)}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center w-24 md:w-32 border-t border-gray-100 pt-1 mt-1">
                                                                <span className="text-[10px] md:text-[11px] text-gray-400">Prem:</span>
                                                                <span className="font-medium text-red-600 text-[10px] md:text-xs">-${parseFloat(p.premium).toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-3 md:px-6 md:py-4 hidden sm:table-cell">
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                                                <Calendar size={12} className="text-gray-400" />
                                                                <span className="whitespace-nowrap">{formatDate(p.purchaseTime)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                                                <Clock size={12} className="text-gray-400" />
                                                                <span className="whitespace-nowrap">{formatDate(p.expiry)}</span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-3 md:px-6 md:py-4 text-right">
                                                        {p.status === "Claimed" ? (
                                                            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-xs font-bold border border-gray-200 whitespace-nowrap">
                                                                <CheckCircle size={12} /> Claimed
                                                            </span>
                                                        ) : p.status === "Expired" ? (
                                                            <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-600 px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-xs font-bold border border-orange-100 whitespace-nowrap">
                                                                <AlertCircle size={12} /> Expired
                                                            </span>
                                                        ) : isClaimable ? (
                                                            <div className="flex flex-col items-end gap-1">
                                                                <button
                                                                    onClick={() => handleClaim(p.id)}
                                                                    disabled={claimingId === p.id}
                                                                    className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs font-bold shadow-sm shadow-red-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                                                >
                                                                    {claimingId === p.id ? <Loader2 size={12} className="animate-spin" /> : <Coins size={12} />}
                                                                    Claim
                                                                </button>
                                                                <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded whitespace-nowrap">
                                                                    +${payout.toFixed(2)}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-end gap-1">
                                                                <span className="inline-flex items-center gap-1 bg-green-50 text-green-600 px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-xs font-bold border border-green-100 whitespace-nowrap">
                                                                    <Activity size={12} /> Protected
                                                                </span>
                                                                <span className="text-[10px] text-gray-400 whitespace-nowrap">Safe zone</span>
                                                            </div>
                                                        )}
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