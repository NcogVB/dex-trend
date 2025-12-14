import { useCallback, useEffect, useRef, useState } from 'react'
import TradingDashboard from '../../components/TradingDashboard'
import { ChevronDown } from 'lucide-react'
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
    realBalance?: string;  // raw balance string
    balance?: number;      // parsed number}
}
const Limit = () => {
    const { createOrder, cancelOrder, currentRate, fetchLastOrderPriceForPair } = useOrder()
    const { getTokenBalance } = useSwap()
    const { account, provider } = useWallet()
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<"open" | "history">("open");
    const [orderHistory, setOrderHistory] = useState<any[]>([]);
    const [isCreatingBuy, setIsCreatingBuy] = useState(false)
    const [isCreatingSell, setIsCreatingSell] = useState(false)
    const [fromToken, setFromToken] = useState<Token>(TOKENS[1])
    const [expiryDays, setExpiryDays] = useState<number>(1); // default 1 day
    const [toToken, setToToken] = useState<Token>(TOKENS[0])
    const [fromAmount, setFromAmount] = useState<string>('')
    const [toAmount, setToAmount] = useState<string>('')
    const [targetPrice, setTargetPrice] = useState<string>("");
    const [isFromDropdownOpen, setIsFromDropdownOpen] = useState<boolean>(false)
    const fromDropdownRef = useRef<HTMLDivElement>(null)
    const [tokens, setTokens] = useState<Token[]>(
        TOKENS.map((t) => ({ ...t, balance: 0, realBalance: '0' }))
    )

    // fetch "current rate" whenever tokens change
    useEffect(() => {
        if (fromToken && toToken) {
            fetchLastOrderPriceForPair({
                tokenIn: fromToken.address,
                tokenOut: toToken.address
            });

        }
    }, [fromToken, toToken]);
    useEffect(() => {
        if (!fromAmount || !targetPrice) {
            setToAmount("");
            return;
        }

        const amount = parseFloat(fromAmount);
        const price = parseFloat(targetPrice);

        if (isNaN(amount) || isNaN(price) || amount <= 0 || price <= 0) {
            setToAmount("");
            return;
        }

        // CEX-style: total = amount × price
        const total = amount * price;

        setToAmount(total.toString());
    }, [fromAmount, targetPrice]);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node

            if (
                fromDropdownRef.current &&
                !fromDropdownRef.current.contains(target)
            ) {
                setIsFromDropdownOpen(false)
            }

        }

        document.addEventListener('mousedown', handleClickOutside)
        return () =>
            document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Handle token selection
    const handleTokenSelect = (token: Token, isFrom: boolean = true): void => {
        if (isFrom) {
            setFromToken(token)
            setIsFromDropdownOpen(false)
        } else {
            setToToken(token)
        }
    }

    // Handle amount input
    const handleAmountChange = (value: string): void => {
        setFromAmount(value)
        // Remove the toAmount calculation - it's now handled by the quote
    }
    useEffect(() => {
        if (currentRate) {
            setTargetPrice(Number(currentRate).toFixed(4)); // keep 8 decimals
        }
    }, [currentRate]); // ✅ only re-run when rate changes


    const isFetchingBalance = useRef(false);

    const updateBalances = useCallback(async () => {
        if (!account || !provider) return;

        // Prevent duplicate calls
        if (isFetchingBalance.current) return;
        isFetchingBalance.current = true;

        try {
            const updated: any = [];

            // IMPORTANT: fetch balances sequentially (no Promise.all)
            for (const t of TOKENS) {
                const bal = await getTokenBalance(t.symbol); // from another file
                updated.push({
                    ...t,
                    realBalance: bal,
                    balance: parseFloat(bal)
                });
            }

            setTokens(updated);

            setFromToken(prev => updated.find((x: Token) => x.symbol === prev.symbol) || updated[0]);
            setToToken(prev => updated.find((x: Token) => x.symbol === prev.symbol) || updated[1]);

        } finally {
            isFetchingBalance.current = false;
        }
    }, [account, provider, getTokenBalance]);


    useEffect(() => {
        updateBalances()
    }, [account, updateBalances])


    const handleCreateOrder = async (isBuy: boolean): Promise<void> => {
        if (isBuy ? isCreatingBuy : isCreatingSell) return;

        if (!fromAmount || !targetPrice) {
            alert("Please enter valid order amount and target price");
            return;
        }

        const priceNum = Number(targetPrice);
        const amountNum = Number(fromAmount);

        if (isNaN(priceNum) || isNaN(amountNum) || priceNum <= 0 || amountNum <= 0) {
            alert("Invalid numeric input");
            return;
        }

        // --- Ensure UI amounts never produce bad decimals ---
        const clean = (v: number, decimals: number = 18) =>
            Number(v.toFixed(decimals)).toString();

        const ttlSeconds = expiryDays * 24 * 3600;

        if (isBuy) {
            // user wants: amountNum of FROM-TOKEN (ex: BNB)
            // pays: price * amount in TO-TOKEN (ex: USDT)
            setIsCreatingBuy(true)
            const amountInBuyIN = priceNum * amountNum; // USDT cost

            const safeAmountIn = clean(amountInBuyIN, 8);   // keep max 8 decimals
            const safeAmountOutMin = clean(amountNum, 8);

            console.log("BUY ORDER =>");
            console.log("Paying tokenIn:", toToken.symbol, safeAmountIn);
            console.log("Receiving tokenOut:", fromToken.symbol, safeAmountOutMin);
            console.log("Target Price:", targetPrice);

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
            // SELL order
            const amountInsellIN = priceNum * amountNum;
            setIsCreatingSell(true)
            const safeAmountIn = clean(amountNum, 8);
            const safeAmountOutMin = clean(amountInsellIN, 8);

            console.log("SELL ORDER =>");
            console.log("Selling tokenIn:", fromToken.symbol, safeAmountIn);
            console.log("Expecting tokenOut:", toToken.symbol, safeAmountOutMin);
            console.log("Target Price:", targetPrice);

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

        await fetchOrders();
        await updateBalances();
        await fetchLastOrderPriceForPair({
            tokenIn: fromToken.address,
            tokenOut: toToken.address,
        });

        showToast(
            `${isBuy ? "Buy" : "Sell"} order created successfully!`,
            "success"
        );

        setFromAmount("");
        setToAmount("");
        setTargetPrice("");

        if (isBuy) setIsCreatingBuy(false);
        else setIsCreatingSell(false);
    };

    const MIN_ERC20_ABI = ["function decimals() view returns (uint8)"];
    const EXECUTOR_ADDRESS = "0x14e904F5FfA5748813859879f8cA20e487F407D8";
    const [userOpenOrders, setUserOpenOrders] = useState<any[]>([]);
    const [generalOpenOrders, setGeneralOpenOrders] = useState<any[]>([]);
    const currentTokensRef = useRef({ from: fromToken, to: toToken });

    // 🧠 MEMORY CACHE: Stores orders so we don't re-fetch on token switch
    const ordersCache = useRef(new Map<number, any>());
    const isFetchingRef = useRef(false);
    const decimalsCache = useRef<Record<string, number>>({});
    // This runs INSTANTLY (no network)
    const refreshUI = useCallback(() => {
        const now = Math.floor(Date.now() / 1000);
        const userOpen: any[] = [];
        const generalOpen: any[] = [];
        const historyList: any[] = [];

        // 🔥 FIX: Read from REF, not state. This is always fresh.
        const { from, to } = currentTokensRef.current;

        if (!from || !to) return; // Safety check

        ordersCache.current.forEach((order) => {
            // Match against the LIVE selected tokens
            const matchesPair =
                (order.tokenIn === from.address.toLowerCase() && order.tokenOut === to.address.toLowerCase()) ||
                (order.tokenIn === to.address.toLowerCase() && order.tokenOut === from.address.toLowerCase());

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
        setGeneralOpenOrders(generalOpen.sort(sortFn));
        setUserOpenOrders(userOpen.sort(sortFn));
        setOrderHistory(historyList.sort(sortFn));

    }, [account]); // Removed fromToken/toToken dependency since we use refs
    useEffect(() => {
        currentTokensRef.current = { from: fromToken, to: toToken };
    }, [fromToken, toToken]);
    const fetchOrders = async () => {
        if (isFetchingRef.current || !provider) return;
        isFetchingRef.current = true;

        try {
            const executor = new ethers.Contract(EXECUTOR_ADDRESS, ExecutorABI.abi, provider);

            // 1. Get Chain State
            const nextId = Number(await executor.nextOrderId());
            const now = Math.floor(Date.now() / 1000);

            if (nextId <= 1) {
                ordersCache.current.clear();
                refreshUI(); // Clear UI
                return;
            }

            // 2. Identify IDs to fetch
            //    Fetch NEW IDs + update status of ACTIVE IDs
            const idsToFetch: number[] = [];
            const lastKnownId = ordersCache.current.size > 0 ? Math.max(...ordersCache.current.keys()) : 0;

            // New IDs
            for (let i = lastKnownId + 1; i < nextId; i++) idsToFetch.push(i);

            // Re-check Active IDs (to see if they filled/expired)
            ordersCache.current.forEach(o => {
                if (!o.filled && !o.cancelled && o.expiry > now) idsToFetch.push(o.id);
            });

            // 3. Batch Fetch (Chunk size 50 for speed)
            const uniqueIds = [...new Set(idsToFetch)];
            if (uniqueIds.length > 0) {
                const chunkSize = 50;
                const fetchedResults: any[] = [];

                for (let i = 0; i < uniqueIds.length; i += chunkSize) {
                    const batch = await Promise.all(
                        uniqueIds.slice(i, i + chunkSize).map(id =>
                            executor.getOrder(id).then((ord: any) => ({ id, ord })).catch(() => null)
                        )
                    );
                    fetchedResults.push(...batch.filter(Boolean));
                }

                // 4. Resolve Decimals (Optimized)
                const uniqueTokens = new Set<string>();
                fetchedResults.forEach(({ ord }) => {
                    if (ord?.tokenIn) uniqueTokens.add(ord.tokenIn.toLowerCase());
                    if (ord?.tokenOut) uniqueTokens.add(ord.tokenOut.toLowerCase());
                });

                await Promise.all(
                    Array.from(uniqueTokens).map(async (addr) => {
                        if (decimalsCache.current[addr]) return;
                        try {
                            const erc = new ethers.Contract(addr, MIN_ERC20_ABI, provider);
                            decimalsCache.current[addr] = Number(await erc.decimals());
                        } catch { decimalsCache.current[addr] = 18; }
                    })
                );

                // 5. Parse & Store in Cache
                for (const { id, ord } of fetchedResults) {
                    if (!ord?.maker) continue;

                    const tokenIn = ord.tokenIn.toLowerCase();
                    const decimalsIn = decimalsCache.current[tokenIn] ?? 18;

                    const orderData = {
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
                    };
                    ordersCache.current.set(id, orderData);
                }
            }

            // 6. Update the UI with the data we have
            refreshUI();

        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            isFetchingRef.current = false;
        }
    };
    // Effect 1: FAST SWITCHING (Runs when tokens change)
    useEffect(() => {
        refreshUI();
    }, [fromToken, toToken, refreshUI]);

    // Effect 2: BACKGROUND SYNC (Runs on load & interval)
    useEffect(() => {
        if (!provider) return;

        // Initial fetch
        fetchOrders();
        updateBalances();

        const executor = new ethers.Contract(EXECUTOR_ADDRESS, ExecutorABI.abi, provider);
        const refresh = () => { fetchOrders(); updateBalances(); };

        executor.on("OrderCreated", refresh);
        executor.on("OrderCancelled", refresh);

        // Poll every 5 seconds (keeps data fresh without DDOSing)
        const interval = setInterval(fetchOrders, 5000);

        return () => {
            executor.off("OrderCreated", refresh);
            executor.off("OrderCancelled", refresh);
            clearInterval(interval);
        };
    }, [provider]);
    useEffect(() => {
        if (!fromToken || !toToken || !provider) return;

        updateBalances();

        const interval = setInterval(() => {
            updateBalances();
        }, 1000); // Run every 1 seconds

        return () => clearInterval(interval); // Cleanup on unmount
    }, [fromToken, toToken, provider, updateBalances]);

    const handleCancel = async (orderId: number) => {
        await cancelOrder({ orderId })
        await fetchOrders();
        await updateBalances();
        console.log("Cancel order:", orderId);
    };
    const sellOrdersRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (sellOrdersRef.current) {
            sellOrdersRef.current.scrollTop = sellOrdersRef.current.scrollHeight;
        }
    }, [generalOpenOrders]);


    return (
        <div>
            <div className="hero-section">
                <div className="flex-grow flex flex-col items-center w-full p-3">
                    {/* Chart and Orders Section */}
                    <div className="w-full flex flex-col lg:flex-row gap-3">
                        <div className="w-full lg:w-[70%] flex flex-col gap-3">

                            {/* Chart */}
                            <div className="w-full">
                                <TradingDashboard
                                    fullScreen
                                    showOrders={false}
                                    pair={
                                        fromToken.symbol === "MATIC"
                                            ? "POLUSDT"
                                            : `${fromToken.symbol}${toToken.symbol}`
                                    }
                                />
                            </div>

                            {/* Active Orders (below chart, full width of left column) */}
                            <div className="modern-card p-6 flex flex-col h-[250px]">
                                <h2 className="text-xl font-semibold text-[#111] mb-4 shrink-0">Active Orders</h2>

                                {/* This container must stretch to fill remaining height */}
                                <div className="w-full border border-[#E5E5E5] rounded-lg overflow-hidden flex flex-col flex-1">
                                    {/* Header Row */}
                                    <div className="grid grid-cols-7 bg-[#F3F4F6] text-xs font-semibold text-gray-700 py-2 px-3 border-b border-[#E5E5E5] shrink-0">
                                        <span className="text-left">Order #</span>
                                        <span className="text-center">Target Price</span>
                                        <span className="text-center">Order Amount</span>
                                        <span className="text-center">Total Amount</span>
                                        <span className="text-center">Expiry</span>
                                        <span className="text-center">Type</span>
                                        <span className="text-center">Action</span>
                                    </div>

                                    {/* Orders */}
                                    <div className="flex-1 overflow-y-auto">
                                        {userOpenOrders.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-sm text-gray-600">
                                                No Open Orders Yet
                                            </div>
                                        ) : (
                                            userOpenOrders.map((o) => {
                                                // Correct target price
                                                const targetPrice = parseFloat(
                                                    o.targetPrice1e18
                                                        ? ethers.formatUnits(o.targetPrice1e18, 18)
                                                        : o.targetPrice || "0"
                                                );

                                                const isSell = Number(o.orderType) === 1;

                                                // 🔥 FIXED — Only BUY orders use originalAmountIn
                                                const displayAmount = isSell
                                                    ? parseFloat(o.amountIn || "0")              // SELL shows remaining
                                                    : parseFloat(o.originalAmountIn || "0");     // BUY shows original deposit

                                                const total = Number.isFinite(displayAmount * targetPrice)
                                                    ? (displayAmount * targetPrice).toFixed(6)
                                                    : "0";

                                                const expiryDate = new Date(o.expiry * 1000);
                                                const expiryShort = expiryDate.toLocaleDateString(undefined, {
                                                    weekday: "short",
                                                    day: "2-digit",
                                                    month: "short"
                                                });

                                                return (
                                                    <div
                                                        key={o.id}
                                                        className="grid grid-cols-7 text-xs text-gray-700 py-2 px-3 border-b border-gray-100 hover:bg-gray-50 transition"
                                                    >
                                                        {/* Order # */}
                                                        <span className="text-left font-medium">#{o.id}</span>

                                                        {/* Target Price */}
                                                        <span
                                                            className="text-center cursor-pointer"
                                                            onClick={() => setTargetPrice(targetPrice.toString())}
                                                        >
                                                            {targetPrice.toFixed(6)}
                                                        </span>

                                                        {/* Order Amount */}
                                                        <span
                                                            className="text-center cursor-pointer"
                                                            onClick={() => setFromAmount(displayAmount.toString())}
                                                        >
                                                            {displayAmount.toFixed(6)}
                                                        </span>

                                                        {/* Total */}
                                                        <span className="text-center">{total}</span>

                                                        {/* Expiry */}
                                                        <span className="text-center">{expiryShort}</span>

                                                        {/* BUY / SELL */}
                                                        <span
                                                            className={`text-center font-semibold ${isSell ? "text-red-600" : "text-green-600"
                                                                }`}
                                                        >
                                                            {isSell ? "SELL" : "BUY"}
                                                        </span>

                                                        {/* Cancel */}
                                                        <div className="flex justify-center">
                                                            <button
                                                                onClick={() => handleCancel(o.id)}
                                                                className="px-3 py-1 text-xs font-medium rounded bg-red-100 text-red-600 hover:bg-red-200"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                </div>

                            </div>
                        </div>
                        {/* Right Side - Orders Panel + Create Order */}
                        <div className="w-full lg:w-[30%] flex flex-col gap-3">
                            {/* Orders Panel */}
                            <div className="modern-card flex flex-col h-[400px]">
                                <div className="p-3 flex flex-col h-full">
                                    {/* Tabs */}
                                    <div className="bg-[#F8F8F8] border border-[#E5E5E5] rounded-md px-1 py-1 text-xs w-full flex mb-2">
                                        <button
                                            className={`flex-1 py-1 rounded cursor-pointer transition ${activeTab === "open"
                                                ? "bg-white text-[#111] shadow-sm font-semibold"
                                                : "text-[#888] hover:text-[#333]"
                                                }`}
                                            onClick={() => setActiveTab("open")}
                                        >
                                            Open
                                        </button>
                                        <button
                                            className={`flex-1 py-1 rounded cursor-pointer transition ${activeTab === "history"
                                                ? "bg-white text-[#111] shadow-sm font-semibold"
                                                : "text-[#888] hover:text-[#333]"
                                                }`}
                                            onClick={() => setActiveTab("history")}
                                        >
                                            History
                                        </button>
                                    </div>

                                    {/* Orders Content (scrollable area) */}
                                    <div className="bg-[#F8F8F8] border border-[#E5E5E5] rounded-md flex flex-col h-full overflow-hidden">
                                        <>
                                            {/* Header Row */}
                                            <div className="px-3 py-2 flex items-center justify-between text-gray-600 font-semibold border-b border-gray-300 text-xs">
                                                <span className="flex-1 text-left">Target Price</span>
                                                <span className="flex-1 text-center">Order Amount</span>
                                                <span className="flex-1 text-right">Total Value</span>
                                            </div>

                                            {activeTab === "open" ? (
                                                /* ===== OPEN TAB ===== */
                                                generalOpenOrders.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center h-full text-sm text-gray-600">
                                                        No Open Orders
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col text-xs font-medium h-full">
                                                        {/* === SELL ORDERS (Top Scroll) === */}
                                                        <div ref={sellOrdersRef} className="flex-1 overflow-y-scroll">
                                                            <ul>
                                                                {generalOpenOrders
                                                                    .filter(o => o.orderType === 1) // SELL
                                                                    .sort((a, b) => {
                                                                        // Sell: low -> high price
                                                                        const pa = Number(parseFloat(a.targetPrice || "0"));
                                                                        const pb = Number(parseFloat(b.targetPrice || "0"));
                                                                        return pa - pb;
                                                                    })
                                                                    .map(o => {
                                                                        const price = parseFloat(o.targetPrice || "0");
                                                                        const amount = parseFloat(o.amountIn || "0");
                                                                        // total value = price * amount (price is tokenIn per tokenOut; display as numeric)
                                                                        const total = (price * amount) || 0;
                                                                        return (
                                                                            <li key={o.id} className="px-3 py-2 flex items-center justify-between text-red-600 hover:bg-red-50 transition">
                                                                                <span className="flex-1 text-left cursor-pointer" onClick={() => setTargetPrice(String(price))}>
                                                                                    {Number.isFinite(price) ? price.toFixed(5) : "-"}
                                                                                </span>

                                                                                <span className="text-center cursor-pointer" onClick={() => setFromAmount(String(amount))}>
                                                                                    {Number.isFinite(amount) ? amount.toFixed(6) : "0"}
                                                                                </span>

                                                                                <span className="flex-1 text-right">{Number.isFinite(total) ? total.toFixed(4) : "0"}</span>
                                                                            </li>
                                                                        );
                                                                    })}
                                                            </ul>
                                                        </div>

                                                        {/* === FIXED CURRENT PRICE IN MIDDLE === */}
                                                        <div
                                                            onClick={() => currentRate && setTargetPrice(parseFloat(currentRate).toFixed(6))}
                                                            className="px-3 py-2 flex items-center justify-center border-y border-gray-300 text-sm font-semibold text-blue-600 bg-white sticky top-0 hover:bg-blue-50 cursor-pointer"
                                                        >
                                                            {currentRate ? (
                                                                <>
                                                                    {parseFloat(currentRate).toFixed(6)}
                                                                    <span className="text-gray-500 ml-1">{toToken?.symbol ?? ""}</span>
                                                                </>
                                                            ) : "-"}
                                                        </div>

                                                        {/* === BUY ORDERS (Bottom Scroll) === */}
                                                        <div className="flex-1 overflow-y-auto">
                                                            <ul>
                                                                {generalOpenOrders
                                                                    .filter(o => o.orderType === 0) // BUY
                                                                    .sort((a, b) => {
                                                                        // Buy: high -> low price
                                                                        const pa = Number(parseFloat(a.targetPrice || "0"));
                                                                        const pb = Number(parseFloat(b.targetPrice || "0"));
                                                                        return pb - pa;
                                                                    })
                                                                    .map(o => {
                                                                        const price = parseFloat(o.targetPrice || "0");
                                                                        const amount = parseFloat(o.originalAmountIn || "0");
                                                                        const total = (price * amount) || 0;
                                                                        return (
                                                                            <li key={o.id} className="px-3 py-2 flex items-center justify-between text-green-600 hover:bg-green-50 transition">
                                                                                <span className="flex-1 text-left cursor-pointer" onClick={() => setTargetPrice(String(price))}>
                                                                                    {Number.isFinite(price) ? price.toFixed(5) : "-"}
                                                                                </span>

                                                                                <span className="text-center cursor-pointer" onClick={() => setFromAmount(String(amount))}>
                                                                                    {Number.isFinite(amount) ? amount.toFixed(6) : "0"}
                                                                                </span>

                                                                                <span className="flex-1 text-right">{Number.isFinite(total) ? total.toFixed(4) : "0"}</span>
                                                                            </li>
                                                                        );
                                                                    })}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                )
                                            ) : (
                                                /* ===== HISTORY TAB ===== */
                                                orderHistory.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center h-full text-sm text-gray-600">
                                                        No History
                                                    </div>
                                                ) : (
                                                    <div className="flex-1 flex flex-col text-xs font-medium overflow-y-auto">
                                                        <ul>
                                                            {orderHistory
                                                                .sort((a, b) => b.id - a.id)
                                                                .map((o) => {
                                                                    const isSell = o.orderType === 1;

                                                                    // FIXED — preferred field order
                                                                    const price = Number(o.targetPrice ?? o.targetSqrt ?? 0);

                                                                    // 🔥 FIXED: Show original deposited amount ALWAYS
                                                                    const amount = Number(o.originalAmountIn ?? o.amountIn ?? 0);

                                                                    // Avoid NaN
                                                                    const total = Number.isFinite(price * amount)
                                                                        ? (price * amount)
                                                                        : 0;

                                                                    return (
                                                                        <li
                                                                            key={o.id}
                                                                            className={`px-3 py-2 flex items-center justify-between transition cursor-pointer 
                                                                                  ${isSell ? "text-red-600 hover:bg-red-50"
                                                                                    : "text-green-600 hover:bg-green-50"}`}
                                                                        >
                                                                            {/* Order ID + Price */}
                                                                            <span
                                                                                className="flex-1 flex items-center gap-2"
                                                                                onClick={() => setTargetPrice(price.toString())}
                                                                            >
                                                                                <span className="text-gray-400 font-semibold">#{o.id}</span>
                                                                                <span>{Number.isFinite(price) ? price.toFixed(5) : "-"}</span>
                                                                            </span>

                                                                            {/* Original Amount */}
                                                                            <span
                                                                                className="text-center cursor-pointer"
                                                                                onClick={() => setFromAmount(amount.toString())}
                                                                            >
                                                                                {Number.isFinite(amount) ? amount.toFixed(6) : "0"}
                                                                            </span>

                                                                            {/* Total */}
                                                                            <span className="flex-1 text-right">
                                                                                {Number.isFinite(total) ? total.toFixed(4) : "0"}
                                                                            </span>
                                                                        </li>
                                                                    );
                                                                })}
                                                        </ul>
                                                    </div>
                                                )
                                            )}
                                        </>
                                    </div>
                                </div>
                            </div>

                            <div className="modern-card p-3 flex flex-col gap-3 text-xs rounded-xl border border-gray-200 bg-white">
                                <h2 className="text-sm font-semibold text-gray-800">Create Order</h2>

                                {/* --- FROM SECTION --- */}
                                <div className="relative group">
                                    {/* Main input box */}
                                    <div className="modern-input px-2 py-1.5 w-full flex items-center gap-2 border border-gray-200 rounded-md">
                                        <input
                                            type="number"
                                            value={fromAmount}
                                            onChange={(e) => handleAmountChange(e.target.value)}
                                            placeholder="0.0"
                                            className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
                                        />

                                        {/* Token selector */}
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
                                    {currentRate && (
                                        <div className="text-[11px] text-gray-500 px-1 flex justify-between items-center pt-1 cursor-pointer">
                                            <div
                                                onClick={() => {
                                                    if (currentRate) {
                                                        setTargetPrice(parseFloat(currentRate).toFixed(3));
                                                    }
                                                }}
                                            >
                                                1 {fromToken.symbol} = {currentRate} {toToken.symbol}
                                            </div>
                                            <div>
                                                Available:{" "}
                                                {fromToken.balance ? fromToken.balance.toFixed(3) : "0.000"}
                                            </div>
                                        </div>
                                    )}
                                    {/* ✅ Percentage boxes BELOW input box */}
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

                                    {/* Current Rate + Balance */}

                                </div>

                                {/* --- TO SECTION --- */}
                                <div>

                                    {currentRate && (
                                        <div className="text-[11px] text-gray-500 px-1 flex justify-end items-center pt-0.5">
                                            <div>
                                                Available: {toToken.balance ? toToken.balance.toFixed(3) : "0.000"} {toToken.symbol}
                                            </div>

                                        </div>
                                    )}
                                </div>
                                {/* --- TARGET PRICE + EXPIRY --- */}
                                <div className="grid grid-cols-2 gap-2">
                                    {/* Target / Expiration / Current Rate */}
                                    <div className="flex flex-col">
                                        <span className="text-gray-500">Target Price</span>
                                        <input
                                            type="number"
                                            value={targetPrice}
                                            onChange={(e) => {
                                                const input = e.target.value;
                                                setTargetPrice(input);
                                            }}
                                            className={`border rounded px-2 py-1 text-center font-medium text-xs  
                                                }`}
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

                                {/* --- BUY / SELL BUTTONS --- */}
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