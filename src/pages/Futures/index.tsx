import { useCallback, useEffect, useState } from 'react';
import TradingDashboard from '../../components/TradingDashboard';
import { Loader2, ArrowUpRight, ArrowDownRight, X, ShieldCheck, TrendingUp, Zap, AlertTriangle } from 'lucide-react';
import { ethers } from 'ethers';
import { useWallet } from '../../contexts/WalletContext';
import { TOKENS } from '../../utils/SwapTokens';
import { useToast } from '../../components/Toast';
import CoreABI from '../../ABI/ExchangeCoreABI.json';
import FuturesABI from '../../ABI/FuturesABI.json';
import TokenSelector from '../../components/TokenSelector';
import { ERC20ABI } from '../../contexts/ABI';
import { CORE_ADDR, FUTURES_ADDR, USDT_ADDR } from '../../utils/Constants';

const Futures = () => {
    const { account, provider, signer } = useWallet();
    const { showToast } = useToast();

    const [state, setState] = useState({
        asset: TOKENS[1],
        price: "0",
        walletUsdt: "0",
        protocolLiquidity: "0", // NEW: Real TVL from Contract
        myPositions: [] as any[]
    });

    const [form, setForm] = useState({ amount: '', leverage: 20 });
    const [ui, setUi] = useState({ loading: false, action: null as string | null });

    const fetchAll = useCallback(async () => {
        if (!provider) return;
        try {
            const core = new ethers.Contract(CORE_ADDR, CoreABI, provider);
            const futures = new ethers.Contract(FUTURES_ADDR, FuturesABI, provider);
            const usdt = new ethers.Contract(USDT_ADDR, ERC20ABI, provider);

            // 1. Fetch Real Contract Data
            const priceRaw = await core.getPrice(state.asset.address, USDT_ADDR);
            const tvlRaw = await core.liquidityPool(USDT_ADDR); // Get Real USDT Liquidity

            let wallBal = "0";
            let myPos: any[] = [];

            if (account) {
                const wallBalRaw = await usdt.balanceOf(account);
                wallBal = ethers.formatUnits(wallBalRaw, 18);

                const posPromises = TOKENS.map(async (t) => {
                    if (t.symbol === "USDT") return null;
                    try {
                        const p = await futures.positions(account, t.address);
                        if (!p.active) return null;

                        const curr = parseFloat(ethers.formatUnits(await core.getPrice(t.address, USDT_ADDR), 18));
                        const entry = parseFloat(ethers.formatUnits(p.entryPrice, 18));
                        const size = parseFloat(ethers.formatUnits(p.sizeUSD, 18));
                        const marginVal = parseFloat(ethers.formatUnits(p.margin, 18));

                        const diff = p.isLong ? (curr - entry) : (entry - curr);
                        const pnl = entry > 0 ? ((diff * size) / entry).toFixed(5) : "0";
                        const leverage = marginVal > 0 ? (size / marginVal).toFixed(1) : "MAX";

                        return {
                            symbol: t.symbol,
                            addr: t.address,
                            size: size.toFixed(2),
                            entry: entry.toFixed(2),
                            mark: curr.toFixed(2),
                            pnl: pnl,
                            isLong: p.isLong,
                            leverage: leverage
                        };
                    } catch (err) { return null; }
                });
                myPos = (await Promise.all(posPromises)).filter(Boolean);
            }

            setState(prev => ({
                ...prev,
                price: ethers.formatUnits(priceRaw, 18),
                protocolLiquidity: ethers.formatUnits(tvlRaw, 18),
                walletUsdt: wallBal,
                myPositions: myPos
            }));
        } catch (e) { console.error("Fetch Error:", e); }
    }, [account, provider, state.asset]);

    useEffect(() => {
        fetchAll();
        const i = setInterval(fetchAll, 5000);
        return () => clearInterval(i);
    }, [fetchAll]);

    // --- MATH & VALIDATION ---
    const totalInput = parseFloat(form.amount || "0");
    const leverage = form.leverage;
    const feeRate = 0.003;

    // Calculate actual margin going to contract (Inclusive Fee Logic)
    const actualMargin = totalInput > 0 ? totalInput / (1 + (leverage * feeRate)) : 0;
    const estimatedFee = actualMargin * leverage * feeRate;
    const positionSize = actualMargin * leverage;

    const MIN_MARGIN = 20;
    const isValid = actualMargin >= MIN_MARGIN;

    const execute = async (isLong: boolean) => {
        if (!form.amount || totalInput <= 0) return;
        if (!signer || !account) return alert("Connect Wallet");

        if (actualMargin < MIN_MARGIN) {
            showToast(`Minimum Margin is $${MIN_MARGIN}. Please increase amount.`, "error");
            return;
        }

        setUi({ loading: true, action: isLong ? 'long' : 'short' });
        try {
            const futures = new ethers.Contract(FUTURES_ADDR, FuturesABI, signer);
            const usdt = new ethers.Contract(USDT_ADDR, ERC20ABI, signer);

            const marginWei = ethers.parseUnits(actualMargin.toFixed(18), 18);
            const totalApproval = ethers.parseUnits((totalInput * 1.001).toFixed(18), 18);

            const allowance = await usdt.allowance(account, CORE_ADDR);
            if (allowance < totalApproval) {
                const txApp = await usdt.approve(CORE_ADDR, ethers.MaxUint256);
                await txApp.wait();
            }

            const txOpen = await futures.openPosition(
                state.asset.address,
                marginWei,
                leverage,
                isLong,
                { gasLimit: 1000000 }
            );
            await txOpen.wait();

            showToast("Position Opened", "success");
            setForm(p => ({ ...p, amount: '' }));
            fetchAll();
        } catch (e: any) {
            console.error(e);
            let msg = "Transaction Failed";
            if (e.reason) msg = e.reason;
            if (e.info?.error?.message) msg = e.info.error.message;
            if (e.message.includes("user rejected")) msg = "User rejected";
            showToast(msg, "error");
        } finally {
            setUi({ loading: false, action: null });
        }
    };

    const close = async (addr: string) => {
        if (!signer) return;
        setUi({ loading: true, action: `close-${addr}` });
        try {
            const futures = new ethers.Contract(FUTURES_ADDR, FuturesABI, signer);
            const tx = await futures.closePosition(addr, { gasLimit: 1000000 });
            await tx.wait();
            showToast("Closed", "success");
            fetchAll();
        } catch (e) { showToast("Close Failed", "error"); }
        finally { setUi({ loading: false, action: null }); }
    };

    const handlePercentClick = (pct: number) => {
        const wallet = parseFloat(state.walletUsdt);
        if (wallet <= 0) return;
        const amt = (wallet * pct / 100) * 0.999;
        setForm(p => ({ ...p, amount: amt.toFixed(2) }));
    };

    return (
        <div className="hero-section flex flex-col items-center w-full p-3">
            <div className="w-full flex flex-col lg:flex-row gap-3">
                <div className="w-full lg:w-[70%] flex flex-col gap-3">
                    <div className="w-full"><TradingDashboard fullScreen showOrders={false} pair={`${state.asset.symbol}USDT`} /></div>

                    <div className="modern-card p-6 flex flex-col h-[250px]">
                        <h2 className="text-xl font-semibold text-[#111] mb-4">My Open Positions</h2>
                        <div className="w-full border border-[#E5E5E5] rounded-lg overflow-hidden flex flex-col flex-1 relative">
                            <div className="grid grid-cols-7 bg-[#F3F4F6] text-xs font-semibold text-gray-700 py-2 px-3 border-b border-[#E5E5E5]">
                                <span className="text-left">Pair</span> <span className="text-center">Side</span> <span className="text-center">Size</span> <span className="text-center">Entry</span> <span className="text-center">Mark</span> <span className="text-center">PnL</span> <span className="text-right">Action</span>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {state.myPositions.length === 0 ? <div className="flex justify-center items-center h-full text-sm text-gray-500">No Open Positions</div> :
                                    state.myPositions.map((p: any, i: number) => (
                                        <div key={i} className="grid grid-cols-7 text-xs py-3 px-3 border-b border-gray-100 hover:bg-gray-50 items-center">
                                            <div className="flex items-center gap-2 font-bold text-gray-700"><img src={TOKENS.find(t => t.symbol === p.symbol)?.img} className="w-4 h-4 rounded-full" />{p.symbol}</div>
                                            <div className={`text-center font-bold ${p.isLong ? 'text-green-600' : 'text-red-600'}`}>{p.isLong ? "LONG" : "SHORT"} x{p.leverage}</div>
                                            <div className="text-center font-mono">${p.size}</div>
                                            <div className="text-center font-mono">{p.entry}</div>
                                            <div className="text-center font-mono">{p.mark}</div>
                                            <div className={`text-center font-bold ${parseFloat(p.pnl) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{parseFloat(p.pnl) > 0 ? "+" : ""}{p.pnl} USDT</div>
                                            <div className="flex justify-end"><button onClick={() => close(p.addr)} disabled={ui.loading} className="p-1 hover:bg-red-100 text-red-500 rounded transition">{ui.loading && ui.action === `close-${p.addr}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}</button></div>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-[30%] flex flex-col gap-3">

                    {/* REAL MARKET INFO (Updated) */}
                    <div className="modern-card p-5 flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2">
                                <img src={state.asset.img} className="w-8 h-8 rounded-full shadow-sm" />
                                <div>
                                    <div className="text-lg font-bold text-gray-800">{state.asset.symbol} / USDT</div>
                                    <div className="text-xs text-gray-500">Perpetual Futures</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-mono font-bold text-gray-800">${parseFloat(state.price).toFixed(2)}</div>
                                <div className="text-xs text-green-500 font-medium flex items-center justify-end gap-1"><TrendingUp className="w-3 h-3" /> Live</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Real Data from SC */}
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1"><ShieldCheck className="w-3 h-3 text-blue-500" /> Protocol Liquidity</div>
                                <div className="font-bold text-gray-800 text-sm">${parseFloat(state.protocolLiquidity).toLocaleString(undefined, { maximumFractionDigits: 0 })} USDT</div>
                            </div>

                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1"><Zap className="w-3 h-3 text-orange-500" /> Max Leverage</div>
                                <div className="font-bold text-gray-800 text-sm">50x</div>
                            </div>
                        </div>
                    </div>

                    <div className="modern-card p-4 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800">Place Order</h2>
                            <div className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 font-mono">Bal: {parseFloat(state.walletUsdt).toFixed(2)}</div>
                        </div>

                        <div className="relative z-50">
                            <TokenSelector
                                tokens={TOKENS.filter(t => t.symbol !== "USDT")}
                                selected={state.asset}
                                onSelect={(t: any) => setState(p => ({ ...p, asset: t }))}
                                label="Select Asset"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-[10px] text-gray-500">
                                <span className="font-bold text-gray-700">Total Investment (Margin + Fee)</span>
                            </div>
                            <div className={`modern-input px-3 py-3 w-full flex items-center border rounded-xl focus-within:ring-1 transition ${!isValid && totalInput > 0 ? 'border-red-300 ring-red-100 bg-red-50' : 'border-gray-200 focus-within:border-blue-500 focus-within:ring-blue-100'}`}>
                                <input
                                    type="number"
                                    value={form.amount}
                                    onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))}
                                    placeholder="Min 25.00"
                                    className="flex-1 bg-transparent text-lg font-medium outline-none text-gray-800 placeholder-gray-300"
                                />
                                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">USDT</span>
                            </div>

                            {!isValid && totalInput > 0 && (
                                <div className="flex items-center gap-1 text-[10px] text-red-500 mt-1 font-semibold">
                                    <AlertTriangle className="w-3 h-3" /> Increase amount. Min margin is $20.
                                </div>
                            )}

                            <div className="flex gap-2 mt-2">
                                {[25, 50, 75, 100].map(pct => (
                                    <button key={pct} onClick={() => handlePercentClick(pct)} className="flex-1 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-[10px] font-medium text-gray-600 transition border border-gray-100">{pct}%</button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 py-2">
                            <div className="flex justify-between text-xs"><span className="text-gray-500">Leverage</span><span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{form.leverage}x</span></div>
                            <input type="range" min="1" max="50" step="1" value={form.leverage} onChange={(e) => setForm(p => ({ ...p, leverage: Number(e.target.value) }))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                            <div className="flex justify-between text-[10px] text-gray-400"><span>1x</span><span>25x</span><span>50x</span></div>
                        </div>

                        <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100 flex flex-col gap-1.5">
                            <div className="flex justify-between text-[11px] text-gray-600">
                                <span>Actual Margin</span>
                                <span className={`font-medium ${!isValid && totalInput > 0 ? 'text-red-500' : 'text-gray-900'}`}>${actualMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-[11px] text-gray-600">
                                <span>Fee (0.3%)</span>
                                <span className="font-medium text-gray-900">${estimatedFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="h-px bg-blue-200 my-0.5 w-full opacity-50"></div>
                            <div className="flex justify-between text-[11px] text-gray-600">
                                <span>Buying Power (Size)</span>
                                <span className="font-bold text-blue-700">${positionSize.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-1">
                            <button onClick={() => execute(true)} disabled={ui.loading || !form.amount || !isValid} className={`flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition transform active:scale-95 ${ui.loading || !isValid ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-100'}`}>
                                {ui.loading && ui.action === 'long' ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUpRight className="w-5 h-5" />} Long
                            </button>
                            <button onClick={() => execute(false)} disabled={ui.loading || !form.amount || !isValid} className={`flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition transform active:scale-95 ${ui.loading || !isValid ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-100'}`}>
                                {ui.loading && ui.action === 'short' ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowDownRight className="w-5 h-5" />} Short
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Futures;