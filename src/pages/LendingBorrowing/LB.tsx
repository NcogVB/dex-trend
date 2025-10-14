import { useState, useRef, useCallback, useEffect } from "react";
import { ChevronDown, CircleQuestionMarkIcon } from "lucide-react";
import { useWallet } from "../../contexts/WalletContext";
import { TOKENS } from "../../utils/SwapTokens";
import { useLendingBorrowing } from "../../contexts/LendingBorrowingContext";

const LendingBorrowing = () => {
    const { account } = useWallet();
    const { getTokenBalance, depositCollateral, borrow, refreshPositions } = useLendingBorrowing();

    const [tokens, setTokens] = useState(
        TOKENS.map((t) => ({ ...t, balance: 0, realBalance: "0" }))
    );

    const [activeTab, setActiveTab] = useState("supply");
    const [supplyToken, setSupplyToken] = useState(tokens[0]);
    const [borrowToken, setBorrowToken] = useState(tokens[1]);
    const [supplyAmount, setSupplyAmount] = useState("");
    const [borrowAmount, setBorrowAmount] = useState("");
    const [isSupplyDropdownOpen, setIsSupplyDropdownOpen] = useState(false);
    const [isBorrowDropdownOpen, setIsBorrowDropdownOpen] = useState(false);

    const supplyDropdownRef = useRef(null);
    const borrowDropdownRef = useRef(null);

    // 🔹 Update token balances
    const updateBalances = useCallback(async () => {
        if (!account) return;
        const updated = await Promise.all(
            tokens.map(async (t) => {
                const realBalance = await getTokenBalance(t.address).catch(() => "0");
                return { ...t, realBalance, balance: parseFloat(realBalance) };
            })
        );
        setTokens(updated);
        setSupplyToken((prev) => updated.find((t) => t.symbol === prev.symbol) || updated[0]);
        setBorrowToken((prev) => updated.find((t) => t.symbol === prev.symbol) || updated[1]);
    }, [account, getTokenBalance]);

    useEffect(() => {
        updateBalances();
    }, [account, updateBalances]);

    const handleAction = async () => {
        if (activeTab === "supply") {
            await depositCollateral(supplyToken.address, supplyAmount);
        } else {
            await borrow(borrowToken.address, borrowAmount, "0xPOOL_ADDRESS"); // Replace with correct Uniswap V3 pool
        }
        await refreshPositions();
        await updateBalances();
    };

    return (
        <div className="w-full p-[3.5px] md:rounded-[12px] rounded-[12px]">
            <div className="modern-card w-full px-[20px] md:px-[40px] py-[30px] md:py-[40px]">
                {/* Tabs */}
                <div className="relative z-10 bg-[#F8F8F8] inline-flex px-2 py-1.5 rounded-[8px] border border-[#E5E5E5] mb-6 gap-1">
                    <button
                        onClick={() => setActiveTab("supply")}
                        className={`rounded-[6px] px-[20px] py-[10px] text-sm font-semibold ${activeTab === "supply"
                            ? "bg-white text-[#16A34A] shadow-sm"
                            : "text-[#888888] hover:text-[#333333]"
                            }`}
                    >
                        Supply
                    </button>
                    <button
                        onClick={() => setActiveTab("borrow")}
                        className={`rounded-[6px] px-[20px] py-[10px] text-sm font-semibold ${activeTab === "borrow"
                            ? "bg-white text-[#DC2626] shadow-sm"
                            : "text-[#888888] hover:text-[#333333]"
                            }`}
                    >
                        Borrow
                    </button>
                </div>

                {!account && (
                    <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-800">
                        Connect your wallet to start lending or borrowing
                    </div>
                )}

                {/* Token input sections */}
                {activeTab === "supply" ? (
                    <>
                        <div className="flex flex-col md:flex-row items-center gap-[25px] md:gap-[51px]">
                            <div className="flex-1 w-full">
                                <div className="modern-input flex justify-between items-center px-[16px] py-[16px]">
                                    <input
                                        type="number"
                                        value={supplyAmount}
                                        onChange={(e) => setSupplyAmount(e.target.value)}
                                        placeholder="0.000"
                                        className="text-[#333333] font-semibold text-[20px] bg-transparent border-none outline-none flex-1 mr-4 placeholder-[#888888]"
                                    />
                                    <div ref={supplyDropdownRef} className="relative min-w-[95px]">
                                        <button
                                            onClick={() => setIsSupplyDropdownOpen((o) => !o)}
                                            className="w-full flex items-center cursor-pointer hover:bg-[#F8F8F8] rounded-[6px] p-2 transition-colors"
                                        >
                                            <img src={supplyToken.img} alt={supplyToken.name} className="rounded-full size-[23px]" />
                                            <span className="ml-3 mr-8">{supplyToken.symbol}</span>
                                            <ChevronDown
                                                className={`transition-transform ${isSupplyDropdownOpen ? "rotate-180" : ""
                                                    }`}
                                            />
                                        </button>
                                        {isSupplyDropdownOpen && (
                                            <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                                                {tokens.map((token) => (
                                                    <li
                                                        key={token.symbol}
                                                        onClick={() => {
                                                            setSupplyToken(token);
                                                            setIsSupplyDropdownOpen(false);
                                                        }}
                                                        className="flex items-center px-2 py-2 hover:bg-gray-100 cursor-pointer"
                                                    >
                                                        <img src={token.img} alt={token.name} className="w-6 h-6 mr-2" />
                                                        <div>
                                                            <div className="font-medium">{token.symbol}</div>
                                                            <div className="text-xs text-gray-500">{token.balance.toFixed(4)}</div>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-3 percentage-redio-buttons">
                                    {[25, 50, 75, 100].map((pct) => (
                                        <button
                                            key={pct}
                                            onClick={() => {
                                                const calcAmt = ((supplyToken.balance * pct) / 100).toFixed(6);
                                                setSupplyAmount(calcAmt);
                                            }}
                                            className="cursor-pointer w-full block bg-[#F8F8F8] border border-[#E5E5E5] rounded-[6px] py-[8px] text-[14px] font-medium text-[#888888] text-center hover:bg-[#16A34A] hover:text-white transition-colors"
                                        >
                                            {pct === 100 ? "MAX" : `${pct}%`}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Supply Info */}
                        <div className="mt-[36px] modern-card px-[20px] py-[20px] flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex-1 text-center md:text-left">
                                <span className="text-[#888888] text-sm">Supply APY</span>
                                <p className="text-[#16A34A] font-semibold text-[18px] mt-2">4.85%</p>
                            </div>
                            <div className="flex-1 text-center md:text-right">
                                <span className="text-[#888888] text-sm flex justify-center md:justify-end items-center gap-2">
                                    Collateral Factor <CircleQuestionMarkIcon size={16} />
                                </span>
                                <p className="text-[#333333] font-semibold text-[18px] mt-2">75%</p>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex flex-col md:flex-row items-center gap-[25px] md:gap-[51px]">
                            <div className="flex-1 w-full">
                                <div className="modern-input flex justify-between items-center px-[16px] py-[16px]">
                                    <input
                                        type="number"
                                        value={borrowAmount}
                                        onChange={(e) => setBorrowAmount(e.target.value)}
                                        placeholder="0.000"
                                        className="text-[#333333] font-semibold text-[20px] bg-transparent border-none outline-none flex-1 mr-4 placeholder-[#888888]"
                                    />
                                    <div ref={borrowDropdownRef} className="relative min-w-[95px]">
                                        <button
                                            onClick={() => setIsBorrowDropdownOpen((o) => !o)}
                                            className="w-full flex items-center cursor-pointer hover:bg-[#F8F8F8] rounded-[6px] p-2 transition-colors"
                                        >
                                            <img src={borrowToken.img} alt={borrowToken.name} className="rounded-full size-[23px]" />
                                            <span className="ml-3 mr-8">{borrowToken.symbol}</span>
                                            <ChevronDown
                                                className={`transition-transform ${isBorrowDropdownOpen ? "rotate-180" : ""
                                                    }`}
                                            />
                                        </button>
                                        {isBorrowDropdownOpen && (
                                            <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                                                {tokens
                                                    .filter((t) => t.symbol !== supplyToken.symbol)
                                                    .map((token) => (
                                                        <li
                                                            key={token.symbol}
                                                            onClick={() => {
                                                                setBorrowToken(token);
                                                                setIsBorrowDropdownOpen(false);
                                                            }}
                                                            className="flex items-center px-2 py-2 hover:bg-gray-100 cursor-pointer"
                                                        >
                                                            <img src={token.img} alt={token.name} className="w-6 h-6 mr-2" />
                                                            <div>
                                                                <div className="font-medium">{token.symbol}</div>
                                                                <div className="text-xs text-gray-500">{token.balance.toFixed(4)}</div>
                                                            </div>
                                                        </li>
                                                    ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Borrow Info */}
                        <div className="mt-[36px] modern-card px-[20px] py-[20px] flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex-1 text-center md:text-left">
                                <span className="text-[#888888] text-sm">Borrow APR</span>
                                <p className="text-[#DC2626] font-semibold text-[18px] mt-2">7.25%</p>
                            </div>
                            <div className="flex-1 text-center md:text-right">
                                <span className="flex items-center justify-center md:justify-end gap-2 text-[#888888] text-sm">
                                    Health Factor <CircleQuestionMarkIcon size={16} />
                                </span>
                                <p className="text-[#333333] font-semibold text-[18px] mt-2">1.45</p>
                            </div>
                        </div>
                    </>
                )}

                {/* Action button */}
                <button
                    onClick={handleAction}
                    disabled={!account || (!supplyAmount && !borrowAmount)}
                    className={`modern-button mt-[25px] md:mt-[40px] w-full p-[16px] text-center ${activeTab === "supply" ? "bg-[#16A34A]" : "bg-[#DC2626]"
                        } text-white font-semibold rounded-[8px] hover:opacity-90 transition`}
                >
                    {!account
                        ? "Connect Wallet"
                        : activeTab === "supply"
                            ? "Supply"
                            : "Borrow"}
                </button>
            </div>
        </div>
    );
};

export default LendingBorrowing;
