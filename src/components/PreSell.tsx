"use client";

import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import presaleABI from "../ABI/ICO.json";
import usdtABI from "../ABI/usdt.json";
import { useWallet } from "../contexts/WalletContext";

// --- BSC Configuration ---
const BSC_RPC = "https://bsc-dataseed.binance.org"; // Fast Public RPC
const CHAIN_ID = 56; // Binance Smart Chain Mainnet

const CONTRACTS = {
    PRESALE: "0xc927a357Ae3dEC46BF7eBB047942B488f8c01238",
    USDT: "0x55d398326f99059fF775485246999027B3197955",
    DXT: "0x6987b2ac4CCf7f48e5B0eF4C2F499F49f81f37b3",
};

const DECIMALS = {
    USDT: 18,
    DXT: 18
};

// --- Read-Only Provider ---
const READ_PROVIDER = new ethers.JsonRpcProvider(BSC_RPC);

export default function PreSell() {
    const { provider, signer, chainId, account, formatAddress } = useWallet();

    // State
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
    const [buyers, setBuyers] = useState<Array<any>>([]);
    const [userContributed, setUserContributed] = useState("0");
    const [userBought, setUserBought] = useState("0");

    // Derived
    const requiredUSDT = buyAmount ? Number(buyAmount) * price : 0;

    // --- Fast Data Loading (Uses READ_PROVIDER) ---
    const refreshData = useCallback(async () => {
        try {
            // 1. Global Data (Phase, Buyers) - Use Fast RPC
            const presaleRead = new ethers.Contract(CONTRACTS.PRESALE, presaleABI, READ_PROVIDER);
            
            const [pId, buyersRaw] = await Promise.all([
                presaleRead.currentPhaseId(),
                presaleRead.getAllBuyers()
            ]);

            const pIdNum = Number(pId);
            setPhaseId(pIdNum);

            const ph = await presaleRead.phases(pIdNum);
            const alloc = Number(ph[0]) / 10 ** DECIMALS.DXT;
            const pUSDT = Number(ph[1]) / 10 ** DECIMALS.USDT;
            const sold = Number(ph[2]) / 10 ** DECIMALS.DXT;

            setTotalAllocation(alloc);
            setSoldAmount(sold);
            setRemaining((alloc - sold).toLocaleString());
            setPrice(pUSDT);
            setSoldPercent(alloc > 0 ? Number(((sold / alloc) * 100).toFixed(2)) : 0);

            setBuyers(buyersRaw.map((b: any) => ({
                wallet: b.buyer,
                totalDXT: (Number(b.totalDXTBought) / 10 ** DECIMALS.DXT).toFixed(2),
                totalUSDT: (Number(b.totalUSDTPaid) / 10 ** DECIMALS.USDT).toFixed(2),
                lastPhase: Number(b.lastPhase),
                timestamp: Number(b.lastPurchaseTime)
            })).reverse().slice(0, 20));

            // 2. User Data (Balances, Allowance) - Only if connected to BSC
            if (account && provider && chainId === CHAIN_ID) {
                const presaleWallet = new ethers.Contract(CONTRACTS.PRESALE, presaleABI, provider);
                const usdtWallet = new ethers.Contract(CONTRACTS.USDT, usdtABI, provider);
                const dxtWallet = new ethers.Contract(CONTRACTS.DXT, usdtABI, provider);

                const [uContrib, uBought, uBal, dBal, allow] = await Promise.all([
                    presaleWallet.contributed(account),
                    presaleWallet.bought(account),
                    usdtWallet.balanceOf(account),
                    dxtWallet.balanceOf(account),
                    usdtWallet.allowance(account, CONTRACTS.PRESALE)
                ]);

                setUserContributed((Number(uContrib) / 10 ** DECIMALS.USDT).toFixed(2));
                setUserBought((Number(uBought) / 10 ** DECIMALS.DXT).toFixed(2));
                setUsdtBalance((Number(uBal) / 10 ** DECIMALS.USDT).toFixed(2));
                setDxtBalance((Number(dBal) / 10 ** DECIMALS.DXT).toFixed(2));
                setAllowance((Number(allow) / 10 ** DECIMALS.USDT).toString());
            }
        } catch (err) {
            console.error("Data refresh failed", err);
        }
    }, [account, provider, chainId]);

    // Initial Load & Polling
    useEffect(() => {
        refreshData();
        const interval = setInterval(refreshData, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, [refreshData]);

    // --- Actions ---
    const approveUSDT = async () => {
        if (!signer) return alert("Connect wallet");
        if (chainId !== CHAIN_ID) return alert("Please switch network to Binance Smart Chain");
        
        setIsApproving(true);
        try {
            const usdt = new ethers.Contract(CONTRACTS.USDT, usdtABI, signer);
            const tx = await usdt.approve(CONTRACTS.PRESALE, ethers.parseUnits("1000000000", DECIMALS.USDT));
            await tx.wait();
            refreshData();
        } catch (e) { console.error(e); alert("Approval failed"); }
        setIsApproving(false);
    };

    const buyTokens = async () => {
        if (!signer) return alert("Connect wallet");
        if (chainId !== CHAIN_ID) return alert("Please switch network to Binance Smart Chain");
        if (!buyAmount || Number(buyAmount) <= 0) return alert("Enter amount");
        
        setIsBuying(true);
        try {
            const contract = new ethers.Contract(CONTRACTS.PRESALE, presaleABI, signer);
            const tx = await contract.buy(ethers.parseUnits(buyAmount, DECIMALS.DXT));
            await tx.wait();
            alert("Purchase successful!");
            setBuyAmount("");
            refreshData();
        } catch (e: any) {
            console.error(e);
            alert("Failed: " + (e.reason || e.message || "Unknown error"));
        }
        setIsBuying(false);
    };

    const needsApproval = Number(buyAmount || "0") * price > Number(allowance);

    return (
        <div className="min-h-screen bg-white p-6">
            <div className="max-w-7xl mx-auto">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {[
                        { l: "Your USDT", v: usdtBalance },
                        { l: "Your DXT", v: dxtBalance },
                        { l: "Total Contributed", v: `${userContributed} USDT` },
                        { l: "Total Purchased", v: `${userBought} DXT` }
                    ].map((stat, i) => (
                        <div key={i} className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                            <div className="text-xs text-red-600 font-semibold mb-1">{stat.l}</div>
                            <div className="text-2xl font-bold text-red-700">{stat.v}</div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Buy Widget */}
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
                                <button
                                    onClick={needsApproval ? approveUSDT : buyTokens}
                                    disabled={isApproving || isBuying || !buyAmount}
                                    className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 text-sm"
                                >
                                    {needsApproval 
                                        ? (isApproving ? "Approving..." : "Approve USDT") 
                                        : (isBuying ? "Buying..." : "Buy Now")}
                                </button>
                            </div>
                        </div>

                        {/* Phase Info */}
                        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
                            <h3 className="text-base font-bold mb-3 text-red-700">Phase {phaseId} Details</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-gray-600">Price per DXT</span><span className="font-bold text-red-700">${price}</span></div>
                                <div className="flex justify-between"><span className="text-gray-600">Allocation</span><span className="font-bold text-gray-800">{totalAllocation.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-gray-600">Sold</span><span className="font-bold text-gray-800">{soldAmount.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-gray-600">Remaining</span><span className="font-bold text-red-600">{remaining}</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-2">
                        {/* Progress */}
                        <div className="bg-white border-2 border-red-200 rounded-xl p-5 mb-6">
                            <h2 className="text-lg font-bold mb-4 text-red-700">Presale Progress</h2>
                            <div className="mb-4">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-600 font-semibold">Phase {phaseId} Progress</span>
                                    <span className="font-bold text-red-600">{soldPercent}%</span>
                                </div>
                                <div className="w-full bg-red-100 rounded-full h-3 overflow-hidden border border-red-200">
                                    <div className="bg-red-600 h-3 rounded-full transition-all duration-500" style={{ width: `${soldPercent}%` }}></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-5 gap-2 mt-5">
                                {[1, 2, 3, 4, 5].map((p) => (
                                    <div key={p} className={`text-center p-3 rounded-lg border-2 transition ${p === phaseId ? "bg-red-100 border-red-500" : p < phaseId ? "bg-green-50 border-green-500" : "bg-gray-50 border-gray-300"}`}>
                                        <div className="text-xs text-gray-600 font-semibold">Phase</div>
                                        <div className="text-xl font-bold text-gray-800">{p}</div>
                                        <div className="text-xs text-gray-600 font-semibold">${[0.025, 0.05, 0.1, 0.15, 0.2][p - 1]}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Buyers Table */}
                        <div className="bg-white border-2 border-red-200 rounded-xl p-5">
                            <h2 className="text-lg font-bold mb-4 text-red-700">Recent Buyers</h2>
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
                                                <tr><td colSpan={4} className="text-center py-8 text-gray-500">No buyers yet. Be the first!</td></tr>
                                            ) : (
                                                buyers.map((b, i) => (
                                                    <tr key={i} className="border-b border-red-100 hover:bg-red-50 transition">
                                                        <td className="py-3 px-2 text-red-600 font-medium">{formatAddress(b.wallet)}</td>
                                                        <td className="py-3 px-2 text-right font-semibold text-gray-800">{Number(b.totalDXT).toLocaleString()}</td>
                                                        <td className="py-3 px-2 text-right font-semibold text-red-600">{Number(b.totalUSDT).toLocaleString()}</td>
                                                        <td className="py-3 px-2 text-center"><span className="inline-block px-2 py-1 bg-red-100 border border-red-300 rounded text-xs font-semibold text-red-700">Phase {b.lastPhase}</span></td>
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