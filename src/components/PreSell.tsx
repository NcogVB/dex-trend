"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import presaleABI from "../ABI/ICO.json";
import usdtABI from "../ABI/usdt.json";
import { useWallet } from "../contexts/WalletContext";

const CONTRACTS: Record<number, { PRESALE: string; USDT: string; DXT: string }> = {
    137: {
        PRESALE: "0x545079A4f1D15F2F6a28cC933Cc3961A767516B0",
        USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        DXT: "0x7c0461f4B63f1C9746D767cF22EA4BD8B702Bb5c",
    },
    56: {
        PRESALE: "0x9E7f120EA417515303A80DBF1c13a238bd1D365E",
        USDT: "0x55d398326f99059fF775485246999027B3197955",
        DXT: "0x610E1044C026fCf6AB24B49cad1FF4c616647636",
    },
};


const DECIMALS: {
    USDT: Record<number, number>;
    DXT: Record<number, number>;
} = {
    USDT: {
        137: 6,
        56: 18,
    },
    DXT: {
        137: 18,
        56: 18,
    }
};


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
    const [price, setPrice] = useState(0); // human-readable price in USDT
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

    // pick contracts based on chain
    const activeContracts = chainId ? CONTRACTS[chainId] : undefined;
    const PRESALE = activeContracts?.PRESALE;
    const USDT = activeContracts?.USDT;
    const DXT = activeContracts?.DXT;

    // dynamic decimals per chain
    const usdtDecimals =
        chainId && DECIMALS.USDT[chainId] !== undefined
            ? DECIMALS.USDT[chainId]
            : 18;

    const dxtDecimals =
        chainId && DECIMALS.DXT[chainId] !== undefined
            ? DECIMALS.DXT[chainId]
            : 18;

    // Load Phase Data
    async function loadPhaseData() {
        if (!provider || !PRESALE) return;
        try {
            const contract = new ethers.Contract(PRESALE, presaleABI, provider);
            const pId = await contract.currentPhaseId();
            setPhaseId(Number(pId));

            const ph = await contract.phases(pId);
            const allocation = Number(ph[0]) / 10 ** dxtDecimals;   // DXT allocation
            const priceUSDT = Number(ph[1]) / 10 ** usdtDecimals;   // price in USDT
            const sold = Number(ph[2]) / 10 ** dxtDecimals;         // DXT sold

            setTotalAllocation(allocation);
            setSoldAmount(sold);
            setRemaining((allocation - sold).toLocaleString());
            setPrice(priceUSDT);

            const percent = allocation > 0 ? (sold / allocation) * 100 : 0;
            setSoldPercent(Number(percent.toFixed(2)));
        } catch (err) {
            console.error("Phase load failed:", err);
        }
    }

    // Load User Stats
    async function loadUserStats() {
        if (!provider || !account || !PRESALE) return;
        try {
            const contract = new ethers.Contract(PRESALE, presaleABI, provider);
            const contributed = await contract.contributed(account);
            const bought = await contract.bought(account);

            setUserContributed((Number(contributed) / 10 ** usdtDecimals).toFixed(2));
            setUserBought((Number(bought) / 10 ** dxtDecimals).toFixed(2));
        } catch (err) {
            console.error("User stats load failed:", err);
        }
    }

    // Load Balances
    async function loadBalances() {
        if (!provider || !account || !USDT || !DXT) return;
        try {
            const usdt = new ethers.Contract(USDT, usdtABI, provider);
            const dxt = new ethers.Contract(DXT, usdtABI, provider); // assuming standard ERC20 ABI

            const usdtBal = await usdt.balanceOf(account);
            const dxtBal = await dxt.balanceOf(account);

            setUsdtBalance((Number(usdtBal) / 10 ** usdtDecimals).toFixed(2));
            setDxtBalance((Number(dxtBal) / 10 ** dxtDecimals).toFixed(2));
        } catch (err) {
            console.error("Balance load failed:", err);
        }
    }

    // Load Allowance
    async function loadAllowance() {
        if (!provider || !account || !USDT || !PRESALE) return;
        try {
            const usdt = new ethers.Contract(USDT, usdtABI, provider);
            const allowed = await usdt.allowance(account, PRESALE);
            setAllowance((Number(allowed) / 10 ** usdtDecimals).toString());
        } catch (err) {
            console.error("Allowance load failed:", err);
        }
    }

    // Load All Buyers
    async function loadBuyers() {
        if (!provider || !PRESALE) return;
        try {
            const contract = new ethers.Contract(PRESALE, presaleABI, provider);
            const allBuyers = await contract.getAllBuyers();

            const buyerData = allBuyers
                .map((buyer: { buyer: any; totalDXTBought: any; totalUSDTPaid: any; lastPhase: any; lastPurchaseTime: any; }) => ({
                    wallet: buyer.buyer,
                    totalDXT: (Number(buyer.totalDXTBought) / 10 ** dxtDecimals).toFixed(2),
                    totalUSDT: (Number(buyer.totalUSDTPaid) / 10 ** usdtDecimals).toFixed(2),
                    lastPhase: Number(buyer.lastPhase),
                    timestamp: Number(buyer.lastPurchaseTime)
                }))
                .reverse()
                .slice(0, 20);

            setBuyers(buyerData);
        } catch (err) {
            console.error("Buyers load failed:", err);
        }
    }

    // Approve USDT
    async function approveUSDT() {
        if (!signer || !USDT || !PRESALE) return alert("Connect wallet on supported network first");
        setIsApproving(true);
        try {
            const usdt = new ethers.Contract(USDT, usdtABI, signer);
            // large allowance, using dynamic decimals
            const maxAmount = ethers.parseUnits("1000000000", usdtDecimals);
            const tx = await usdt.approve(PRESALE, maxAmount);
            // button text: Approving...
            await tx.wait();
            await loadAllowance();
            // don't auto-buy here unless you really want that UX
            // await buyTokens();
        } catch (err) {
            console.error(err);
            alert("Approval failed");
        }
        setIsApproving(false);
    }

    // Buy Tokens
    // Buy Tokens
    async function buyTokens() {
        if (!signer || !PRESALE) return alert("Connect wallet first");
        if (!buyAmount || Number(buyAmount) <= 0) return alert("Enter an amount");

        setIsBuying(true);

        try {
            const amount = ethers.parseUnits(buyAmount, dxtDecimals);
            const contract = new ethers.Contract(PRESALE, presaleABI, signer);

            const tx = await contract.buy(amount, { gasLimit: 500000 });

            await tx.wait();

            alert("Purchase successful!");
            setBuyAmount("");

            setTimeout(() => {
                loadPhaseData();
                loadBalances();
                loadAllowance();
                loadUserStats();
                loadBuyers();
            }, 1500);

        } catch (err: any) {
            console.error(err);

            if (err.code === "ACTION_REJECTED") {
                alert("Transaction rejected");
            } else {
                alert("Transaction failed: " + (err.message || "Unknown error"));
            }
        }

        setIsBuying(false);
    }

    useEffect(() => {
        if (!provider || !chainId || !CONTRACTS[chainId]) return;
        loadPhaseData();
        loadBalances();
        loadAllowance();
        loadUserStats();
        loadBuyers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [provider, chainId, account]);

    const needsApproval = requiredUSDT > Number(allowance || "0");

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
                                        <div className="text-xl font-bold text-red-700">
                                            {requiredUSDT.toFixed(4)} USDT
                                        </div>
                                    </div>
                                )}

                                {needsApproval ? (
                                    <button
                                        onClick={approveUSDT}
                                        disabled={isApproving || !buyAmount}
                                        className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 text-sm"
                                    >
                                        {isApproving ? "Approving USDT..." : "Approve USDT"}
                                    </button>
                                ) : (
                                    <button
                                        onClick={buyTokens}
                                        disabled={isBuying || !buyAmount}
                                        className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 text-sm"
                                    >
                                        {isBuying ? "Buying DXT..." : "Buy Now"}
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
                                            ${[0.01, 0.05, 0.1, 0.15, 0.2][p - 1]}
                                        </div>
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
                                                <tr>
                                                    <td colSpan={4} className="text-center py-8 text-gray-500">
                                                        No buyers yet. Be the first!
                                                    </td>
                                                </tr>
                                            ) : (
                                                buyers.map((buyer, i) => (
                                                    <tr
                                                        key={i}
                                                        className="border-b border-red-100 hover:bg-red-50 transition"
                                                    >
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
