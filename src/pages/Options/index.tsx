import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2, TrendingUp, TrendingDown, Clock, Info, CheckCircle, XCircle, DollarSign, Activity } from 'lucide-react';
import { ethers } from 'ethers';
import { useWallet } from '../../contexts/WalletContext';
import { TOKENS } from '../../utils/SwapTokens';
import { useToast } from '../../components/Toast';

import CoreABI from '../../ABI/ExchangeCoreABI.json';
import OptionsABI from '../../ABI/OptionsABI.json';

const ERC20ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function approve(address spender, uint256 value) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
];

const CORE_ADDR = "0x2D2d50590B7900F1023B7A745EBc368c9C3D97A0";
const OPTIONS_ADDR = "0xF58C18bcF9670323bB0B8b5C331660d829a3EaBC";
const USDT_ADDR = "0x0F7782ef1Bd024E75a47d344496022563F0C1A38";

const EXPIRIES = [1, 7, 14, 30];

const Options = () => {
    const { account, provider, signer } = useWallet();
    const { showToast } = useToast();
    const dropdownRef = useRef<HTMLDivElement>(null);

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
        action: null as string | null,
        isOpen: false
    });

    const strikes = useCallback(() => {
        const p = parseFloat(state.price);
        if (p === 0) return [];
        const step = p * 0.025; 
        const result = [];
        
        const decimals = p < 10 ? 4 : (p < 100 ? 2 : 0);

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

            const priceRaw = await core.getPrice(state.asset.address,TOKENS.find(t => t.symbol === "USDT")!.address);
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
                } catch {}
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

            const maxApprove = ethers.parseUnits("100000", 18);
            const allowance = await usdt.allowance(account, CORE_ADDR);
            
            if (allowance < maxApprove) {
                const txApp = await usdt.approve(CORE_ADDR, ethers.MaxUint256);
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
                { gasLimit: 800000 }
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

    const formatPrice = (p: string) => parseFloat(p).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });

    return (
        <div className="flex flex-col items-center w-full p-4 gap-4 bg-gray-50/50 min-h-screen">
            
            <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-4 gap-4">
                
                <div className="lg:col-span-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative" ref={dropdownRef}>
                            <button onClick={() => setUi(p => ({ ...p, isOpen: !p.isOpen }))} className="flex items-center gap-3 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-white hover:shadow-md transition">
                                <img src={state.asset.img} className="w-8 h-8 rounded-full shadow-sm" />
                                <div className="flex flex-col items-start">
                                    <span className="text-lg font-bold text-gray-900 leading-none">{state.asset.symbol} Options</span>
                                    <span className="text-xs text-blue-600 font-medium">Oracle: ${formatPrice(state.price)}</span>
                                </div>
                                <ChevronDown className="w-4 h-4 text-gray-400 ml-2" />
                            </button>
                            {ui.isOpen && (
                                <ul className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden py-1">
                                    {TOKENS.filter(t => t.symbol !== "USDT").map(t => (
                                        <li key={t.symbol} onClick={() => { setState(p => ({ ...p, asset: t })); setUi(u => ({ ...u, isOpen: false })); }} className="flex items-center px-4 py-3 hover:bg-blue-50 cursor-pointer gap-3 border-b border-gray-50 last:border-0 transition">
                                            <img src={t.img} className="w-6 h-6 rounded-full" /> 
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-700">{t.symbol}</span>
                                                <span className="text-[10px] text-gray-400">{t.name}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                            <span className="text-xs font-bold text-gray-500 uppercase">Amount:</span>
                            <input 
                                type="number" 
                                value={state.amount} 
                                onChange={(e) => setState(p => ({ ...p, amount: e.target.value }))}
                                className="w-20 bg-transparent text-sm font-mono font-bold outline-none text-gray-900 text-right"
                                placeholder="1.0"
                            />
                            <span className="text-xs font-bold text-gray-400">{state.asset.symbol}</span>
                        </div>

                        <div className="hidden md:flex flex-col ml-4">
                            <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Wallet Balance</span>
                            <span className="text-sm font-mono font-bold text-gray-700">${formatPrice(state.walletUsdt)}</span>
                        </div>
                    </div>

                    <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                        {EXPIRIES.map(d => (
                            <button key={d} onClick={() => setUi(p => ({ ...p, selectedExpiry: d }))} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${ui.selectedExpiry === d ? "bg-white text-blue-600 shadow-sm ring-1 ring-gray-200" : "text-gray-500 hover:text-gray-700"}`}>
                                {d}D
                            </button>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-1 flex flex-col gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-500"/> Open Positions
                            </h3>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{state.myOptions.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {state.myOptions.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                                    <div className="bg-gray-100 p-3 rounded-full mb-3"><Clock className="w-6 h-6 opacity-50"/></div>
                                    No active options found
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
                                        <div key={o.id} className={`p-3 rounded-xl border transition-all hover:shadow-md ${isITM ? "bg-green-50/50 border-green-200" : "bg-white border-gray-200"}`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${o.isCall ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{o.isCall ? "CALL" : "PUT"}</span>
                                                    <span className="text-sm font-bold text-gray-800">${parseFloat(o.strike).toLocaleString()}</span>
                                                </div>
                                                {isITM ? <CheckCircle className="w-4 h-4 text-green-500"/> : <XCircle className="w-4 h-4 text-gray-300"/>}
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500 mb-3 bg-white/50 p-2 rounded-lg">
                                                <div>Amount: <span className="text-gray-900 font-mono">{parseFloat(o.amount).toFixed(2)}</span></div>
                                                <div className="text-right">Expires: <span className={daysLeft < 2 ? "text-red-500 font-bold" : "text-gray-900"}>{daysLeft}d</span></div>
                                                <div>Prem: <span className="text-gray-900">${parseFloat(o.premium).toFixed(2)}</span></div>
                                                <div className="text-right">Est. PnL: <span className={isITM ? "text-green-600 font-bold" : "text-gray-400"}>${pnl.toFixed(2)}</span></div>
                                            </div>

                                            <button 
                                                onClick={() => handleExercise(o.id)}
                                                disabled={ui.loading || !isITM}
                                                className={`w-full py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition ${isITM ? "bg-green-600 text-white hover:bg-green-700 shadow-green-100 shadow-lg" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                                            >
                                                {ui.loading && ui.action === `exercise-${o.id}` ? <Loader2 className="w-3 h-3 animate-spin"/> : (
                                                    <>{isITM ? <DollarSign className="w-3 h-3"/> : <XCircle className="w-3 h-3"/>} {isITM ? "Exercise Profit" : "Out of Money"}</>
                                                )}
                                            </button>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
                        <div className="grid grid-cols-7 bg-gray-50 text-[10px] font-black text-gray-500 py-3 border-b border-gray-200 text-center uppercase tracking-widest sticky top-0 z-10">
                            <span className="col-span-2 text-left pl-6 text-green-600 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> Calls</span>
                            <span className="col-span-1 text-gray-400">Break Even</span>
                            <span className="col-span-1 text-gray-800 text-xs">Strike Price</span>
                            <span className="col-span-1 text-gray-400">Break Even</span>
                            <span className="col-span-2 text-right pr-6 text-red-600 flex items-center justify-end gap-1">Puts <TrendingDown className="w-3 h-3"/></span>
                        </div>
                        
                        <div className="divide-y divide-gray-100 overflow-y-auto custom-scrollbar">
                            {strikes().map((strike, i) => {
                                const sVal = parseFloat(strike);
                                const current = parseFloat(state.price);
                                const diff = ((sVal - current) / current) * 100;
                                const isAtm = Math.abs(diff) < 2.5; 
                                const amountNum = parseFloat(state.amount) || 1;
                                
                                // Simulated Premium Calc (Matches Contract Logic Roughly)
                                const notional = sVal * amountNum;
                                const premiumEst = (notional * 0.02 * (ui.selectedExpiry/30)); 
                                
                                const breakEvenCall = sVal + (premiumEst / amountNum);
                                const breakEvenPut = sVal - (premiumEst / amountNum);

                                return (
                                    <div key={i} className={`grid grid-cols-7 text-xs hover:bg-gray-50 transition-colors items-center py-2.5 ${isAtm ? "bg-blue-50/30" : ""}`}>
                                        
                                        <div className="col-span-2 flex justify-start items-center gap-3 pl-4">
                                            <button 
                                                onClick={() => handleBuy(true, strike)}
                                                disabled={ui.loading}
                                                className="group flex items-center gap-2 px-3 py-1.5 border border-green-100 bg-white hover:bg-green-500 hover:border-green-600 hover:text-white rounded-lg transition-all shadow-sm w-24 justify-center"
                                            >
                                                <span className="font-mono font-bold">${premiumEst.toFixed(1)}</span>
                                                {ui.loading && ui.action === `buy-call-${strike}` ? <Loader2 className="w-3 h-3 animate-spin"/> : <TrendingUp className="w-3 h-3 opacity-30 group-hover:opacity-100"/>}
                                            </button>
                                            <div className="h-1 flex-1 bg-green-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-green-400" style={{ width: `${Math.max(0, 100 - (diff * 5))}%` }}></div>
                                            </div>
                                        </div>

                                        <div className="col-span-1 text-center font-mono text-[10px] text-gray-400">
                                            ${breakEvenCall.toFixed(2)}
                                        </div>

                                        <div className={`col-span-1 text-center font-mono text-sm font-bold py-1 rounded ${isAtm ? "bg-blue-100 text-blue-700" : "text-gray-700"}`}>
                                            ${sVal.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                        </div>

                                        <div className="col-span-1 text-center font-mono text-[10px] text-gray-400">
                                            ${breakEvenPut.toFixed(2)}
                                        </div>

                                        <div className="col-span-2 flex justify-end items-center gap-3 pr-4">
                                            <div className="h-1 flex-1 bg-red-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-red-400" style={{ width: `${Math.max(0, 100 + (diff * 5))}%` }}></div>
                                            </div>
                                            <button 
                                                onClick={() => handleBuy(false, strike)}
                                                disabled={ui.loading}
                                                className="group flex items-center gap-2 px-3 py-1.5 border border-red-100 bg-white hover:bg-red-500 hover:border-red-600 hover:text-white rounded-lg transition-all shadow-sm w-24 justify-center"
                                            >
                                                <TrendingDown className="w-3 h-3 opacity-30 group-hover:opacity-100"/>
                                                <span className="font-mono font-bold">${premiumEst.toFixed(1)}</span>
                                                {ui.loading && ui.action === `buy-put-${strike}` && <Loader2 className="w-3 h-3 animate-spin absolute"/>}
                                            </button>
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