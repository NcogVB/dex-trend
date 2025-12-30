import { useState, useCallback, useEffect, useRef } from "react";
import { ChevronDown, TrendingUp, Activity, Wallet, Loader2 } from "lucide-react";
import { useWallet } from "../../contexts/WalletContext";
import { TOKENS } from "../../utils/SwapTokens";
import { ethers, Contract } from "ethers";
import { ERC20_ABI } from "../../contexts/ABI";

// --- ABI & CONFIG ---
const CONTRACT_ADDRESS = "0x09C1f217DAE1cD163d6ce0a234066EB5fB4d07f3";

const LENDING_ABI = [
    "function depositCollateral(address token, uint256 amount) external",
    "function withdrawCollateral(address token, uint256 amount) external",
    "function borrow(address borrowToken, uint256 amount) external",
    "function repay(uint256 amount) external",
    "function userCollateralAmount(address user, address token) view returns (uint256)",
    "function debts(address) view returns (address token, uint256 principal, uint256 interestIndex, uint256 lastAccrued)",
    "function getHealthFactor(address user) view returns (uint256)",
    "function getBorrowAPRPercent() view returns (uint256)",
    "function maxLTV() view returns (uint256)",
    "function getUserCollateralValue(address user) view returns (uint256)"
];

const LendingBorrowing = () => {
    const { account, provider, signer } = useWallet();

    const [tokens, setTokens] = useState(TOKENS.map((t) => ({ ...t, balance: "0.00", deposited: "0.00" })));
    const [activeTab, setActiveTab] = useState<"supply" | "borrow">("supply");
    const [actionType, setActionType] = useState<"deposit" | "withdraw" | "borrow" | "repay">("deposit");
    const [selectedTokenAddr, setSelectedTokenAddr] = useState(TOKENS[0].address);
    const [amount, setAmount] = useState("");

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [userStats, setUserStats] = useState({
        totalCollateralValue: "0.00",
        debtToken: ethers.ZeroAddress,
        debtAmount: "0.00",
        healthFactor: "0.00",
        borrowAPY: "0.00",
        maxLTV: "0"
    });

    const activeToken = tokens.find(t => t.address.toLowerCase() === selectedTokenAddr.toLowerCase()) || tokens[0];

    const formatValue = (val: any) => {
        try {
            if (!val) return "0.00";

            const bn = ethers.getBigInt(val);

            if (bn === BigInt(0)) return "0.00";

            const threshold = ethers.parseUnits("1000000000", 18);

            if (bn > threshold) {

                const raw = ethers.formatUnits(bn, 18);
                return (parseFloat(raw) / 1e18).toFixed(2);
            }

            return parseFloat(ethers.formatUnits(bn, 18)).toFixed(2);
        } catch (e) {
            console.error("Format error", e);
            return "0.00";
        }
    };

    const parseEth = (val: string) => ethers.parseUnits(val, 18);

    // --- FETCH DATA ---
    const fetchData = useCallback(async () => {
        if (!account || !provider) return;

        try {
            const lendingContract = new Contract(CONTRACT_ADDRESS, LENDING_ABI, provider);

            const results = await Promise.allSettled([
                lendingContract.debts(account),
                lendingContract.getHealthFactor(account),
                lendingContract.getBorrowAPRPercent(),
                lendingContract.maxLTV(),
                lendingContract.getUserCollateralValue(account)
            ]);

            const getRes = (index: number) => {
                // @ts-ignore
                return results[index].status === 'fulfilled' ? results[index].value : 0;
            };

            const debtData = getRes(0);

            // Handle BigInt scaling correctly for APY
            const rawAPY = getRes(2);
            // APY from contract is scaled by 1e18 (e.g. 0.05 * 1e18). 
            // So we formatUnits to get 0.05, then multiply by 100 to get 5.00%
            const formattedAPY = (parseFloat(ethers.formatUnits(rawAPY || 0, 18)) * 100).toFixed(2);

            const rawLTV = getRes(3);
            const formattedLTV = (parseFloat(ethers.formatUnits(rawLTV || 0, 18)) * 100).toFixed(0);

            // Handle Health Factor (Standard 1e18 scale)
            const rawHF = getRes(1);
            let formattedHF = "∞";
            // If HF is massive (default for no debt), show Infinity
            if (rawHF < ethers.parseUnits("1000", 18)) {
                formattedHF = parseFloat(ethers.formatUnits(rawHF, 18)).toFixed(2);
            }

            setUserStats({
                debtToken: debtData[0] || ethers.ZeroAddress,
                debtAmount: formatValue(debtData[1]),
                healthFactor: formattedHF,
                borrowAPY: formattedAPY,
                maxLTV: formattedLTV,
                totalCollateralValue: formatValue(getRes(4))
            });

            // Fetch Token Balances
            const updatedTokens = await Promise.all(tokens.map(async (t) => {
                try {
                    const tokenContract = new Contract(t.address, ERC20_ABI, provider);
                    const [walletBal, depositedBal] = await Promise.all([
                        tokenContract.balanceOf(account),
                        lendingContract.userCollateralAmount(account, t.address)
                    ]);
                    return { ...t, balance: formatValue(walletBal), deposited: formatValue(depositedBal) };
                } catch (e) {
                    return t;
                }
            }));
            setTokens(updatedTokens);

        } catch (err) {
            console.error("Fetch Data Error:", err);
        }
    }, [account, provider]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // --- TRANSACTION HANDLER ---
    const executeTransaction = async () => {
        if (!amount || parseFloat(amount) <= 0) return alert("Enter a valid amount");
        setIsLoading(true);

        try {
            const contract = new Contract(CONTRACT_ADDRESS, LENDING_ABI, signer);

            const targetTokenAddr = actionType === "repay"
                ? (userStats.debtToken !== ethers.ZeroAddress ? userStats.debtToken : activeToken.address)
                : activeToken.address;

            const tokenContract = new Contract(targetTokenAddr, ERC20_ABI, signer);
            const weiAmount = parseEth(amount);

            if (actionType === "deposit" || actionType === "repay") {
                const currentAllowance = await tokenContract.allowance(account, CONTRACT_ADDRESS);

                const requiredAllowance = actionType === "repay"
                    ? (weiAmount * 110n) / 100n
                    : weiAmount;

                if (currentAllowance < requiredAllowance) {
                    const approveTx = await tokenContract.approve(CONTRACT_ADDRESS, ethers.MaxUint256);
                    await approveTx.wait();
                }
            }

            let tx;
            if (actionType === "deposit") {
                tx = await contract.depositCollateral(activeToken.address, weiAmount);
            }
            else if (actionType === "withdraw") {
                tx = await contract.withdrawCollateral(activeToken.address, weiAmount);
            }
            else if (actionType === "borrow") {
                tx = await contract.borrow(activeToken.address, weiAmount);
            }
            else if (actionType === "repay") {

                const debtWei = parseEth(userStats.debtAmount);

                if (weiAmount >= (debtWei * 99n) / 100n) {
                    tx = await contract.repay(ethers.MaxUint256);
                } else {
                    tx = await contract.repay(weiAmount);
                }
            }

            await tx.wait();
            alert(`✅ ${actionType.toUpperCase()} Successful!`);
            setAmount("");
            fetchData();

        } catch (err: any) {
            console.error(err);
            const msg = err.reason || err.shortMessage || err.message || "Transaction failed";
            alert(`❌ Error: ${msg}`);
        } finally {
            setIsLoading(false);
        }
    };

    // --- UI HELPERS ---
    const handleTabChange = (tab: "supply" | "borrow") => {
        setActiveTab(tab);
        setActionType(tab === "supply" ? "deposit" : "borrow");
        setAmount("");
    };

    const getMaxAmount = () => {
        if (actionType === "deposit") return activeToken.balance;
        if (actionType === "withdraw") return activeToken.deposited;
        if (actionType === "repay") return userStats.debtAmount;
        return "0";
    };

    // Lock token selection logic
    const isTokenLocked = (actionType === 'repay' && parseFloat(userStats.debtAmount) > 0);
    useEffect(() => {
        if (actionType === 'repay' && userStats.debtToken !== ethers.ZeroAddress) {
            setSelectedTokenAddr(userStats.debtToken);
        }
    }, [actionType, userStats.debtToken]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsDropdownOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="flex items-center justify-center min-h-[80vh] w-full px-4 mt-4">
            <div className="w-full max-w-[480px] bg-white border border-gray-200 shadow-2xl rounded-3xl overflow-hidden relative">

                {/* HEADER STATS */}
                <div className="bg-gray-50/50 px-6 py-5 border-b border-gray-100 grid grid-cols-3 gap-2">
                    <div className="flex flex-col">
                        <span className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1 flex items-center gap-1">
                            <Activity size={10} /> Health
                        </span>
                        <span className={`text-xl font-bold ${parseFloat(userStats.healthFactor) < 1.1 ? 'text-red-600' : 'text-green-600'}`}>
                            {userStats.healthFactor}
                        </span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1 flex items-center gap-1">
                            <TrendingUp size={10} /> Max LTV
                        </span>
                        <span className="text-xl font-bold text-gray-800">{userStats.maxLTV}%</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1">APR</span>
                        <span className="text-xl font-bold text-red-600">{userStats.borrowAPY}%</span>
                    </div>
                </div>

                {/* MAIN TABS */}
                <div className="p-1 bg-gray-100/80 mx-6 mt-6 rounded-xl flex relative">
                    <button
                        onClick={() => handleTabChange("supply")}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === "supply" ? "bg-white text-red-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                            }`}
                    >
                        Supply
                    </button>
                    <button
                        onClick={() => handleTabChange("borrow")}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === "borrow" ? "bg-white text-red-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                            }`}
                    >
                        Borrow
                    </button>
                </div>

                {/* SUB TABS */}
                <div className="px-8 mt-4 flex gap-6">
                    {activeTab === "supply" ? (
                        <>
                            <button onClick={() => { setActionType("deposit"); setAmount(""); }}
                                className={`text-sm font-semibold transition-colors ${actionType === "deposit" ? "text-red-600 border-b-2 border-red-600" : "text-gray-400"}`}>
                                Deposit
                            </button>
                            <button onClick={() => { setActionType("withdraw"); setAmount(""); }}
                                className={`text-sm font-semibold transition-colors ${actionType === "withdraw" ? "text-red-600 border-b-2 border-red-600" : "text-gray-400"}`}>
                                Withdraw
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => { setActionType("borrow"); setAmount(""); }}
                                className={`text-sm font-semibold transition-colors ${actionType === "borrow" ? "text-red-600 border-b-2 border-red-600" : "text-gray-400"}`}>
                                Borrow
                            </button>
                            <button onClick={() => { setActionType("repay"); setAmount(""); }}
                                className={`text-sm font-semibold transition-colors ${actionType === "repay" ? "text-red-600 border-b-2 border-red-600" : "text-gray-400"}`}>
                                Repay
                            </button>
                        </>
                    )}
                </div>

                {/* INPUT AREA */}
                <div className="px-6 py-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 transition-all hover:border-red-200 focus-within:border-red-400 focus-within:ring-1 focus-within:ring-red-100">
                        <div className="flex justify-between mb-3">
                            <span className="text-xs font-semibold text-gray-400">Amount</span>
                            <span className="text-xs font-semibold text-gray-500 cursor-pointer hover:text-red-600 transition-colors" onClick={() => setAmount(getMaxAmount())}>
                                Max: {getMaxAmount()}
                            </span>
                        </div>

                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-transparent text-3xl font-bold text-gray-800 placeholder-gray-200 outline-none"
                            />

                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => !isTokenLocked && setIsDropdownOpen(!isDropdownOpen)}
                                    className={`flex items-center gap-2 bg-white pl-2 pr-3 py-1.5 rounded-full shadow-sm border border-gray-200 transition ${isTokenLocked ? 'opacity-70 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                                >
                                    <img src={activeToken.img} className="w-7 h-7 rounded-full object-cover" alt="token" />
                                    <span className="font-bold text-gray-700 text-sm">{activeToken.symbol}</span>
                                    {!isTokenLocked && <ChevronDown size={14} className="text-gray-400" />}
                                </button>

                                {isDropdownOpen && !isTokenLocked && (
                                    <div className="absolute right-0 top-12 w-64 bg-white border border-gray-100 shadow-xl rounded-xl z-50 overflow-hidden">
                                        <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                                            {tokens.map((token) => (
                                                <button
                                                    key={token.symbol}
                                                    onClick={() => { setSelectedTokenAddr(token.address); setIsDropdownOpen(false); }}
                                                    className="flex items-center justify-between w-full px-4 py-3 hover:bg-red-50 transition border-b border-gray-50 last:border-0"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <img src={token.img} className="w-8 h-8 rounded-full shadow-sm" alt={token.symbol} />
                                                        <div className="text-left">
                                                            <p className="font-bold text-sm text-gray-800">{token.symbol}</p>
                                                            <p className="text-[10px] text-gray-400">{token.name}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-medium text-gray-800">Bal: {token.balance}</p>
                                                        <p className="text-[10px] text-red-600 font-medium">Dep: {token.deposited}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 space-y-2 px-1">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-400 font-medium">Total Collateral</span>
                            <span className="font-bold text-gray-700">${userStats.totalCollateralValue}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-400 font-medium">Total Debt</span>
                            <span className="font-bold text-gray-700">
                                {userStats.debtAmount}
                                <span className="text-xs text-gray-400 ml-1">
                                    {userStats.debtToken !== ethers.ZeroAddress ? TOKENS.find(t => t.address.toLowerCase() === userStats.debtToken.toLowerCase())?.symbol : ""}
                                </span>
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={executeTransaction}
                        disabled={isLoading || !account}
                        className={`w-full mt-6 py-4 rounded-xl font-bold text-lg text-white shadow-lg transform transition active:scale-[0.98] 
                            ${!account ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 shadow-red-200"} 
                            flex items-center justify-center gap-2`}
                    >
                        {!account ? (
                            <> <Wallet size={20} /> Connect Wallet </>
                        ) : isLoading ? (
                            <> <Loader2 className="animate-spin" /> Processing... </>
                        ) : (
                            `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} ${activeToken.symbol}`
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LendingBorrowing;