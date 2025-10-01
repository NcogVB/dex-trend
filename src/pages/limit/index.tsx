import { useEffect, useRef, useState } from 'react'
import TradingDashboard from '../../components/TradingDashboard'
import { ChevronDown } from 'lucide-react'
import { useOrder } from '../../contexts/OrderLimitContext'
import { useSwap } from '../../contexts/SwapContext'
import { tokens } from './Tokens'

interface Token {
    symbol: string
    name: string
    img: string
    color: string
    balance: number
    address: string
}

const Limit = () => {
    const { createOrder, loading } = useOrder()
    const { getQuote } = useSwap()

    const [isCreatingOrder, setIsCreatingOrder] = useState<boolean>(false)

    const [fromToken, setFromToken] = useState<Token>(tokens[0])
    const [toToken, setToToken] = useState<Token>(tokens[1])
    const [fromAmount, setFromAmount] = useState<string>('')
    const [toAmount, setToAmount] = useState<string>('')
    const [targetPrice, setTargetPrice] = useState<string>("");
    const [targetError, setTargetError] = useState<string>("");
    const [isFromDropdownOpen, setIsFromDropdownOpen] = useState<boolean>(false)
    const [isToDropdownOpen, setIsToDropdownOpen] = useState<boolean>(false)
    const fromDropdownRef = useRef<HTMLDivElement>(null)
    const toDropdownRef = useRef<HTMLDivElement>(null)

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
    const handleCreateOrder = async (): Promise<void> => {
        if (isCreatingOrder) return

        if (!fromAmount || !toAmount) {
            alert('Please enter valid amounts')
            return
        }

        setIsCreatingOrder(true)
        try {

            await createOrder({
                tokenIn: fromToken.address,
                tokenOut: toToken.address,
                amountIn: fromAmount,
                amountOutMin: (parseFloat(toAmount) * (1 - 1 / 100)).toFixed(6), // Apply slippage
                targetSqrtPriceX96: targetPrice, // Pass the ratio, not sqrt price
                triggerAbove: true,
                ttlSeconds: 86400, // 24 hours
            })

            alert('Order created successfully!')

            // Reset form
            setFromAmount('')
            setToAmount('')

        } catch (err: unknown) {
            const errorMessage =
                err instanceof Error ? err.message : String(err)
            alert(`Failed to create order: ${errorMessage}`)
            console.error('Order creation error:', err)
        } finally {
            setIsCreatingOrder(false)
        }
    }
    return (
        <div>
            <div className="hero-section">
                <div className="flex-grow flex flex-col items-center px-4 pt-[40px] md:pt-[88px] container mx-auto w-full">
                    <div className="w-full">
                        <TradingDashboard fullScreen showOrders pair={`${fromToken.symbol}${toToken.symbol}`} // 👈 build pair dynamically
                        />
                        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                            {/* === Left: Limit Order Form === */}
                            <div className="modern-card px-6 py-6 flex flex-col gap-6 ">
                                <h2 className="text-lg sm:text-xl font-semibold text-[#111]">Create Order</h2>

                                {/* From Token Section */}
                                <div className="modern-input px-3 py-2 w-full">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={fromAmount}
                                            onChange={(e) => handleAmountChange(e.target.value)}
                                            placeholder="0.000"
                                            className="flex-1 font-semibold text-lg bg-transparent border-none outline-none placeholder-[#888]"
                                        />
                                        <div className="relative" ref={fromDropdownRef}>
                                            <button
                                                onClick={() => setIsFromDropdownOpen(!isFromDropdownOpen)}
                                                className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100"
                                            >
                                                <img src={fromToken.img} alt={fromToken.symbol} className="w-6 h-6 rounded-full" />
                                                <span>{fromToken.symbol}</span>
                                                <ChevronDown className={`transition-transform ${isFromDropdownOpen ? "rotate-180" : ""}`} />
                                            </button>
                                            {isFromDropdownOpen && (
                                                <ul
                                                    className="absolute left-0 right-0 mt-1 w-full max-h-48 overflow-y-auto bg-white rounded shadow-lg z-50 text-sm
scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
                                                    role="listbox"
                                                >                                                    {tokens
                                                    .filter((t) => t.symbol !== toToken.symbol)
                                                    .map((t) => (
                                                        <li
                                                            key={t.symbol}
                                                            onClick={() => handleTokenSelect(t, true)}
                                                            className="modern-dropdown-item flex items-center"
                                                        >
                                                            <img src={t.img} className="w-5 h-5 mr-2" alt={t.symbol} />
                                                            {t.symbol}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Swap Button */}
                                <div className="flex justify-center">
                                    <button
                                        onClick={handleSwapTokens}
                                        className="p-2 rounded-full hover:bg-gray-100 transition"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="25" fill="none">
                                            <path
                                                fill="#000"
                                                d="M19.876.5H8.138C3.04.5 0 3.538 0 8.634v11.718c0 5.11 3.04 8.148 8.138 8.148h11.724C24.96 28.5 28 25.462 28 20.366V8.634C28.014 3.538 24.974.5 19.876.5Zm-7.284 21c0 .14-.028.266-.084.406a1.095 1.095 0 0 1-.574.574 1.005 1.005 0 0 1-.406.084 1.056 1.056 0 0 1-.743-.308l-4.132-4.13a1.056 1.056 0 0 1 0-1.484 1.057 1.057 0 0 1 1.485 0l2.34 2.338V7.5c0-.574.476-1.05 1.05-1.05.574 0 1.064.476 1.064 1.05v14Zm8.755-9.128a1.04 1.04 0 0 1-.743.308 1.04 1.04 0 0 1-.742-.308l-2.34-2.338V21.5c0 .574-.475 1.05-1.05 1.05-.574 0-1.05-.476-1.05-1.05v-14c0-.14.028-.266.084-.406.112-.252.308-.462.574-.574a.99.99 0 0 1 .798 0c.127.056.238.126.337.224l4.132 4.13c.406.42.406 1.092 0 1.498Z"
                                            />
                                        </svg>
                                    </button>
                                </div>

                                {/* To Token Section */}
                                <div className="modern-input px-3 py-2 w-full">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={toAmount}
                                            onChange={(e) => handleAmountChange(e.target.value)}
                                            placeholder="0.000"
                                            className="flex-1 font-semibold text-lg bg-transparent border-none outline-none placeholder-[#888]"
                                        />
                                        <div className="relative overflow-visible" ref={toDropdownRef}>
                                            <button
                                                onClick={() => setIsToDropdownOpen(!isToDropdownOpen)}
                                                className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100"
                                            >
                                                <img
                                                    src={toToken.img}
                                                    alt={toToken.symbol}
                                                    className="w-6 h-6 rounded-full"
                                                />
                                                <span>{toToken.symbol}</span>
                                                <ChevronDown
                                                    className={`transition-transform ${isToDropdownOpen ? "rotate-180" : ""}`}
                                                />
                                            </button>

                                            {isToDropdownOpen && (
                                                <ul
                                                    className="absolute left-0 right-0 mt-1 w-full max-h-48 overflow-y-auto bg-white rounded shadow-lg z-50 text-sm
                 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
                                                    role="listbox"
                                                >
                                                    {tokens
                                                        .filter((t) => t.symbol !== fromToken.symbol)
                                                        .map((t) => (
                                                            <li
                                                                key={t.symbol}
                                                                onClick={() => handleTokenSelect(t, false)}
                                                                className="flex items-center cursor-pointer px-3 py-2 hover:bg-gray-100 rounded"
                                                            >
                                                                <img src={t.img} className="w-5 h-5 mr-2" alt={t.symbol} />
                                                                <span>{t.symbol}</span>
                                                            </li>
                                                        ))}
                                                </ul>
                                            )}
                                        </div>

                                    </div>
                                </div>

                                {/* Target / Expiration / Current Rate */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="flex flex-col text-center">
                                        <span className="text-xs text-gray-500">Target Price</span>
                                        <input
                                            type="number"
                                            step="0.00000001"
                                            value={targetPrice}
                                            onChange={(e) => {
                                                const input = e.target.value;
                                                setTargetPrice(input);
                                                const currentRate = toAmount
                                                    ? parseFloat(toAmount) / parseFloat(fromAmount || "1")
                                                    : 0;
                                                if (parseFloat(input) < currentRate) {
                                                    setTargetError(`Target must be ≥ ${currentRate.toFixed(8)}`);
                                                } else {
                                                    setTargetError("");
                                                }
                                            }}
                                            placeholder="Set target"
                                            className={`mt-1 border rounded-md px-2 py-2 text-center font-semibold ${targetError ? "border-red-500 text-red-600" : "border-gray-300"
                                                }`}
                                        />
                                        {targetError && <p className="text-xs text-red-500 mt-1">{targetError}</p>}
                                    </div>

                                    <div className="flex flex-col text-center">
                                        <span className="text-xs text-gray-500">Expiration</span>
                                        <p className="mt-1 font-semibold text-[16px]">
                                            {new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString()}
                                        </p>
                                    </div>

                                    <div className="flex flex-col text-center">
                                        <span className="text-xs text-gray-500">Current Rate</span>
                                        <p className="mt-1 font-semibold text-[16px]">
                                            {toAmount
                                                ? (parseFloat(toAmount) / parseFloat(fromAmount || "1")).toFixed(8)
                                                : "0.00000000"}
                                        </p>
                                    </div>
                                </div>

                                {/* Place Order */}
                                <button
                                    onClick={handleCreateOrder}
                                    disabled={!fromAmount || !toAmount || loading || isCreatingOrder || !targetPrice}
                                    className={`w-full py-3 rounded-lg font-semibold transition ${!fromAmount || !toAmount || loading || isCreatingOrder || !targetPrice
                                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                        : "bg-blue-600 hover:bg-blue-700 text-white"
                                        }`}
                                >
                                    {isCreatingOrder ? "Placing Order..." : "Place Limit Order"}
                                </button>
                            </div>

                            {/* === Right: Active Orders === */}
                            <div className="modern-card px-6 py-6 flex flex-col h-full">
                                <h2 className="text-lg sm:text-xl font-semibold text-[#111] mb-3">Active Orders</h2>
                                <div className="bg-[#F9FAFB] border border-[#E5E5E5] rounded-lg p-4 flex-1 overflow-y-auto max-h-[70vh]">
                                    <ul className="space-y-3">
                                        <li className="flex justify-between items-center bg-white rounded-md p-3 shadow-sm">
                                            <div>
                                                <p className="text-sm font-medium">#1 USDC → USDT</p>
                                                <p className="text-xs text-gray-500">1.5 USDC in | min 2200 USDT out</p>
                                            </div>
                                            <button className="px-3 py-1 text-xs font-medium rounded bg-red-100 text-red-600 hover:bg-red-200">
                                                Cancel
                                            </button>
                                        </li>
                                        <li className="flex justify-between items-center bg-white rounded-md p-3 shadow-sm">
                                            <div>
                                                <p className="text-sm font-medium">#2 BTC → USDC</p>
                                                <p className="text-xs text-gray-500">0.2 BTC in | min 3.2 USDC out</p>
                                            </div>
                                            <button className="px-3 py-1 text-xs font-medium rounded bg-red-100 text-red-600 hover:bg-red-200">
                                                Cancel
                                            </button>
                                        </li>
                                        <li className="flex justify-between items-center bg-white rounded-md p-3 shadow-sm">
                                            <div>
                                                <p className="text-sm font-medium">#3 USDC → MATIC</p>
                                                <p className="text-xs text-gray-500">500 USDC in | min 800 MATIC out</p>
                                            </div>
                                            <button className="px-3 py-1 text-xs font-medium rounded bg-red-100 text-red-600 hover:bg-red-200">
                                                Cancel
                                            </button>
                                        </li>
                                    </ul>
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
