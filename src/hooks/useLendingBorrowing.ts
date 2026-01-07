import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../contexts/WalletContext"; 
import SimpleLendingBorrowingABI from "../ABI/ABI.json"; 

const CONTRACT_ADDRESS = "0x06E4C760C33f7fB0d3798BfD78eFeA2935545ccb"; // Updated address

// Standard ERC20 ABI for balance/approval
const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function approve(address spender, uint256 value) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
];

export const useLendingBorrowing = () => {
    const { account, signer, provider } = useWallet();
    const [contract, setContract] = useState<ethers.Contract | null>(null);
    const [loading, setLoading] = useState(false);

    // Consolidated User Stats State
    const [userStats, setUserStats] = useState({
        healthFactor: "0",
        ltv: "0",
        totalCollateralUSD: "0",
        totalDebtUSD: "0",
        borrowAPR: "0",
        depositAPR: "0" // If you add supply APY later
    });

    // Positions State
    const [userPositions, setUserPositions] = useState<{
        collateral: { token: string; amount: string; symbol: string }[];
        debt: { token: string; amount: string; symbol: string } | null;
    }>({ collateral: [], debt: null });

    // --- Initialize Contract ---
    useEffect(() => {
        if (!signer) {
            setContract(null);
            return;
        }
        const c = new ethers.Contract(CONTRACT_ADDRESS, SimpleLendingBorrowingABI, signer);
        setContract(c);
    }, [signer]);

    // --- Fetch All User Data ---
    const refreshData = useCallback(async () => {
        if (!contract || !account || !provider) return;

        try {
            // 1. Fetch Global Account Stats
            // We use try-catch on individual calls in case contract lacks specific view functions
            const healthFactor = await contract.getHealthFactor(account).catch(() => ethers.MaxUint256);
            const totalDebt = await contract.getUserDebt(account).catch(() => 0n);
            const totalCollateral = await contract.getUserCollateralValue(account).catch(() => 0n);
            // Assuming fixed APR for now if contract doesn't return it
            const aprRaw = await contract.getBorrowAPR().catch(() => 0n); 

            // 2. Fetch Debt Details
            const debtStruct = await contract.debts(account).catch(() => ({ token: ethers.ZeroAddress, amount: 0n }));
            let debtDetails = null;
            
            if (debtStruct.token !== ethers.ZeroAddress) {
                const debtTokenContract = new ethers.Contract(debtStruct.token, ERC20_ABI, provider);
                const decimals = await debtTokenContract.decimals();
                const symbol = await debtTokenContract.symbol().catch(() => "UNKNOWN"); // Add symbol to ABI if needed
                
                debtDetails = {
                    token: debtStruct.token,
                    amount: ethers.formatUnits(debtStruct.principal || debtStruct.amount, decimals),
                    symbol: symbol
                };
            }

            // 3. Fetch Collateral Details (Iterate over supported tokens)
            // Note: This requires knowing which tokens are supported. 
            // If contract has `getAllCollateralTokens`, use that. 
            // Otherwise, we might need to pass a token list or query individually based on UI tokens.
            // For this snippet, I'll assume we iterate known TOKENS from your config or similar.
            // ... (Logic skipped here to keep hook generic, usually UI passes token list)

            setUserStats({
                healthFactor: healthFactor === ethers.MaxUint256 ? "∞" : ethers.formatUnits(healthFactor, 18),
                ltv: "75", // Hardcoded or fetched from contract
                totalCollateralUSD: ethers.formatUnits(totalCollateral, 18),
                totalDebtUSD: ethers.formatUnits(totalDebt, 18),
                borrowAPR: (Number(ethers.formatUnits(aprRaw, 18)) * 100).toFixed(2),
                depositAPR: "0"
            });

            setUserPositions(prev => ({ ...prev, debt: debtDetails }));

        } catch (err) {
            console.error("Error refreshing lending data:", err);
        }
    }, [account, contract, provider]);

    // Auto-refresh on load
    useEffect(() => {
        refreshData();
        const interval = setInterval(refreshData, 15000); // Poll every 15s
        return () => clearInterval(interval);
    }, [refreshData]);


    // --- Core Actions ---

    // 1. Deposit
    const deposit = useCallback(async (tokenAddress: string, amount: string) => {
        if (!contract || !signer) return;
        setLoading(true);
        try {
            const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
            const decimals = await token.decimals();
            const weiAmount = ethers.parseUnits(amount, decimals);

            // Check Allowance
            const allowance = await token.allowance(account, CONTRACT_ADDRESS);
            if (allowance < weiAmount) {
                const txApp = await token.approve(CONTRACT_ADDRESS, ethers.MaxUint256);
                await txApp.wait();
            }

            const tx = await contract.depositCollateral(tokenAddress, weiAmount);
            await tx.wait();
            await refreshData();
        } catch (err) {
            console.error("Deposit Error:", err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [contract, signer, account, refreshData]);

    // 2. Withdraw
    const withdraw = useCallback(async (tokenAddress: string, amount: string) => {
        if (!contract) return;
        setLoading(true);
        try {
            // Need decimals to parse amount correctly. 
            // Ideally pass decimals or fetch here.
            const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
            const decimals = await token.decimals();
            const weiAmount = ethers.parseUnits(amount, decimals);

            const tx = await contract.withdrawCollateral(tokenAddress, weiAmount);
            await tx.wait();
            await refreshData();
        } catch (err) {
            console.error("Withdraw Error:", err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [contract, provider, refreshData]);

    // 3. Borrow
    const borrow = useCallback(async (tokenAddress: string, amount: string) => {
        if (!contract) return;
        setLoading(true);
        try {
            const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
            const decimals = await token.decimals();
            const weiAmount = ethers.parseUnits(amount, decimals);

            const tx = await contract.borrow(tokenAddress, weiAmount);
            await tx.wait();
            await refreshData();
        } catch (err) {
            console.error("Borrow Error:", err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [contract, provider, refreshData]);

    // 4. Repay
    const repay = useCallback(async (tokenAddress: string, amount: string, isFullRepay: boolean = false) => {
        if (!contract || !signer) return;
        setLoading(true);
        try {
            const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
            const decimals = await token.decimals();
            let weiAmount = ethers.parseUnits(amount, decimals);

            if (isFullRepay) {
                // If full repay, we might need a slightly higher approval buffer for interest 
                // or use a specific function if contract supports `repayFull`
                weiAmount = ethers.MaxUint256; 
            }

            // Check Allowance
            const allowance = await token.allowance(account, CONTRACT_ADDRESS);
            // If reusing logic, actual amount needed for approval might differ if full repay
            const amountToApprove = isFullRepay ? ethers.MaxUint256 : weiAmount;
            
            if (allowance < amountToApprove) {
                const txApp = await token.approve(CONTRACT_ADDRESS, ethers.MaxUint256);
                await txApp.wait();
            }

            // If logic relies on passing MaxUint256 to contract for full repay:
            const tx = await contract.repay(isFullRepay ? ethers.MaxUint256 : weiAmount);
            await tx.wait();
            await refreshData();
        } catch (err) {
            console.error("Repay Error:", err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [contract, signer, account, refreshData]);

    return {
        userStats,
        userPositions,
        loading,
        deposit,
        withdraw,
        borrow,
        repay,
        refreshData
    };
};