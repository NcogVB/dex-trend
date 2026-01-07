import { useState, useCallback, useEffect, useRef } from "react";
import { ChevronDown, TrendingUp, Activity, Wallet, Loader2, ArrowDownUp, AlertCircle, Coins } from "lucide-react";
import { useWallet } from "../../contexts/WalletContext";
import { TOKENS } from "../../utils/SwapTokens";
import { ethers, Contract } from "ethers";
import { ERC20_ABI } from "../../contexts/ABI";

const CONTRACT_ADDRESS = "0x6Cc3baF9320934d4DEcAB8fdAc92F00102A58994";

const LENDING_ABI = [
    "function deposit(address asset, uint256 amount) external",
    "function withdraw(address asset, uint256 amount) external",
    "function borrow(address asset, uint256 amount) external",
    "function repay(address asset, uint256 amount) external",
    "function repayWithCollateral(address asset, uint256 amount) external",
    "function getUserAccountData(address user, address token) external view returns (uint256 totalCollateralUSD, uint256 totalDebtUSD, uint256 healthFactor, uint256 availableToBorrowUSD, uint256 tokenCollateralBalance, uint256 tokenDebtBalance)",
    "function getReserveData(address token) external view returns (uint256 totalLiquidity, uint256 totalBorrows, uint256 borrowAPR, uint256 depositAPR)"
];

