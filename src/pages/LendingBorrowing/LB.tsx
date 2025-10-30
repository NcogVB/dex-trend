import { useState, useCallback, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useWallet } from "../../contexts/WalletContext";
import { TOKENS } from "../../utils/SwapTokens";
import LendingBorrowingABI from "../../ABI/LB.json";
import { ethers } from "ethers";
import { ERC20_ABI } from "../../contexts/ABI";

const LendingBorrowing = () => {
    const { account, provider, signer } = useWallet();
    const CONTRACT_ADDRESS = "0x602bf26b70BE787ed2973dd8bB93c83c1B5B7f31";

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

    const [userCollateral, setUserCollateral] = useState({
        token: "",
        amount: "0",
    });

    const [userDebt, setUserDebt] = useState({
        token: "",
        principal: "0",
        interestIndex: "0",
    });

    const getContract = () =>
        new ethers.Contract(CONTRACT_ADDRESS, LendingBorrowingABI.abi, signer);

    // 🔹 Fetch token balances
    const getTokenBalance = useCallback(
        async (tokenAddress: string) => {
            if (!account) return "0";
            try {
                const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
                const bal = await token.balanceOf(account);
                return ethers.formatUnits(bal, 18);
            } catch (err) {
                console.error("Balance error:", err);
                return "0";
            }
        },
        [account]
    );

    const updateBalances = useCallback(async () => {
        if (!account) return;
        const updated = await Promise.all(
            tokens.map(async (t) => {
                const realBalance = await getTokenBalance(t.address);
                return { ...t, realBalance, balance: parseFloat(realBalance) };
            })
        );
        setTokens(updated);
        setSupplyToken(
            (prev) => updated.find((t) => t.symbol === prev.symbol) || updated[0]
        );
        setBorrowToken(
            (prev) => updated.find((t) => t.symbol === prev.symbol) || updated[1]
        );
    }, [account, getTokenBalance]);

    useEffect(() => {
        updateBalances();
    }, [account, updateBalances]);

    // 🔹 Fetch user collateral & debt
    // 🔹 Fetch user collateral & debt
    const fetchUserPositions = useCallback(async () => {
        if (!account) return;
        try {
            const contract = getContract();

            // Fetch both in parallel
            const [collateralData, debtData] = await Promise.all([
                contract.collaterals(account),
                contract.debts(account),
            ]);

            // collateralData = [tokenAddress, amount]
            // debtData = [token, principal, interestIndex, lastAccrued]

            const collateralToken = collateralData[0];
            const collateralAmount = collateralData[1]
                ? ethers.formatUnits(collateralData[1], 18)
                : "0";

            const debtToken = debtData[0];
            const principal = debtData[1] ? ethers.formatUnits(debtData[1], 18) : "0";
            const interestIndex = debtData[2]
                ? ethers.formatUnits(debtData[2], 18)
                : "0";

            setUserCollateral({
                token: collateralToken,
                amount: collateralAmount,
            });

            setUserDebt({
                token: debtToken,
                principal,
                interestIndex,
            });
        } catch (err) {
            console.error("Error fetching user data:", err);
            setUserCollateral({ token: "", amount: "0" });
            setUserDebt({ token: "", principal: "0", interestIndex: "0" });
        }
    }, [account, provider]);


    useEffect(() => {
        if (account) fetchUserPositions();
    }, [account, supplyToken, borrowToken, fetchUserPositions]);

    // 🔹 Deposit Collateral
    const depositCollateral = async (tokenAddress: string, amount: string) => {
        try {
            const contract = getContract();
            const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
            const amt = ethers.parseUnits(amount, 18);

            const approveTx = await token.approve(CONTRACT_ADDRESS, amt);
            await approveTx.wait();

            const tx = await contract.depositCollateral(tokenAddress, amt);
            await tx.wait();

            alert("✅ Collateral deposited successfully!");
            await fetchUserPositions();
        } catch (err) {
            console.error("Deposit collateral error:", err);
            alert("❌ Deposit failed. Check console.");
        }
    };

    // 🔹 Borrow
    const borrow = async (borrowTokenAddress: string, amount: string) => {
        try {
            const contract = getContract();
            const amt = ethers.parseUnits(amount, 18);

            const tx = await contract.borrow(borrowTokenAddress, amt);
            await tx.wait();

            alert("✅ Borrow successful!");
            await fetchUserPositions();
        } catch (err) {
            console.error("Borrow error:", err);
            alert("❌ Borrow failed. Check console.");
        }
    };

    const handleAction = async () => {
        if (!account) return alert("Connect your wallet first!");

        if (activeTab === "supply") {
            if (!supplyAmount || supplyAmount === "0")
                return alert("Enter a valid amount");
            await depositCollateral(supplyToken.address, supplyAmount);
        } else {
            if (!borrowAmount || borrowAmount === "0")
                return alert("Enter a valid amount");
            await borrow(borrowToken.address, borrowAmount);
        }

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

                {/* Input Fields */}
                {activeTab === "supply" ? (
                    <>
                        {/* Supply Input */}
                        <div className="modern-input flex justify-between items-center px-[16px] py-[16px]">
                            <input
                                type="number"
                                value={supplyAmount}
                                onChange={(e) => setSupplyAmount(e.target.value)}
                                placeholder="0.000"
                                className="text-[#333333] font-semibold text-[20px] bg-transparent border-none outline-none flex-1 mr-4 placeholder-[#888888]"
                            />
                            <button
                                onClick={() => setIsSupplyDropdownOpen((o) => !o)}
                                className="flex items-center gap-2"
                            >
                                <img src={supplyToken.img} className="w-6 h-6 rounded-full" />
                                <span>{supplyToken.symbol}</span>
                                <ChevronDown
                                    className={`transition-transform ${isSupplyDropdownOpen ? "rotate-180" : ""
                                        }`}
                                />
                            </button>
                        </div>

                        {/* User Info */}
                        <div className="mt-[36px] modern-card px-[20px] py-[20px] flex justify-between">
                            <div>
                                <span className="text-[#888888] text-sm">Your Collateral</span>
                                <p className="text-[#16A34A] font-semibold text-[18px] mt-2">
                                    {userCollateral.amount} {supplyToken.symbol}
                                </p>
                            </div>
                            <div>
                                <span className="text-[#888888] text-sm">Your Debt</span>
                                <p className="text-[#DC2626] font-semibold text-[18px] mt-2">
                                    {userDebt.principal} {borrowToken.symbol}
                                </p>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Borrow Input */}
                        <div className="modern-input flex justify-between items-center px-[16px] py-[16px]">
                            <input
                                type="number"
                                value={borrowAmount}
                                onChange={(e) => setBorrowAmount(e.target.value)}
                                placeholder="0.000"
                                className="text-[#333333] font-semibold text-[20px] bg-transparent border-none outline-none flex-1 mr-4 placeholder-[#888888]"
                            />
                            <button
                                onClick={() => setIsBorrowDropdownOpen((o) => !o)}
                                className="flex items-center gap-2"
                            >
                                <img src={borrowToken.img} className="w-6 h-6 rounded-full" />
                                <span>{borrowToken.symbol}</span>
                                <ChevronDown
                                    className={`transition-transform ${isBorrowDropdownOpen ? "rotate-180" : ""
                                        }`}
                                />
                            </button>
                        </div>

                        {/* User Info */}
                        <div className="mt-[36px] modern-card px-[20px] py-[20px] flex justify-between">
                            <div>
                                <span className="text-[#888888] text-sm">Your Collateral</span>
                                <p className="text-[#16A34A] font-semibold text-[18px] mt-2">
                                    {userCollateral.amount} {supplyToken.symbol}
                                </p>
                            </div>
                            <div>
                                <span className="text-[#888888] text-sm">Your Debt</span>
                                <p className="text-[#DC2626] font-semibold text-[18px] mt-2">
                                    {userDebt.principal} {borrowToken.symbol}
                                </p>
                            </div>
                        </div>
                    </>
                )}

                {/* Action Button */}
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
