import React, { useCallback, useEffect, useRef, useState } from 'react'
import TradingDashboard from '../../components/TradingDashboard'
import { ChevronDown, Loader2 } from 'lucide-react'
import ExecutorABI from "../../ABI/LimitOrder.json";
import { ethers } from 'ethers'
import { useWallet } from '../../contexts/WalletContext'
import { TOKENS } from '../../utils/SwapTokens'
import { useToast } from '../../components/Toast'
import { useSwap } from '../../hooks/useSwap';
import { useOrder } from '../../hooks/useOrder';

interface Token {
    symbol: string
    name: string
    img: string
    address: string
    realBalance?: string;
    balance?: number;
}

const GLOBAL_ORDERS_CACHE = new Map<number, any>();
const GLOBAL_DECIMALS_CACHE: Record<string, number> = {};

const Limit = () => {
    const { createOrder, cancelOrder, currentRate, fetchLastOrderPriceForPair } = useOrder()
    const { getTokenBalance } = useSwap()
    const { account, provider } = useWallet()
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<"open" | "history">("open");
    const [orderHistory, setOrderHistory] = useState<any[]>([]);
    const [userOpenOrders, setUserOpenOrders] = useState<any[]>([]);
    const [generalOpenOrders, setGeneralOpenOrders] = useState<any[]>([]);

    const [isOrdersLoading, setIsOrdersLoading] = useState(false);
    const [isLoadingRate, setIsLoadingRate] = useState(false);

    const [isCreatingBuy, setIsCreatingBuy] = useState(false)
    const [isCreatingSell, setIsCreatingSell] = useState(false)
    const [fromToken, setFromToken] = useState<Token>(TOKENS[1])
    const [expiryDays, setExpiryDays] = useState<number>(1);
    const [toToken, setToToken] = useState<Token>(TOKENS[0])
    const [fromAmount, setFromAmount] = useState<string>('')
    const [toAmount, setToAmount] = useState<string>('')
    const [targetPrice, setTargetPrice] = useState<string>("");
    const [isFromDropdownOpen, setIsFromDropdownOpen] = useState<boolean>(false)
    const fromDropdownRef = useRef<HTMLDivElement>(null)
    const [tokens, setTokens] = useState<Token[]>(
        TOKENS.map((t) => ({ ...t, balance: 0, realBalance: '0' }))
    )
    const currentPairRef = useRef({ from: fromToken.address, to: toToken.address });
    const fetchRequestId = useRef(0);
    const sellOrdersRef = useRef<HTMLDivElement>(null);

    const refreshUI = useCallback(() => {
        const now = Math.floor(Date.now() / 1000);
        const fAddr = currentPairRef.current.from.toLowerCase();
        const tAddr = currentPairRef.current.to.toLowerCase();

        const userOpen: any[] = [];
        const generalOpen: any[] = [];
        const historyList: any[] = [];

        GLOBAL_ORDERS_CACHE.forEach((order) => {
            const matchesPair =
                (order.tokenIn === fAddr && order.tokenOut === tAddr) ||
                (order.tokenIn === tAddr && order.tokenOut === fAddr);

            if (matchesPair) {
                const expired = order.expiry < now;
                const active = !order.filled && !order.cancelled && !expired;

                if (active) {
                    generalOpen.push(order);
                    if (account && order.maker.toLowerCase() === account.toLowerCase()) {
                        userOpen.push(order);
                    }
                } else {
                    historyList.push({ ...order, expired });
                }
            }
        });

        const sortFn = (a: any, b: any) => b.id - a.id;

        React.startTransition(() => {
            setGeneralOpenOrders(generalOpen.sort(sortFn));
            setUserOpenOrders(userOpen.sort(sortFn));
            setOrderHistory(historyList.sort(sortFn));

            if (generalOpen.length > 0 || historyList.length > 0) {
                setIsOrdersLoading(false);
            }
        });

    }, [account]);

    useEffect(() => {
        currentPairRef.current = { from: fromToken.address, to: toToken.address };
    }, [fromToken.address, toToken.address]);

    useEffect(() => {
        fetchRequestId.current += 1;
        const currentReq = fetchRequestId.current;
        currentPairRef.current = { from: fromToken.address, to: toToken.address };

        React.startTransition(() => {
            setGeneralOpenOrders([]);
            setUserOpenOrders([]);
            setOrderHistory([]);
            setIsOrdersLoading(true);
        });

        if (fromToken && toToken) {
            setIsLoadingRate(true);
            fetchLastOrderPriceForPair({
                tokenIn: fromToken.address,
                tokenOut: toToken.address
            }).finally(() => setIsLoadingRate(false));

            requestAnimationFrame(() => {
                if (fetchRequestId.current === currentReq) {
                    refreshUI();
                    if (provider) fetchOrdersStrict(currentReq);
                }
            });
        }

        return () => {
            if (fetchRequestId.current === currentReq) {
                fetchRequestId.current += 1;
            }
        };
    }, [fromToken.address, toToken.address, provider]);

    const EXECUTOR_ADDRESS = "0x14e904F5FfA5748813859879f8cA20e487F407D8";
    const MIN_ERC20_ABI = ["function decimals() view returns (uint8)"];

    const fetchOrdersStrict = async (requestId: number) => {
        if (!provider) return;

        try {
            if (fetchRequestId.current !== requestId) return;

            const executor = new ethers.Contract(EXECUTOR_ADDRESS, ExecutorABI.abi, provider);
            const nextIdBig = await executor.nextOrderId();
            const nextId = Number(nextIdBig);

            if (fetchRequestId.current !== requestId) return;

            if (nextId <= 1) {
                if (fetchRequestId.current === requestId) setIsOrdersLoading(false);
                return;
            }

            const now = Math.floor(Date.now() / 1000);
            const activeIdsToCheck: number[] = [];
            GLOBAL_ORDERS_CACHE.forEach(o => {
                if (!o.filled && !o.cancelled && o.expiry > now) {
                    activeIdsToCheck.push(o.id);
                }
            });

            const newIdsToFetch: number[] = [];
            for (let i = nextId - 1; i >= 1; i--) {
                if (!GLOBAL_ORDERS_CACHE.has(i)) {
                    newIdsToFetch.push(i);
                }
            }

            const allIds = [...new Set([...activeIdsToCheck, ...newIdsToFetch])].sort((a, b) => b - a);

            if (allIds.length > 0) {
                const chunkSize = 25;

                for (let i = 0; i < allIds.length; i += chunkSize) {
                    if (fetchRequestId.current !== requestId) return;

                    const batchIds = allIds.slice(i, i + chunkSize);
                    const batchResults = await Promise.all(batchIds.map(id =>
                        executor.getOrder(id)
                            .then((ord: any) => ({ id, ord }))
                            .catch(() => null)
                    ));

                    if (fetchRequestId.current !== requestId) return;

                    const uniqueTokens = new Set<string>();
                    const validResults = batchResults.filter((r): r is { id: number; ord: any } => r !== null);

                    validResults.forEach(({ ord }) => {
                        if (ord?.tokenIn) uniqueTokens.add(ord.tokenIn.toLowerCase());
                        if (ord?.tokenOut) uniqueTokens.add(ord.tokenOut.toLowerCase());
                    });

                    await Promise.all(Array.from(uniqueTokens).map(async (addr) => {
                        if (GLOBAL_DECIMALS_CACHE[addr] !== undefined) return;
                        try {
                            const erc = new ethers.Contract(addr, MIN_ERC20_ABI, provider);
                            GLOBAL_DECIMALS_CACHE[addr] = Number(await erc.decimals());
                        } catch { GLOBAL_DECIMALS_CACHE[addr] = 18; }
                    }));

                    if (fetchRequestId.current !== requestId) return;

                    for (const { id, ord } of validResults) {
                        if (!ord?.maker) continue;
                        const tokenIn = ord.tokenIn.toLowerCase();
                        const decimalsIn = GLOBAL_DECIMALS_CACHE[tokenIn] ?? 18;

                        GLOBAL_ORDERS_CACHE.set(id, {
                            id,
                            maker: ord.maker,
                            tokenIn,
                            tokenOut: ord.tokenOut.toLowerCase(),
                            amountIn: ethers.formatUnits(ord.amountIn, decimalsIn),
                            originalAmountIn: ethers.formatUnits(ord.amountOutMin, decimalsIn),
                            targetPrice: ethers.formatUnits(ord.targetPrice1e18?.toString() ?? "0", 18),
                            expiry: Number(ord.expiry),
                            filled: Boolean(ord.filled),
                            cancelled: Boolean(ord.cancelled),
                            orderType: Number(ord.orderType),
                        });
                    }

                    if (fetchRequestId.current === requestId) {
                        refreshUI();
                        setIsOrdersLoading(false);
                    }
                }
            } else {
                if (fetchRequestId.current === requestId) setIsOrdersLoading(false);
            }

        } catch (err) {
            console.error("Fetch error:", err);
            if (fetchRequestId.current === requestId) setIsOrdersLoading(false);
        }
    };

    useEffect(() => {
        currentPairRef.current = { from: fromToken.address, to: toToken.address };
    }, [fromToken.address, toToken.address]);

    useEffect(() => {
        if (!provider) return;
        const interval = setInterval(() => fetchOrdersStrict(fetchRequestId.current), 10000);
        return () => clearInterval(interval);
    }, [provider]);

    const updateBalances = useCallback(async () => {
        if (!account || !provider) return;
        try {
            const fromBal = await getTokenBalance(fromToken.symbol);
            const toBal = await getTokenBalance(toToken.symbol);

            setFromToken(prev => ({ ...prev, realBalance: fromBal, balance: parseFloat(fromBal) }));
            setToToken(prev => ({ ...prev, realBalance: toBal, balance: parseFloat(toBal) }));

            setTokens(prev => prev.map(t => {
                if (t.symbol === fromToken.symbol) return { ...t, realBalance: fromBal, balance: parseFloat(fromBal) };
                if (t.symbol === toToken.symbol) return { ...t, realBalance: toBal, balance: parseFloat(toBal) };
                return t;
            }));
        } catch (e) {
            console.error("Balance fetch error:", e);
        }
    }, [account, provider, getTokenBalance, fromToken.symbol, toToken.symbol]);

    useEffect(() => { updateBalances() }, [account, updateBalances]);

    useEffect(() => {
        if (sellOrdersRef.current) {
            sellOrdersRef.current.scrollTop = sellOrdersRef.current.scrollHeight;
        }
    }, [generalOpenOrders.length]);

    useEffect(() => {
        if (!fromAmount || !targetPrice) { setToAmount(""); return; }
        const amount = parseFloat(fromAmount);
        const price = parseFloat(targetPrice);
        if (isNaN(amount) || isNaN(price) || amount <= 0 || price <= 0) { setToAmount(""); return; }
        const total = amount * price;
        setToAmount(total.toString());
    }, [fromAmount, targetPrice]);

    useEffect(() => {
        if (currentRate && !targetPrice) {
            setTargetPrice(Number(currentRate).toFixed(4));
        }
    }, [currentRate]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node
            if (fromDropdownRef.current && !fromDropdownRef.current.contains(target)) {
                setIsFromDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleTokenSelect = (token: Token, isFrom: boolean = true): void => {
        if (isFrom) {
            setFromToken(token);
            setIsFromDropdownOpen(false);
        } else {
            setToToken(token);
        }
    }

    const handleAmountChange = (value: string): void => setFromAmount(value);

    const handleCreateOrder = async (isBuy: boolean): Promise<void> => {
        if (isBuy ? isCreatingBuy : isCreatingSell) return;
        if (!fromAmount || !targetPrice) return alert("Please enter valid order amount and target price");

        const priceNum = Number(targetPrice);
        const amountNum = Number(fromAmount);

        if (isNaN(priceNum) || isNaN(amountNum) || priceNum <= 0 || amountNum <= 0) return alert("Invalid numeric input");

        const clean = (v: number, decimals: number = 18) => Number(v.toFixed(decimals)).toString();
        const ttlSeconds = expiryDays * 24 * 3600;

        if (isBuy) {
            setIsCreatingBuy(true)
            const amountInBuyIN = priceNum * amountNum;
            const safeAmountIn = clean(amountInBuyIN, 8);
            const safeAmountOutMin = clean(amountNum, 8);

            await createOrder({
                tokenIn: toToken.address,
                tokenOut: fromToken.address,
                amountIn: safeAmountIn,
                amountOutMin: safeAmountOutMin,
                targetPrice,
                ttlSeconds,
                ordertype: 0,
            });
            setIsCreatingBuy(false)
        } else {
            const amountInsellIN = priceNum * amountNum;
            setIsCreatingSell(true)
            const safeAmountIn = clean(amountNum, 8);
            const safeAmountOutMin = clean(amountInsellIN, 8);

            await createOrder({
                tokenIn: fromToken.address,
                tokenOut: toToken.address,
                amountIn: safeAmountIn,
                amountOutMin: safeAmountOutMin,
                targetPrice,
                ttlSeconds,
                ordertype: 1,
            });
            setIsCreatingSell(false)
        }
        fetchRequestId.current += 1;
        await fetchOrdersStrict(fetchRequestId.current);

        fetchOrdersStrict(fetchRequestId.current);
        await updateBalances();
        await fetchLastOrderPriceForPair({
            tokenIn: fromToken.address,
            tokenOut: toToken.address,
        });

        showToast(`${isBuy ? "Buy" : "Sell"} order created successfully!`, "success");
        setFromAmount(""); setToAmount(""); setTargetPrice("");
        if (isBuy) setIsCreatingBuy(false); else setIsCreatingSell(false);
    };

    const handleCancel = async (orderId: number) => {
        await cancelOrder({ orderId });
        const order = GLOBAL_ORDERS_CACHE.get(orderId);
        if (order) GLOBAL_ORDERS_CACHE.set(orderId, { ...order, cancelled: true });
        refreshUI();
    };

    return (
        <div>
            <div className="hero-section">
                <div className="flex-grow flex flex-col items-center w-full p-3">
                    <div className="w-full flex flex-col lg:flex-row gap-3">
                        <div className="w-full lg:w-[70%] flex flex-col gap-3">

                            <div className="w-full">
                                <TradingDashboard
                                    fullScreen
                                    showOrders={false}
                                    pair={fromToken.symbol === "MATIC" ? "POLUSDT" : `${fromToken.symbol}${toToken.symbol}`}
                                />
                            </div>

                            <div className="modern-card p-6 flex flex-col h-[250px]">
                                <div className="flex justify-between items-center mb-4 shrink-0">
                                    <h2 className="text-xl font-semibold text-[#111]">Active Orders</h2>
                                </div>

                                <div className="w-full border border-[#E5E5E5] rounded-lg overflow-hidden flex flex-col flex-1 relative">
                                    <div className="grid grid-cols-7 bg-[#F3F4F6] text-xs font-semibold text-gray-700 py-2 px-3 border-b border-[#E5E5E5] shrink-0">
                                        <span className="text-left">Order #</span>
                                        <span className="text-center">Target Price</span>
                                        <span className="text-center">Order Amount</span>
                                        <span className="text-center">Total Amount</span>
                                        <span className="text-center">Expiry</span>
                                        <span className="text-center">Type</span>
                                        <span className="text-center">Action</span>
                                    </div>

                                    <div className="flex-1 overflow-y-auto">
                                        {userOpenOrders.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-sm text-gray-600">
                                                No Open Orders Yet
                                            </div>
                                        ) : (
                                            userOpenOrders.map((o) => {
                                                const targetPrice = parseFloat(o.targetPrice || "0");
                                                const isSell = Number(o.orderType) === 1;
                                                const displayAmount = isSell ? parseFloat(o.amountIn || "0") : parseFloat(o.originalAmountIn || "0");
                                                const total = Number.isFinite(displayAmount * targetPrice) ? (displayAmount * targetPrice).toFixed(6) : "0";
                                                const expiryDate = new Date(o.expiry * 1000);
                                                const expiryShort = expiryDate.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" });

                                                return (
                                                    <div key={o.id} className="grid grid-cols-7 text-xs text-gray-700 py-2 px-3 border-b border-gray-100 hover:bg-gray-50 transition">
                                                        <span className="text-left font-medium">#{o.id}</span>
                                                        <span className="text-center cursor-pointer" onClick={() => setTargetPrice(targetPrice.toString())}>{targetPrice.toFixed(6)}</span>
                                                        <span className="text-center cursor-pointer" onClick={() => setFromAmount(displayAmount.toString())}>{displayAmount.toFixed(6)}</span>
                                                        <span className="text-center">{total}</span>
                                                        <span className="text-center">{expiryShort}</span>
                                                        <span className={`text-center font-semibold ${isSell ? "text-red-600" : "text-green-600"}`}>{isSell ? "SELL" : "BUY"}</span>
                                                        <div className="flex justify-center">
                                                            <button onClick={() => handleCancel(o.id)} className="px-3 py-1 text-xs font-medium rounded bg-red-100 text-red-600 hover:bg-red-200">Cancel</button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="w-full lg:w-[30%] flex flex-col gap-3">
                            <div className="modern-card flex flex-col h-[400px]">
                                <div className="p-3 flex flex-col h-full">
                                    <div className="bg-[#F8F8F8] border border-[#E5E5E5] rounded-md px-1 py-1 text-xs w-full flex mb-2">
                                        <button className={`flex-1 py-1 rounded cursor-pointer transition ${activeTab === "open" ? "bg-white text-[#111] shadow-sm font-semibold" : "text-[#888] hover:text-[#333]"}`} onClick={() => setActiveTab("open")}>Open</button>
                                        <button className={`flex-1 py-1 rounded cursor-pointer transition ${activeTab === "history" ? "bg-white text-[#111] shadow-sm font-semibold" : "text-[#888] hover:text-[#333]"}`} onClick={() => setActiveTab("history")}>History</button>
                                    </div>

                                    <div className="bg-[#F8F8F8] border border-[#E5E5E5] rounded-md flex flex-col h-full overflow-hidden relative">
                                        <div className="px-3 py-2 flex items-center justify-between text-gray-600 font-semibold border-b border-gray-300 text-xs shrink-0">
                                            <span className="flex-1 text-left">Price</span>
                                            <span className="flex-1 text-center">Amount</span>
                                            <span className="flex-1 text-right">Total</span>
                                        </div>

                                        {isOrdersLoading && activeTab === "open" && generalOpenOrders.length === 0 && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
                                                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                            </div>
                                        )}

                                        {activeTab === "open" ? (
                                            <div className="flex flex-col text-xs font-medium h-full relative">
                                                <div ref={sellOrdersRef} className="flex-1 overflow-y-scroll scrollbar-hide">
                                                    {generalOpenOrders.filter(o => o.orderType === 1).sort((a, b) => parseFloat(b.targetPrice) - parseFloat(a.targetPrice)).map(o => {
                                                        const p = parseFloat(o.targetPrice); const a = parseFloat(o.amountIn);
                                                        return (
                                                            <div key={o.id} onClick={() => { setTargetPrice(p.toString()); setFromAmount(a.toString()); }} className="px-3 py-1 flex justify-between text-red-600 hover:bg-red-50 cursor-pointer">
                                                                <span className="flex-1 text-left">{p.toFixed(5)}</span>
                                                                <span className="flex-1 text-center">{a.toFixed(4)}</span>
                                                                <span className="flex-1 text-right">{(p * a).toFixed(2)}</span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>

                                                <div className="px-3 py-2 flex items-center justify-center border-y border-gray-300 text-sm font-semibold text-blue-600 bg-white sticky z-10 cursor-pointer" onClick={() => currentRate && setTargetPrice(parseFloat(currentRate).toFixed(6))}>
                                                    {currentRate ? <>{parseFloat(currentRate).toFixed(6)} <span className="text-gray-400 text-xs ml-1">{toToken.symbol}</span></> : <Loader2 className="w-3 h-3 animate-spin" />}
                                                </div>

                                                <div className="flex-1 overflow-y-scroll scrollbar-hide">
                                                    {generalOpenOrders.filter(o => o.orderType === 0).sort((a, b) => parseFloat(b.targetPrice) - parseFloat(a.targetPrice)).map(o => {
                                                        const p = parseFloat(o.targetPrice); const a = parseFloat(o.originalAmountIn);
                                                        return (
                                                            <div key={o.id} onClick={() => { setTargetPrice(p.toString()); setFromAmount(a.toString()); }} className="px-3 py-1 flex justify-between text-green-600 hover:bg-green-50 cursor-pointer">
                                                                <span className="flex-1 text-left">{p.toFixed(5)}</span>
                                                                <span className="flex-1 text-center">{a.toFixed(4)}</span>
                                                                <span className="flex-1 text-right">{(p * a).toFixed(2)}</span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex-1 overflow-y-scroll text-xs font-medium relative">
                                                {orderHistory.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center h-full text-sm text-gray-600">No History</div>
                                                ) : (
                                                    <ul>
                                                        {orderHistory.map(o => {
                                                            const isSell = o.orderType === 1;
                                                            const p = parseFloat(o.targetPrice || "0");
                                                            const a = parseFloat(o.originalAmountIn || o.amountIn || "0");
                                                            return (
                                                                <div key={o.id} className={`px-3 py-2 flex justify-between ${isSell ? 'text-red-600' : 'text-green-600'} hover:bg-gray-50`}>
                                                                    <span className="w-[48px] text-left text-gray-400 font-semibold">
                                                                        #{o.id}
                                                                    </span>

                                                                    <span className="flex-1 text-left">{p.toFixed(5)}</span>
                                                                    <span className="flex-1 text-center">{a.toFixed(4)}</span>
                                                                    <span className="flex-1 text-right">{(p * a).toFixed(2)}</span>
                                                                </div>
                                                            )
                                                        })}
                                                    </ul>
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
                                        <input
                                            type="number"
                                            value={fromAmount}
                                            onChange={(e) => handleAmountChange(e.target.value)}
                                            placeholder="0.0"
                                            className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
                                        />

                                        <div className="relative" ref={fromDropdownRef}>
                                            <button
                                                onClick={() => setIsFromDropdownOpen(!isFromDropdownOpen)}
                                                className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-gray-100"
                                            >
                                                <img src={fromToken.img} alt={fromToken.symbol} className="w-4 h-4 rounded-full" />
                                                <span>{fromToken.symbol}</span>
                                                <ChevronDown
                                                    className={`w-3 h-3 transition-transform ${isFromDropdownOpen ? "rotate-180" : ""}`}
                                                />
                                            </button>

                                            {isFromDropdownOpen && (
                                                <ul className="absolute right-0 mt-1 w-40 max-h-40 overflow-y-auto bg-white rounded-md shadow-lg z-50 border border-gray-200">
                                                    {tokens
                                                        .filter((t) => t.symbol !== toToken.symbol)
                                                        .map((t) => (
                                                            <li
                                                                key={t.symbol}
                                                                onClick={() => handleTokenSelect(t, true)}
                                                                className="flex items-center px-2 py-1 hover:bg-gray-50 cursor-pointer"
                                                            >
                                                                <img
                                                                    src={t.img}
                                                                    className="w-4 h-4 mr-2 rounded-full"
                                                                    alt={t.symbol}
                                                                />
                                                                {t.symbol}
                                                            </li>
                                                        ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                    {(currentRate || isLoadingRate) && (
                                        <div className="text-[11px] text-gray-500 px-1 flex justify-between items-center pt-1">
                                            <div
                                                onClick={() => {
                                                    if (currentRate && !isLoadingRate) {
                                                        setTargetPrice(parseFloat(currentRate).toFixed(6));
                                                    }
                                                }}
                                                className="cursor-pointer hover:text-blue-600"
                                            >
                                                {isLoadingRate ? (
                                                    <span className="flex items-center gap-1">
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        <span>Loading rate...</span>
                                                    </span>
                                                ) : currentRate ? (
                                                    <span>1 {fromToken.symbol} = {parseFloat(currentRate).toFixed(6)} {toToken.symbol}</span>
                                                ) : (
                                                    <span className="text-gray-400">Rate unavailable</span>
                                                )}
                                            </div>
                                            <div>
                                                Available: {fromToken.balance ? fromToken.balance.toFixed(3) : "0.000"}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex justify-between mt-2 gap-1">
                                        {[25, 50, 75, 100].map((pct) => (
                                            <button
                                                key={pct}
                                                onClick={() => {
                                                    const bal = parseFloat(fromToken.realBalance || "0");
                                                    const calcAmt = ((bal * pct) / 100).toFixed(6);
                                                    setFromAmount(calcAmt);
                                                }}
                                                className="flex-1 text-center py-1 rounded-md bg-gray-100 text-[11px] font-medium hover:bg-blue-600 hover:text-white transition-all"
                                            >
                                                {pct === 100 ? "MAX" : `${pct}%`}
                                            </button>
                                        ))}
                                    </div>

                                </div>

                                <div>

                                    {currentRate && (
                                        <div className="text-[11px] text-gray-500 px-1 flex justify-end items-center pt-0.5">
                                            <div>
                                                Available: {toToken.balance ? toToken.balance.toFixed(3) : "0.000"} {toToken.symbol}
                                            </div>

                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col">
                                        <span className="text-gray-500">Target Price</span>
                                        <input
                                            type="number"
                                            value={targetPrice}
                                            onChange={(e) => {
                                                const input = e.target.value;
                                                setTargetPrice(input);
                                            }}
                                            className={`border rounded px-2 py-1 text-center font-medium text-xs`}
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-[11px] text-gray-500">Expiry (Days)</label>
                                        <input
                                            type="number"
                                            max="30"
                                            value={expiryDays}
                                            onChange={(e) => setExpiryDays(Number(e.target.value))}
                                            className="border border-gray-200 rounded-md px-2 py-1 bg-gray-50 text-center text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        />
                                        <div className="text-[10px] text-gray-400 text-center mt-1">
                                            Expires on:{" "}
                                            {new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
                                        </div>
                                    </div>

                                </div>

                                <div className="flex gap-2 mt-1">
                                    <button
                                        onClick={() => handleCreateOrder(true)}
                                        disabled={isCreatingBuy || !toAmount}
                                        className={`flex-1 py-1.5 rounded-md font-semibold text-white text-xs transition ${isCreatingBuy ? 'bg-green-400 cursor-wait' : 'bg-green-600 hover:bg-green-700'
                                            } `}
                                    >
                                        {isCreatingBuy ? 'Processing…' : `Buy ${fromToken.symbol}`}
                                    </button>

                                    <button
                                        onClick={() => handleCreateOrder(false)}
                                        disabled={isCreatingSell || !toAmount}
                                        className={`flex-1 py-1.5 rounded-md font-semibold text-white text-xs transition ${isCreatingSell ? 'bg-red-400 cursor-wait' : 'bg-red-600 hover:bg-red-700'
                                            }  `}
                                    >
                                        {isCreatingSell ? 'Processing…' : `Sell ${fromToken.symbol}`}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
export default Limit