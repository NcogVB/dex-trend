import React, { useEffect, useState, useCallback, useRef } from "react";
import { ethers, Contract } from "ethers";
import {
    Shield,
    Activity,
    Calendar,
    Coins,
    Plus,
    RefreshCw,
    CheckCircle,
    AlertCircle,
    Clock,
    ArrowRight,
    ChevronDown,
    Loader2
} from "lucide-react";
// Assuming you have this, otherwise use the inline ABI below
import DeFiInsuranceABI from "./ABI.json";
import { useWallet } from "../../contexts/WalletContext";
import { TOKENS } from "../../utils/SwapTokens";
import { ERC20_ABI } from "../../contexts/ABI";

const CONTRACT_ADDRESS = "0xa8e91a487D6c46B6ea9B36a71bd4f241a3eFba04";
const USDT_ADDRESS = "0x0F7782ef1Bd024E75a47d344496022563F0C1A38";


interface Policy {
    policyId: number;
    holder: string;
    assetToken: string;
    quoteToken: string;
    notional: string;
    coverageDuration: string;
    thresholdPercentage: string;
    premium: string;
    purchaseTime: string;
    expiryTime: string;
    claimed: boolean;
    active: boolean;
    rawExpiry: number;
}

const PolicyDashboard: React.FC = () => {
    const { account, signer } = useWallet();
    const [contract, setContract] = useState<ethers.Contract | null>(null);
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [statusMsg, setStatusMsg] = useState(""); // Feedback for user
    const [isAssetOpen, setIsAssetOpen] = useState(false);

    const assetRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: any) {
            if (assetRef.current && !assetRef.current.contains(event.target)) setIsAssetOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Stats
    const [premiumRate, setPremiumRate] = useState<string>("0%");
    const [underwriterShare, setUnderwriterShare] = useState<string>("0%");

    // Form - Quote Token Removed (Fixed to USDT)
    const [form, setForm] = useState({
        assetToken: "",
        notional: "",
        duration: "",
        threshold: "",
    });

    useEffect(() => {
        if (!signer) return;
        // Use CORE_ABI to ensure we have the updated function signatures
        const instance = new ethers.Contract(CONTRACT_ADDRESS, DeFiInsuranceABI, signer);
        setContract(instance);
    }, [signer]);

    const fetchPolicies = useCallback(async () => {
        if (!contract || !account) return;
        setRefreshing(true);

        try {
            const counter = await contract.policyCounter();
            const count = Number(counter);
            const allPolicies: Policy[] = [];

            for (let i = 1; i <= count; i++) {
                const p = await contract.getPolicyDetails(i);
                if (p.holder.toLowerCase() === account.toLowerCase()) {
                    allPolicies.push({
                        policyId: i,
                        holder: p.holder,
                        assetToken: p.assetToken,
                        quoteToken: p.quoteToken,
                        notional: ethers.formatUnits(p.notional, 18),
                        coverageDuration: (Number(p.coverageDuration) / 86400).toFixed(0),
                        thresholdPercentage: (Number(p.thresholdPercentage) / 10000).toFixed(2),
                        premium: ethers.formatUnits(p.premium, 18),
                        purchaseTime: new Date(Number(p.purchaseTime) * 1000).toLocaleDateString(),
                        expiryTime: new Date(Number(p.expiryTime) * 1000).toLocaleString(),
                        rawExpiry: Number(p.expiryTime),
                        claimed: p.claimed,
                        active: p.active,
                    });
                }
            }

            // Stats
            try {
                const rateBps = await contract.premiumRateBps();
                const shareBps = await contract.underwriterShareBps();
                setPremiumRate((Number(rateBps) / 100).toFixed(2) + "%");
                setUnderwriterShare((Number(shareBps) / 100).toFixed(2) + "%");
            } catch (e) { }

            setPolicies(allPolicies.reverse());
        } catch (err) {
            console.error("Failed to load policies:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [contract, account]);

    useEffect(() => {
        fetchPolicies();
        const interval = setInterval(fetchPolicies, 20000);
        return () => clearInterval(interval);
    }, [fetchPolicies]);

    // 🔹 Actions
    const createPolicy = async () => {
        if (!contract || !signer || !account) return;
        if (!form.assetToken || !form.notional || !form.duration || !form.threshold) {
            alert("Please fill in all fields");
            return;
        }

        setSubmitting(true);
        setStatusMsg("Calculating Premium...");

        try {
            const notionalWei = ethers.parseUnits(form.notional, 18);
            const durationSec = Number(form.duration) * 86400;
            const thresholdInt = Number(form.threshold); // e.g. 2000 for 20%

            // 1. Calculate Premium to know how much to approve
            const premiumWei = await contract.calculatePremium(
                notionalWei,
                durationSec,
                thresholdInt
            );

            console.log("Required Premium:", ethers.formatUnits(premiumWei, 18), "USDT");

            // 2. Check USDT Allowance
            setStatusMsg("Checking USDT Allowance...");
            const usdtContract = new Contract(USDT_ADDRESS, ERC20_ABI, signer);
            const allowance = await usdtContract.allowance(account, CONTRACT_ADDRESS);

            // 3. Approve if needed
            if (allowance < premiumWei) {
                setStatusMsg("Approving USDT...");
                const approveTx = await usdtContract.approve(CONTRACT_ADDRESS, ethers.MaxUint256);
                await approveTx.wait();
                console.log("USDT Approved");
            }

            // 4. Purchase Policy
            setStatusMsg("Purchasing Policy...");
            // Note: Removed _quoteToken argument as per instruction
            const tx = await contract.purchasePolicy(
                form.assetToken,
                USDT_ADDRESS,
                notionalWei,
                durationSec,
                thresholdInt
            );

            await tx.wait();

            alert("✅ Policy created successfully!");
            setForm({ assetToken: "", notional: "", duration: "", threshold: "" });
            fetchPolicies();

        } catch (err: any) {
            console.error("Creation failed:", err);
            // Decode typical revert reasons
            const reason = err.reason || err.shortMessage || err.message || "Unknown Error";
            alert("Transaction Failed: " + reason);
        } finally {
            setSubmitting(false);
            setStatusMsg("");
        }
    };

    const handleClaim = async (policyId: number) => {
        if (!contract) return;
        setSubmitting(true);
        setStatusMsg("Submitting claim...");
        try {
            const tx = await contract.submitClaim(policyId);
            await tx.wait();
            alert(`✅ Claim approved! Payout sent to wallet.`);
            fetchPolicies();
        } catch (err: any) {
            console.error("Claim failed:", err);
            const reason = err.reason || err.shortMessage || "Claim conditions not met";
            alert("Claim Failed: " + reason);
        } finally {
            setSubmitting(false);
            setStatusMsg("");
        }
    };

    // 🔹 Helpers
    const getTokenSymbol = (addr: string) => TOKENS.find(t => t.address.toLowerCase() === addr.toLowerCase())?.symbol || "UNK";
    const getTokenImg = (addr: string) => TOKENS.find(t => t.address.toLowerCase() === addr.toLowerCase())?.img || "";

    if (!account) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
            <div className="bg-red-50 p-6 rounded-full mb-4">
                <Shield className="w-16 h-16 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">DeFi Insurance Protocol</h2>
            <p className="text-gray-500 mt-2 max-w-md">Connect your wallet to purchase coverage.</p>
        </div>
    );

    return (
        <div className="flex justify-center w-full px-4 py-8">
            <div className="w-full max-w-6xl space-y-8">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Shield className="text-red-600 fill-red-100" />
                            Insurance Dashboard
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Protect your assets against price drops</p>
                    </div>

                    <button
                        onClick={fetchPolicies}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                    >
                        <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                        {refreshing ? "Syncing..." : "Refresh Data"}
                    </button>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                            <Coins size={48} className="text-red-500" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">Premium Rate</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{premiumRate}</h3>
                        <p className="text-xs text-green-600 flex items-center gap-1 mt-2 font-medium">
                            <Activity size={12} /> Live Market Rate
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                            <Shield size={48} className="text-purple-500" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">Underwriter Share</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{underwriterShare}</h3>
                        <p className="text-xs text-purple-600 flex items-center gap-1 mt-2 font-medium">
                            <CheckCircle size={12} /> Verified Protocol
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                            <Calendar size={48} className="text-orange-500" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">My Active Policies</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">
                            {policies.filter(p => p.active && !p.claimed).length}
                        </h3>
                        <p className="text-xs text-gray-400 mt-2">Total History: {policies.length}</p>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-3 gap-8">

                    {/* Left: Create Policy Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sticky top-24">
                            <div className="mb-6 pb-4 border-b border-gray-100">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-red-600" />
                                    Create Policy
                                </h2>
                                <p className="text-xs text-gray-500 mt-1">Define parameters for your coverage</p>
                            </div>
                            <div className="space-y-4">
                                {/* Token Selection Row */}
                                <div className="grid grid-cols-2 gap-3">

                                    {/* ASSET TOKEN DROPDOWN */}
                                    <div className="space-y-1.5 relative" ref={assetRef}>
                                        <label className="text-xs font-semibold text-gray-500 ml-1">Asset Token</label>
                                        <button
                                            onClick={() => setIsAssetOpen(!isAssetOpen)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm flex justify-between items-center outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                                        >
                                            <span className={!form.assetToken ? "text-gray-400" : "text-gray-700 font-medium"}>
                                                {form.assetToken ? getTokenSymbol(form.assetToken) : "Select Asset"}
                                            </span>
                                            <ChevronDown size={16} className="text-gray-400" />
                                        </button>

                                        {isAssetOpen && (
                                            <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                                                <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                                    {TOKENS.map((t) => (
                                                        <div
                                                            key={t.address}
                                                            onClick={() => {
                                                                setForm({ ...form, assetToken: t.address });
                                                                setIsAssetOpen(false);
                                                            }}
                                                            className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 flex items-center gap-2 transition-colors border-b border-gray-50 last:border-0"
                                                        >
                                                            <img src={t.img} className="w-5 h-5 rounded-full" alt="" />
                                                            {t.symbol}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* FIXED QUOTE TOKEN DISPLAY */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 ml-1">Quote Token</label>
                                        <div className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2.5 text-sm flex items-center gap-2 text-gray-500 cursor-not-allowed">
                                            {/* Assuming you have a USDT image in TOKENS, otherwise generic icon */}
                                            {/* <img src={getTokenImg(USDT_ADDRESS)} className="w-5 h-5 rounded-full" alt="USDT" /> */}
                                            <span className="font-bold">USDT</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Inputs */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-500 ml-1">Notional Amount</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={form.notional}
                                            onChange={(e) => setForm({ ...form, notional: e.target.value })}
                                            placeholder="0.00"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                                        />
                                        <span className="absolute right-4 top-3 text-xs text-gray-400 font-medium">Units</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 ml-1">Duration (Days)</label>
                                        <input
                                            type="number"
                                            value={form.duration}
                                            onChange={(e) => setForm({ ...form, duration: e.target.value })}
                                            placeholder="30"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 ml-1">Trigger Drop (bps)</label>
                                        <input
                                            type="number"
                                            value={form.threshold}
                                            onChange={(e) => setForm({ ...form, threshold: e.target.value })}
                                            placeholder="2000 = 20%"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={createPolicy}
                                    disabled={submitting}
                                    className="w-full mt-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                >
                                    {submitting ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 size={16} className="animate-spin" />
                                            {statusMsg || "Processing..."}
                                        </span>
                                    ) : (
                                        <>Calculate & Purchase <ArrowRight size={16} /></>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right: Policy Table */}
                    <div className="lg:col-span-2">
                        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                <h3 className="font-bold text-gray-800">Your Policies</h3>
                                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">
                                    {policies.length} Total
                                </span>
                            </div>

                            {loading ? (
                                <div className="p-12 text-center text-gray-400">Loading policy data...</div>
                            ) : policies.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="bg-gray-50 inline-flex p-4 rounded-full mb-3">
                                        <Shield className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <p className="text-gray-500 font-medium">No policies found</p>
                                    <p className="text-xs text-gray-400 mt-1">Create your first policy to get started</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                                            <tr>
                                                <th className="px-5 py-3 font-medium">Pair</th>
                                                <th className="px-5 py-3 font-medium">Coverage</th>
                                                <th className="px-5 py-3 font-medium">Cost</th>
                                                <th className="px-5 py-3 font-medium">Status</th>
                                                <th className="px-5 py-3 font-medium text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {policies.map((p) => {
                                                const AssetImg = getTokenImg(p.assetToken);
                                                const QuoteImg = getTokenImg(p.quoteToken);

                                                // Status Logic
                                                let statusBadge;
                                                if (p.claimed) {
                                                    statusBadge = <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-xs font-medium"><CheckCircle size={10} /> Claimed</span>
                                                } else if (p.active) {
                                                    const isExpired = Date.now() > p.rawExpiry * 1000;
                                                    if (isExpired) {
                                                        statusBadge = <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-xs font-medium"><Clock size={10} /> Expired</span>
                                                    } else {
                                                        statusBadge = <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-medium"><Activity size={10} /> Active</span>
                                                    }
                                                } else {
                                                    statusBadge = <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-medium"><AlertCircle size={10} /> Inactive</span>
                                                }

                                                return (
                                                    <tr key={p.policyId} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-5 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex -space-x-2">
                                                                    {AssetImg ? <img src={AssetImg} className="w-6 h-6 rounded-full border border-white" alt="asset" /> : <div className="w-6 h-6 rounded-full bg-gray-200 border border-white" />}
                                                                    {QuoteImg ? <img src={QuoteImg} className="w-6 h-6 rounded-full border border-white" alt="quote" /> : <div className="w-6 h-6 rounded-full bg-gray-200 border border-white" />}
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold text-gray-800">
                                                                        {getTokenSymbol(p.assetToken)}/{getTokenSymbol(p.quoteToken)}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-400">ID: #{p.policyId}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <div className="font-medium text-gray-700">{p.notional} units</div>
                                                            <div className="text-xs text-gray-400">Trigger: -{p.thresholdPercentage}%</div>
                                                            <div className="text-xs text-gray-400">{p.coverageDuration} Days</div>
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <div className="font-medium text-red-500">-{parseFloat(p.premium).toFixed(4)}</div>
                                                            <div className="text-xs text-gray-400">Premium</div>
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            {statusBadge}
                                                            <div className="text-[10px] text-gray-400 mt-1">
                                                                Exp: {p.expiryTime.split(',')[0]}
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4 text-right">
                                                            {p.active && !p.claimed && (
                                                                <button
                                                                    onClick={() => handleClaim(p.policyId)}
                                                                    className="bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm"
                                                                >
                                                                    Submit Claim
                                                                </button>
                                                            )}
                                                            {p.claimed && (
                                                                <span className="text-xs text-green-600 font-medium">Paid Out</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PolicyDashboard;