import { useCallback, useEffect, useState } from 'react';
import TradingDashboard from '../../components/TradingDashboard';
import { Loader2, ArrowUpRight, ArrowDownRight, X, Globe } from 'lucide-react';
import { ethers } from 'ethers';
import { useWallet } from '../../contexts/WalletContext';
import { TOKENS } from '../../utils/SwapTokens';
import { useToast } from '../../components/Toast';
import CoreABI from '../../ABI/ExchangeCoreABI.json';
import FuturesABI from '../../ABI/FuturesABI.json';
import TokenSelector from '../../components/TokenSelector';

const ERC20ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function approve(address spender, uint256 value) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
];

const CORE_ADDR = "0x8DD59298DF593432A6197CE9A0f5e7F57DF555B2";
const FUTURES_ADDR = "0x1fF93E88AEae63ce7c0F0759E9D4306D75b29Ae0";
const USDT_ADDR = "0x0F7782ef1Bd024E75a47d344496022563F0C1A38";

const Futures = () => {
    const { account, provider, signer } = useWallet();
    const { showToast } = useToast();

    const [state, setState] = useState({
        asset: TOKENS[1],
        price: "0",
        walletUsdt: "0",
        protocolUsdt: "0",
        myPositions: [] as any[],
        publicTrades: [] as any[]
    });

    const [form, setForm] = useState({ amount: '', leverage: 10 });
    const [ui, setUi] = useState({ loading: false, action: null as string | null });

    const fetchAll = useCallback(async () => {
        if (!provider) return;
        try {
            const core = new ethers.Contract(CORE_ADDR, CoreABI, provider);
            const futures = new ethers.Contract(FUTURES_ADDR, FuturesABI, provider);
            const usdt = new ethers.Contract(USDT_ADDR, ERC20ABI, provider);

            const priceRaw = await core.getPrice(state.asset.address, USDT_ADDR);

            const globalPosRaw = await futures.getGlobalPositions(0, 20);
            const publicTrades = globalPosRaw.map((p: any) => ({
                user: p.user,
                isLong: p.isLong,
                size: ethers.formatUnits(p.sizeUSD, 18),
                entry: ethers.formatUnits(p.entryPrice, 18),
                asset: p.asset
            }));

            let wallBal = "0";
            let protBal = "0";
            let myPos: any[] = [];

            if (account) {
                const wallBalRaw = await usdt.balanceOf(account);
                const userRes = await core.getUserBalance(account, USDT_ADDR);

                wallBal = ethers.formatUnits(wallBalRaw, 18);
                protBal = ethers.formatUnits(userRes[0], 18);

                const posPromises = TOKENS.map(async (t) => {
                    if (t.symbol === "USDT") return null;
                    try {
                        const p = await futures.positions(account, t.address);
                        const isActive = p.active || p[5];
                        if (!isActive) return null;

                        const curr = parseFloat(ethers.formatUnits(await core.getPrice(t.address, USDT_ADDR), 18));
                        const entry = parseFloat(ethers.formatUnits(p.entryPrice, 18));
                        const size = parseFloat(ethers.formatUnits(p.sizeUSD, 18));

                        if (entry === 0) return null;

                        const diff = p.isLong ? (curr - entry) : (entry - curr);
                        const pnl = ((diff * size) / entry).toFixed(2);

                        const marginVal = parseFloat(ethers.formatUnits(p.margin, 18));
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
                    } catch (err) {
                        return null;
                    }
                });

                const results = await Promise.all(posPromises);
                myPos = results.filter(Boolean);
            }

            setState(prev => ({
                ...prev,
                price: ethers.formatUnits(priceRaw, 18),
                walletUsdt: wallBal,
                protocolUsdt: protBal,
                myPositions: myPos,
                publicTrades: publicTrades
            }));
        } catch (e) { console.error("Fetch Error:", e); }
    }, [account, provider, state.asset]);

    useEffect(() => {
        fetchAll();
        const i = setInterval(fetchAll, 5000);
        return () => clearInterval(i);
    }, [fetchAll]);

    const execute = async (isLong: boolean) => {
        if (!form.amount || parseFloat(form.amount) <= 0) return;
        if (!signer || !account) return alert("Connect Wallet");

        setUi({ loading: true, action: isLong ? 'long' : 'short' });
        try {
            const futures = new ethers.Contract(FUTURES_ADDR, FuturesABI, signer);
            const usdt = new ethers.Contract(USDT_ADDR, ERC20ABI, signer);

            const qty = parseFloat(form.amount);
            const price = parseFloat(state.price);
            const size = qty * price;
            const requiredMargin = size / form.leverage;
            const fee = size * 0.003;
            const totalPull = requiredMargin + fee;

            const totalPullWei = ethers.parseUnits(totalPull.toFixed(18), 18);
            const qtyWei = ethers.parseUnits(form.amount, 18);

            const allowance = await usdt.allowance(account, CORE_ADDR);
            if (allowance < totalPullWei) {
                const txApp = await usdt.approve(CORE_ADDR, ethers.MaxUint256);
                await txApp.wait();
            }

            const txOpen = await futures.openPosition(
                state.asset.address,
                qtyWei,
                form.leverage,
                isLong,
                { gasLimit: 500000 }
            );
            await txOpen.wait();

            showToast("Position Opened", "success");
            setForm(p => ({ ...p, amount: '' }));
            fetchAll();
        } catch (e: any) {
            console.error(e);
            let msg = "Transaction Failed";
            if (e.reason) msg = e.reason;
            if (e.message && e.message.includes("user rejected")) msg = "User rejected transaction";
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
            const tx = await futures.closePosition(addr, { gasLimit: 500000 });
            await tx.wait();
            showToast("Closed Successfully", "success");
            fetchAll();
        } catch (e) {
            console.error(e);
            showToast("Close Failed", "error");
        } finally {
            setUi({ loading: false, action: null });
        }
    };

    // --- FIX: Correct Math for Percentage Button ---
    const handlePercentClick = (pct: number) => {
        const wallet = parseFloat(state.walletUsdt);
        const price = parseFloat(state.price);
        if (price === 0) return;

        // Formula: Wallet = Margin + Fee
        // Wallet = (Position/Lev) + (Position * 0.003)
        // Wallet = Position * ( (1/Lev) + 0.003 )
        // Position = Wallet / ( (1/Lev) + 0.003 )
        
        const availableFunds = (wallet * pct) / 100;
        const leverageCostFactor = (1 / form.leverage) + 0.003;
        
        const maxPositionSize = availableFunds / leverageCostFactor;
        const maxQty = maxPositionSize / price;

        // Round down slightly to handle gas/rounding issues (0.999 factor)
        setForm(p => ({ ...p, amount: (maxQty * 0.999).toFixed(6) }));
    };

    const TradeRow = ({ t }: { t: any }) => {
        const symbol = TOKENS.find(tk => tk.address.toLowerCase() === t.asset.toLowerCase())?.symbol || "UNK";
        return (
            <div className="grid grid-cols-4 text-[10px] py-1 px-2 hover:bg-gray-50 border-b border-gray-50 cursor-default items-center">
                <span className="text-gray-500 font-bold">{symbol}</span>
                <span className={`font-bold ${t.isLong ? 'text-green-600' : 'text-red-600'}`}>{t.isLong ? "Long" : "Short"}</span>
                <span className="text-right text-gray-600">${parseFloat(t.size).toFixed(0)}</span>
                <span className="text-right font-mono text-gray-800">{parseFloat(t.entry).toFixed(2)}</span>
            </div>
        );
    };

    const priceNum = parseFloat(state.price);
    const qtyNum = parseFloat(form.amount || "0");
    const sizeNum = qtyNum * priceNum;
    const marginReq = sizeNum / form.leverage;
    const feeReq = sizeNum * 0.003;
    const totalCost = marginReq + feeReq;

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

                    <div className="modern-card flex flex-col h-[300px]">
                        <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
                            <Globe className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-bold text-gray-800">Global Open Interest</span>
                        </div>
                        <div className="grid grid-cols-4 bg-[#F8F9FA] text-[10px] font-semibold text-gray-500 py-2 px-2 border-b border-gray-100 uppercase">
                            <span>Asset</span> <span>Side</span> <span className="text-right">Size</span> <span className="text-right">Entry</span>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {state.publicTrades.length === 0 ? (
                                <div className="flex justify-center items-center h-full text-xs text-gray-400">No Active Positions</div>
                            ) : (
                                state.publicTrades.map((t: any, i: number) => <TradeRow key={i} t={t} />)
                            )}
                        </div>
                        <div className="py-2 bg-gray-50 border-t border-gray-100 flex justify-center gap-2">
                            <span className={`text-sm font-bold ${priceNum > 0 ? 'text-green-600' : 'text-gray-800'}`}>{priceNum.toFixed(4)}</span>
                            <ArrowUpRight className="w-4 h-4 text-green-600" />
                        </div>
                    </div>

                    <div className="modern-card p-4 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800">Trade Futures</h2>
                            <div className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 font-mono">${priceNum.toFixed(4)}</div>
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
                                <span>Amount ({state.asset.symbol})</span>
                                <span className="cursor-pointer text-blue-600">Wallet: {parseFloat(state.walletUsdt).toFixed(2)} USDT</span>
                            </div>
                            <div className="modern-input px-3 py-2 w-full flex items-center border border-gray-200 rounded-lg">
                                <input 
                                    type="number" 
                                    value={form.amount} 
                                    onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))} 
                                    placeholder="0.00" 
                                    className="flex-1 bg-transparent text-sm outline-none" 
                                />
                                <span className="text-xs font-bold text-gray-400">{state.asset.symbol}</span>
                            </div>
                            <div className="flex gap-1 mt-1">
                                {[25, 50, 75, 100].map(pct => (
                                    <button key={pct} onClick={() => handlePercentClick(pct)} className="flex-1 py-1 rounded bg-gray-50 hover:bg-gray-100 text-[10px] transition">{pct}%</button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between text-xs"><span className="text-gray-500">Leverage</span><span className="font-bold text-blue-600">{form.leverage}x</span></div>
                            <input type="range" min="1" max="50" step="1" value={form.leverage} onChange={(e) => setForm(p => ({ ...p, leverage: Number(e.target.value) }))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                            <div className="flex justify-between text-[10px] text-gray-400"><span>1x</span><span>25x</span><span>50x</span></div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 flex flex-col gap-1">
                            {/* FIX: Correct Display Calculations */}
                            <div className="flex justify-between text-[10px] text-gray-500">
                                <span>Position Value</span> 
                                <span className="font-semibold text-gray-800">${sizeNum.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-500">
                                <span>Est. Cost (Margin+Fee)</span> 
                                <span className="font-semibold text-blue-600">${totalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-1">
                            <button onClick={() => execute(true)} disabled={ui.loading || !form.amount} className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white transition ${ui.loading ? 'bg-green-300' : 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-100'}`}>
                                {ui.loading && ui.action === 'long' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />} Long
                            </button>
                            <button onClick={() => execute(false)} disabled={ui.loading || !form.amount} className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white transition ${ui.loading ? 'bg-red-300' : 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-100'}`}>
                                {ui.loading && ui.action === 'short' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownRight className="w-4 h-4" />} Short
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Futures;