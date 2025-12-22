import React, { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
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
    ArrowRight
} from "lucide-react";
import DeFiInsuranceABI from "./ABI.json";
import { useWallet } from "../../contexts/WalletContext";
import { TOKENS } from "../../utils/SwapTokens";

const CONTRACT_ADDRESS = "0xF1Cfa890bF34663F1F9138C3D8974D6711CB69b4";

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
    rawExpiry: number; // Added for sort/logic
}

const PolicyDashboard: React.FC = () => {
    const { account, signer } = useWallet();
    const [contract, setContract] = useState<ethers.Contract | null>(null);
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Stats
    const [premiumRate, setPremiumRate] = useState<string>("0%");
    const [underwriterShare, setUnderwriterShare] = useState<string>("0%");

    // Form
    const [form, setForm] = useState({
        assetToken: "",
        quoteToken: "",
        fee: 500,
        notional: "",
        duration: "",
        threshold: "",
    });

    // 🔹 Initialize Contract
    useEffect(() => {
        if (!signer) return;
        const instance = new ethers.Contract(CONTRACT_ADDRESS, DeFiInsuranceABI.abi, signer);
        setContract(instance);
    }, [signer]);

    // 🔹 Fetch Policies
    const fetchPolicies = useCallback(async () => {
        if (!contract || !account) return;
        setRefreshing(true);

        try {
            const counter = await contract.policyCounter();
            const count = Number(counter);
            const allPolicies: Policy[] = [];

            // Batch fetching could be optimized in production, simplified here
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
            } catch (e) { console.warn("Could not fetch stats", e); }

            setPolicies(allPolicies.reverse()); // Show newest first
        } catch (err) {
            console.error("❌ Failed to load policies:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [contract, account]);

    useEffect(() => {
        fetchPolicies();
        // Poll for updates
        const interval = setInterval(fetchPolicies, 20000);
        return () => clearInterval(interval);
    }, [fetchPolicies]);

    // 🔹 Actions
    const createPolicy = async () => {
        if (!contract) return;
        if (!form.assetToken || !form.quoteToken || !form.notional || !form.duration || !form.threshold) {
            alert("Please fill in all fields");
            return;
        }

        setSubmitting(true);
        try {
            // Need to approve premium token? (Usually quote token). 
            // Skipping approval UI for brevity, assuming standard ETH/Native or previously approved.

            const tx = await contract.purchasePolicy(
                form.assetToken,
                form.quoteToken,
                form.fee,
                ethers.parseUnits(form.notional, 18),
                Number(form.duration) * 86400,
                Number(form.threshold)
            );
            await tx.wait();
            alert("✅ Policy created successfully!");
            setForm({ assetToken: "", quoteToken: "", fee: 500, notional: "", duration: "", threshold: "" });
            fetchPolicies();
        } catch (err: any) {
            console.error("Creation failed:", err);
            alert("Failed: " + (err.reason || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    const handleClaim = async (policyId: number) => {
        if (!contract) return;
        setSubmitting(true);
        try {
            const fee = 500; // Uniswap Pool Fee Tier
            const tx = await contract.submitClaim(policyId, fee);
            await tx.wait();
            alert(`✅ Claim submitted for Policy #${policyId}`);
            fetchPolicies();
        } catch (err: any) {
            console.error("Claim failed:", err);
            alert("Failed: " + (err.reason || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    // 🔹 Helpers
    const getTokenSymbol = (addr: string) => TOKENS.find(t => t.address.toLowerCase() === addr.toLowerCase())?.symbol || "UNK";
    const getTokenImg = (addr: string) => TOKENS.find(t => t.address.toLowerCase() === addr.toLowerCase())?.img || "";

    if (!account) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
            <div className="bg-blue-50 p-6 rounded-full mb-4">
                <Shield className="w-16 h-16 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">DeFi Insurance Protocol</h2>
            <p className="text-gray-500 mt-2 max-w-md">Connect your wallet to purchase coverage, view active policies, and manage claims.</p>
        </div>
    );

    return (
        <div className="flex justify-center w-full px-4 py-8">
            <div className="w-full max-w-6xl space-y-8">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Shield className="text-blue-600 fill-blue-100" />
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
                            <Coins size={48} className="text-blue-500" />
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
                                    <Plus className="w-5 h-5 text-blue-600" />
                                    Create Policy
                                </h2>
                                <p className="text-xs text-gray-500 mt-1">Define parameters for your coverage</p>
                            </div>

                            <div className="space-y-4">
                                {/* Token Selection */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 ml-1">Asset Token</label>
                                        <select
                                            value={form.assetToken}
                                            onChange={(e) => setForm({ ...form, assetToken: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        >
                                            <option value="">Asset</option>
                                            {TOKENS.map(t => (
                                                <option key={t.address} value={t.address}>{t.symbol}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 ml-1">Quote Token</label>
                                        <select
                                            value={form.quoteToken}
                                            onChange={(e) => setForm({ ...form, quoteToken: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        >
                                            <option value="">Quote</option>
                                            {TOKENS.map(t => (
                                                <option key={t.address} value={t.address}>{t.symbol}</option>
                                            ))}
                                        </select>
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
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 ml-1">Trigger Drop %</label>
                                        <input
                                            type="number"
                                            value={form.threshold}
                                            onChange={(e) => setForm({ ...form, threshold: e.target.value })}
                                            placeholder="20"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={createPolicy}
                                    disabled={submitting}
                                    className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                >
                                    {submitting ? (
                                        <>Processing...</>
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
                                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
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
                                                                    {AssetImg ? <img src={AssetImg} className="w-6 h-6 rounded-full border border-white" /> : <div className="w-6 h-6 rounded-full bg-gray-200 border border-white" />}
                                                                    {QuoteImg ? <img src={QuoteImg} className="w-6 h-6 rounded-full border border-white" /> : <div className="w-6 h-6 rounded-full bg-gray-200 border border-white" />}
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
                                                                    className="bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm"
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