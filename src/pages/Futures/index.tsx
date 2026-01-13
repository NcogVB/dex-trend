import { useCallback, useEffect, useRef, useState } from 'react';
import TradingDashboard from '../../components/TradingDashboard';
import { ChevronDown, Loader2, ArrowUpRight, ArrowDownRight, X, Globe } from 'lucide-react';
import { ethers } from 'ethers';
import { useWallet } from '../../contexts/WalletContext';
import { TOKENS } from '../../utils/SwapTokens';
import { useToast } from '../../components/Toast';

// Import ABIs
import CoreABI from '../../ABI/ExchangeCoreABI.json';
import FuturesABI from '../../ABI/FuturesABI.json';
const ERC20ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function approve(address spender, uint256 value) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
];
// Config
const CORE_ADDR = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const FUTURES_ADDR = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const USDT_ADDR = "0x0F7782ef1Bd024E75a47d344496022563F0C1A38";

const Futures = () => {
    const { account, provider, signer } = useWallet();
    const { showToast } = useToast();
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [state, setState] = useState({
        asset: TOKENS[1],
        price: "0",
        walletUsdt: "0",
        protocolUsdt: "0",
        myPositions: [] as any[],
        publicTrades: [] as any[]
    });

    const [form, setForm] = useState({ margin: '', leverage: 10, isOpen: false });
    const [ui, setUi] = useState({ loading: false, action: null as string | null });

    const fetchAll = useCallback(async () => {
        if (!provider) return;
        try {
            const core = new ethers.Contract(CORE_ADDR, CoreABI, provider);
            const futures = new ethers.Contract(FUTURES_ADDR, FuturesABI, provider);
            const usdt = new ethers.Contract(USDT_ADDR, ERC20ABI, provider);

            // 1. Asset Price
            const priceRaw = await core.getPrice(state.asset.address);

            // 2. Market Positions (Public Order Book)
            // Fetch first 20 global positions
            const globalPosRaw = await futures.getGlobalPositions(0, 20);
            const publicTrades = globalPosRaw.map((p: any) => ({
                user: p.user,
                isLong: p.isLong,
                size: ethers.formatUnits(p.sizeUSD, 18),
                entry: ethers.formatUnits(p.entryPrice, 18),
                asset: p.asset
            }));

            let wallBal = "0", protBal = "0", myPos: ({ symbol: string; addr: string; size: string; entry: string; mark: string; pnl: string; isLong: any; leverage: string; } | null)[] = [];

            // 3. User Data
            if (account) {
                // Fetch Wallet Balance
                const wallBalRaw = await usdt.balanceOf(account);

                // Fetch Protocol Balance using new getUserBalance function
                const userRes = await core.getUserBalance(account, USDT_ADDR);

                wallBal = ethers.formatUnits(wallBalRaw, 18);
                protBal = ethers.formatUnits(userRes[0], 18); // collateral index

                // Fetch User's Open Positions
                myPos = (await Promise.all(TOKENS.map(async (t) => {
                    if (t.symbol === "USDT") return null;
                    const p = await futures.positions(account, t.address);
                    if (!p.active) return null;

                    const curr = parseFloat(ethers.formatUnits(await core.getPrice(t.address), 18));
                    const entry = parseFloat(ethers.formatUnits(p.entryPrice, 18));
                    const size = parseFloat(ethers.formatUnits(p.sizeUSD, 18));
                    const diff = p.isLong ? (curr - entry) : (entry - curr);

                    return {
                        symbol: t.symbol, addr: t.address, size: size.toFixed(2),
                        entry: entry.toFixed(2), mark: curr.toFixed(2),
                        pnl: ((diff * size) / entry).toFixed(2),
                        isLong: p.isLong, leverage: (size / parseFloat(ethers.formatUnits(p.margin, 18))).toFixed(1)
                    };
                }))).filter(Boolean);
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
        if (!form.margin || parseFloat(form.margin) <= 0) return;
        setUi({ loading: true, action: isLong ? 'long' : 'short' });
        try {
            const core = new ethers.Contract(CORE_ADDR, CoreABI, signer);
            const futures = new ethers.Contract(FUTURES_ADDR, FuturesABI, signer);
            const usdt = new ethers.Contract(USDT_ADDR, ERC20ABI, signer);

            const margin = ethers.parseUnits(form.margin, 18);
            const protBal = ethers.parseUnits(state.protocolUsdt, 18);

            if (protBal < margin) {
                const needed = margin - protBal;
                const allowance = await usdt.allowance(account, CORE_ADDR);
                if (allowance < needed) {
                    const txApp = await usdt.approve(CORE_ADDR, ethers.MaxUint256);
                    await txApp.wait();
                }
                const txDep = await core.deposit(USDT_ADDR, needed);
                await txDep.wait();
            }

            const txOpen = await futures.openPosition(state.asset.address, margin, form.leverage, isLong);
            await txOpen.wait();

            showToast("Position Opened", "success");
            setForm(p => ({ ...p, margin: '' }));
            fetchAll();
        } catch (e: any) {
            console.error(e);
            showToast(e.reason || "Transaction Failed", "error");
        } finally {
            setUi({ loading: false, action: null });
        }
    };

    const close = async (addr: string) => {
        setUi({ loading: true, action: `close-${addr}` });
        try {
            const futures = new ethers.Contract(FUTURES_ADDR, FuturesABI, signer);
            const tx = await futures.closePosition(addr);
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

    const TradeRow = ({ t }: { t: any }) => {
        // Resolve symbol from address if possible
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

    return (
        <div className="hero-section flex flex-col items-center w-full p-3">
            <div className="w-full flex flex-col lg:flex-row gap-3">

                {/* LEFT COLUMN */}
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

                {/* RIGHT COLUMN */}
                <div className="w-full lg:w-[30%] flex flex-col gap-3">

                    {/* MARKET POSITIONS PANEL */}
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
                            <span className={`text-sm font-bold ${priceNum > 0 ? 'text-green-600' : 'text-gray-800'}`}>{priceNum.toFixed(2)}</span>
                            <ArrowUpRight className="w-4 h-4 text-green-600" />
                        </div>
                    </div>

                    {/* TRADING FORM */}
                    <div className="modern-card p-4 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800">Trade Futures</h2>
                            <div className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 font-mono">${priceNum.toFixed(2)}</div>
                        </div>

                        <div className="relative" ref={dropdownRef}>
                            <button onClick={() => setForm(p => ({ ...p, isOpen: !p.isOpen }))} className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100">
                                <div className="flex items-center gap-2"><img src={state.asset.img} className="w-5 h-5 rounded-full" /> <span className="font-semibold text-sm">{state.asset.symbol} / USDT</span></div>
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                            </button>
                            {form.isOpen && (
                                <ul className="absolute top-full mt-1 w-full bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-48 overflow-y-auto">
                                    {TOKENS.filter(t => t.symbol !== "USDT").map(t => (
                                        <li key={t.symbol} onClick={() => { setState(p => ({ ...p, asset: t })); setForm(p => ({ ...p, isOpen: false })); }} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer gap-2">
                                            <img src={t.img} className="w-5 h-5 rounded-full" /> <span className="text-sm font-medium">{t.symbol}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-[10px] text-gray-500">
                                <span>Margin</span> <span className="cursor-pointer text-blue-600" onClick={() => setForm(p => ({ ...p, margin: state.protocolUsdt }))}>Avail: {parseFloat(state.protocolUsdt).toFixed(2)}</span>
                            </div>
                            <div className="modern-input px-3 py-2 w-full flex items-center border border-gray-200 rounded-lg">
                                <input type="number" value={form.margin} onChange={(e) => setForm(p => ({ ...p, margin: e.target.value }))} placeholder="0.00" className="flex-1 bg-transparent text-sm outline-none" />
                                <span className="text-xs font-bold text-gray-400">USDT</span>
                            </div>
                            <div className="flex gap-1 mt-1">{[25, 50, 75, 100].map(pct => (<button key={pct} onClick={() => setForm(p => ({ ...p, margin: ((parseFloat(state.protocolUsdt) * pct) / 100).toFixed(2) }))} className="flex-1 py-1 rounded bg-gray-50 hover:bg-gray-100 text-[10px] transition">{pct}%</button>))}</div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between text-xs"><span className="text-gray-500">Leverage</span><span className="font-bold text-blue-600">{form.leverage}x</span></div>
                            <input type="range" min="1" max="50" step="1" value={form.leverage} onChange={(e) => setForm(p => ({ ...p, leverage: Number(e.target.value) }))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                            <div className="flex justify-between text-[10px] text-gray-400"><span>1x</span><span>25x</span><span>50x</span></div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 flex flex-col gap-1">
                            <div className="flex justify-between text-[10px] text-gray-500"><span>Size</span> <span className="font-semibold text-gray-800">${(parseFloat(form.margin || "0") * form.leverage).toFixed(2)}</span></div>
                            <div className="flex justify-between text-[10px] text-gray-500"><span>Fee</span> <span className="font-semibold text-gray-800">~${(parseFloat(form.margin || "0") * form.leverage * 0.001).toFixed(2)}</span></div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-1">
                            <button onClick={() => execute(true)} disabled={ui.loading || !form.margin} className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white transition ${ui.loading ? 'bg-green-300' : 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-100'}`}>
                                {ui.loading && ui.action === 'long' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />} Long
                            </button>
                            <button onClick={() => execute(false)} disabled={ui.loading || !form.margin} className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white transition ${ui.loading ? 'bg-red-300' : 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-100'}`}>
                                {ui.loading && ui.action === 'short' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownRight className="w-4 h-4" />} Short
                            </button>
                        </div>
                        {parseFloat(form.margin || "0") > parseFloat(state.protocolUsdt) && <div className="text-[10px] text-orange-600 bg-orange-50 p-2 rounded text-center">Auto-deposit from wallet ({parseFloat(state.walletUsdt).toFixed(2)} Avail)</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Futures;