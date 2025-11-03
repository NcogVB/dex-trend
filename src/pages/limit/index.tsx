import { useCallback, useEffect, useRef, useState } from 'react'
import TradingDashboard from '../../components/TradingDashboard'
import { ChevronDown } from 'lucide-react'
import { useOrder } from '../../contexts/OrderLimitContext'
import { useSwap } from '../../contexts/SwapContext'
import ExecutorABI from "../../ABI/LimitOrder.json";
import { ethers } from 'ethers'
import { useWallet } from '../../contexts/WalletContext'
import { TOKENS } from '../../utils/SwapTokens'

interface Token {
    symbol: string
    name: string
    img: string
    address: string
    realBalance?: string;  // raw balance string
    balance?: number;      // parsed number}
}
const Limit = () => {
    const { createOrder, cancelOrder } = useOrder()
    const { getQuote, getTokenBalance } = useSwap()
    const { account, provider } = useWallet()

    const [activeTab, setActiveTab] = useState<"open" | "history">("open");
    const [orderHistory, setOrderHistory] = useState<any[]>([]);
    const [isCreatingBuy, setIsCreatingBuy] = useState(false)
    const [isCreatingSell, setIsCreatingSell] = useState(false)
    const [fromToken, setFromToken] = useState<Token>(TOKENS[1])
    const [toToken, setToToken] = useState<Token>(TOKENS[0])
    const [fromAmount, setFromAmount] = useState<string>('')
    const [toAmount, setToAmount] = useState<string>('')
    const [targetPrice, setTargetPrice] = useState<string>("");
    const [isFromDropdownOpen, setIsFromDropdownOpen] = useState<boolean>(false)
    const [isToDropdownOpen, setIsToDropdownOpen] = useState<boolean>(false)
    const fromDropdownRef = useRef<HTMLDivElement>(null)
    const toDropdownRef = useRef<HTMLDivElement>(null)
    const [tokens, setTokens] = useState<Token[]>(
        TOKENS.map((t) => ({ ...t, balance: 0, realBalance: '0' }))
    )
    const [currentRate, setCurrentRate] = useState<string>("0.00000000");

    // fetch "current rate" whenever tokens change
    useEffect(() => {
        const fetchRate = async () => {
            try {
                if (!fromToken || !toToken) return;

                // fetch quote for 1 unit of fromToken
                const quote = await getQuote({
                    fromSymbol: fromToken.symbol as "USDC" | "USDT",
                    toSymbol: toToken.symbol as "USDC" | "USDT",
                    amountIn: "1",
                });

                if (quote?.amountOut) {
                    setCurrentRate(parseFloat(quote.amountOut).toFixed(8));
                }
            } catch (err) {
                console.error("Failed to fetch current rate:", err);
                setCurrentRate("0.00000000");
            }
        };

        fetchRate();
    }, [fromToken, toToken, getQuote]);

    useEffect(() => {
        if (
            fromAmount &&
            !isNaN(Number(fromAmount)) &&
            parseFloat(fromAmount) > 0
        ) {
            const handler = setTimeout(async () => {

                const quote = await getQuote({
                    fromSymbol: fromToken.symbol as 'skybnb' | 'USDT',
                    toSymbol: toToken.symbol as 'skybnb' | 'USDT',
                    amountIn: fromAmount,
                })
                console.log("quote amount", quote.amountOut)
                setToAmount(quote.amountOut)
            }, 500)

            return () => clearTimeout(handler)
        } else {
            setToAmount('')
        }
    }, [fromAmount, fromToken, toToken, getQuote])


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node

            if (
                fromDropdownRef.current &&
                !fromDropdownRef.current.contains(target)
            ) {
                setIsFromDropdownOpen(false)
            }
            if (
                toDropdownRef.current &&
                !toDropdownRef.current.contains(target)
            ) {
                setIsToDropdownOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () =>
            document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Handle token swap
    const handleSwapTokens = (): void => {
        const tempToken = fromToken
        const tempAmount = fromAmount

        setFromToken(toToken)
        setToToken(tempToken)
        setFromAmount(toAmount)
        setToAmount(tempAmount)
    }

    // Handle token selection
    const handleTokenSelect = (token: Token, isFrom: boolean = true): void => {
        if (isFrom) {
            setFromToken(token)
            setIsFromDropdownOpen(false)
        } else {
            setToToken(token)
            setIsToDropdownOpen(false)
        }
    }

    // Handle amount input
    const handleAmountChange = (value: string): void => {
        setFromAmount(value)
        // Remove the toAmount calculation - it's now handled by the quote
    }
    const updateBalances = useCallback(async () => {
        if (!account) return
        const updated = await Promise.all(
            TOKENS.map(async (t) => {
                const realBalance = await getTokenBalance(t.symbol).catch(() => "0")
                return { ...t, realBalance, balance: parseFloat(realBalance) }
            })
        )
        setTokens(updated)
        setFromToken(
            (prev) => updated.find((t) => t.symbol === prev.symbol) || updated[0]
        )
        setToToken(
            (prev) => updated.find((t) => t.symbol === prev.symbol) || updated[1]
        )
    }, [account, getTokenBalance])

    useEffect(() => {
        updateBalances()
    }, [account, updateBalances])
    const handleCreateOrder = async (isBuy: boolean): Promise<void> => {
        if (isBuy ? isCreatingBuy : isCreatingSell) return

        if (!fromAmount || !toAmount || !targetPrice) {
            alert('Please enter valid amounts and target price')
            return
        }

        if (isBuy) setIsCreatingBuy(true)
        else setIsCreatingSell(true)

        try {
            const ttlSeconds = 24 * 3600
            const ordertype = isBuy ? 0 : 1;
            await createOrder({
                tokenIn: isBuy ? toToken.address : fromToken.address,
                tokenOut: isBuy ? fromToken.address : toToken.address,
                amountIn: isBuy ? toAmount : fromAmount,
                amountOutMin: (parseFloat(isBuy ? fromAmount : toAmount) * (1 - 1 / 100)).toFixed(6),
                targetSqrtPriceX96: targetPrice, // your internal conversion can handle sqrtPrice later
                triggerAbove: isBuy ? false : true, // BUY triggers above, SELL triggers below
                ttlSeconds,
                ordertype,
            })

            alert(`${isBuy ? 'Buy' : 'Sell'} order created successfully!`)

            setFromAmount('')
            setToAmount('')
            setTargetPrice('')
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err)
            alert(`Failed to create ${isBuy ? 'buy' : 'sell'} order: ${errorMessage}`)
            console.error('Order creation error:', err)
        } finally {
            if (isBuy) setIsCreatingBuy(false)
            else setIsCreatingSell(false)
        }
    }
    const MIN_ERC20_ABI = ["function decimals() view returns (uint8)"];
    const EXECUTOR_ADDRESS = "0x230eb7155cD2392b8113fE5B557f9F05A81Df9Cd";
    const [userOpenOrders, setUserOpenOrders] = useState<any[]>([]);
    const [generalOpenOrders, setGeneralOpenOrders] = useState<any[]>([]);

    const fetchOrders = async () => {
        try {
            if (!provider) {
                console.error("Provider is not initialized");
                return;
            }
            const executor = new ethers.Contract(EXECUTOR_ADDRESS, ExecutorABI.abi, provider);

            const nextIdBN = await executor.nextOrderId();
            const nextId = Number(nextIdBN ?? 0);

            if (nextId <= 1) {
                setUserOpenOrders([]);
                setGeneralOpenOrders([]);
                setOrderHistory([]);
                return;
            }

            const decimalsCache: Record<string, number> = {};
            const userOpen: any[] = [];
            const generalOpen: any[] = [];
            const historyMap: Map<number, any> = new Map();

            const batch: Promise<{ id: number; ord: any } | null>[] = [];
            for (let id = 1; id < nextId; id++) {
                batch.push(
                    executor
                        .getOrder(id)
                        .then((ord: any) => ({ id, ord }))
                        .catch((e) => {
                            console.warn(`getOrder(${id}) failed:`, e?.message ?? e);
                            return null;
                        })
                );
            }

            const settled = await Promise.all(batch);
            const now = Math.floor(Date.now() / 1000);

            for (const entry of settled) {
                if (!entry) continue;
                const { id, ord } = entry;
                if (!ord?.maker) continue;

                const tokenIn = ord.tokenIn;
                const tokenOut = ord.tokenOut;

                const lowerIn = tokenIn.toLowerCase();
                const lowerOut = tokenOut.toLowerCase();

                if (!(lowerIn in decimalsCache)) {
                    try {
                        const erc20 = new ethers.Contract(tokenIn, MIN_ERC20_ABI, provider);
                        decimalsCache[lowerIn] = Number(await erc20.decimals());
                    } catch {
                        decimalsCache[lowerIn] = 18;
                    }
                }
                if (!(lowerOut in decimalsCache)) {
                    try {
                        const erc20 = new ethers.Contract(tokenOut, MIN_ERC20_ABI, provider);
                        decimalsCache[lowerOut] = Number(await erc20.decimals());
                    } catch {
                        decimalsCache[lowerOut] = 18;
                    }
                }

                const decimalsIn = decimalsCache[lowerIn];
                const decimalsOut = decimalsCache[lowerOut];

                const amountIn = ethers.formatUnits(ord.amountIn, decimalsIn);
                const minOut = ethers.formatUnits(ord.amountOutMin, decimalsOut);

                const targetAmount = ethers.formatUnits(
                    ord.targetSqrtPriceX96?.toString?.() ?? String(ord.targetSqrtPriceX96),
                    18
                );

                const orderData = {
                    id,
                    maker: ord.maker,
                    tokenIn,
                    tokenOut,
                    poolFee: Number(ord.poolFee),
                    pool: ord.pool,
                    amountIn,
                    minOut,
                    targetSqrt: targetAmount,
                    triggerAbove: Boolean(ord.triggerAbove),
                    expiry: Number(ord.expiry),
                    filled: Boolean(ord.filled),
                    cancelled: Boolean(ord.cancelled),
                    orderType: Number(ord.orderType), // 0 = BUY, 1 = SELL
                };

                const isExpired = orderData.expiry > 0 && orderData.expiry < now;
                const isActive = !orderData.filled && !orderData.cancelled && !isExpired;

                // Check if order matches selected token pair using token addresses
                // ✅ Show orders for both directions of the selected pair
                const matchesTokenPair = fromToken && toToken
                    ? (
                        (lowerIn === fromToken.address.toLowerCase() && lowerOut === toToken.address.toLowerCase()) ||
                        (lowerIn === toToken.address.toLowerCase() && lowerOut === fromToken.address.toLowerCase())
                    )
                    : true;

                // FIXED: Changed from !matchesTokenPair to matchesTokenPair
                if (matchesTokenPair) {
                    if (isActive) {
                        // Active orders go to open orders
                        generalOpen.push(orderData);
                        // If it's user's order, add to user open orders
                        if (account && ord.maker.toLowerCase() === account.toLowerCase()) {
                            userOpen.push(orderData);
                        }
                    } else if (orderData.filled || orderData.cancelled) {
                        // Only add to history if filled or cancelled (NOT expired)
                        historyMap.set(id, orderData);
                    }
                }
            }

            userOpen.sort((a, b) => b.id - a.id);
            generalOpen.sort((a, b) => b.id - a.id);

            const history = Array.from(historyMap.values()).sort((a, b) => b.id - a.id);

            setUserOpenOrders(userOpen);
            setGeneralOpenOrders(generalOpen);
            setOrderHistory(history);
        } catch (err: any) {
            console.error("Failed to fetch orders:", err?.message ?? err);
        }
    };

    const handleCancel = async (orderId: number) => {
        await cancelOrder({ orderId })
        console.log("Cancel order:", orderId);
    };

    // Add this useEffect to refresh orders when token selection changes
    useEffect(() => {
        if (fromToken && toToken && provider) {
            fetchOrders();
        }
    }, [fromToken, toToken, provider]);
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
                                    pair={`${fromToken.symbol}${toToken.symbol}`}
                                />
                            </div>

                            {/* Active Orders (below chart, full width of left column) */}
                            <div className="modern-card p-6 flex flex-col h-[200px]">
                                <h2 className="text-xl font-semibold text-[#111] mb-4">Active Orders</h2>
                                <div className="bg-[#F9FAFB] border border-[#E5E5E5] rounded-lg p-4 flex-1 overflow-y-auto">
                                    {userOpenOrders.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full">
                                            <h2 className="text-[#333333] text-xl font-semibold text-center">
                                                No Open Orders Yet
                                            </h2>
                                        </div>
                                    ) : (
                                        <ul className="space-y-3">
                                            {userOpenOrders.map((o) => (
                                                <li
                                                    key={o.id}
                                                    className="flex justify-between items-center bg-white rounded-md p-3 shadow-sm"
                                                >
                                                    <div>
                                                        <p className="text-sm font-medium">
                                                            #{o.id} {o.tokenIn.slice(0, 6)}… → {o.tokenOut.slice(0, 6)}…
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {o.amountIn} in | min {o.minOut} out
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            {o.triggerAbove ? "Above" : "Below"} •{" "}
                                                            {new Date(o.expiry * 1000).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleCancel(o.id)}
                                                        className="px-3 py-1 text-xs font-medium rounded bg-red-100 text-red-600 hover:bg-red-200"
                                                    >
                                                        Cancel
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Side - Orders Panel + Create Order */}
                        <div className="w-full lg:w-[30%] flex flex-col gap-3">
                            {/* Orders Panel */}
                            <div className="modern-card flex flex-col h-[300px]">
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
                                    <div className="bg-[#F8F8F8] border border-[#E5E5E5] rounded-md flex-1 overflow-y-auto">
                                        {/* Header Row */}
                                        <div className="px-3 py-2 flex items-center justify-between text-gray-600 font-semibold border-b border-gray-300 text-xs">
                                            <span className="flex-1 text-left">Target Price</span>
                                            <span className="flex-1 text-center">Order Amount</span>
                                            <span className="flex-1 text-right">Total Amount</span>
                                        </div>

                                        {activeTab === "open" ? (
                                            generalOpenOrders.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center h-full text-sm text-gray-600">
                                                    No Open Orders
                                                </div>
                                            ) : (
                                                <ul className="divide-y divide-gray-200 text-xs">
                                                    {generalOpenOrders.map((o) => {
                                                        const totalAmount = (parseFloat(o.targetSqrt) * parseFloat(o.amountIn)).toFixed(2);
                                                        const colorClass = o.orderType === 0 ? "text-green-600" : "text-red-600";
                                                        return (
                                                            <li
                                                                key={o.id}
                                                                className={`px-3 py-2 flex items-center justify-between font-medium ${colorClass}`}
                                                            >
                                                                {/* Target Price */}
                                                                <span className="flex-1 text-left">{parseFloat(o.targetSqrt).toFixed(5)}</span>

                                                                {/* Order Amount */}
                                                                <span className="flex-1 text-center">{o.amountIn}</span>

                                                                {/* Total Amount */}
                                                                <span className="flex-1 text-right">{totalAmount}</span>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>

                                            )
                                        ) : (
                                            orderHistory.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center h-full text-sm text-gray-600">
                                                    No History
                                                </div>
                                            ) : (
                                                <ul className="divide-y divide-gray-200 text-xs">
                                                    {orderHistory.map((o) => {
                                                        const totalAmount = (parseFloat(o.targetSqrt) * parseFloat(o.amountIn)).toFixed(2);
                                                        const isBuy = o.triggerAbove;
                                                        const colorClass = isBuy ? "text-green-600" : "text-red-600";

                                                        return (
                                                            <li
                                                                key={o.id}
                                                                className={`px-3 py-2 flex items-center justify-between font-medium ${colorClass}`}
                                                            >
                                                                <span className="flex-1 text-left">{parseFloat(o.targetSqrt).toFixed(5)}</span>
                                                                <span className="flex-1 text-center">{o.amountIn}</span>
                                                                <span className="flex-1 text-right">{totalAmount}</span>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>

                                            )
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="modern-card p-3 flex flex-col gap-3 text-xs rounded-xl border border-gray-200 bg-white">
                                <h2 className="text-sm font-semibold text-gray-800">Create Order</h2>

                                {/* --- FROM SECTION --- */}
                                <div className="relative group">   {/* 👈 added group here */}
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
                                                    className={`w-3 h-3 transition-transform ${isFromDropdownOpen ? "rotate-180" : ""
                                                        }`}
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

                                    {/* Hover buttons (now work) */}
                                    <div className="absolute -top-6 left-60 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        {[25, 50, 75, 100].map((pct) => (
                                            <button
                                                key={pct}
                                                onClick={() => {
                                                    const bal = parseFloat(fromToken.realBalance || "0");
                                                    const calcAmt = ((bal * pct) / 100).toFixed(6);
                                                    setFromAmount(calcAmt);
                                                }}
                                                className="px-2 py-0.5 rounded bg-gray-100 text-[10px] font-medium hover:bg-blue-600 hover:text-white"
                                            >
                                                {pct === 100 ? "MAX" : `${pct}%`}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Current Rate */}
                                    {currentRate && (
                                        <div className="text-[11px] text-gray-500 px-1 flex justify-between items-center pt-0.5">
                                            <div>
                                                1 {fromToken.symbol} = {currentRate} {toToken.symbol}
                                            </div>
                                            <div>
                                                Balance:{" "}
                                                {fromToken.balance ? fromToken.balance.toFixed(3) : "0.000"}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* --- SWAP BUTTON --- */}
                                <div className="flex justify-center -my-1">
                                    <button
                                        onClick={handleSwapTokens}
                                        className="p-1 rounded-full hover:bg-gray-100 transition"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="28"
                                            height="29"
                                            fill="none"
                                        >
                                            <path
                                                fill="#000"
                                                d="M19.876.5H8.138C3.04.5 0 3.538 0 8.634v11.718c0 5.11 3.04 8.148 8.138 8.148h11.724C24.96 28.5 28 25.462 28 20.366V8.634C28.014 3.538 24.974.5 19.876.5Zm-7.284 21c0 .14-.028.266-.084.406a1.095 1.095 0 0 1-.574.574 1.005 1.005 0 0 1-.406.084 1.056 1.056 0 0 1-.743-.308l-4.132-4.13a1.056 1.056 0 0 1 0-1.484 1.057 1.057 0 0 1 1.485 0l2.34 2.338V7.5c0-.574.476-1.05 1.05-1.05.574 0 1.064.476 1.064 1.05v14Zm8.755-9.128a1.04 1.04 0 0 1-.743.308 1.04 1.04 0 0 1-.742-.308l-2.34-2.338V21.5c0 .574-.475 1.05-1.05 1.05-.574 0-1.05-.476-1.05-1.05v-14c0-.14.028-.266.084-.406.112-.252.308-.462.574-.574a.99.99 0 0 1 .798 0c.127.056.238.126.337.224l4.132 4.13c.406.42.406 1.092 0 1.498Z"
                                            />
                                        </svg>
                                    </button>
                                </div>

                                {/* --- TO SECTION --- */}
                                <div>
                                    <div className="modern-input px-2 py-1.5 w-full flex items-center gap-2 border border-gray-200 rounded-md">
                                        <input
                                            type="number"
                                            value={toAmount}
                                            readOnly
                                            placeholder="0.0"
                                            className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
                                        />
                                        <div className="relative" ref={toDropdownRef}>
                                            <button
                                                onClick={() => setIsToDropdownOpen(!isToDropdownOpen)}
                                                className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-gray-100"
                                            >
                                                <img src={toToken.img} alt={toToken.symbol} className="w-4 h-4 rounded-full" />
                                                <span>{toToken.symbol}</span>
                                                <ChevronDown className={`w-3 h-3 transition-transform ${isToDropdownOpen ? "rotate-180" : ""}`} />
                                            </button>

                                            {isToDropdownOpen && (
                                                <ul className="absolute right-0 mt-1 w-40 max-h-40 overflow-y-auto bg-white rounded-md shadow-lg z-50 border border-gray-200">
                                                    {TOKENS.filter((t) => t.symbol !== fromToken.symbol).map((t) => (
                                                        <li
                                                            key={t.symbol}
                                                            onClick={() => handleTokenSelect(t, false)}
                                                            className="flex items-center px-2 py-1 hover:bg-gray-50 cursor-pointer"
                                                        >
                                                            <img src={t.img} className="w-4 h-4 mr-2 rounded-full" alt={t.symbol} />
                                                            {t.symbol}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>

                                    {currentRate && (
                                        <div className="text-[11px] text-gray-500 px-1 flex justify-between items-center pt-0.5">
                                            <div>
                                                1 {toToken.symbol} = {(1 / parseFloat(currentRate)).toFixed(8)} {fromToken.symbol}
                                            </div>
                                            <div>
                                                Balance: {toToken.balance ? toToken.balance.toFixed(3) : "0.000"}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* --- TARGET PRICE + EXPIRY --- */}
                                <div className="grid grid-cols-2 gap-2">
                                    {/* Target / Expiration / Current Rate */}
                                    <div className="flex flex-col">
                                        <span className="text-gray-500">Target</span>
                                        <input
                                            type="number"
                                            step="0.00000001"
                                            value={targetPrice}
                                            onChange={(e) => {
                                                const input = e.target.value;
                                                setTargetPrice(input);
                                            }}
                                            placeholder="0.0"
                                            className={`border rounded px-2 py-1 text-center font-medium text-xs  
                                                }`}
                                        />

                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-[11px] text-gray-500">Expiry</label>
                                        <div className="border border-gray-200 rounded-md px-2 py-1 bg-gray-50 text-center text-[11px]">
                                            {new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>

                                {/* --- BUY / SELL BUTTONS --- */}
                                <div className="flex gap-2 mt-1">
                                    <button
                                        onClick={() => handleCreateOrder(true)}
                                        disabled={isCreatingBuy}
                                        className={`flex-1 py-1.5 rounded-md font-semibold text-white text-xs transition ${isCreatingBuy ? 'bg-green-400 cursor-wait' : 'bg-green-600 hover:bg-green-700'
                                            }`}
                                    >
                                        {isCreatingBuy ? 'Processing…' : `Buy ${fromToken.symbol}`}
                                    </button>

                                    <button
                                        onClick={() => handleCreateOrder(false)}
                                        disabled={isCreatingSell}
                                        className={`flex-1 py-1.5 rounded-md font-semibold text-white text-xs transition ${isCreatingSell ? 'bg-red-400 cursor-wait' : 'bg-red-600 hover:bg-red-700'
                                            }`}
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