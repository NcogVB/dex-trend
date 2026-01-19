import { useCallback, useEffect, useState } from 'react';
import { Loader2, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, DollarSign, Activity, Info } from 'lucide-react';
import { ethers } from 'ethers';
import { useWallet } from '../../contexts/WalletContext';
import { TOKENS } from '../../utils/SwapTokens';
import { useToast } from '../../components/Toast';

import CoreABI from '../../ABI/ExchangeCoreABI.json';
import OptionsABI from '../../ABI/OptionsABI.json';
import TokenSelector from '../../components/TokenSelector';

const ERC20ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function approve(address spender, uint256 value) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
];

const CORE_ADDR = "0x8DD59298DF593432A6197CE9A0f5e7F57DF555B2";
const OPTIONS_ADDR = "0xE0A678602ab0C4869b391A940411B065cfCc7346";
const USDT_ADDR = "0x0F7782ef1Bd024E75a47d344496022563F0C1A38";

const EXPIRIES = [1, 7, 14, 30];

const Options = () => {
    const { account, provider, signer } = useWallet();
    const { showToast } = useToast();

    const [state, setState] = useState({
        asset: TOKENS[1],
        price: "0",
        walletUsdt: "0",
        myOptions: [] as any[],
        amount: "1"
    });

    const [ui, setUi] = useState({
        selectedExpiry: 7,
        loading: false,
        action: null as string | null
    });

    const strikes = useCallback(() => {
        const p = parseFloat(state.price);
        if (p === 0) return [];

        const isStable = p < 2;
        const step = p * (isStable ? 0.005 : 0.025);

        const result = [];
        const decimals = p < 2 ? 5 : (p < 10 ? 4 : (p < 100 ? 2 : 0));

        for (let i = -5; i <= 5; i++) {
            const val = p + (i * step);
            result.push(val.toFixed(decimals));
        }
        return result.reverse();
    }, [state.price]);

    const fetchAll = useCallback(async () => {
        if (!provider) return;
        try {
            const core = new ethers.Contract(CORE_ADDR, CoreABI, provider);
            const options = new ethers.Contract(OPTIONS_ADDR, OptionsABI, provider);
            const usdt = new ethers.Contract(USDT_ADDR, ERC20ABI, provider);

            const usdtToken = TOKENS.find(t => t.symbol === "USDT");
            if (!usdtToken) return;

            const priceRaw = await core.getPrice(state.asset.address, usdtToken.address);
            const price = parseFloat(ethers.formatUnits(priceRaw, 18));

            let walletUsdt = "0";
            let myOptions: any[] = [];

            if (account) {
                const bal = await usdt.balanceOf(account);
                walletUsdt = ethers.formatUnits(bal, 18);

                try {
                    const rawOptions = await options.getActiveOptions(0, 100);
                    myOptions = rawOptions
                        .map((o: any) => ({
                            id: Number(o.id),
                            holder: o.holder,
                            asset: o.asset,
                            strike: ethers.formatUnits(o.strikePrice, 18),
                            amount: ethers.formatUnits(o.amount, 18),
                            expiry: Number(o.expiry),
                            premium: ethers.formatUnits(o.premium, 18),
                            isCall: o.isCall,
                            active: o.active
                        }))
                        .filter((o: any) =>
                            o.holder.toLowerCase() === account.toLowerCase() &&
                            o.active &&
                            o.asset.toLowerCase() === state.asset.address.toLowerCase()
                        );
                } catch { }
            }

            setState(p => ({
                ...p,
                price: price.toString(),
                walletUsdt,
                myOptions
            }));

        } catch (e) { console.error(e); }
    }, [account, provider, state.asset]);

    useEffect(() => {
        fetchAll();
        const i = setInterval(fetchAll, 5000);
        return () => clearInterval(i);
    }, [fetchAll]);

    const handleBuy = async (isCall: boolean, strike: string) => {
        if (!signer) return alert("Connect Wallet");
        if (!state.amount || parseFloat(state.amount) <= 0) return alert("Enter valid amount");

        setUi(p => ({ ...p, loading: true, action: `buy-${isCall ? 'call' : 'put'}-${strike}` }));

        try {
            const options = new ethers.Contract(OPTIONS_ADDR, OptionsABI, signer);
            const usdt = new ethers.Contract(USDT_ADDR, ERC20ABI, signer);

            const minRequired = ethers.parseUnits("1000", 18);
            const allowance = await usdt.allowance(account, OPTIONS_ADDR);

            if (allowance < minRequired) {
                const txApp = await usdt.approve(OPTIONS_ADDR, ethers.MaxUint256);
                await txApp.wait();
            }

            const strikeWei = ethers.parseUnits(strike, 18);
            const amountWei = ethers.parseUnits(state.amount, 18);

            const tx = await options.buyOption(
                state.asset.address,
                amountWei,
                strikeWei,
                ui.selectedExpiry,
                isCall,
                { gasLimit: 1200000 }
            );
            await tx.wait();

            showToast(`${isCall ? "Call" : "Put"} Option Bought Successfully`, "success");
            fetchAll();
        } catch (e: any) {
            console.error(e);
            let msg = e.reason || "Transaction Failed";
            if (e.message?.includes("user rejected")) msg = "User rejected transaction";
            showToast(msg, "error");
        } finally {
            setUi(p => ({ ...p, loading: false, action: null }));
        }
    };

    const handleExercise = async (id: number) => {
        if (!signer) return;
        setUi(p => ({ ...p, loading: true, action: `exercise-${id}` }));
        try {
            const options = new ethers.Contract(OPTIONS_ADDR, OptionsABI, signer);
            const tx = await options.exerciseOption(id, { gasLimit: 500000 });
            await tx.wait();
            showToast("Option Exercised! Profits sent to wallet.", "success");
            fetchAll();
        } catch (e: any) {
            showToast("Exercise Failed: " + (e.reason || "Option is Out of Money"), "error");
        } finally {
            setUi(p => ({ ...p, loading: false, action: null }));
        }
    };

    const formatPrice = (p: string) => parseFloat(p).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });

    return (
        <div className="flex flex-col items-center w-full p-4 gap-4 bg-gray-50 min-h-screen text-gray-800 font-sans">

            <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* --- HEADER & CONTROLS --- */}
                <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex flex-wrap items-center gap-6 w-full md:w-auto">

                        <div className="w-full md:w-64 relative z-50">
                            <TokenSelector
                                tokens={TOKENS.filter(t => t.symbol !== "USDT")}
                                selected={state.asset}
                                onSelect={(t: any) => setState(p => ({ ...p, asset: t }))}
                                label="Asset Pair"
                            />
                        </div>

                        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200 shadow-inner">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Contract Size</span>
                            <div className="h-4 w-px bg-gray-300 mx-1"></div>
                            <input
                                type="number"
                                value={state.amount}
                                onChange={(e) => setState(p => ({ ...p, amount: e.target.value }))}
                                className="w-24 bg-transparent text-sm font-mono font-bold outline-none text-gray-900 text-right focus:text-blue-600 transition-colors"
                                placeholder="1.0"
                            />
                            <span className="text-xs font-bold text-gray-400">{state.asset.symbol}</span>
                        </div>

                        <div className="hidden md:flex flex-col border-l border-gray-200 pl-6">
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-mono font-bold text-gray-900">${formatPrice(state.price)}</span>
                                <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider"> Price</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Expiration</span>
                        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                            {EXPIRIES.map(d => (
                                <button key={d} onClick={() => setUi(p => ({ ...p, selectedExpiry: d }))} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${ui.selectedExpiry === d ? "bg-white text-blue-600 shadow-sm ring-1 ring-gray-200" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"}`}>
                                    {d}D
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- LEFT SIDE: POSITIONS --- */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[650px]">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                                <Activity className="w-4 h-4 text-blue-500" /> Active Positions
                            </h3>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{state.myOptions.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                            {state.myOptions.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm opacity-60">
                                    <Clock className="w-8 h-8 mb-2 opacity-30" />
                                    <span>No active positions</span>
                                </div>
                            ) : (
                                state.myOptions.map((o) => {
                                    const currentP = parseFloat(state.price);
                                    const strikeP = parseFloat(o.strike);
                                    const isITM = o.isCall ? currentP > strikeP : currentP < strikeP;
                                    const pnl = isITM ? Math.abs(currentP - strikeP) * parseFloat(o.amount) : 0;
                                    const expiryDate = new Date(o.expiry * 1000);
                                    const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 3600 * 24));

                                    return (
                                        <div key={o.id} className={`relative p-4 rounded-xl border transition-all hover:shadow-md group ${isITM ? "bg-green-50/30 border-green-200" : "bg-white border-gray-100"}`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${o.isCall ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{o.isCall ? "CALL" : "PUT"}</span>
                                                        <span className="text-sm font-bold text-gray-900">${parseFloat(o.strike).toLocaleString()}</span>
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 font-medium">ID: #{o.id}</span>
                                                </div>
                                                {isITM ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Clock className="w-5 h-5 text-gray-300" />}
                                            </div>

                                            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[11px] text-gray-500 mb-4">
                                                <div className="flex justify-between"><span>Size:</span> <span className="font-mono text-gray-900">{parseFloat(o.amount).toFixed(2)}</span></div>
                                                <div className="flex justify-between"><span>Expiry:</span> <span className={daysLeft < 2 ? "text-red-500 font-bold" : "text-gray-900"}>{daysLeft}d</span></div>
                                                <div className="flex justify-between"><span>Paid:</span> <span className="text-gray-900">${parseFloat(o.premium).toFixed(2)}</span></div>
                                                <div className="flex justify-between"><span>PnL:</span> <span className={`font-bold ${isITM ? "text-green-600" : "text-gray-400"}`}>${pnl.toFixed(2)}</span></div>
                                            </div>

                                            <button
                                                onClick={() => handleExercise(o.id)}
                                                disabled={ui.loading || !isITM}
                                                className={`w-full py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${isITM ? "bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-200" : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"}`}
                                            >
                                                {ui.loading && ui.action === `exercise-${o.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : (
                                                    <>{isITM ? <DollarSign className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} {isITM ? "Claim Now" : "Wait..."}</>
                                                )}
                                            </button>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* --- MAIN: OPTION CHAIN --- */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[650px]">
                        {/* Chain Header */}
                        <div className="grid grid-cols-11 bg-gray-50 text-[10px] font-bold text-gray-500 py-3 border-b border-gray-200 text-center uppercase tracking-widest sticky top-0 z-10 shadow-sm">
                            <span className="col-span-4 text-left pl-6 text-green-600 flex items-center gap-1.5"><TrendingUp className="w-3 h-3" /> Calls</span>
                            <span className="col-span-3 text-gray-800 text-xs flex items-center justify-center gap-1">Strike Price <Info className="w-3 h-3 text-gray-300" /></span>
                            <span className="col-span-4 text-right pr-6 text-red-600 flex items-center justify-end gap-1.5">Puts <TrendingDown className="w-3 h-3" /></span>
                        </div>

                        <div className="divide-y divide-gray-50 overflow-y-auto custom-scrollbar flex-1 bg-white">
                            {strikes().map((strike, i) => {
                                const sVal = parseFloat(strike);
                                const current = parseFloat(state.price);
                                const diff = ((sVal - current) / current) * 100;
                                const isAtm = Math.abs(diff) < (current < 2 ? 0.5 : 2.5);
                                const amountNum = parseFloat(state.amount) || 1;

                                const notional = sVal * amountNum;
                                const premiumEst = (notional * 0.02 * (ui.selectedExpiry / 30));

                                const breakEvenCall = sVal + (premiumEst / amountNum);
                                const breakEvenPut = sVal - (premiumEst / amountNum);

                                return (
                                    <div key={i} className={`grid grid-cols-11 text-xs transition-colors items-center py-1 hover:bg-gray-50 group ${isAtm ? "bg-blue-50/40" : ""}`}>

                                        {/* CALL SIDE */}
                                        <div className="col-span-4 flex items-center justify-between pl-4 pr-2 border-r border-gray-50 h-full">
                                            <div className="flex flex-col items-start gap-0.5">
                                                <span className="text-[10px] text-gray-400 font-mono">BE: ${breakEvenCall.toFixed(2)}</span>
                                                <div className="w-16 h-1 bg-green-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-green-400" style={{ width: `${Math.max(0, 100 - (diff * 5))}%` }}></div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleBuy(true, strike)}
                                                disabled={ui.loading}
                                                className="group/btn flex items-center gap-2 px-3 py-1.5 bg-white border border-green-100 hover:border-green-500 hover:bg-green-50 rounded-lg transition-all shadow-sm w-28 justify-between"
                                            >
                                                <span className="font-mono font-bold text-gray-700 group-hover/btn:text-green-700">${premiumEst.toFixed(2)}</span>
                                                {ui.loading && ui.action === `buy-call-${strike}` ? <Loader2 className="w-3 h-3 animate-spin text-green-600" /> : <TrendingUp className="w-3 h-3 text-green-400 group-hover/btn:text-green-600" />}
                                            </button>
                                        </div>

                                        {/* STRIKE CENTER */}
                                        <div className={`col-span-3 flex flex-col justify-center items-center h-full py-3 ${isAtm ? "bg-blue-100/50" : ""}`}>
                                            <span className={`font-mono text-sm font-bold ${isAtm ? "text-blue-700" : "text-gray-700"}`}>
                                                ${sVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                                            </span>
                                            {isAtm && <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wide mt-0.5">ATM</span>}
                                        </div>

                                        {/* PUT SIDE */}
                                        <div className="col-span-4 flex items-center justify-between pl-2 pr-4 border-l border-gray-50 h-full">
                                            <button
                                                onClick={() => handleBuy(false, strike)}
                                                disabled={ui.loading}
                                                className="group/btn flex items-center gap-2 px-3 py-1.5 bg-white border border-red-100 hover:border-red-500 hover:bg-red-50 rounded-lg transition-all shadow-sm w-28 justify-between"
                                            >
                                                <TrendingDown className="w-3 h-3 text-red-400 group-hover/btn:text-red-600" />
                                                <span className="font-mono font-bold text-gray-700 group-hover/btn:text-red-700">${premiumEst.toFixed(2)}</span>
                                                {ui.loading && ui.action === `buy-put-${strike}` && <Loader2 className="w-3 h-3 animate-spin text-red-600 absolute right-2" />}
                                            </button>
                                            <div className="flex flex-col items-end gap-0.5">
                                                <span className="text-[10px] text-gray-400 font-mono">BE: ${breakEvenPut.toFixed(2)}</span>
                                                <div className="w-16 h-1 bg-red-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-red-400" style={{ width: `${Math.max(0, 100 + (diff * 5))}%` }}></div>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Options;