import { useCallback, useEffect, useRef, useState } from 'react';
import TradingDashboard from '../../components/TradingDashboard';
import { ChevronDown, Loader2 } from 'lucide-react';
import { ethers } from 'ethers';
import { useWallet } from '../../contexts/WalletContext';
import { TOKENS } from '../../utils/SwapTokens';
import { useToast } from '../../components/Toast';
import { useOrder } from '../../hooks/useOrder';

const CORE_ADDR = "0xfad47c95A4Fa7f923Cb9d295f5a35F17A1927A86";

// Updated ABI with 'expiry'
const CORE_ABI = [
    "function orders(uint256) view returns (uint256 id, address maker, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, uint256 targetPrice, uint256 expiry, bool filled, bool cancelled, bool isBuy)",
    "function nextOrderId() view returns (uint256)",
    "function getUserBalance(address user, address token) view returns (uint256 collateral, uint256 locked)"
];

const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)"
];

const GLOBAL_ORDERS_CACHE = new Map<number, any>();
const GLOBAL_DECIMALS_CACHE: Record<string, number> = {};

const Limit = () => {
    const { createOrder, cancelOrder, currentRate, fetchLastOrderPriceForPair } = useOrder();
    const { account, provider } = useWallet();
    const { showToast } = useToast();

    const [market, setMarket] = useState({
        from: { ...TOKENS[1], wallet: "0", protocol: "0" },
        to: { ...TOKENS[0], wallet: "0", protocol: "0" }
    });

    const [form, setForm] = useState({
        amount: '', price: '', total: '', expiry: 1,
        isDropdownOpen: false
    });

    const [ui, setUi] = useState({
        tab: "open" as "open" | "history",
        loadingOrders: false,
        creating: null as 'buy' | 'sell' | null
    });

    const [orderList, setOrderList] = useState({ user: [] as any[], general: [] as any[], history: [] as any[] });

    const fetchReq = useRef(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchBalances = useCallback(async () => {
        if (!account || !provider) return;
        try {
            const core = new ethers.Contract(CORE_ADDR, CORE_ABI, provider);
            const fromToken = new ethers.Contract(market.from.address, ERC20_ABI, provider);
            const toToken = new ethers.Contract(market.to.address, ERC20_ABI, provider);

            const [wFrom, wTo, pFrom, pTo] = await Promise.all([
                fromToken.balanceOf(account),
                toToken.balanceOf(account),
                core.getUserBalance(account, market.from.address),
                core.getUserBalance(account, market.to.address)
            ]);

            setMarket(prev => ({
                from: {
                    ...prev.from,
                    wallet: ethers.formatUnits(wFrom, 18),
                    protocol: ethers.formatUnits(pFrom[0], 18)
                },
                to: {
                    ...prev.to,
                    wallet: ethers.formatUnits(wTo, 18),
                    protocol: ethers.formatUnits(pTo[0], 18)
                }
            }));
        } catch (e) { console.error(e); }
    }, [account, provider, market.from.address, market.to.address]);

    const refreshOrders = useCallback(async (requestId: number) => {
        if (!provider || fetchReq.current !== requestId) return;

        try {
            const core = new ethers.Contract(CORE_ADDR, CORE_ABI, provider);
            const nextId = Number(await core.nextOrderId());

            if (nextId <= 1) {
                setUi(p => ({ ...p, loadingOrders: false }));
                return;
            }

            // Fetch last 50 orders (Active + History)
            const idsToFetch = [];
            const startId = Math.max(1, nextId - 50);
            for (let i = nextId - 1; i >= startId; i--) {
                idsToFetch.push(i);
            }

            await Promise.all(idsToFetch.map(async (id) => {
                try {
                    // Only fetch if not cached or if cached as active (state might change)
                    if (!GLOBAL_ORDERS_CACHE.has(id) || !GLOBAL_ORDERS_CACHE.get(id).isFinal) {
                        const o = await core.orders(id);
                        if (o.maker === ethers.ZeroAddress) return;

                        const tIn = o.tokenIn.toLowerCase();
                        if (!GLOBAL_DECIMALS_CACHE[tIn]) GLOBAL_DECIMALS_CACHE[tIn] = 18;

                        // Parse State
                        const isFilled = o.filled;
                        const isCancelled = o.cancelled;
                        const isBuy = o.isBuy;
                        const priceVal = parseFloat(ethers.formatUnits(o.targetPrice || 0, 18));

                        // --- AMOUNT LOGIC ---
                        const rawAmountIn = parseFloat(ethers.formatUnits(o.amountIn, 18));
                        const rawAmountOutMin = parseFloat(ethers.formatUnits(o.amountOutMin, 18));

                        // Active Display Amount (Remaining)
                        let displayAmount = 0;
                        if (!isFilled && !isCancelled) {
                            if (isBuy) displayAmount = rawAmountIn / priceVal; // Buy: USDT / Price = Asset
                            else displayAmount = rawAmountIn; // Sell: Asset = Asset
                        }

                        // History Display Amount (Original Size)
                        let originalSize = 0;
                        if (isBuy) originalSize = rawAmountOutMin; // Buy: amountOutMin is original Asset requested
                        else originalSize = rawAmountOutMin / priceVal; // Sell: amountOutMin is USDT requested / price = Asset

                        GLOBAL_ORDERS_CACHE.set(id, {
                            id: Number(o.id),
                            maker: o.maker,
                            tokenIn: tIn,
                            tokenOut: o.tokenOut.toLowerCase(),
                            amountDisplay: displayAmount, // Dynamic Remaining
                            originalSize: originalSize,   // Static Original
                            targetPrice: priceVal,
                            expiry: Number(o.expiry),
                            filled: isFilled,
                            cancelled: isCancelled,
                            isBuy: isBuy,
                            orderType: isBuy ? 0 : 1,
                            isFinal: isFilled || isCancelled // Mark final so we don't re-fetch history
                        });
                    }
                } catch { }
            }));

            // Filter for UI
            const fAddr = market.from.address.toLowerCase();
            const tAddr = market.to.address.toLowerCase();
            const userOrders: any[] = [], generalOrders: any[] = [], historyOrders: any[] = [];

            GLOBAL_ORDERS_CACHE.forEach(o => {
                // Pair Check
                const isPair = (o.tokenIn === fAddr && o.tokenOut === tAddr) || (o.tokenIn === tAddr && o.tokenOut === fAddr);
                if (!isPair) return;

                const isActive = !o.filled && !o.cancelled;

                if (isActive) {
                    // Only show if dust > 0.0001
                    if (o.amountDisplay > 0.0001) {
                        generalOrders.push(o);
                        if (account && o.maker.toLowerCase() === account.toLowerCase()) userOrders.push(o);
                    }
                } else {
                    if (account && o.maker.toLowerCase() === account.toLowerCase()) historyOrders.push(o);
                }
            });

            const sorter = (a: any, b: any) => b.id - a.id;
            setOrderList({
                user: userOrders.sort(sorter),
                general: generalOrders.sort(sorter),
                history: historyOrders.sort(sorter)
            });
            setUi(p => ({ ...p, loadingOrders: false }));

        } catch (e) { setUi(p => ({ ...p, loadingOrders: false })); }
    }, [provider, account, market.from.address, market.to.address]);

    useEffect(() => {
        fetchReq.current += 1;
        const reqId = fetchReq.current;
        setUi(p => ({ ...p, loadingOrders: true }));
        setOrderList({ user: [], general: [], history: [] });

        fetchLastOrderPriceForPair({ tokenIn: market.from.address, tokenOut: market.to.address });
        refreshOrders(reqId);
        fetchBalances();

        const interval = setInterval(() => { refreshOrders(reqId); fetchBalances(); }, 5000);
        return () => clearInterval(interval);
    }, [market.from.address, market.to.address, account, provider]);

    useEffect(() => {
        if (currentRate && !form.price) setForm(p => ({ ...p, price: Number(currentRate).toFixed(4) }));
    }, [currentRate]);

    useEffect(() => {
        const handler = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setForm(p => ({ ...p, isDropdownOpen: false })); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

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
            // Contract expects: AmountIn, AmountOutMin
            // Buy: Input USDT (Price * Amt). Output Asset (Amt).
            // Sell: Input Asset (Amt). Output USDT (Price * Amt).
            const amtIn = isBuy ? (price * amt) : amt;
            const amtOutMin = isBuy ? amt : (price * amt);

            await createOrder({
                tokenIn: isBuy ? market.to.address : market.from.address,
                tokenOut: isBuy ? market.from.address : market.to.address,
                amountIn: clean(amtIn),
                amountOutMin: clean(amtOutMin),
                targetPrice: form.price,
                ttlSeconds: form.expiry * 86400,
                ordertype: isBuy ? 0 : 1
            });

            showToast(`${isBuy ? 'Buy' : 'Sell'} order created!`, "success");
            setForm(p => ({ ...p, amount: '', total: '' }));
            refreshOrders(fetchReq.current);
            fetchBalances();
        } catch (e: any) {
            console.error(e);
            showToast(e.message || "Failed", "error");
        } finally {
            setUi(p => ({ ...p, creating: null }));
        }
    };

    const handleCancel = async (orderId: number) => {
        try {
            await cancelOrder({ orderId });
            const o = GLOBAL_ORDERS_CACHE.get(orderId);
            if (o) {
                o.cancelled = true;
                o.isFinal = true;
                GLOBAL_ORDERS_CACHE.set(orderId, o);
            }
            refreshOrders(fetchReq.current);
            showToast("Order cancelled", "success");
        } catch (e) {
            showToast("Cancel failed", "error");
        }
    };

    const OrderRowHistory = ({ o }: { o: any }) => {
        const isSell = o.orderType === 1;
        const p = o.targetPrice;
        // For history, show original requested size
        const a = o.originalSize;
        const status = o.cancelled ? "Cancelled" : "Filled";

        return (
            <div className={`flex items-center text-xs py-2 px-3 border-b border-gray-100 hover:bg-gray-50 transition ${isSell ? 'text-red-600' : 'text-green-600'}`}>
                <span className="w-12 text-left font-medium">#{o.id}</span>
                <span className="flex-1 text-center">{p.toFixed(5)}</span>
                <span className="flex-1 text-center">{a.toFixed(4)}</span>
                <span className="flex-1 text-right">{status}</span>
            </div>
        );
    };

    return (
        <div>
            <div className="hero-section flex flex-col items-center w-full p-3">
                <div className="w-full flex flex-col lg:flex-row gap-3">
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
                                    {orderList.user.length === 0 ? <div className="flex justify-center items-center h-full text-sm text-gray-500">No Open Orders</div> : orderList.user.map(o => {
                                        const isSell = o.orderType === 1;
                                        const p = o.targetPrice;
                                        const a = o.amountDisplay; // Remaining Amount
                                        return (
                                            <div key={o.id} className="grid grid-cols-7 text-xs py-2 px-3 border-b border-gray-100 hover:bg-gray-50 transition">
                                                <span className="text-left font-medium">#{o.id}</span>
                                                <span className="text-center cursor-pointer" onClick={() => updateInput('price', p.toString())}>{p.toFixed(6)}</span>
                                                <span className="text-center cursor-pointer" onClick={() => updateInput('amount', a.toString())}>{a.toFixed(4)}</span>
                                                <span className="text-center">{(p * a).toFixed(2)}</span>
                                                <span className="text-center">{o.expiry ? new Date(o.expiry * 1000).toLocaleDateString(undefined, { month: "short", day: "2-digit" }) : "-"}</span>
                                                <span className={`text-center font-semibold ${isSell ? "text-red-600" : "text-green-600"}`}>{isSell ? "SELL" : "BUY"}</span>
                                                <div className="flex justify-center">
                                                    <button onClick={(e) => { e.stopPropagation(); handleCancel(o.id); }} className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-600 hover:bg-red-200 cursor-pointer pointer-events-auto z-10">Cancel</button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="w-full lg:w-[30%] flex flex-col gap-3">
                        <div className="modern-card flex flex-col h-[400px]">
                            <div className="p-3 flex flex-col h-full">
                                <div className="bg-[#F8F8F8] border border-[#E5E5E5] rounded px-1 py-1 text-xs flex mb-2">
                                    {['open', 'history'].map(t => (
                                        <button key={t} onClick={() => setUi(p => ({ ...p, tab: t as any }))} className={`flex-1 py-1 rounded capitalize transition ${ui.tab === t ? "bg-white text-[#111] shadow-sm font-semibold" : "text-[#888]"}`}>{t}</button>
                                    ))}
                                </div>

                                <div className="bg-[#F8F8F8] border border-[#E5E5E5] rounded-md flex flex-col h-full overflow-hidden relative">
                                    <div className="px-3 py-2 flex items-center justify-between text-gray-600 font-semibold text-xs border-b border-gray-300">
                                        {ui.tab === 'open' ? (
                                            <>
                                                <span className="flex-1 text-left">Price</span>
                                                <span className="flex-1 text-center">Amount</span>
                                                <span className="flex-1 text-right">Total</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="w-12 text-left">ID</span>
                                                <span className="flex-1 text-center">Price</span>
                                                <span className="flex-1 text-center">Size</span>
                                                <span className="flex-1 text-right">Status</span>
                                            </>
                                        )}
                                    </div>

                                    {ui.loadingOrders && ui.tab === 'open' && orderList.general.length === 0 && <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20"><Loader2 className="animate-spin text-blue-500" /></div>}

                                    {ui.tab === 'open' ? (
                                        <div className="flex flex-col text-xs font-medium h-full relative">
                                            <div ref={scrollRef} className="flex-1 overflow-y-scroll scrollbar-hide">
                                                {orderList.general.filter(o => o.orderType === 1).sort((a, b) => b.targetPrice - a.targetPrice).map(o => (
                                                    <div key={o.id} onClick={() => { updateInput('price', o.targetPrice.toString()); updateInput('amount', o.amountDisplay.toString()); }} className="px-3 py-1 flex justify-between text-red-600 hover:bg-red-50 cursor-pointer">
                                                        <span className="flex-1 text-left">{o.targetPrice.toFixed(5)}</span>
                                                        <span className="flex-1 text-center">{o.amountDisplay.toFixed(4)}</span>
                                                        <span className="flex-1 text-right">{(o.targetPrice * o.amountDisplay).toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div onClick={() => currentRate && updateInput('price', parseFloat(currentRate).toFixed(6))} className="px-3 py-2 flex justify-center border-y border-gray-300 text-sm font-semibold text-blue-600 bg-white cursor-pointer sticky z-10">
                                                {currentRate ? <>{parseFloat(currentRate).toFixed(6)} <span className="text-gray-400 text-xs ml-1">{market.to.symbol}</span></> : <Loader2 className="w-3 h-3 animate-spin" />}
                                            </div>
                                            <div className="flex-1 overflow-y-scroll scrollbar-hide">
                                                {orderList.general.filter(o => o.orderType === 0).sort((a, b) => b.targetPrice - a.targetPrice).map(o => (
                                                    <div key={o.id} onClick={() => { updateInput('price', o.targetPrice.toString()); updateInput('amount', o.amountDisplay.toString()); }} className="px-3 py-1 flex justify-between text-green-600 hover:bg-green-50 cursor-pointer">
                                                        <span className="flex-1 text-left">{o.targetPrice.toFixed(5)}</span>
                                                        <span className="flex-1 text-center">{o.amountDisplay.toFixed(4)}</span>
                                                        <span className="flex-1 text-right">{(o.targetPrice * o.amountDisplay).toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 overflow-y-scroll text-xs">
                                            {orderList.history.length === 0 ? (
                                                <div className="flex justify-center items-center h-full text-gray-500">No History</div>
                                            ) : (
                                                orderList.history.map(o => <OrderRowHistory key={o.id} o={o} />)
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

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
                                                    <li key={t.symbol} onClick={() => { setMarket(p => ({ ...p, from: { ...t, wallet: "0", protocol: "0" } })); setForm(p => ({ ...p, isDropdownOpen: false })); }} className="flex items-center px-2 py-1 hover:bg-gray-50 cursor-pointer">
                                                        <img src={t.img} className="w-4 h-4 mr-2 rounded-full" alt="" /> {t.symbol}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-between mt-1 text-[10px] text-gray-500">
                                    <span title="In your wallet">Wallet: <span className="font-medium text-gray-700">{parseFloat(market.from.wallet).toFixed(3)}</span></span>
                                    <span className="cursor-pointer hover:text-blue-600" title="Deposited in Exchange Core" onClick={() => updateInput('amount', market.from.protocol)}>
                                        Protocol: <span className="font-bold text-blue-600">{parseFloat(market.from.protocol).toFixed(3)}</span>
                                    </span>
                                </div>

                                <div className="flex justify-between mt-2 gap-1">
                                    {[25, 50, 75, 100].map(pct => (
                                        <button key={pct} onClick={() => {
                                            const bal = parseFloat(market.from.protocol) > 0 ? parseFloat(market.from.protocol) : parseFloat(market.from.wallet);
                                            updateInput('amount', ((bal * pct) / 100).toFixed(6));
                                        }} className="flex-1 py-1 rounded-md bg-gray-100 hover:bg-blue-600 hover:text-white transition">{pct}%</button>
                                    ))}
                                </div>
                            </div>

                            <div className="text-[10px] text-gray-500 text-right">
                                {market.to.symbol} Protocol Bal: <span className="font-bold text-blue-600">{parseFloat(market.to.protocol).toFixed(3)}</span>
                            </div>

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
                                <button onClick={() => handleCreate(true)} disabled={ui.creating === 'buy' || !form.total} className={`flex-1 py-1.5 rounded text-white transition ${ui.creating === 'buy' ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700'}`}>{ui.creating === 'buy' ? 'Processing' : `Buy ${market.from.symbol}`}</button>
                                <button onClick={() => handleCreate(false)} disabled={ui.creating === 'sell' || !form.total} className={`flex-1 py-1.5 rounded text-white transition ${ui.creating === 'sell' ? 'bg-red-400' : 'bg-red-600 hover:bg-red-700'}`}>{ui.creating === 'sell' ? 'Processing' : `Sell ${market.from.symbol}`}</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Limit;