const LendingBorrowing = () => {
    const { account, provider, signer } = useWallet();

    const [activeTab, setActiveTab] = useState<"supply" | "borrow">("supply");
    const [actionType, setActionType] = useState<"deposit" | "withdraw" | "borrow" | "repay">("deposit");
    const [selectedTokenAddr, setSelectedTokenAddr] = useState(TOKENS[0].address);
    const [amount, setAmount] = useState("");

    // Toggle for Hybrid Repayment
    const [useInternalRepay, setUseInternalRepay] = useState(true);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [globalStats, setGlobalStats] = useState({
        healthFactor: "∞",
        totalCollateralUSD: "0.00",
        totalDebtUSD: "0.00",
        availableBorrowUSD: "0.00",
        netWorth: "0.00"
    });

    const [tokenData, setTokenData] = useState<any[]>([]);

    const activeToken = tokenData.find(t => t.address.toLowerCase() === selectedTokenAddr.toLowerCase()) || tokenData[0] || TOKENS[0];

    const fmt = (val: bigint | string, dec = 18, fixed = 4) => {
        if (!val) return "0";
        return parseFloat(ethers.formatUnits(val, dec)).toFixed(fixed);
    };

    const parseVal = (val: string, dec = 18) => {
        if (!val) return 0n;
        return ethers.parseUnits(val, dec);
    };

    const fetchData = useCallback(async () => {
        if (!account || !provider) return;
        try {
            const lendingContract = new Contract(CONTRACT_ADDRESS, LENDING_ABI, provider);

            // Fetch data for ALL tokens in the list
            const updatedTokens = await Promise.all(TOKENS.map(async (t) => {
                const tokenContract = new Contract(t.address, ERC20_ABI, provider);
                const balance = await tokenContract.balanceOf(account).catch(() => 0n);

                // Fetch Contract Data
                const reserveData = await lendingContract.getReserveData(t.address).catch(() => ({ borrowAPR: 0n, depositAPR: 0n }));

                const userData = await lendingContract.getUserAccountData(account, t.address).catch(() => ({
                    tokenCollateralBalance: 0n,
                    tokenDebtBalance: 0n,
                    totalCollateralUSD: 0n,
                    totalDebtUSD: 0n,
                    healthFactor: ethers.MaxUint256,
                    availableToBorrowUSD: 0n
                }));

                return {
                    ...t,
                    decimals: 18, // Fallback if decimals missing in config
                    walletBalance: balance,
                    deposited: userData.tokenCollateralBalance,
                    borrowed: userData.tokenDebtBalance,
                    depositAPR: Number(reserveData.depositAPR) / 100,
                    borrowAPR: Number(reserveData.borrowAPR) / 100,
                    global: {
                        col: userData.totalCollateralUSD,
                        debt: userData.totalDebtUSD,
                        health: userData.healthFactor,
                        avail: userData.availableToBorrowUSD
                    }
                };
            }));

            setTokenData(updatedTokens);

            if (updatedTokens.length > 0) {
                const g = updatedTokens[0].global; // Global stats are same for all tokens
                const net = Number(ethers.formatUnits(g.col, 18)) - Number(ethers.formatUnits(g.debt, 18));

                setGlobalStats({
                    totalCollateralUSD: fmt(g.col, 18, 2),
                    totalDebtUSD: fmt(g.debt, 18, 2),
                    healthFactor: g.health > ethers.parseUnits("100", 18) ? "∞" : fmt(g.health, 18, 2),
                    availableBorrowUSD: fmt(g.avail, 18, 2),
                    netWorth: net.toFixed(2)
                });
            }

        } catch (e) {
            console.error("Fetch Error:", e);
        }
    }, [account, provider]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleTransaction = async () => {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return alert("Invalid Amount");
        if (!signer) return alert("Connect Wallet");

        setIsLoading(true);
        try {
            const contract = new Contract(CONTRACT_ADDRESS, LENDING_ABI, signer);
            const tokenContract = new Contract(activeToken.address, ERC20_ABI, signer);
            const weiAmount = parseVal(amount, activeToken.decimals);
            if (actionType === "deposit" || actionType === "repay") {
                const allowance = await tokenContract.allowance(account, CONTRACT_ADDRESS);
                if (allowance < weiAmount) {
                    const txApp = await tokenContract.approve(CONTRACT_ADDRESS, ethers.MaxUint256);
                    await txApp.wait();
                }
            }

            let tx;
            if (actionType === "deposit") tx = await contract.deposit(activeToken.address, weiAmount);
            if (actionType === "withdraw") tx = await contract.withdraw(activeToken.address, weiAmount);
            if (actionType === "borrow") tx = await contract.borrow(activeToken.address, weiAmount);
            if (actionType === "repay") {
                if (useInternalRepay) {
                    // Call the Hybrid function
                    tx = await contract.repayWithCollateral(activeToken.address, weiAmount);
                } else {
                    // Call standard function (Wallet only)
                    tx = await contract.repay(activeToken.address, weiAmount);
                }
            }

            await tx.wait();
            alert("Transaction Successful!");
            setAmount("");
            fetchData();
        } catch (err: any) {
            console.error(err);
            alert("Error: " + (err.reason || err.message || "Transaction Failed"));
        } finally {
            setIsLoading(false);
        }
    };

    const getMax = () => {
        if (!activeToken) return "0";
        if (actionType === "deposit") return fmt(activeToken.walletBalance, activeToken.decimals);
        if (actionType === "withdraw") return fmt(activeToken.deposited, activeToken.decimals);
        if (actionType === "repay") {
            // If internal repay, we can technically repay up to debt amount (hybrid will handle source)
            return fmt(activeToken.borrowed, activeToken.decimals);
        }
        return "0";
    };

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: any) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    return (
        <div className="flex flex-col items-center justify-start min-h-screen w-full px-4 pt-8 gap-6 max-w-6xl mx-auto font-sans">

            {/* GLOBAL DASHBOARD */}
            <div className="w-full grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition hover:shadow-md">
                    <p className="text-xs text-gray-500 font-bold uppercase flex items-center gap-1"><Wallet size={12} /> Net Worth</p>
                    <p className="text-2xl font-black text-gray-800 mt-1">${globalStats.netWorth}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition hover:shadow-md">
                    <p className="text-xs text-gray-500 font-bold uppercase flex items-center gap-1"><TrendingUp size={12} /> Borrow Power</p>
                    <p className="text-2xl font-black text-green-600 mt-1">${globalStats.availableBorrowUSD}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition hover:shadow-md">
                    <p className="text-xs text-gray-500 font-bold uppercase flex items-center gap-1"><Activity size={12} /> Health Factor</p>
                    <p className={`text-2xl font-black mt-1 ${globalStats.healthFactor === "∞" || Number(globalStats.healthFactor) > 2 ? "text-green-500" : "text-red-500"}`}>
                        {globalStats.healthFactor}
                    </p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition hover:shadow-md">
                    <p className="text-xs text-gray-500 font-bold uppercase flex items-center gap-1"><AlertCircle size={12} /> Total Debt</p>
                    <p className="text-2xl font-black text-red-600 mt-1">${globalStats.totalDebtUSD}</p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 w-full">

                {/* INTERACTION CARD */}
                <div className="w-full lg:w-1/3 bg-white border border-gray-200 shadow-xl rounded-3xl overflow-hidden h-fit">
                    <div className="flex border-b border-gray-100">
                        <button onClick={() => { setActiveTab("supply"); setActionType("deposit"); setAmount(""); }}
                            className={`flex-1 py-4 font-bold text-sm transition-colors ${activeTab === "supply" ? "text-red-600 bg-red-50 border-b-2 border-red-600" : "text-gray-400 hover:text-gray-600"}`}>
                            Supply
                        </button>
                        <button onClick={() => { setActiveTab("borrow"); setActionType("borrow"); setAmount(""); }}
                            className={`flex-1 py-4 font-bold text-sm transition-colors ${activeTab === "borrow" ? "text-red-600 bg-red-50 border-b-2 border-red-600" : "text-gray-400 hover:text-gray-600"}`}>
                            Borrow
                        </button>
                    </div>

                    <div className="flex gap-3 px-6 pt-6">
                        {activeTab === "supply" ? (
                            <>
                                <button onClick={() => setActionType("deposit")} className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${actionType === "deposit" ? "bg-black text-white shadow-md" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>Deposit</button>
                                <button onClick={() => setActionType("withdraw")} className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${actionType === "withdraw" ? "bg-black text-white shadow-md" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>Withdraw</button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setActionType("borrow")} className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${actionType === "borrow" ? "bg-black text-white shadow-md" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>Borrow</button>
                                <button onClick={() => setActionType("repay")} className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${actionType === "repay" ? "bg-black text-white shadow-md" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>Repay</button>
                            </>
                        )}
                    </div>

                    <div className="p-6">
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 transition-all focus-within:ring-2 focus-within:ring-red-100 focus-within:border-red-300">
                            <div className="flex justify-between mb-2">
                                <span className="text-xs font-bold text-gray-400">{actionType.toUpperCase()} Amount</span>
                                <span onClick={() => setAmount(getMax())} className="text-xs font-bold text-red-600 cursor-pointer hover:underline">Max: {getMax()}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-transparent text-2xl font-bold outline-none text-gray-800 placeholder-gray-300"
                                />
                                <div className="relative" ref={dropdownRef}>
                                    <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-200 hover:bg-gray-50 transition">
                                        <img src={activeToken?.img} className="w-5 h-5 rounded-full object-cover" alt="" />
                                        <span className="font-bold text-sm">{activeToken?.symbol}</span>
                                        <ChevronDown size={14} className="text-gray-400" />
                                    </button>

                                    {isDropdownOpen && (
                                        <div className="absolute right-0 top-10 w-64 bg-white border border-gray-100 shadow-xl rounded-xl z-50 overflow-hidden max-h-64 overflow-y-auto custom-scrollbar">
                                            {tokenData.map(t => (
                                                <button key={t.address} onClick={() => { setSelectedTokenAddr(t.address); setIsDropdownOpen(false); }} className="flex items-center justify-between w-full px-4 py-3 hover:bg-red-50 text-left border-b border-gray-50 last:border-0 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <img src={t.img} className="w-7 h-7 rounded-full shadow-sm object-cover" alt="" />
                                                        <div>
                                                            <p className="font-bold text-sm text-gray-800">{t.symbol}</p>
                                                            <p className="text-[10px] text-gray-400">{t.name}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-bold text-gray-700">{fmt(t.walletBalance, t.decimals, 2)}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Hybrid Repayment Toggle */}
                        {actionType === "repay" && (
                            <div className="mt-4 flex items-center justify-between bg-yellow-50 p-3 rounded-xl border border-yellow-100 cursor-pointer" onClick={() => setUseInternalRepay(!useInternalRepay)}>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-gray-800 flex items-center gap-1"><Coins size={14} className="text-yellow-600" /> Pay with Collateral</span>
                                    <span className="text-[10px] text-gray-500">Use contract balance + wallet</span>
                                </div>
                                <div className={`w-10 h-5 rounded-full relative transition-colors ${useInternalRepay ? 'bg-yellow-500' : 'bg-gray-300'}`}>
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${useInternalRepay ? 'left-6' : 'left-1'}`}></div>
                                </div>
                            </div>
                        )}

                        <div className="mt-6 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Asset APY</span>
                                <span className="font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-lg">
                                    {activeTab === "supply" ? `${activeToken?.depositAPR?.toFixed(2)}%` : `${activeToken?.borrowAPR?.toFixed(2)}%`}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Collateral Factor</span>
                                <span className="font-bold text-gray-800">80%</span>
                            </div>
                        </div>

                        <button
                            onClick={handleTransaction}
                            disabled={isLoading || !account}
                            className={`w-full mt-6 py-4 rounded-xl font-bold text-white shadow-lg transition active:scale-[0.98] flex justify-center items-center gap-2
                                ${!account ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 shadow-red-200"}
                            `}
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : (!account ? "Connect Wallet" : actionType.toUpperCase())}
                        </button>
                    </div>
                </div>

                {/* USER POSITIONS TABLE */}
                <div className="w-full lg:w-2/3 bg-white border border-gray-200 shadow-sm rounded-3xl p-6 h-fit min-h-[400px]">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <ArrowDownUp size={18} className="text-gray-400" /> Your Positions
                    </h3>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-gray-400 text-xs uppercase border-b border-gray-100">
                                    <th className="pb-4 font-semibold pl-2">Asset</th>
                                    <th className="pb-4 font-semibold">Net APY</th>
                                    <th className="pb-4 font-semibold">Deposited</th>
                                    <th className="pb-4 font-semibold">Borrowed</th>
                                    <th className="pb-4 font-semibold">Wallet</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {tokenData.map((token) => (
                                    <tr key={token.address} className="group hover:bg-gray-50 transition-colors">
                                        <td className="py-4 pl-2">
                                            <div className="flex items-center gap-3">
                                                <img src={token.img} className="w-9 h-9 rounded-full shadow-sm object-cover group-hover:scale-110 transition-transform" alt="" />
                                                <div>
                                                    <p className="font-bold text-sm text-gray-800">{token.symbol}</p>
                                                    <p className="text-[10px] text-gray-400">{token.name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-green-600 bg-green-50 w-fit px-1.5 rounded-md">+{token.depositAPR.toFixed(2)}%</span>
                                                <span className="text-[10px] text-red-400">-{token.borrowAPR.toFixed(2)}%</span>
                                            </div>
                                        </td>
                                        <td className="py-4 font-medium text-gray-700">
                                            {fmt(token.deposited, token.decimals)}
                                        </td>
                                        <td className="py-4 font-medium text-red-600">
                                            {fmt(token.borrowed, token.decimals)}
                                        </td>
                                        <td className="py-4 font-medium text-gray-400">
                                            {fmt(token.walletBalance, token.decimals)}
                                        </td>
                                    </tr>
                                ))}
                                {tokenData.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12 text-gray-400 text-sm flex flex-col items-center gap-2">
                                            <Loader2 className="animate-spin text-gray-300" />
                                            Loading Assets...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LendingBorrowing;