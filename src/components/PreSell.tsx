"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import presaleABI from "../ABI/ICO.json";
import usdtABI from "../ABI/usdt.json";
import { useWallet } from "../contexts/WalletContext";

const PRESALE = "0xb6714316dE097AA83B4E2bAf0A22FeB490fE3f98";
const USDT = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const DXT = "0xfE1FA246e89b016a9aD89d8fE859779a19953B60";
const POLYGON_CHAIN_ID = 137;

export default function PreSell() {
    const {
        provider,
        signer,
        isConnected,
        chainId,
        switchToPolygon,
        connect,
        account,
        formatAddress
    } = useWallet();

    const [phaseId, setPhaseId] = useState<number>(1);
    const [remaining, setRemaining] = useState<string>("0");
    const [price, setPrice] = useState<number>(0);
    const [buyAmount, setBuyAmount] = useState<string>("");
    const [dxtBalance, setDxtBalance] = useState<string>("0");
    const [usdtBalance, setUsdtBalance] = useState<string>("0");
    const [allowance, setAllowance] = useState<string>("0");
    const [isApproving, setIsApproving] = useState(false);
    const [isBuying, setIsBuying] = useState(false);

    const requiredUSDT = buyAmount ? Number(buyAmount) * price : 0;

    // -----------------------------
    // Load Phase Data
    // -----------------------------
    async function loadPhaseData() {
        if (!provider) return;
        try {
            const contract = new ethers.Contract(PRESALE, presaleABI, provider);

            const pId = await contract.currentPhaseId();
            setPhaseId(Number(pId));

            const ph = await contract.phases(pId);
            const allocation = Number(ph[0]) / 1e18;
            const sold = Number(ph[2]) / 1e18;
            const priceUSDT = Number(ph[1]) / 1e6;

            setRemaining((allocation - sold).toLocaleString());
            setPrice(priceUSDT);
        } catch (err) {
            console.error("Phase load failed:", err);
        }
    }
    async function loadDXTBalance() {
        if (!provider || !account) return;

        try {
            const dxt = new ethers.Contract(DXT, usdtABI, provider);
            const bal = await dxt.balanceOf(account);

            setDxtBalance((Number(bal) / 1e18).toFixed(2)); // DXT uses 18 decimals
        } catch (err) {
            console.error("DXT balance load failed:", err);
        }
    }
    useEffect(() => {
        if (chainId === POLYGON_CHAIN_ID) {
            loadPhaseData();
            loadUSDTBalance();
            loadAllowance();
            loadDXTBalance();   // <<< ADD THIS
        }
    }, [provider, chainId, account]);

    // -----------------------------
    // Load USDT Balance
    // -----------------------------
    async function loadUSDTBalance() {
        if (!provider || !account) return;

        try {
            const usdt = new ethers.Contract(USDT, usdtABI, provider);
            const bal = await usdt.balanceOf(account);
            setUsdtBalance((Number(bal) / 1e6).toFixed(2));
        } catch (err) {
            console.error("Balance load failed:", err);
        }
    }

    // -----------------------------
    // Load Allowance
    // -----------------------------
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

    // -----------------------------
    // Approve USDT
    // -----------------------------
    async function approveUSDT() {
        if (!signer) return;
        setIsApproving(true);
        try {
            const usdt = new ethers.Contract(USDT, usdtABI, signer);

            const tx = await usdt.approve(
                PRESALE,
                ethers.parseUnits("1000000000000", 6) // unlimited
            );

            await tx.wait();
            await loadAllowance();
            alert("USDT Approved!");
        } catch (err) {
            console.error(err);
            alert("Approval failed");
        }
        setIsApproving(false);
    }

    // -----------------------------
    // Buy Tokens
    // -----------------------------
    async function buyTokens() {
        if (!signer) return alert("Connect wallet first");
        setIsBuying(true);
        try {
            const amount = ethers.parseUnits(buyAmount, 18);
            const contract = new ethers.Contract(PRESALE, presaleABI, signer);

            const tx = await contract.buy(amount);
            await tx.wait();

            alert("Purchase successful!");
            await loadPhaseData();
            await loadUSDTBalance();
            await loadAllowance();
            await loadDXTBalance();
        } catch (err) {
            console.error(err);
            alert("Transaction failed");
        }
        setIsBuying(false);
    }

    // -----------------------------
    // Run when chain becomes Polygon
    // -----------------------------
    useEffect(() => {
        if (chainId === POLYGON_CHAIN_ID) {
            loadPhaseData();
            loadUSDTBalance();
            loadAllowance();
        }
    }, [provider, chainId, account]);

    // Check if user needs approval
    const needsApproval = requiredUSDT > Number(allowance);

    return (
        <div className="min-h-screen bg-gray-50 text-red-900 flex justify-center px-4 py-10">
            <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl border border-gray-200 p-8">

                {/* Header Buttons */}
                <div className="flex justify-between mb-8">
                    <button
                        onClick={() => (!isConnected ? connect() : null)}
                        className="px-6 py-3 bg-gray-800 text-white rounded-xl"
                    >
                        {isConnected ? formatAddress(account!) : "Connect Wallet"}
                    </button>

                    <button
                        onClick={switchToPolygon}
                        className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700"
                    >
                        Switch to Polygon
                    </button>
                </div>

                <h1 className="text-4xl font-extrabold text-center mb-10 text-red-600">
                    DXT Presale
                </h1>

                {/* Phase Display */}
                <div className="bg-white p-6 rounded-2xl mb-10 border shadow-sm">
                    <h2 className="text-2xl font-bold mb-4 text-gray-800">Current Phase</h2>

                    <p><span className="font-semibold text-red-600">Phase:</span> {phaseId}</p>
                    <p><span className="font-semibold text-red-600">Price:</span> ${price} per DXT</p>
                    <p><span className="font-semibold text-red-600">Remaining:</span> {remaining} DXT</p>

                    <p className="mt-3 text-lg">
                        <span className="font-semibold text-red-600">USDT Balance:</span> {usdtBalance}
                    </p>

                    <p className="mt-1 text-lg">
                        <span className="font-semibold text-red-600">DXT Balance:</span> {dxtBalance}
                    </p>

                </div>

                {/* Buy Section */}
                <div className="bg-white p-6 rounded-2xl mb-10 border shadow-sm">
                    <h2 className="text-2xl font-bold mb-4 text-gray-800">Buy Tokens</h2>

                    <input
                        type="number"
                        value={buyAmount}
                        onChange={(e) => setBuyAmount(e.target.value)}
                        className="p-4 border rounded-xl w-full mb-4"
                        placeholder="Enter DXT amount"
                    />

                    {/* If approval needed → show Approve button */}
                    {needsApproval ? (
                        <button
                            onClick={approveUSDT}
                            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg"
                        >
                            {isApproving ? "Approving..." : "Approve USDT"}
                        </button>
                    ) : (
                        <button
                            onClick={buyTokens}
                            className="w-full py-4 bg-red-600 text-white rounded-xl font-semibold text-lg"
                        >
                            {isBuying ? "Buying..." : "Buy Now"}
                        </button>
                    )}

                    {buyAmount && (
                        <p className="mt-4 text-gray-700 text-lg">
                            You will pay: <span className="text-red-600 font-bold">
                                {requiredUSDT.toFixed(4)} USDT
                            </span>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
