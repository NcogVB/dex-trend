import { ChevronDown, CircleQuestionMarkIcon } from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import TradingDashboard from './TradingDashboard'
import { useSwap } from '../contexts/SwapContext'
import { useWallet } from '../contexts/WalletContext'

interface Token {
    symbol: string
    name: string
    img: string
    color: string
    balance: number
    realBalance?: string
}

const Converter = () => {
    const {
        getQuote,
        executeSwap,
        getTokenBalance,
    } = useSwap()
    const { account } = useWallet();
    console.log('Connection Status:', {
        account,
    })
    const [tokens, setTokens] = useState<Token[]>([
        {
            symbol: 'WPOL',
            name: 'Wrapped Polygon',
            img: '/images/pol.png',
            color: '#8247E5',
            balance: 0,
            realBalance: '0',
        },
        {
            symbol: 'USDC.e',
            name: 'USD Coin',
            img: '/images/stock-5.png',
            color: '#2775CA',
            balance: 0,
            realBalance: '0',
        },
    ])

    const [fromToken, setFromToken] = useState<Token>(tokens[0])
    const [toToken, setToToken] = useState<Token>(tokens[1])
    const [fromAmount, setFromAmount] = useState('')
    const [toAmount, setToAmount] = useState('')
    const [slippageTolerance, setSlippageTolerance] = useState(1)
    const [exchangeRate, setExchangeRate] = useState(0)
    const [isSwapping, setIsSwapping] = useState(false)
    const [isLoadingQuote, setIsLoadingQuote] = useState(false)
    const [isFromDropdownOpen, setIsFromDropdownOpen] = useState(false)
    const [isToDropdownOpen, setIsToDropdownOpen] = useState(false)

    const fromDropdownRef = useRef<HTMLDivElement>(null)
    const toDropdownRef = useRef<HTMLDivElement>(null)

    // Update balances from blockchain via context
    const updateBalances = useCallback(async () => {
        if (!account) return
        const updated = await Promise.all(
            tokens.map(async (t) => {
                const realBalance = await getTokenBalance(t.symbol as any).catch(
                    () => '0'
                )
                return { ...t, realBalance, balance: parseFloat(realBalance) }
            })
        )
        setTokens(updated)
        setFromToken(prev =>
            updated.find((t) => t.symbol === prev.symbol) || updated[0]
        )
        setToToken(prev =>
            updated.find((t) => t.symbol === prev.symbol) || updated[1]
        )
    }, [account, getTokenBalance])

    // Fetch quote using context
    const fetchQuote = useCallback(
        async (amount: string) => {
            if (!amount || parseFloat(amount) <= 0) {
                setToAmount('')
                setExchangeRate(0)
                return
            }

            const startTime = Date.now()
            setIsLoadingQuote(true)

            try {
                const quote = await getQuote({
                    fromSymbol: fromToken.symbol as "WPOL" | "USDC.e",
                    toSymbol: toToken.symbol as "WPOL" | "USDC.e",
                    amountIn: amount,
                })

                setToAmount(quote.amountOut)
                const rate = parseFloat(quote.amountOut) / parseFloat(amount)
                setExchangeRate(rate)
            } catch (e) {
                console.error('Quote error:', e)
                setToAmount('0')
                setExchangeRate(0)
            } finally {
                // ensure at least 500ms visible loading
                const elapsed = Date.now() - startTime
                const delay = elapsed < 500 ? 500 - elapsed : 0
                setTimeout(() => setIsLoadingQuote(false), delay)
            }
        },
        [fromToken.symbol, toToken.symbol, getQuote]
    )

    // Handle swap
    const handleSwap = async () => {
        if (!account) {
            return
        }
        if (!fromAmount || parseFloat(fromAmount) <= 0) {
            alert('Enter a valid amount')
            return
        }
        setIsSwapping(true)
        try {
            const receipt = await executeSwap({
                fromSymbol: fromToken.symbol as "WPOL" | "USDC.e",
                toSymbol: toToken.symbol as "WPOL" | "USDC.e",
                amountIn: fromAmount,
                slippageTolerance: slippageTolerance,
            })
            alert(`Swap successful! Tx hash: ${receipt.hash}`)
            setFromAmount('')
            setToAmount('')
            setExchangeRate(0)
            setTimeout(updateBalances, 3000)
        } catch (err: unknown) {
            console.error('Swap failed', err)
            const errorMessage =
                err instanceof Error ? err.message : String(err)
            alert(`Swap failed: ${errorMessage}`)
        } finally {
            setIsSwapping(false)
        }
    }

    // Effects
    useEffect(() => {
        if (account) updateBalances()
    }, [account, updateBalances])
    useEffect(() => {
        if (fromAmount && fromToken.symbol !== toToken.symbol) {
            fetchQuote(fromAmount)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fromAmount, fromToken.symbol, toToken.symbol])

    // Dropdown close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node
            if (
                fromDropdownRef.current &&
                !fromDropdownRef.current.contains(target)
            )
                setIsFromDropdownOpen(false)
            if (
                toDropdownRef.current &&
                !toDropdownRef.current.contains(target)
            )
                setIsToDropdownOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () =>
            document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="mt-[150px] mb-[150px] w-full p-[3.5px] md:rounded-[12px] rounded-[12px]">
            <TradingDashboard />
            <div className="modern-card w-full px-[20px] md:px-[40px] py-[30px] md:py-[40px]">
                {/* Top tabs */}
                <div className="relative z-10 bg-[#F8F8F8] inline-flex px-2 py-1.5 rounded-[8px] border border-[#E5E5E5] mb-6 gap-1">
                    <Link
                        to="/swap"
                        className="rounded-[6px] bg-white text-[#DC2626] font-semibold text-sm px-[20px] py-[10px] cursor-pointer shadow-sm"
                    >
                        Exchange
                    </Link>
                    <Link
                        to="/pool"
                        className="rounded-[6px] text-[#888888] font-medium text-sm px-[20px] py-[10px] cursor-pointer hover:text-[#333333] transition-colors"
                    >
                        Pool
                    </Link>
                </div>

                {!account && (
                    <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-800">
                        Connect your wallet to start trading
                    </div>
                )}

                {/* Swap UI */}
                <div className="flex flex-col md:flex-row items-center gap-[25px] md:gap-[51px]">
                    {/* From */}
                    <div className="flex-1 w-full">
                        <div className="modern-input flex justify-between items-center px-[16px] py-[16px]">
                            <input
                                type="number"
                                value={fromAmount}
                                onChange={(e) => setFromAmount(e.target.value)}
                                placeholder="0.000"
                                className="text-[#333333] font-semibold text-[20px] bg-transparent border-none outline-none flex-1 mr-4 placeholder-[#888888]"
                            />
                            <div
                                ref={fromDropdownRef}
                                className="relative min-w-[95px]"
                            >
                                <button
                                    onClick={() =>
                                        setIsFromDropdownOpen((o) => !o)
                                    }
                                    className="w-full flex items-center cursor-pointer hover:bg-[#F8F8F8] rounded-[6px] p-2 transition-colors"
                                >
                                    <img
                                        src={fromToken.img}
                                        alt={fromToken.name}
                                        className="rounded-full size-[23px]"
                                    />
                                    <span className="ml-3 mr-8">
                                        {fromToken.symbol}
                                    </span>
                                    <ChevronDown
                                        className={`transition-transform ${isFromDropdownOpen ? 'rotate-180' : ''}`}
                                    />
                                </button>
                                {isFromDropdownOpen && (
                                    <ul className="modern-dropdown absolute z-10 mt-1 w-full max-h-48 overflow-auto">
                                        {tokens
                                            .filter(
                                                (t) =>
                                                    t.symbol !== toToken.symbol
                                            )
                                            .map((token) => (
                                                <li
                                                    key={token.symbol}
                                                    onClick={() => {
                                                        setFromToken(token)
                                                        setIsFromDropdownOpen(
                                                            false
                                                        )
                                                    }}
                                                    className="modern-dropdown-item flex items-center"
                                                >
                                                    <img
                                                        src={token.img}
                                                        alt={token.name}
                                                        className="w-6 h-6 mr-2"
                                                    />
                                                    <div>
                                                        <div>
                                                            {token.symbol}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {token.balance.toFixed(
                                                                4
                                                            )}
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                        <div className="mt-4 flex gap-3 percentage-redio-buttons">
                            {' '}
                            {[25, 50, 75, 100].map((pct) => (
                                <button
                                    key={pct}
                                    onClick={() => {
                                        const bal = parseFloat(
                                            fromToken.realBalance || '0'
                                        )
                                        const calcAmt = (
                                            (bal * pct) /
                                            100
                                        ).toFixed(6)
                                        setFromAmount(calcAmt)
                                    }}
                                    className="cursor-pointer w-full block bg-[#F8F8F8] border border-[#E5E5E5] rounded-[6px] py-[8px] text-[14px] font-medium text-[#888888] text-center hover:bg-[#DC2626] hover:text-white transition-colors peer-checked:bg-[#DC2626] peer-checked:text-white"
                                >
                                    {pct === 100 ? 'MAX' : `${pct}%`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Swap arrows */}
                    <div>
                        <button
                            onClick={() => {
                                const t = fromToken
                                setFromToken(toToken)
                                setToToken(t)
                                const a = fromAmount
                                setFromAmount(toAmount)
                                setToAmount(a)
                            }}
                            className="hover:bg-gray-100 p-2 rounded-full"
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

                    {/* To */}
                    <div className="flex-1 w-full">
                        <div className="modern-input flex justify-between items-center px-[16px] py-[16px]">
                            <input
                                type="number"
                                value={toAmount}
                                readOnly
                                placeholder="0.000"
                                className="text-[#333333] font-semibold text-[20px] bg-transparent border-none outline-none flex-1 mr-4 placeholder-[#888888]"
                            />
                            <div
                                ref={toDropdownRef}
                                className="relative min-w-[95px]"
                            >
                                <button
                                    onClick={() =>
                                        setIsToDropdownOpen((o) => !o)
                                    }
                                    className="w-full flex items-center cursor-pointer hover:bg-[#F8F8F8] rounded-[6px] p-2 transition-colors"
                                >
                                    <img
                                        src={toToken.img}
                                        alt={toToken.name}
                                        className="rounded-full size-[23px]"
                                    />
                                    <span className="ml-3 mr-8">
                                        {toToken.symbol}
                                    </span>
                                    <ChevronDown
                                        className={`transition-transform ${isToDropdownOpen ? 'rotate-180' : ''}`}
                                    />
                                </button>
                                {isToDropdownOpen && (
                                    <ul className="modern-dropdown absolute z-10 mt-1 w-full max-h-48 overflow-auto">
                                        {tokens
                                            .filter(
                                                (t) =>
                                                    t.symbol !==
                                                    fromToken.symbol
                                            )
                                            .map((token) => (
                                                <li
                                                    key={token.symbol}
                                                    onClick={() => {
                                                        setToToken(token)
                                                        setIsToDropdownOpen(
                                                            false
                                                        )
                                                    }}
                                                    className="modern-dropdown-item flex items-center"
                                                >
                                                    <img
                                                        src={token.img}
                                                        alt={token.name}
                                                        className="w-6 h-6 mr-2"
                                                    />
                                                    <div>
                                                        <div>
                                                            {token.symbol}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {token.balance.toFixed(
                                                                4
                                                            )}
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                        <div className="mt-4 flex gap-3 percentage-redio-buttons">
                            {' '}
                            {[25, 50, 75, 100].map((pct) => (
                                <button
                                    key={pct}
                                    onClick={() => {
                                        const bal = parseFloat(
                                            toToken.realBalance || '0'
                                        )
                                        const calcAmt = (
                                            (bal * pct) /
                                            100
                                        ).toFixed(6)
                                        setToAmount(calcAmt)
                                    }}
                                    className="cursor-pointer w-full block bg-[#F8F8F8] border border-[#E5E5E5] rounded-[6px] py-[8px] text-[14px] font-medium text-[#888888] text-center hover:bg-[#DC2626] hover:text-white transition-colors peer-checked:bg-[#DC2626] peer-checked:text-white"
                                >
                                    {pct === 100 ? 'MAX' : `${pct}%`}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Info */}
                <div className="mt-[36px] modern-card px-[20px] py-[20px] flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex-1 text-center md:text-left">
                        <span className="text-[#888888] text-sm">
                            Exchange Rate
                        </span>
                        <p className="text-[#333333] font-semibold text-[18px] mt-2">
                            {exchangeRate > 0
                                ? `1 ${fromToken.symbol} = ${exchangeRate.toFixed(8)} ${toToken.symbol}`
                                : '--'}
                        </p>
                    </div>

                    <div className="flex-1 text-center md:text-right">
                        <span className="flex items-center justify-center md:justify-end gap-2 text-[#888888] text-sm">
                            Slippage Tolerance{' '}
                            <CircleQuestionMarkIcon size={16} />
                        </span>
                        <div className="flex items-center justify-center md:justify-end mt-2">
                            <input
                                type="number"
                                value={slippageTolerance}
                                onChange={(e) =>
                                    setSlippageTolerance(
                                        parseFloat(e.target.value) || 1
                                    )
                                }
                                className="font-semibold text-[18px] text-[#DC2626] bg-transparent border-none outline-none w-12 text-right"
                            />
                            %
                        </div>
                    </div>
                </div>

                {/* Swap button */}
                <button
                    onClick={handleSwap}
                    disabled={isSwapping || !fromAmount || parseFloat(fromAmount) <= 0}
                    className="modern-button mt-[25px] md:mt-[40px] w-full p-[16px] text-center disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {isSwapping ? (
                        "Swapping..."
                    ) : !account ? (
                        "Connect Wallet"
                    ) : (
                        <>
                            Exchange
                            {isLoadingQuote && <span className="ml-2 animate-spin">⏳</span>}
                        </>
                    )}
                </button>

            </div>
        </div>
    )
}

export default Converter
