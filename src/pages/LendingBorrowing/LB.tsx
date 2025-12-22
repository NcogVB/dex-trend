import { useState, useCallback, useEffect, useRef } from "react";
import { ChevronDown, TrendingUp, Activity, } from "lucide-react";
import { useWallet } from "../../contexts/WalletContext";
import { TOKENS } from "../../utils/SwapTokens";
import { ethers } from "ethers";
import { ERC20_ABI } from "../../contexts/ABI";

const LENDING_ABI = [
    "function depositCollateral(address token, uint256 amount) external",
    "function withdrawCollateral(uint256 amount) external",
    "function borrow(address borrowToken, uint256 amount) external",
    "function repay(uint256 amount) external",
    "function collaterals(address) view returns (address token, uint256 amount)",
    "function debts(address) view returns (address token, uint256 principal, uint256 interestIndex, uint256 lastAccrued)",
    "function getHealthFactor(address user) view returns (uint256)",
    "function getBorrowAPRPercent() view returns (uint256)",
    "function maxLTV() view returns (uint256)"
];

const CONTRACT_ADDRESS = "0x602bf26b70BE787ed2973dd8bB93c83c1B5B7f31";

const LendingBorrowing = () => {
    const { account, provider, signer } = useWallet();

    const [tokens, setTokens] = useState(TOKENS.map((t) => ({ ...t, balance: "0.00" })));
    const [activeTab, setActiveTab] = useState<"supply" | "borrow">("supply");
    const [actionType, setActionType] = useState<"deposit" | "withdraw" | "borrow" | "repay">("deposit");

    const [selectedToken, setSelectedToken] = useState(tokens[0]);
    const [amount, setAmount] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);

    const [userStats, setUserStats] = useState({
        collateralToken: ethers.ZeroAddress,
        collateralAmount: "0",
        debtToken: ethers.ZeroAddress,
        debtAmount: "0",
        healthFactor: "0",
        borrowAPY: "0",
        maxLTV: "0"
    });

    const getContract = () => new ethers.Contract(CONTRACT_ADDRESS, LENDING_ABI, signer);

    const formatEth = (val: any) => ethers.formatUnits(val, 18);
    const parseEth = (val: string) => ethers.parseUnits(val, 18);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchData = useCallback(async () => {
        if (!account || !provider) return;

        try {
            const lendingContract = new ethers.Contract(CONTRACT_ADDRESS, LENDING_ABI, provider);

            const [colData, debtData, hf, apy, ltv] = await Promise.all([
                lendingContract.collaterals(account),
                lendingContract.debts(account),
                lendingContract.getHealthFactor(account),
                lendingContract.getBorrowAPRPercent(),
                lendingContract.maxLTV()
            ]);

            setUserStats({
                collateralToken: colData[0],
                collateralAmount: formatEth(colData[1]),
                debtToken: debtData[0],
                debtAmount: formatEth(debtData[1]),
                healthFactor: formatEth(hf),
                borrowAPY: (parseFloat(formatEth(apy)) * 100).toFixed(2),
                maxLTV: (parseFloat(formatEth(ltv)) * 100).toFixed(0)
            });

            const balancePromises = tokens.map(async (t) => {
                try {
                    const tokenContract = new ethers.Contract(t.address, ERC20_ABI, provider);
                    const bal = await tokenContract.balanceOf(account);
                    return { ...t, balance: formatEth(bal) };
                } catch (e) {
                    console.error(`Error fetching balance for ${t.symbol}`, e);
                    return { ...t, balance: "0.00" };
                }
            });

            const updatedTokens = await Promise.all(balancePromises);
            setTokens(updatedTokens);

            const currentSelected = updatedTokens.find(t => t.address === selectedToken.address);
            if (currentSelected) setSelectedToken(currentSelected);

        } catch (err) {
            console.error("Fetch Data Error:", err);
        }
    }, [account, provider]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleTabChange = (tab: "supply" | "borrow") => {
        setActiveTab(tab);
        if (tab === "supply") setActionType("deposit");
        else setActionType("borrow");
        setAmount("");
    };

    const executeTransaction = async () => {
        if (!amount || parseFloat(amount) <= 0) return alert("Enter a valid amount");
        setIsLoading(true);

        try {
            const contract = getContract();

            if (actionType === "deposit" || actionType === "repay") {
                const targetTokenAddr = actionType === "repay"
                    ? (userStats.debtToken !== ethers.ZeroAddress ? userStats.debtToken : selectedToken.address)
                    : selectedToken.address;

                const tokenContract = new ethers.Contract(targetTokenAddr, ERC20_ABI, signer);

                const approveTx = await tokenContract.approve(CONTRACT_ADDRESS, parseEth(amount));
                await approveTx.wait();
            }

            let tx;
            if (actionType === "deposit") {
                if (parseFloat(userStats.collateralAmount) > 0 && selectedToken.address.toLowerCase() !== userStats.collateralToken.toLowerCase()) {
                    throw new Error(`You already have ${userStats.collateralAmount} collateral. You can only deposit more of the same token.`);
                }
                tx = await contract.depositCollateral(selectedToken.address, parseEth(amount));
            }
            else if (actionType === "withdraw") {
                tx = await contract.withdrawCollateral(parseEth(amount));
            }
            else if (actionType === "borrow") {
                tx = await contract.borrow(selectedToken.address, parseEth(amount));
            }
            else if (actionType === "repay") {
                tx = await contract.repay(parseEth(amount));
            }

            await tx.wait();
            alert(`✅ ${actionType.toUpperCase()} Successful!`);
            setAmount("");
            fetchData();

        } catch (err: any) {
            console.error(err);
            alert(`❌ Error: ${err.reason || err.message || err.data?.message || "Transaction failed"}`);
        } finally {
            setIsLoading(false);
        }
    };

    const getMaxAmount = () => {
        if (actionType === "deposit") return selectedToken.balance;
        if (actionType === "withdraw") return userStats.collateralAmount;
        if (actionType === "repay") return userStats.debtAmount; // Logic simplification: repay full debt
        return "0";
    };

    const hfValue = parseFloat(userStats.healthFactor);
    const hfColor = hfValue > 2 ? "text-green-500" : hfValue > 1 ? "text-yellow-500" : "text-red-500";

    const getActiveToken = () => {
        if (actionType === 'repay' && userStats.debtToken !== ethers.ZeroAddress) {
            const t = tokens.find(t => t.address.toLowerCase() === userStats.debtToken.toLowerCase());
            return t || selectedToken;
        }
        if (actionType === 'withdraw' && parseFloat(userStats.collateralAmount) > 0) {
            const t = tokens.find(t => t.address.toLowerCase() === userStats.collateralToken.toLowerCase());
            return t || selectedToken;
        }
        return selectedToken;
    };

    const activeDisplayToken = getActiveToken();
    const isTokenLocked = (actionType === 'repay' && parseFloat(userStats.debtAmount) > 0) ||
        (actionType === 'withdraw' && parseFloat(userStats.collateralAmount) > 0);

    return (
        <div className="flex items-center justify-center min-h-[80vh] w-full px-4 mt-4">
            <div className="w-full max-w-[480px] bg-white border border-gray-200 shadow-2xl rounded-3xl overflow-hidden relative">

                <div className="bg-gray-50/50 px-6 py-5 border-b border-gray-100 grid grid-cols-3 gap-2">
                    <div className="flex flex-col">
                        <span className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1 flex items-center gap-1">
                            <Activity size={10} /> Health
                        </span>
                        <span className={`text-xl font-bold ${hfColor}`}>
                            {hfValue > 100 ? "∞" : hfValue.toFixed(2)}
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
                        <span className="text-xl font-bold text-red-500">{userStats.borrowAPY}%</span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="p-1 bg-gray-100/80 mx-6 mt-6 rounded-xl flex relative">
                    <button
                        onClick={() => handleTabChange("supply")}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === "supply" ? "bg-white text-green-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                            }`}
                    >
                        Supply
                    </button>
                    <button
                        onClick={() => handleTabChange("borrow")}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === "borrow" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                            }`}
                    >
                        Borrow
                    </button>
                </div>

                {/* Sub Action Toggles */}
                <div className="px-8 mt-4 flex gap-6">
                    {activeTab === "supply" ? (
                        <>
                            <button onClick={() => setActionType("deposit")} className={`text-sm font-semibold transition-colors ${actionType === "deposit" ? "text-green-600" : "text-gray-300"}`}>Deposit</button>
                            <button onClick={() => setActionType("withdraw")} className={`text-sm font-semibold transition-colors ${actionType === "withdraw" ? "text-green-600" : "text-gray-300"}`}>Withdraw</button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setActionType("borrow")} className={`text-sm font-semibold transition-colors ${actionType === "borrow" ? "text-blue-600" : "text-gray-300"}`}>Borrow</button>
                            <button onClick={() => setActionType("repay")} className={`text-sm font-semibold transition-colors ${actionType === "repay" ? "text-blue-600" : "text-gray-300"}`}>Repay</button>
                        </>
                    )}
                </div>

                {/* Input Area */}
                <div className="px-6 py-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 transition-all hover:border-gray-300">
                        <div className="flex justify-between mb-3">
                            <span className="text-xs font-semibold text-gray-400">Amount</span>
                            <span className="text-xs font-semibold text-gray-500">
                                Max: {actionType === "deposit" ? activeDisplayToken.balance :
                                    actionType === "withdraw" ? parseFloat(userStats.collateralAmount).toFixed(4) :
                                        actionType === "repay" ? parseFloat(userStats.debtAmount).toFixed(4) :
                                            activeDisplayToken.balance}
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

                            {/* Token Selector with Scrollbar */}
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => !isTokenLocked && setIsDropdownOpen(!isDropdownOpen)}
                                    className={`flex items-center gap-2 bg-white pl-2 pr-3 py-1.5 rounded-full shadow-sm border border-gray-200 transition ${isTokenLocked ? 'opacity-80 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                                >
                                    <img src={activeDisplayToken.img} className="w-7 h-7 rounded-full object-cover" alt="token" />
                                    <span className="font-bold text-gray-700 text-sm">{activeDisplayToken.symbol}</span>
                                    {!isTokenLocked && <ChevronDown size={14} className="text-gray-400" />}
                                </button>

                                {/* Dropdown Menu */}
                                {isDropdownOpen && !isTokenLocked && (
                                    <div className="absolute right-0 top-12 w-64 bg-white border border-gray-100 shadow-xl rounded-xl z-50 overflow-hidden">
                                        <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                                            {tokens.map((token) => (
                                                <button
                                                    key={token.symbol}
                                                    onClick={() => {
                                                        setSelectedToken(token);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className="flex items-center justify-between w-full px-4 py-3 hover:bg-gray-50 transition border-b border-gray-50 last:border-0"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <img src={token.img} className="w-8 h-8 rounded-full shadow-sm" alt={token.symbol} />
                                                        <div className="text-left">
                                                            <p className="font-bold text-sm text-gray-800">{token.symbol}</p>
                                                            <p className="text-[10px] text-gray-400">{token.name}</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-medium text-gray-500">
                                                        {parseFloat(token.balance).toFixed(2)}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Max Button */}
                        <div className="flex justify-end mt-3">
                            <button
                                onClick={() => setAmount(getMaxAmount())}
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-gray-200 text-gray-500 hover:bg-gray-300 transition`}
                            >
                                Use Max
                            </button>
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="mt-5 space-y-2 px-1">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-400 font-medium">Collateral Value</span>
                            <span className="font-bold text-gray-700">
                                {parseFloat(userStats.collateralAmount).toFixed(4)}
                                <span className="text-xs text-gray-400 ml-1">
                                    {userStats.collateralToken !== ethers.ZeroAddress ? TOKENS.find(t => t.address.toLowerCase() === userStats.collateralToken.toLowerCase())?.symbol : ""}
                                </span>
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-400 font-medium">Borrowed Value</span>
                            <span className="font-bold text-gray-700">
                                {parseFloat(userStats.debtAmount).toFixed(4)}
                                <span className="text-xs text-gray-400 ml-1">
                                    {userStats.debtToken !== ethers.ZeroAddress ? TOKENS.find(t => t.address.toLowerCase() === userStats.debtToken.toLowerCase())?.symbol : ""}
                                </span>
                            </span>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={executeTransaction}
                        disabled={isLoading || !account}
                        className={`w-full mt-6 py-4 rounded-xl font-bold text-lg text-white shadow-lg transform transition active:scale-[0.98] ${!account ? "bg-gray-400 cursor-not-allowed" :
                            activeTab === "supply"
                                ? "bg-[#16A34A] hover:bg-[#15803d]"
                                : "bg-[#2563EB] hover:bg-[#1d4ed8]"
                            }`}
                    >
                        {isLoading ? "Processing..." : !account ? "Connect Wallet" : `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} ${activeDisplayToken.symbol}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LendingBorrowing;