import { useCallback, useEffect, useRef, useState } from 'react';
import TradingDashboard from '../../components/TradingDashboard';
import { ChevronDown, Loader2 } from 'lucide-react';
import ExecutorABI from "../../ABI/ABI.json";
import { ethers } from 'ethers';
import { useWallet } from '../../contexts/WalletContext';
import { TOKENS } from '../../utils/SwapTokens';
import { useToast } from '../../components/Toast';
import { useOrder } from '../../hooks/useOrder';

const EXECUTOR_ADDR = "0xCcEfbE2B520068Ab9bFcD3AF8E47E710eF579f86";
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];
const GLOBAL_ORDERS_CACHE = new Map<number, any>();
const GLOBAL_DECIMALS_CACHE: Record<string, number> = {};

const Limit = () => {
    const { createOrder, cancelOrder, currentRate, fetchLastOrderPriceForPair } = useOrder();
    const { account, provider } = useWallet();
    const { showToast } = useToast();

    const [market, setMarket] = useState({
        from: { ...TOKENS[1], balance: 0 },
        to: { ...TOKENS[0], balance: 0 },
        protocolBal: { from: "0.0000", to: "0.0000" }
    });

    const [form, setForm] = useState({
        amount: '', price: '', total: '', expiry: 1,
        isDropdownOpen: false
    });

    const [ui, setUi] = useState({
        tab: "open" as "open" | "history",
        loadingOrders: false,
        loadingRate: false,
        creating: null as 'buy' | 'sell' | null
    });

    const [orderList, setOrderList] = useState({ user: [] as any[], general: [] as any[], history: [] as any[] });

    const fetchReq = useRef(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const getTokenBalance = useCallback(async (tokenAddress: string) => {
        if (!account || !provider) return "0";
        try {
            const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
            const bal = await contract.balanceOf(account);
            const dec = await contract.decimals();
            return ethers.formatUnits(bal, dec);
        } catch { return "0"; }
    }, [account, provider]);

    const fetchBalances = useCallback(async () => {
        if (!account || !provider) return;
        try {
            const executor = new ethers.Contract(EXECUTOR_ADDR, ExecutorABI, provider);

            const [wFrom, wTo, pFrom, pTo] = await Promise.all([
                getTokenBalance(market.from.address),
                getTokenBalance(market.to.address),
                executor.getUserAccountData(account, market.from.address).catch(() => ({ tokenCollateralBalance: 0n })),
                executor.getUserAccountData(account, market.to.address).catch(() => ({ tokenCollateralBalance: 0n }))
            ]);

            setMarket(prev => ({
                ...prev,
                from: { ...prev.from, balance: parseFloat(wFrom) },
                to: { ...prev.to, balance: parseFloat(wTo) },
                protocolBal: {
                    from: ethers.formatUnits(pFrom.tokenCollateralBalance || 0n, 18),
                    to: ethers.formatUnits(pTo.tokenCollateralBalance || 0n, 18)
                }
            }));
        } catch (e) { console.error("Balance fetch err", e); }
    }, [account, provider, market.from.address, market.to.address, getTokenBalance]);

    const refreshOrders = useCallback(async (requestId: number) => {
        if (!provider || fetchReq.current !== requestId) return;

        try {
            const executor = new ethers.Contract(EXECUTOR_ADDR, ExecutorABI, provider);
            const nextId = Number(await executor.nextOrderId());
            if (nextId <= 1) { setUi(p => ({ ...p, loadingOrders: false })); return; }

            // 1. Determine IDs to fetch (New + Active Cached)
            const now = Math.floor(Date.now() / 1000);
            const activeIds = Array.from(GLOBAL_ORDERS_CACHE.values())
                .filter(o => !o.filled && !o.cancelled && o.expiry > now)
                .map(o => o.id);

            const newIds = [];
            for (let i = nextId - 1; i >= 1; i--) {
                if (!GLOBAL_ORDERS_CACHE.has(i)) newIds.push(i);
            }

            const idsToFetch = [...new Set([...activeIds, ...newIds])].sort((a, b) => b - a);

            // 2. Batch Fetch
            const chunkSize = 25;
            for (let i = 0; i < idsToFetch.length; i += chunkSize) {
                if (fetchReq.current !== requestId) return;
                const batch = idsToFetch.slice(i, i + chunkSize);
                const results = await Promise.all(batch.map(id => executor.orders(id).then((o: any) => ({ id, o })).catch(() => null)));

                // 3. Cache Decimals & Process
                for (const res of results) {
                    if (!res?.o?.maker) continue;
                    const tIn = res.o.tokenIn.toLowerCase();

                    if (GLOBAL_DECIMALS_CACHE[tIn] === undefined) {
                        try {
                            const c = new ethers.Contract(tIn, ["function decimals() view returns (uint8)"], provider);
                            GLOBAL_DECIMALS_CACHE[tIn] = Number(await c.decimals());
                        } catch { GLOBAL_DECIMALS_CACHE[tIn] = 18; }
                    }

                    GLOBAL_ORDERS_CACHE.set(res.id, {
                        id: res.id,
                        maker: res.o.maker,
                        tokenIn: tIn,
                        tokenOut: res.o.tokenOut.toLowerCase(),
                        amountIn: ethers.formatUnits(res.o.amountIn, GLOBAL_DECIMALS_CACHE[tIn]),
                        originalAmountIn: ethers.formatUnits(res.o.amountOutMin, GLOBAL_DECIMALS_CACHE[tIn]), // Simplified mapping
                        targetPrice: ethers.formatUnits(res.o.targetPrice1e18 || 0, 18),
                        expiry: Number(res.o.expiry),
                        filled: res.o.filled,
                        cancelled: res.o.cancelled,
                        orderType: Number(res.o.orderType)
                    });
                }
            }

            // 4. Filter for UI
            const fAddr = market.from.address.toLowerCase();
            const tAddr = market.to.address.toLowerCase();
            const user: any[] = [], general: any[] = [], history: any[] = [];

            GLOBAL_ORDERS_CACHE.forEach(o => {
                const isPair = (o.tokenIn === fAddr && o.tokenOut === tAddr) || (o.tokenIn === tAddr && o.tokenOut === fAddr);
                if (!isPair) return;

                const isExpired = o.expiry < now;
                const isActive = !o.filled && !o.cancelled && !isExpired;

                if (isActive) {
                    general.push(o);
                    if (account && o.maker.toLowerCase() === account.toLowerCase()) user.push(o);
                } else {
                    history.push({ ...o, expired: isExpired });
                }
            });

            const sorter = (a: any, b: any) => b.id - a.id;
            setOrderList({ user: user.sort(sorter), general: general.sort(sorter), history: history.sort(sorter) });
            setUi(p => ({ ...p, loadingOrders: false }));

        } catch (e) { console.error(e); setUi(p => ({ ...p, loadingOrders: false })); }
    }, [provider, account, market.from.address, market.to.address]);

    // --- Effects ---

    // 1. Initial Load & Rate
    useEffect(() => {
        fetchReq.current += 1;
        const reqId = fetchReq.current;
        setUi(p => ({ ...p, loadingOrders: true, loadingRate: true }));
        setOrderList({ user: [], general: [], history: [] });

        fetchLastOrderPriceForPair({ tokenIn: market.from.address, tokenOut: market.to.address })
            .finally(() => setUi(p => ({ ...p, loadingRate: false })));

        refreshOrders(reqId);
        fetchBalances();

        const interval = setInterval(() => refreshOrders(reqId), 10000);
        return () => clearInterval(interval);
    }, [market.from.address, market.to.address, account, provider]); // eslint-disable-line

    useEffect(() => {
        if (currentRate && !form.price) setForm(p => ({ ...p, price: Number(currentRate).toFixed(4) }));
    }, [currentRate]);

    useEffect(() => {
        const handler = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setForm(p => ({ ...p, isDropdownOpen: false })); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [orderList.general]);

    const updateInput = (field: 'amount' | 'price', val: string) => {
        const newState = { ...form, [field]: val };
        const numAmt = parseFloat(newState.amount);
        const numPri = parseFloat(newState.price);
        const total = (numAmt > 0 && numPri > 0) ? (numAmt * numPri).toString() : '';
        setForm({ ...newState, total });
    };

    const handleCreate = async (isBuy: boolean) => {
        if (ui.creating) return;
        const price = Number(form.price);
        const amt = Number(form.amount);
        if (!price || !amt || price <= 0 || amt <= 0) return alert("Invalid inputs");

        setUi(p => ({ ...p, creating: isBuy ? 'buy' : 'sell' }));
        try {
            const clean = (v: number) => Number(v.toFixed(18)).toString();
            const amtIn = isBuy ? (price * amt) : amt;
            const amtOutMin = isBuy ? amt : (price * amt);

            await createOrder({
                tokenIn: isBuy ? market.to.address : market.from.address,
                tokenOut: isBuy ? market.from.address : market.to.address,
                amountIn: clean(amtIn),
                amountOutMin: clean(amtOutMin),
                targetPrice: form.price,
                ttlSeconds: form.expiry * 86400,
                ordertype: isBuy ? 0 : 1,
            });

            showToast(`${isBuy ? 'Buy' : 'Sell'} order created!`, "success");
            setForm(p => ({ ...p, amount: '', total: '' })); // Reset amounts
            refreshOrders(fetchReq.current);
            fetchBalances();
        } catch (e: any) {
            console.error(e);
            showToast(e.message?.includes("rejected") ? "Rejected by user" : "Failed", "error");
        } finally {
            setUi(p => ({ ...p, creating: null }));
        }
    };

    const handleCancel = async (orderId: number) => {
        await cancelOrder({ orderId });
        const o = GLOBAL_ORDERS_CACHE.get(orderId);
        if (o) GLOBAL_ORDERS_CACHE.set(orderId, { ...o, cancelled: true });
        refreshOrders(fetchReq.current);
    };

    const OrderRow = ({ o, isHistory = false }: { o: any, isHistory?: boolean }) => {
        const isSell = o.orderType === 1;
        const p = parseFloat(o.targetPrice || "0");
        const a = parseFloat(isHistory ? (o.originalAmountIn || o.amountIn) : (isSell ? o.amountIn : o.originalAmountIn) || "0");
        const total = (p * a).toFixed(2);

        return (
            <div className={`grid grid-cols-7 text-xs py-2 px-3 border-b border-gray-100 hover:bg-gray-50 transition ${isHistory && (isSell ? 'text-red-600' : 'text-green-600')}`}>
                <span className="text-left font-medium">#{o.id}</span>
                <span className="text-center cursor-pointer" onClick={() => !isHistory && updateInput('price', p.toString())}>{p.toFixed(6)}</span>
                <span className="text-center cursor-pointer" onClick={() => !isHistory && updateInput('amount', a.toString())}>{a.toFixed(4)}</span>
                <span className="text-center">{total}</span>
                <span className="text-center">{new Date(o.expiry * 1000).toLocaleDateString(undefined, { month: "short", day: "2-digit" })}</span>
                <span className={`text-center font-semibold ${isSell ? "text-red-600" : "text-green-600"}`}>{isSell ? "SELL" : "BUY"}</span>
                <div className="flex justify-center">
                    {!isHistory && <button onClick={() => handleCancel(o.id)} className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-600">Cancel</button>}
                </div>
            </div>
        );
    };

    return (
        <div>
            <div className="hero-section flex flex-col items-center w-full p-3">
                <div className="w-full flex flex-col lg:flex-row gap-3">
                    {/* LEFT COLUMN: Chart & User Orders */}
                    <div className="w-full lg:w-[70%] flex flex-col gap-3">
                        <div className="w-full">
                            <TradingDashboard fullScreen showOrders={false} pair={market.from.symbol === "MATIC" ? "POLUSDT" : `${market.from.symbol}${market.to.symbol}`} />
                        </div>

                        <div className="modern-card p-6 flex flex-col h-[250px]">
                            <h2 className="text-xl font-semibold text-[#111] mb-4">Active Orders</h2>
                            <div className="w-full border border-[#E5E5E5] rounded-lg overflow-hidden flex flex-col flex-1 relative">
                                <div className="grid grid-cols-7 bg-[#F3F4F6] text-xs font-semibold text-gray-700 py-2 px-3 border-b border-[#E5E5E5]">
                                    {['Order #', 'Price', 'Amount', 'Total', 'Expiry', 'Type', 'Action'].map(h => <span key={h} className={h === 'Order #' ? 'text-left' : 'text-center'}>{h}</span>)}
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {orderList.user.length === 0 ? <div className="flex justify-center items-center h-full text-sm text-gray-500">No Open Orders</div> : orderList.user.map(o => <OrderRow key={o.id} o={o} />)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Order Book & Form */}
                    <div className="w-full lg:w-[30%] flex flex-col gap-3">
                        <div className="modern-card flex flex-col h-[400px]">
                            <div className="p-3 flex flex-col h-full">
                                {/* Tab Switcher */}
                                <div className="bg-[#F8F8F8] border border-[#E5E5E5] rounded px-1 py-1 text-xs flex mb-2">
                                    {['open', 'history'].map(t => (
                                        <button key={t} onClick={() => setUi(p => ({ ...p, tab: t as any }))} className={`flex-1 py-1 rounded capitalize transition ${ui.tab === t ? "bg-white text-[#111] shadow-sm font-semibold" : "text-[#888]"}`}>{t}</button>
                                    ))}
                                </div>

                                <div className="bg-[#F8F8F8] border border-[#E5E5E5] rounded-md flex flex-col h-full overflow-hidden relative">
                                    <div className="px-3 py-2 flex justify-between text-gray-600 font-semibold text-xs border-b border-gray-300">
                                        <span>Price</span> <span>Amount</span> <span>Total</span>
                                    </div>

                                    {ui.loadingOrders && ui.tab === 'open' && orderList.general.length === 0 && <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20"><Loader2 className="animate-spin text-blue-500" /></div>}

                                    {ui.tab === 'open' ? (
                                        <div className="flex flex-col text-xs font-medium h-full relative">
                                            {/* Sells (Red) */}
                                            <div ref={scrollRef} className="flex-1 overflow-y-scroll scrollbar-hide">
                                                {orderList.general.filter(o => o.orderType === 1).sort((a, b) => parseFloat(b.targetPrice) - parseFloat(a.targetPrice)).map(o => (
                                                    <div key={o.id} onClick={() => { updateInput('price', o.targetPrice); updateInput('amount', o.amountIn); }} className="px-3 py-1 flex justify-between text-red-600 hover:bg-red-50 cursor-pointer">
                                                        <span className="flex-1 text-left">{parseFloat(o.targetPrice).toFixed(5)}</span>
                                                        <span className="flex-1 text-center">{parseFloat(o.amountIn).toFixed(4)}</span>
                                                        <span className="flex-1 text-right">{(parseFloat(o.targetPrice) * parseFloat(o.amountIn)).toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Current Rate */}
                                            <div onClick={() => currentRate && updateInput('price', parseFloat(currentRate).toFixed(6))} className="px-3 py-2 flex justify-center border-y border-gray-300 text-sm font-semibold text-blue-600 bg-white cursor-pointer sticky z-10">
                                                {currentRate ? <>{parseFloat(currentRate).toFixed(6)} <span className="text-gray-400 text-xs ml-1">{market.to.symbol}</span></> : <Loader2 className="w-3 h-3 animate-spin" />}
                                            </div>
                                            {/* Buys (Green) */}
                                            <div className="flex-1 overflow-y-scroll scrollbar-hide">
                                                {orderList.general.filter(o => o.orderType === 0).sort((a, b) => parseFloat(b.targetPrice) - parseFloat(a.targetPrice)).map(o => (
                                                    <div key={o.id} onClick={() => { updateInput('price', o.targetPrice); updateInput('amount', o.originalAmountIn); }} className="px-3 py-1 flex justify-between text-green-600 hover:bg-green-50 cursor-pointer">
                                                        <span className="flex-1 text-left">{parseFloat(o.targetPrice).toFixed(5)}</span>
                                                        <span className="flex-1 text-center">{parseFloat(o.originalAmountIn).toFixed(4)}</span>
                                                        <span className="flex-1 text-right">{(parseFloat(o.targetPrice) * parseFloat(o.originalAmountIn)).toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 overflow-y-scroll text-xs">
                                            {orderList.history.length === 0 ? <div className="flex justify-center items-center h-full text-gray-500">No History</div> : orderList.history.map(o => <OrderRow key={o.id} o={o} isHistory />)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* CREATE ORDER FORM */}
                        <div className="modern-card p-3 flex flex-col gap-3 text-xs rounded-xl border border-gray-200 bg-white">
                            <h2 className="text-sm font-semibold text-gray-800">Create Order</h2>
                            <div className="relative group">
                                <div className="modern-input px-2 py-1.5 w-full flex items-center gap-2 border border-gray-200 rounded-md">
                                    <input type="number" value={form.amount} onChange={(e) => updateInput('amount', e.target.value)} placeholder="0.0" className="flex-1 bg-transparent text-sm outline-none" />
                                    <div className="relative" ref={dropdownRef}>
                                        <button onClick={() => setForm(p => ({ ...p, isDropdownOpen: !p.isDropdownOpen }))} className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-gray-100">
                                            <img src={market.from.img} alt="" className="w-4 h-4 rounded-full" /> <span>{market.from.symbol}</span> <ChevronDown className="w-3 h-3" />
                                        </button>
                                        {form.isDropdownOpen && (
                                            <ul className="absolute right-0 mt-1 w-40 max-h-40 overflow-y-auto bg-white rounded-md shadow-lg z-50 border border-gray-200">
                                                {TOKENS.filter(t => t.symbol !== market.to.symbol).map(t => (
                                                    <li key={t.symbol} onClick={() => { setMarket(p => ({ ...p, from: { ...t, balance: 0 } })); setForm(p => ({ ...p, isDropdownOpen: false })); }} className="flex items-center px-2 py-1 hover:bg-gray-50 cursor-pointer">
                                                        <img src={t.img} className="w-4 h-4 mr-2 rounded-full" alt="" /> {t.symbol}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-between mt-1 text-[10px] text-gray-500">
                                    <div className="flex gap-1">Protocol: <span className="font-bold text-blue-600 cursor-pointer" onClick={() => updateInput('amount', market.protocolBal.from)}>{market.protocolBal.from} {market.from.symbol}</span></div>
                                    <div>Wallet: <span className="font-medium text-gray-700">{market.from.balance.toFixed(3)}</span></div>
                                </div>
                                <div className="flex justify-between mt-2 gap-1">
                                    {[25, 50, 75, 100].map(pct => (
                                        <button key={pct} onClick={() => updateInput('amount', ((market.from.balance * pct) / 100).toFixed(6))} className="flex-1 py-1 rounded-md bg-gray-100 hover:bg-blue-600 hover:text-white transition">{pct === 100 ? "MAX" : `${pct}%`}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="text-[10px] text-gray-500 text-right">Wallet Bal ({market.to.symbol}): <span className="font-bold text-blue-600">{market.to.balance.toFixed(3)}</span></div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col">
                                    <span className="text-gray-500">Target Price</span>
                                    <input type="number" value={form.price} onChange={(e) => updateInput('price', e.target.value)} className="border rounded px-2 py-1 text-center font-medium text-xs" />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[11px] text-gray-500">Expiry (Days)</label>
                                    <input type="number" max="30" value={form.expiry} onChange={(e) => setForm(p => ({ ...p, expiry: Number(e.target.value) }))} className="border rounded px-2 py-1 text-center bg-gray-50" />
                                </div>
                            </div>

                            <div className="flex gap-2 mt-1">
                                <button onClick={() => handleCreate(true)} disabled={ui.creating === 'buy' || !form.total} className={`flex-1 py-1.5 rounded text-white transition ${ui.creating === 'buy' ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700'}`}>{ui.creating === 'buy' ? '...' : `Buy ${market.from.symbol}`}</button>
                                <button onClick={() => handleCreate(false)} disabled={ui.creating === 'sell' || !form.total} className={`flex-1 py-1.5 rounded text-white transition ${ui.creating === 'sell' ? 'bg-red-400' : 'bg-red-600 hover:bg-red-700'}`}>{ui.creating === 'sell' ? '...' : `Sell ${market.from.symbol}`}</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Limit;