"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import presaleABI from "../ABI/ICO.json";
import usdtABI from "../ABI/usdt.json";
import { useWallet } from "../contexts/WalletContext";

const PRESALE = "0x545079A4f1D15F2F6a28cC933Cc3961A767516B0";
const USDT = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const DXT = "0x7c0461f4B63f1C9746D767cF22EA4BD8B702Bb5c";
const POLYGON_CHAIN_ID = 137;

export default function PreSell() {
    const {
        provider,
        signer,
        chainId,
        account,
        formatAddress
    } = useWallet();

    const [phaseId, setPhaseId] = useState(1);
    const [remaining, setRemaining] = useState("0");
    const [price, setPrice] = useState(0);
    const [buyAmount, setBuyAmount] = useState("");
    const [dxtBalance, setDxtBalance] = useState("0");
    const [usdtBalance, setUsdtBalance] = useState("0");
    const [allowance, setAllowance] = useState("0");
    const [isApproving, setIsApproving] = useState(false);
    const [isBuying, setIsBuying] = useState(false);
    const [totalAllocation, setTotalAllocation] = useState(0);
    const [soldAmount, setSoldAmount] = useState(0);
    const [soldPercent, setSoldPercent] = useState(0);
    const [buyers, setBuyers] = useState<Array<{ wallet: string; totalDXT: string; totalUSDT: string; lastPhase: number; timestamp: number }>>([]);
    const [userContributed, setUserContributed] = useState("0");
    const [userBought, setUserBought] = useState("0");

    const requiredUSDT = buyAmount ? Number(buyAmount) * price : 0;

    // Load Phase Data
    async function loadPhaseData() {
        if (!provider) return;
        try {
            const contract = new ethers.Contract(PRESALE, presaleABI, provider);
            const pId = await contract.currentPhaseId();
            setPhaseId(Number(pId));

            const ph = await contract.phases(pId);
            const allocation = Number(ph[0]) / 1e18;
            const priceUSDT = Number(ph[1]) / 1e6;
            const sold = Number(ph[2]) / 1e18;

            setTotalAllocation(allocation);
            setSoldAmount(sold);
            setRemaining((allocation - sold).toLocaleString());
            setPrice(priceUSDT);

            const percent = (sold / allocation) * 100;
            setSoldPercent(Number(percent.toFixed(2)));
        } catch (err) {
            console.error("Phase load failed:", err);
        }
    }

    // Load User Stats
    async function loadUserStats() {
        if (!provider || !account) return;
        try {
            const contract = new ethers.Contract(PRESALE, presaleABI, provider);
            const contributed = await contract.contributed(account);
            const bought = await contract.bought(account);

            setUserContributed((Number(contributed) / 1e6).toFixed(2));
            setUserBought((Number(bought) / 1e18).toFixed(2));
        } catch (err) {
            console.error("User stats load failed:", err);
        }
    }

    // Load Balances
    async function loadBalances() {
        if (!provider || !account) return;
        try {
            const usdt = new ethers.Contract(USDT, usdtABI, provider);
            const dxt = new ethers.Contract(DXT, usdtABI, provider);

            const usdtBal = await usdt.balanceOf(account);
            const dxtBal = await dxt.balanceOf(account);

            setUsdtBalance((Number(usdtBal) / 1e6).toFixed(2));
            setDxtBalance((Number(dxtBal) / 1e18).toFixed(2));
        } catch (err) {
            console.error("Balance load failed:", err);
        }
    }

    // Load Allowance
    async function loadAllowance() {
        if (!provider || !account) return;
        try {
            const usdt = new ethers.Contract(USDT, usdtABI, provider);
            const allowed = await usdt.allowance(account, PRESALE);
            setAllowance((Number(allowed) / 1e6).toString());
        } catch (err) {
            console.error("Allowance load failed:", err);
        }
    }

    // Load All Buyers
    async function loadBuyers() {
        if (!provider) return;
        try {
            const contract = new ethers.Contract(PRESALE, presaleABI, provider);
            const allBuyers = await contract.getAllBuyers();

            const buyerData = allBuyers.map((buyer: { buyer: any; totalDXTBought: any; totalUSDTPaid: any; lastPhase: any; lastPurchaseTime: any; }) => ({
                wallet: buyer.buyer,
                totalDXT: (Number(buyer.totalDXTBought) / 1e18).toFixed(2),
                totalUSDT: (Number(buyer.totalUSDTPaid) / 1e6).toFixed(2),
                lastPhase: Number(buyer.lastPhase),
                timestamp: Number(buyer.lastPurchaseTime)
            })).reverse().slice(0, 20);

            setBuyers(buyerData);
        } catch (err) {
            console.error("Buyers load failed:", err);
        }
    }

    // Approve USDT
    async function approveUSDT() {
        if (!signer) return;
        setIsApproving(true);
        try {
            const usdt = new ethers.Contract(USDT, usdtABI, signer);
            const tx = await usdt.approve(PRESALE, ethers.parseUnits("1000000000", 6));
            await tx.wait();
            await loadAllowance();
            await buyTokens();
        } catch (err) {
            console.error(err);
            alert("Approval failed");
        }
        setIsApproving(false);
    }

    // Buy Tokens
    async function buyTokens() {
        if (!signer) return alert("Connect wallet first");
        setIsBuying(true);
        try {
            const amount = ethers.parseUnits(buyAmount, 18);
            const contract = new ethers.Contract(PRESALE, presaleABI, signer);
            const tx = await contract.buy(amount);
            await tx.wait();

            alert("Purchase successful!");
            setBuyAmount("");
            await loadPhaseData();
            await loadBalances();
            await loadAllowance();
            await loadUserStats();
            await loadBuyers();
        } catch (err) {
            console.error(err);
            alert("Transaction failed");
        }
        setIsBuying(false);
    }

    useEffect(() => {
        if (chainId === POLYGON_CHAIN_ID) {
            loadPhaseData();
            loadBalances();
            loadAllowance();
            loadUserStats();
            loadBuyers();
        }
    }, [provider, chainId, account]);

    const needsApproval = requiredUSDT > Number(allowance);

    return (
        <div className="min-h-screen bg-white p-6">
            <div className="max-w-7xl mx-auto">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                        <div className="text-xs text-red-600 font-semibold mb-1">Your USDT</div>
                        <div className="text-2xl font-bold text-red-700">{usdtBalance}</div>
                    </div>
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                        <div className="text-xs text-red-600 font-semibold mb-1">Your DXT</div>
                        <div className="text-2xl font-bold text-red-700">{dxtBalance}</div>
                    </div>
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                        <div className="text-xs text-red-600 font-semibold mb-1">Your Total Contributed</div>
                        <div className="text-2xl font-bold text-red-700">{userContributed} USDT</div>
                    </div>
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                        <div className="text-xs text-red-600 font-semibold mb-1">Your Total Purchased</div>
                        <div className="text-2xl font-bold text-red-700">{userBought} DXT</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Buy Widget */}
                    <div className="lg:col-span-1">
                        <div className="bg-white border-2 border-red-200 rounded-xl p-5 mb-6">
                            <h2 className="text-lg font-bold mb-4 text-red-700">Buy DXT Tokens</h2>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-gray-600 font-semibold mb-2 block">DXT Amount</label>
                                    <input
                                        type="number"
                                        value={buyAmount}
                                        onChange={(e) => setBuyAmount(e.target.value)}
                                        className="w-full bg-red-50 border-2 border-red-200 rounded-lg px-4 py-2 outline-none focus:border-red-500 transition text-gray-800"
                                        placeholder="0.00"
                                    />
                                </div>

                                {buyAmount && (
                                    <div className="bg-red-100 border-2 border-red-300 rounded-lg p-3">
                                        <div className="text-xs text-red-600 font-semibold mb-1">You will pay</div>
                                        <div className="text-xl font-bold text-red-700">{requiredUSDT.toFixed(4)} USDT</div>
                                    </div>
                                )}

                                {needsApproval ? (
                                    <button
                                        onClick={approveUSDT}
                                        disabled={isApproving}
                                        className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 text-sm"
                                    >
                                        {isApproving ? "Approving..." : "Approve USDT"}
                                    </button>
                                ) : (
                                    <button
                                        onClick={buyTokens}
                                        disabled={isBuying || !buyAmount}
                                        className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 text-sm"
                                    >
                                        {isBuying ? "Processing..." : "Buy Now"}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Phase Info */}
                        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
                            <h3 className="text-base font-bold mb-3 text-red-700">Phase {phaseId} Details</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Price per DXT</span>
                                    <span className="font-bold text-red-700">${price}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Allocation</span>
                                    <span className="font-bold text-gray-800">{totalAllocation.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Sold</span>
                                    <span className="font-bold text-gray-800">{soldAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Remaining</span>
                                    <span className="font-bold text-red-600">{remaining}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Progress & Buyers */}
                    <div className="lg:col-span-2">
                        {/* Progress Section */}
                        <div className="bg-white border-2 border-red-200 rounded-xl p-5 mb-6">
                            <h2 className="text-lg font-bold mb-4 text-red-700">Presale Progress</h2>

                            <div className="mb-4">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-600 font-semibold">Phase {phaseId} Progress</span>
                                    <span className="font-bold text-red-600">{soldPercent}%</span>
                                </div>
                                <div className="w-full bg-red-100 rounded-full h-3 overflow-hidden border border-red-200">
                                    <div
                                        className="bg-red-600 h-3 rounded-full transition-all duration-500"
                                        style={{ width: `${soldPercent}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-5 gap-2 mt-5">
                                {[1, 2, 3, 4, 5].map((p) => (
                                    <div
                                        key={p}
                                        className={`text-center p-3 rounded-lg border-2 transition ${p === phaseId
                                            ? "bg-red-100 border-red-500"
                                            : p < phaseId
                                                ? "bg-green-50 border-green-500"
                                                : "bg-gray-50 border-gray-300"
                                            }`}
                                    >
                                        <div className="text-xs text-gray-600 font-semibold">Phase</div>
                                        <div className="text-xl font-bold text-gray-800">{p}</div>
                                        <div className="text-xs text-gray-600 font-semibold">
                                            ${[0.01, 0.05, 0.10, 0.15, 0.20][p - 1]}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Buyers Table */}
                        <div className="bg-white border-2 border-red-200 rounded-xl p-5">
                            <h2 className="text-lg font-bold mb-4 text-red-700">All Buyers</h2>

                            <div className="overflow-x-auto">
                                <div className="max-h-40 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b-2 border-red-200">
                                                <th className="text-left py-3 px-2 text-gray-700 font-semibold">Wallet</th>
                                                <th className="text-right py-3 px-2 text-gray-700 font-semibold">Total DXT</th>
                                                <th className="text-right py-3 px-2 text-gray-700 font-semibold">Total USDT</th>
                                                <th className="text-center py-3 px-2 text-gray-700 font-semibold">Last Phase</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {buyers.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="text-center py-8 text-gray-500">
                                                        No buyers yet. Be the first!
                                                    </td>
                                                </tr>
                                            ) : (
                                                buyers.map((buyer, i) => (
                                                    <tr key={i} className="border-b border-red-100 hover:bg-red-50 transition">
                                                        <td className="py-3 px-2">
                                                            <span className="text-red-600 font-medium">
                                                                {formatAddress(buyer.wallet)}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-2 text-right font-semibold text-gray-800">
                                                            {Number(buyer.totalDXT).toLocaleString()}
                                                        </td>
                                                        <td className="py-3 px-2 text-right font-semibold text-red-600">
                                                            {Number(buyer.totalUSDT).toLocaleString()}
                                                        </td>
                                                        <td className="py-3 px-2 text-center">
                                                            <span className="inline-block px-2 py-1 bg-red-100 border border-red-300 rounded text-xs font-semibold text-red-700">
                                                                Phase {buyer.lastPhase}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}