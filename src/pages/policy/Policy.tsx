import React, { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import DeFiInsuranceABI from "./ABI.json"; // ABI JSON file
import { useWallet } from "../../contexts/WalletContext";

const CONTRACT_ADDRESS = "0xF1Cfa890bF34663F1F9138C3D8974D6711CB69b4"; // replace with your deployed address

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
}

const PolicyDashboard: React.FC = () => {
    const { account, signer } = useWallet();
    const [contract, setContract] = useState<ethers.Contract | null>(null);
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [premiumRate, setPremiumRate] = useState<string>("");
    const [underwriterShare, setUnderwriterShare] = useState<string>("");

    // User inputs for creating new policy
    const [form, setForm] = useState({
        assetToken: "",
        quoteToken: "",
        fee: 500,
        notional: "",
        duration: "",
        threshold: "",
    });

    // ====================== INITIALIZE CONTRACT ======================
    useEffect(() => {
        if (!signer) return;
        const instance = new ethers.Contract(CONTRACT_ADDRESS, DeFiInsuranceABI.abi, signer);
        setContract(instance);
    }, [signer]);

    // ====================== FETCH POLICIES ======================
    const fetchPolicies = useCallback(async () => {
        if (!contract) return;
        setRefreshing(true);

        try {
            const counter = await contract.policyCounter();
            const count = Number(counter);
            const allPolicies: Policy[] = [];

            for (let i = 1; i <= count; i++) {
                const p = await contract.getPolicyDetails(i);
                if (p.holder === account) {
                    allPolicies.push({
                        policyId: i,
                        holder: p.holder,
                        assetToken: p.assetToken,
                        quoteToken: p.quoteToken,
                        notional: ethers.formatUnits(p.notional, 18),
                        coverageDuration: (Number(p.coverageDuration) / 86400).toFixed(1) + " days",
                        thresholdPercentage: (Number(p.thresholdPercentage) / 10000).toFixed(2) + "%",
                        premium: ethers.formatUnits(p.premium, 18),
                        purchaseTime: new Date(Number(p.purchaseTime) * 1000).toLocaleString(),
                        expiryTime: new Date(Number(p.expiryTime) * 1000).toLocaleString(),
                        claimed: p.claimed,
                        active: p.active,
                    });
                }
            }

            const rateBps = await contract.premiumRateBps();
            const shareBps = await contract.underwriterShareBps();

            const premiumPercent = Number(rateBps) / 100;        // convert bps → %
            const underwriterPercent = Number(shareBps) / 100;   // convert bps → %

            setPremiumRate(premiumPercent.toFixed(2) + "%");
            setUnderwriterShare(underwriterPercent.toFixed(2) + "%");

            setPolicies(allPolicies);
        } catch (err) {
            console.error("❌ Failed to load policies:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [contract, account]);

    useEffect(() => {
        if (contract && account) fetchPolicies();
    }, [contract, account, fetchPolicies]);

    // ====================== CREATE POLICY ======================
    const createPolicy = async () => {
        if (!contract || !signer) return;
        try {
            const tx = await contract.purchasePolicy(
                form.assetToken,
                form.quoteToken,
                form.fee,
                ethers.parseUnits(form.notional, 18),
                Number(form.duration) * 86400, // days → seconds
                Number(form.threshold)
            );
            await tx.wait();
            alert("✅ Policy created successfully!");
            fetchPolicies();
        } catch (err: any) {
            console.error("❌ Policy creation failed:", err);
            alert("Failed to create policy: " + err.message);
        }
    };

    // ====================== UI ======================
    if (loading)
        return (
            <div className="p-8 text-gray-500 text-center text-lg animate-pulse">
                ⏳ Loading DeFi Insurance data...
            </div>
        );

    return (
        <div className="p-8 max-w-6xl mx-auto bg-gray-50 min-h-screen transition-all">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-blue-700">🛡️ DeFi Insurance Dashboard</h2>
                <div className="text-sm text-gray-600 flex items-center gap-3">
                    Connected as:{" "}
                    <span className="font-medium text-blue-600">{account || "Not Connected"}</span>
                    {refreshing && <span className="text-blue-500 animate-pulse">Refreshing...</span>}
                </div>
            </div>

            {/* Summary Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="text-gray-500 text-sm">💰 Premium Rate</div>
                    <div className="text-lg font-medium text-gray-800">{premiumRate} </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="text-gray-500 text-sm">🏦 Underwriter Share</div>
                    <div className="text-lg font-medium text-gray-800">{underwriterShare}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="text-gray-500 text-sm">📄 Total Policies</div>
                    <div className="text-lg font-medium text-gray-800">{policies.length}</div>
                </div>
            </div>

            {/* Create Policy Form */}
            <div className="bg-white p-6 rounded-xl shadow border border-gray-200 mb-8">
                <h3 className="text-lg font-semibold text-blue-700 mb-4">➕ Create New Policy</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                        placeholder="Asset Token Address"
                        value={form.assetToken}
                        onChange={(e) => setForm({ ...form, assetToken: e.target.value })}
                        className="border p-2 rounded"
                    />
                    <input
                        placeholder="Quote Token Address"
                        value={form.quoteToken}
                        onChange={(e) => setForm({ ...form, quoteToken: e.target.value })}
                        className="border p-2 rounded"
                    />
                    <input
                        placeholder="Notional (e.g. 100)"
                        value={form.notional}
                        onChange={(e) => setForm({ ...form, notional: e.target.value })}
                        className="border p-2 rounded"
                    />
                    <input
                        placeholder="Coverage Duration (days)"
                        value={form.duration}
                        onChange={(e) => setForm({ ...form, duration: e.target.value })}
                        className="border p-2 rounded"
                    />
                    <input
                        placeholder="Threshold % (e.g. 20)"
                        value={form.threshold}
                        onChange={(e) => setForm({ ...form, threshold: e.target.value })}
                        className="border p-2 rounded"
                    />
                </div>
                <button
                    onClick={createPolicy}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg transition"
                >
                    Create Policy
                </button>
            </div>

            {/* Policy Table */}
            <div className="overflow-x-auto rounded-lg shadow border border-gray-200 bg-white">
                <table className="min-w-full text-sm text-gray-800">
                    <thead className="bg-blue-50 border-b border-gray-200">
                        <tr>
                            {[
                                "Policy ID",
                                "Asset",
                                "Quote",
                                "Notional",
                                "Threshold",
                                "Premium",
                                "Active",
                                "Expiry",
                            ].map((header) => (
                                <th key={header} className="p-3 text-center font-semibold">
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {policies.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-4 text-center text-gray-500">
                                    No policies found.
                                </td>
                            </tr>
                        ) : (
                            policies.map((p, i) => (
                                <tr
                                    key={i}
                                    className={`text-center ${i % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition`}
                                >
                                    <td className="p-3 text-blue-700 font-medium">{p.policyId}</td>
                                    <td className="p-3">{p.assetToken.slice(0, 6)}...</td>
                                    <td className="p-3">{p.quoteToken.slice(0, 6)}...</td>
                                    <td className="p-3">{p.notional}</td>
                                    <td className="p-3">{p.thresholdPercentage}</td>
                                    <td className="p-3 text-green-600">{p.premium}</td>
                                    <td className="p-3">
                                        {p.active ? (
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">Active</span>
                                        ) : (
                                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs">Ended</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-gray-600">{p.expiryTime}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PolicyDashboard;
