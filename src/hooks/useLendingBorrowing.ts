import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../contexts/WalletContext"; // Adjust path as needed
import SimpleLendingBorrowingABI from "../ABI/LB.json"; // Adjust path as needed

const CONTRACT_ADDRESS = "0x21718A6E1076137534f6c30a1Be5D2e02b1ca18C"; // 🔹 Replace with deployed address

interface CollateralPosition {
    token: string;
    amount: string;
}

interface DebtPosition {
    token: string;
    amount: string;
}

export const useLendingBorrowing = () => {
    const { account, signer } = useWallet();
    const [contract, setContract] = useState<ethers.Contract | null>(null);
    const [collateral, setCollateral] = useState<CollateralPosition | null>(null);
    const [debt, setDebt] = useState<DebtPosition | null>(null);
    const [loading, setLoading] = useState(false);

    // --- Initialize Contract ---
    useEffect(() => {
        if (!signer) {
            setContract(null);
            return;
        }
        const c = new ethers.Contract(CONTRACT_ADDRESS, SimpleLendingBorrowingABI.abi, signer);
        setContract(c);
    }, [signer]);

    // --- Fetch User Positions ---
    const refreshPositions = useCallback(async () => {
        if (!contract || !account) return;

        try {
            // Optional: set loading state for UI feedback if needed
            // setLoading(true); 

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
        } finally {
            // setLoading(false);
        }
    }, [account, contract]);

    // Automatically refresh positions when contract is ready
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
            setLoading(true);
            try {
                const erc20 = new ethers.Contract(
                    tokenAddress,
                    ["function approve(address spender, uint256 value) returns (bool)"],
                    signer
                );
                const amt = ethers.parseUnits(amount, 18);

                // Check allowance could be added here to skip approve if not needed
                const approveTx = await erc20.approve(contract.target, amt); // .target is preferred in ethers v6, .address in v5
                await approveTx.wait();

                const tx = await contract.depositCollateral(tokenAddress, amt);
                await tx.wait();

                await refreshPositions();
            } catch (err) {
                console.error("depositCollateral error:", err);
                throw err; // Re-throw so UI can handle error
            } finally {
                setLoading(false);
            }
        },
        [contract, signer, refreshPositions]
    );

    const borrow = useCallback(
        async (borrowToken: string, amount: string, pool: string) => {
            if (!contract) return;
            setLoading(true);
            try {
                const amt = ethers.parseUnits(amount, 18);
                const tx = await contract.borrow(borrowToken, amt, pool);
                await tx.wait();
                await refreshPositions();
            } catch (err) {
                console.error("borrow error:", err);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [contract, refreshPositions]
    );

    const repay = useCallback(
        async (amount: string) => {
            if (!contract) return;
            setLoading(true);
            try {
                const amt = ethers.parseUnits(amount, 18);
                // Note: You might need to approve the token being repaid here first if the contract pulls tokens!
                // Assuming contract pulls tokens:
                if (debt?.token && debt.token !== ethers.ZeroAddress) {
                    const erc20 = new ethers.Contract(
                        debt.token,
                        ["function approve(address spender, uint256 value) returns (bool)"],
                        signer
                    );
                    await (await erc20.approve(contract.target, amt)).wait();
                }

                const tx = await contract.repay(amt);
                await tx.wait();
                await refreshPositions();
            } catch (err) {
                console.error("repay error:", err);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [contract, refreshPositions, debt, signer]
    );

    return {
        contract,
        collateral,
        debt,
        loading, // Exposed loading state for UI spinners
        getTokenBalance,
        depositCollateral,
        borrow,
        repay,
        refreshPositions,
    };
};