import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../contexts/WalletContext";
import SimpleLendingBorrowingABI from "../ABI/LB.json"; // compiled ABI

const CONTRACT_ADDRESS = "0x12fe4C3D3a84513D04641997dc6E3D1Dea2e5585"; // 🔹 Replace with deployed address

interface CollateralPosition {
    token: string;
    amount: string;
}

interface DebtPosition {
    token: string;
    amount: string;
}

interface LendingBorrowingContextProps {
    contract: ethers.Contract | null;
    collateral: CollateralPosition | null;
    debt: DebtPosition | null;
    getTokenBalance: (tokenAddress: string) => Promise<string>;
    depositCollateral: (tokenAddress: string, amount: string) => Promise<void>;
    borrow: (borrowToken: string, amount: string, pool: string) => Promise<void>;
    repay: (amount: string) => Promise<void>;
    refreshPositions: () => Promise<void>;
}

const LendingBorrowingContext = createContext<LendingBorrowingContextProps | null>(null);

export const LendingBorrowingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { account, signer } = useWallet();
    const [contract, setContract] = useState<ethers.Contract | null>(null);
    const [collateral, setCollateral] = useState<CollateralPosition | null>(null);
    const [debt, setDebt] = useState<DebtPosition | null>(null);

    // --- Initialize Contract ---
    useEffect(() => {
        if (!signer) return;
        const c = new ethers.Contract(CONTRACT_ADDRESS, SimpleLendingBorrowingABI.abi, signer);
        setContract(c);
    }, [signer]);

    // --- Fetch User Positions ---
    const refreshPositions = useCallback(async () => {
        if (!contract || !account) return;
        try {
            const [col, deb] = await Promise.all([
                contract.collaterals(account).catch(() => ({ token: ethers.ZeroAddress, amount: 0 })),
                contract.debts(account).catch(() => ({ token: ethers.ZeroAddress, amount: 0 })),
            ]);
            setCollateral({
                token: col.token,
                amount: ethers.formatUnits(col.amount, 18),
            });
            setDebt({
                token: deb.token,
                amount: ethers.formatUnits(deb.amount, 18),
            });
        } catch (err) {
            console.error("Error fetching positions safely:", err);
        }
    }, [account, contract]);


    useEffect(() => {
        refreshPositions();
    }, [refreshPositions]);

    // --- Token Balances ---
    const getTokenBalance = useCallback(
        async (tokenAddress: string) => {
            if (!account || !signer) return "0";
            try {
                const erc20 = new ethers.Contract(
                    tokenAddress,
                    ["function balanceOf(address) view returns (uint256)"],
                    signer
                );
                const bal = await erc20.balanceOf(account);
                return ethers.formatUnits(bal, 18);
            } catch (err) {
                console.error("getTokenBalance error", err);
                return "0";
            }
        },
        [account, signer]
    );

    // --- Core Actions ---
    const depositCollateral = useCallback(
        async (tokenAddress: string, amount: string) => {
            if (!contract || !signer) return;
            try {
                const erc20 = new ethers.Contract(
                    tokenAddress,
                    ["function approve(address spender, uint256 value) returns (bool)"],
                    signer
                );
                const amt = ethers.parseUnits(amount, 18);
                await (await erc20.approve(contract.address, amt)).wait();
                await (await contract.depositCollateral(tokenAddress, amt)).wait();
                await refreshPositions();
            } catch (err) {
                console.error("depositCollateral error:", err);
            }
        },
        [contract, signer, refreshPositions]
    );

    const borrow = useCallback(
        async (borrowToken: string, amount: string, pool: string) => {
            if (!contract) return;
            try {
                const amt = ethers.parseUnits(amount, 18);
                await (await contract.borrow(borrowToken, amt, pool)).wait();
                await refreshPositions();
            } catch (err) {
                console.error("borrow error:", err);
            }
        },
        [contract, refreshPositions]
    );

    const repay = useCallback(
        async (amount: string) => {
            if (!contract) return;
            try {
                const amt = ethers.parseUnits(amount, 18);
                await (await contract.repay(amt)).wait();
                await refreshPositions();
            } catch (err) {
                console.error("repay error:", err);
            }
        },
        [contract, refreshPositions]
    );

    return (
        <LendingBorrowingContext.Provider
            value={{
                contract,
                collateral,
                debt,
                getTokenBalance,
                depositCollateral,
                borrow,
                repay,
                refreshPositions,
            }}
        >
            {children}
        </LendingBorrowingContext.Provider>
    );
};

export const useLendingBorrowing = () => {
    const ctx = useContext(LendingBorrowingContext);
    if (!ctx) throw new Error("useLendingBorrowing must be used within a Provider");
    return ctx;
};
