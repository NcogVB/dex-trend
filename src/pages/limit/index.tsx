import { useCallback, useEffect, useRef, useState } from 'react';
import TradingDashboard from '../../components/TradingDashboard';
import { Loader2 } from 'lucide-react';
import { ethers } from 'ethers';
import { useWallet } from '../../contexts/WalletContext';
import { TOKENS } from '../../utils/SwapTokens';
import { useToast } from '../../components/Toast';
import { useOrder } from '../../hooks/useOrder';
import TokenSelector from '../../components/TokenSelector';

const CORE_ADDR = "0x8DD59298DF593432A6197CE9A0f5e7F57DF555B2";

const CORE_ABI = [
    "function orders(uint256) view returns (uint256 id, address maker, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, uint256 targetPrice, uint256 expiry, bool filled, bool cancelled, bool isBuy)",
    "function nextOrderId() view returns (uint256)",
    "function getUserBalance(address user, address token) view returns (uint256 collateral, uint256 locked)",
    "event SpotTrade(address indexed tokenIn, address indexed tokenOut, uint256 price, uint256 amount)"
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
        amount: '', price: '', total: '', expiry: 1
    });

    const [ui, setUi] = useState({
        tab: "open" as "open" | "history",
        loadingOrders: false,
        creating: null as 'buy' | 'sell' | null
    });

    const [orderList, setOrderList] = useState({ user: [] as any[], general: [] as any[], history: [] as any[] });

    const fetchReq = useRef(0);
    const scrollRef = useRef<HTMLDivElement>(null);

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

            const idsToFetch = [];
            const startId = Math.max(1, nextId - 50);
            for (let i = nextId - 1; i >= startId; i--) {
                idsToFetch.push(i);
            }

            await Promise.all(idsToFetch.map(async (id) => {
                try {
                    if (!GLOBAL_ORDERS_CACHE.has(id) || !GLOBAL_ORDERS_CACHE.get(id).isFinal) {
                        const o = await core.orders(id);
                        if (o.maker === ethers.ZeroAddress) return;

                        const tIn = o.tokenIn.toLowerCase();
                        if (!GLOBAL_DECIMALS_CACHE[tIn]) GLOBAL_DECIMALS_CACHE[tIn] = 18;

                        const isFilled = o.filled;
                        const isCancelled = o.cancelled;
                        const isBuy = o.isBuy;
                        const rawAmountIn = parseFloat(ethers.formatUnits(o.amountIn, 18));
                        const rawAmountOutMin = parseFloat(ethers.formatUnits(o.amountOutMin, 18));

                        let priceVal = parseFloat(ethers.formatUnits(o.targetPrice || 0, 18));
                        if (priceVal <= 0 && rawAmountIn > 0 && rawAmountOutMin > 0) {
                            if (isBuy) priceVal = rawAmountIn / rawAmountOutMin;
                            else priceVal = rawAmountOutMin / rawAmountIn;
                        }

                        let displayAmount = 0;
                        if (!isFilled && !isCancelled) {
                            if (isBuy) displayAmount = rawAmountIn / priceVal;
                            else displayAmount = rawAmountIn;
                        }

                        let originalSize = 0;
                        if (isBuy) originalSize = rawAmountOutMin;
                        else originalSize = rawAmountOutMin / priceVal;

                        GLOBAL_ORDERS_CACHE.set(id, {
                            id: Number(o.id),
                            maker: o.maker,
                            tokenIn: tIn,
                            tokenOut: o.tokenOut.toLowerCase(),
                            amountDisplay: displayAmount,
                            originalSize: originalSize,
                            targetPrice: priceVal,
                            expiry: Number(o.expiry),
                            filled: isFilled,
                            cancelled: isCancelled,
                            isBuy: isBuy,
                            orderType: isBuy ? 0 : 1,
                            isFinal: isFilled || isCancelled
                        });
                    }
                } catch { }
            }));

            const fAddr = market.from.address.toLowerCase();
            const tAddr = market.to.address.toLowerCase();
            const userOrders: any[] = [], generalOrders: any[] = [], historyOrders: any[] = [];

            GLOBAL_ORDERS_CACHE.forEach(o => {
                const isPair = (o.tokenIn === fAddr && o.tokenOut === tAddr) || (o.tokenIn === tAddr && o.tokenOut === fAddr);
                if (!isPair) return;

                const isActive = !o.filled && !o.cancelled;

                if (isActive) {
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

    // MAIN EFFECT: Fetch Data & Listen for Trades
    useEffect(() => {
        fetchReq.current += 1;
        const reqId = fetchReq.current;
        setUi(p => ({ ...p, loadingOrders: true }));
        setOrderList({ user: [], general: [], history: [] });

        fetchLastOrderPriceForPair({ tokenIn: market.from.address, tokenOut: market.to.address });
        refreshOrders(reqId);
        fetchBalances();

        const interval = setInterval(() => { refreshOrders(reqId); fetchBalances(); }, 5000);

        // EVENT LISTENER: Auto-update when ANY trade happens
        let contractRef: ethers.Contract | null = null;
        if (provider) {
            try {
                contractRef = new ethers.Contract(CORE_ADDR, CORE_ABI, provider);
                contractRef.on("SpotTrade", () => {
                    refreshOrders(reqId);
                    fetchBalances();
                    fetchLastOrderPriceForPair({ tokenIn: market.from.address, tokenOut: market.to.address });
                });
            } catch (e) { console.error("Event error", e); }
        }

        return () => {
            clearInterval(interval);
            if (contractRef) contractRef.removeAllListeners("SpotTrade");
        };
    }, [market.from.address, market.to.address, account, provider]);

    useEffect(() => {
        if (currentRate && !form.price) setForm(p => ({ ...p, price: Number(currentRate).toFixed(4) }));
    }, [currentRate]);


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
                ordertype: isBuy ? 0 : 1
            });

            showToast(`${isBuy ? 'Buy' : 'Sell'} order created!`, "success");
            setForm(p => ({ ...p, amount: '', total: '' }));

            await fetchLastOrderPriceForPair({
                tokenIn: market.from.address,
                tokenOut: market.to.address
            });

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

    // UPDATED: Shows Total instead of Status
    const OrderRowHistory = ({ o }: { o: any }) => {
        const isSell = o.orderType === 1;
        const p = o.targetPrice;
        const a = o.originalSize;
        const total = p * a;

        return (
            <div className={`flex items-center text-xs py-2 px-3 border-b border-gray-100 hover:bg-gray-50 transition ${isSell ? 'text-red-600' : 'text-green-600'}`}>
                <span className="w-12 text-left font-medium">#{o.id}</span>
                <span className="flex-1 text-center">{p.toFixed(5)}</span>
                <span className="flex-1 text-center">{a.toFixed(4)}</span>
                <span className="flex-1 text-right font-medium">{total.toFixed(2)}</span>
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
                                        const a = o.amountDisplay;
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
                                                <span className="flex-1 text-right">Total</span>
                                            </>
                                        )}
                                    </div>

                                    {ui.loadingOrders && ui.tab === 'open' && orderList.general.length === 0 && <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20"><Loader2 className="animate-spin text-blue-500" /></div>}

                                    {ui.tab === 'open' ? (
                                        <div className="flex flex-col text-xs font-medium h-full relative">
                                            <div ref={scrollRef} className="flex-1 overflow-y-scroll scrollbar-hide">
                                                {orderList.general.filter(o => o.orderType === 1).sort((a, b) => b.targetPrice - a.targetPrice).map(o => (
                                                    <div
                                                        key={o.id}
                                                        onClick={() => {
                                                            setForm(prev => ({
                                                                ...prev,
                                                                price: o.targetPrice.toString(),
                                                                amount: o.amountDisplay.toString(),
                                                                total: (o.targetPrice * o.amountDisplay).toString()
                                                            }));
                                                        }}
                                                        className="px-3 py-1 flex justify-between text-red-600 hover:bg-red-50 cursor-pointer"
                                                    >                                                        <span className="flex-1 text-left">{o.targetPrice.toFixed(5)}</span>
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
                                                    <div
                                                        key={o.id}
                                                        onClick={() => {
                                                            setForm(prev => ({
                                                                ...prev,
                                                                price: o.targetPrice.toString(),
                                                                amount: o.amountDisplay.toString(),
                                                                total: (o.targetPrice * o.amountDisplay).toString()
                                                            }));
                                                        }}
                                                        className="px-3 py-1 flex justify-between text-green-600 hover:bg-green-50 cursor-pointer"
                                                    >                                                        <span className="flex-1 text-left">{o.targetPrice.toFixed(5)}</span>
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

                            <div className="flex flex-col gap-2">

                                <div className="relative z-50">
                                    <TokenSelector
                                        tokens={TOKENS.filter(t => t.symbol !== market.to.symbol)}
                                        selected={market.from}
                                        onSelect={(t: any) => setMarket(p => ({ ...p, from: { ...t, wallet: "0", protocol: "0" } }))}
                                    />
                                </div>

                                <div className="relative group">
                                    <div className="modern-input px-3 py-2 w-full flex items-center gap-2 border border-gray-200 rounded-xl bg-gray-50 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                                        <div className="flex-1">
                                            <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Amount</label>
                                            <input
                                                type="number"
                                                value={form.amount}
                                                onChange={(e) => updateInput('amount', e.target.value)}
                                                placeholder="0.0"
                                                className="w-full bg-transparent text-sm font-bold text-gray-900 outline-none"
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded">{market.from.symbol}</span>
                                    </div>

                                    <div className="flex justify-between mt-1 text-[10px] text-gray-500 px-1">
                                        <span className="cursor-pointer hover:text-blue-600 flex items-center gap-1" onClick={() => updateInput('amount', market.from.protocol)}>
                                        </span>
                                        <span className="cursor-pointer hover:text-blue-600 flex items-center gap-1" onClick={() => updateInput('amount', market.from.wallet)}>
                                            <span>Wallet:</span> <span className="font-bold text-gray-700">{parseFloat(market.from.wallet).toFixed(3)}</span>
                                        </span>
                                    </div>

                                    <div className="flex justify-between mt-2 gap-1">
                                        {[25, 50, 75, 100].map(pct => (
                                            <button key={pct} onClick={() => {
                                                const bal = parseFloat(market.from.wallet) > 0 ? parseFloat(market.from.wallet) : parseFloat(market.from.protocol);
                                                updateInput('amount', ((bal * pct) / 100).toFixed(6));
                                            }} className="flex-1 py-1 rounded-md bg-gray-100 hover:bg-blue-600 hover:text-white transition font-medium">{pct}%</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="text-[10px] text-gray-500 text-right border-t border-dashed border-gray-200 pt-2">
                                <span className="font-bold text-blue-600">{parseFloat(market.to.wallet).toFixed(3)} {market.to.symbol}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase mb-1">Target Price</span>
                                    <input type="number" value={form.price} onChange={(e) => updateInput('price', e.target.value)} className="border border-gray-200 bg-gray-50 rounded-lg px-2 py-2 text-center font-bold text-sm focus:outline-none focus:border-blue-500" />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1">Expiry (Days)</label>
                                    <input type="number" max="30" value={form.expiry} onChange={(e) => setForm(p => ({ ...p, expiry: Number(e.target.value) }))} className="border border-gray-200 bg-gray-50 rounded-lg px-2 py-2 text-center font-bold text-sm focus:outline-none focus:border-blue-500" />
                                </div>
                            </div>

                            <div className="flex gap-2 mt-1">
                                <button onClick={() => handleCreate(true)} disabled={ui.creating === 'buy' || !form.total} className={`flex-1 py-3 rounded-xl text-white font-bold transition shadow-lg shadow-green-100 ${ui.creating === 'buy' ? 'bg-green-300' : 'bg-green-500 hover:bg-green-600'}`}>{ui.creating === 'buy' ? 'Processing' : `Buy ${market.from.symbol}`}</button>
                                <button onClick={() => handleCreate(false)} disabled={ui.creating === 'sell' || !form.total} className={`flex-1 py-3 rounded-xl text-white font-bold transition shadow-lg shadow-red-100 ${ui.creating === 'sell' ? 'bg-red-300' : 'bg-red-500 hover:bg-red-600'}`}>{ui.creating === 'sell' ? 'Processing' : `Sell ${market.from.symbol}`}</button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

export default Limit;