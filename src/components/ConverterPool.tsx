import React, { useState, useRef, useEffect } from "react";
import { useWallet } from "../contexts/WalletContext";
import { ethers } from "ethers";
import { ArrowLeft, ChevronDown, Plus, Layers, Loader2, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TOKENS } from "../utils/SwapTokens";
import { useLiquidity } from "../hooks/useLiquidity";

const ConverterPool: React.FC = () => {
    const { addLiquidity, loading } = useLiquidity();
    const { provider } = useWallet();
    const navigate = useNavigate();

    const [fromToken, setFromToken] = useState(TOKENS[0]);
    const [toToken, setToToken] = useState(TOKENS[1]);
    const [amount, setAmount] = useState<string>("");
    const [isAdding, setIsAdding] = useState(false);

    const [showFromDropdown, setShowFromDropdown] = useState(false);
    const [showToDropdown, setShowToDropdown] = useState(false);

    // Refs for clicking outside dropdowns
    const fromRef = useRef<HTMLDivElement>(null);
    const toRef = useRef<HTMLDivElement>(null);

    const FACTORY_ADDRESS = "0x339A0Da8ffC7a6fc98Bf2FC53a17dEEf36F0D9c3";
    const FACTORY_ABI = [
        "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"
    ];

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (fromRef.current && !fromRef.current.contains(event.target as Node)) {
                setShowFromDropdown(false);
            }
            if (toRef.current && !toRef.current.contains(event.target as Node)) {
                setShowToDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAddLiquidity = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            alert("Please enter a valid amount");
            return;
        }
        setIsAdding(true);
        try {
            const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
            // Checking for 0.05% pool (500)
            const poolAddress = await factory.getPool(fromToken.address, toToken.address, 500);

            if (poolAddress === ethers.ZeroAddress) {
                alert("No pool exists for this pair (0.05%). Please create the pool first.");
                setIsAdding(false);
                return;
            }

            console.log("Pool Found:", poolAddress);

            await addLiquidity({
                tokenA: fromToken.address,
                tokenB: toToken.address,
                amountA: amount,
                amountB: amount, // Logic: Adding equal raw amounts (or as per hook logic)
            });

            alert("Liquidity added successfully!");
            setAmount("");
        } catch (err) {
            console.error("Error adding liquidity:", err);
            alert("Failed to add liquidity. Check console for details.");
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="flex items-center justify-center px-4 min-h-[90vh] bg-gray-50/50">
            <div className="w-full max-w-[480px]">
                <div className="bg-white shadow-xl border border-gray-100 rounded-3xl overflow-hidden relative">

                    {/* Header */}
                    <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h2 className="font-bold text-lg text-gray-800">Add Liquidity</h2>
                        <div className="w-9 h-9 flex items-center justify-center rounded-full bg-red-50 text-red-600">
                            <Layers size={18} />
                        </div>
                    </div>

                    <div className="p-6 space-y-6">

                        {/* Pair Selection Area */}
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 block">
                                Select Pair
                            </label>

                            <div className="flex items-center gap-3">
                                {/* Token A Selector */}
                                <div className="relative flex-1" ref={fromRef}>
                                    <button
                                        onClick={() => setShowFromDropdown(!showFromDropdown)}
                                        className="w-full flex items-center justify-between bg-white border border-gray-200 px-3 py-2.5 rounded-xl shadow-sm hover:border-red-400 transition-all"
                                    >
                                        <div className="flex items-center gap-2">
                                            <img src={fromToken.img} alt="" className="w-6 h-6 rounded-full border border-gray-100" />
                                            <span className="font-bold text-gray-700">{fromToken.symbol}</span>
                                        </div>
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    </button>

                                    {showFromDropdown && (
                                        <div className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-20 overflow-hidden max-h-56 overflow-y-auto">
                                            {TOKENS.filter(t => t.symbol !== toToken.symbol).map((t) => (
                                                <button
                                                    key={t.symbol}
                                                    onClick={() => {
                                                        setFromToken(t);
                                                        setShowFromDropdown(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                                                >
                                                    <img src={t.img} className="w-6 h-6 rounded-full" alt="" />
                                                    <span className="font-medium text-gray-700">{t.symbol}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="text-gray-400">
                                    <Plus size={16} />
                                </div>

                                {/* Token B Selector */}
                                <div className="relative flex-1" ref={toRef}>
                                    <button
                                        onClick={() => setShowToDropdown(!showToDropdown)}
                                        className="w-full flex items-center justify-between bg-white border border-gray-200 px-3 py-2.5 rounded-xl shadow-sm hover:border-red-400 transition-all"
                                    >
                                        <div className="flex items-center gap-2">
                                            <img src={toToken.img} alt="" className="w-6 h-6 rounded-full border border-gray-100" />
                                            <span className="font-bold text-gray-700">{toToken.symbol}</span>
                                        </div>
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    </button>

                                    {showToDropdown && (
                                        <div className="absolute top-full right-0 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-20 overflow-hidden max-h-56 overflow-y-auto">
                                            {TOKENS.filter(t => t.symbol !== fromToken.symbol).map((t) => (
                                                <button
                                                    key={t.symbol}
                                                    onClick={() => {
                                                        setToToken(t);
                                                        setShowToDropdown(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                                                >
                                                    <img src={t.img} className="w-6 h-6 rounded-full" alt="" />
                                                    <span className="font-medium text-gray-700">{t.symbol}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Fee Tier Badge */}
                            <div className="flex justify-end mt-2">
                                <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                    0.05% Fee Tier
                                </span>
                            </div>
                        </div>

                        {/* Amount Input */}
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-medium text-gray-600">Deposit Amount</label>
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <Info size={12} /> Applies to both assets
                                </span>
                            </div>
                            <div className="relative">
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-4 text-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all placeholder-gray-300"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <span className="text-xs font-bold text-gray-400 uppercase">UNITS</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={handleAddLiquidity}
                            disabled={isAdding || loading || !amount}
                            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2
                                ${isAdding || loading
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                                    : "bg-gradient-to-r from-red-600 to-red-500 text-white"
                                }`}
                        >
                            {isAdding || loading ? (
                                <>
                                    <Loader2 className="animate-spin w-5 h-5" />
                                    Processing...
                                </>
                            ) : (
                                "Confirm Deposit"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConverterPool;