import { ChevronDown, Settings, Wallet, Loader2, CircleHelp, ArrowRightLeft, ArrowUpDown, X } from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { TOKENS } from '../utils/SwapTokens'
import { useSwap } from '../hooks/useSwap'

interface Token {
    symbol: string
    name: string
    img: string
    balance: number
    realBalance?: string
}

const Converter = () => {
    const { getQuote, swapExactInputSingle, getTokenBalance } = useSwap()
    const { account } = useWallet()

    const [tokens, setTokens] = useState<Token[]>(
        TOKENS.map((t) => ({ ...t, balance: 0, realBalance: '0' }))
    )

    const usdtToken = TOKENS.find(t => t.symbol.toUpperCase() === 'USDT') || tokens[1];
    const usdtTokenFormatted: Token = usdtToken ? { ...usdtToken, balance: usdtToken.balance ?? 0, realBalance: '0' } : tokens[1];

    const [fromToken, setFromToken] = useState<Token>(tokens[1])
    const [toToken, setToToken] = useState<Token>(usdtTokenFormatted) // Fixed to USDT
    const [fromAmount, setFromAmount] = useState('')
    const [toAmount, setToAmount] = useState('')
    const [slippageTolerance, setSlippageTolerance] = useState(1)
    const [exchangeRate, setExchangeRate] = useState(0)
    const [isSwapping, setIsSwapping] = useState(false)
    const [isLoadingQuote, setIsLoadingQuote] = useState(false)

    // UI States
    const [isFromDropdownOpen, setIsFromDropdownOpen] = useState(false)
    const [showSettings, setShowSettings] = useState(false)

    const fromDropdownRef = useRef<HTMLDivElement>(null)

    // 1. Fetch Balances
    const updateBalances = useCallback(async () => {
        if (!account) return
        const updated = await Promise.all(
            tokens.map(async (t) => {
                const realBalance = await getTokenBalance(t.symbol as any).catch(() => '0')
                return { ...t, realBalance, balance: parseFloat(realBalance) }
            })
        )
        setTokens(updated)
        // Preserve selected tokens but update their balance data
        setFromToken(prev => updated.find(t => t.symbol === prev.symbol) || updated[0])
        setToToken(prev => updated.find(t => t.symbol === prev.symbol) || updated[1])
    }, [account, getTokenBalance])

    useEffect(() => { updateBalances() }, [account, updateBalances])

    // 2. Fetch Quote
    const fetchQuote = useCallback(async (amount: string) => {
        if (!amount || parseFloat(amount) <= 0) {
            setToAmount(''); setExchangeRate(0); return;
        }

        setIsLoadingQuote(true)
        try {
            const quote = await getQuote({
                fromSymbol: fromToken.symbol as 'skybnb' | 'USDT',
                toSymbol: toToken.symbol as 'skybnb' | 'USDT',
                amountIn: amount,
            })
            setToAmount(quote.amountOut)
            setExchangeRate(parseFloat(quote.amountOut) / parseFloat(amount))
        } catch (e) {
            console.error('Quote error:', e)
            setToAmount('0')
            setExchangeRate(0)
        } finally {
            setIsLoadingQuote(false)
        }
    }, [fromToken.symbol, toToken.symbol, getQuote])

    useEffect(() => {
        if (fromAmount && fromToken.symbol !== toToken.symbol) {
            const timeout = setTimeout(() => fetchQuote(fromAmount), 500); // Debounce
            return () => clearTimeout(timeout);
        }
    }, [fromAmount, fromToken.symbol, toToken.symbol])

    // 3. Handle Swap
    const handleSwap = async () => {
        if (!account) return
        if (!fromAmount || parseFloat(fromAmount) <= 0) return alert('Enter a valid amount')

        setIsSwapping(true)
        try {
            const receipt = await swapExactInputSingle({
                fromSymbol: fromToken.symbol as 'skybnb' | 'USDT',
                toSymbol: toToken.symbol as 'skybnb' | 'USDT',
                amountIn: fromAmount,
                slippageTolerance: Math.floor(slippageTolerance * 100),
            })
            alert(`Swap successful! Tx: ${receipt.hash}`)
            setFromAmount(''); setToAmount(''); setExchangeRate(0);
            setTimeout(updateBalances, 3000)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            alert(`Swap failed: ${msg}`)
        } finally {
            setIsSwapping(false)
        }
    }

    // 4. Utils
    const switchTokens = () => {
        setFromToken(toToken); setToToken(fromToken);
        setFromAmount(toAmount); setToAmount(fromAmount);
    }

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node
            if (fromDropdownRef.current && !fromDropdownRef.current.contains(target)) setIsFromDropdownOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="w-full">
            <div className="modern-card w-full px-4 py-6 md:px-8 md:py-8 bg-white rounded-2xl border border-gray-100 shadow-sm">

                {/* Header: Tabs & Settings */}
                <div className="flex justify-between items-center mb-6">
                    <div className="bg-gray-100 p-1 rounded-lg inline-flex">
                        <Link to="/swap" className="px-4 py-2 rounded-md bg-white text-red-600 font-semibold text-sm shadow-sm">Exchange</Link>
                        <Link to="/pool" className="px-4 py-2 rounded-md text-gray-500 font-medium text-sm hover:text-gray-900 transition-colors">Pool</Link>
                    </div>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-red-50 text-red-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                    >
                        <Settings size={20} />
                    </button>
                </div>

                {/* Settings Panel */}
                {showSettings && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-5 m-4 animate-in zoom-in-95 duration-200 relative">

                            {/* Modal Header */}
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="font-bold text-gray-900 text-lg">Transaction Settings</h3>
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="p-1 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Setting: Slippage */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                    <span>Slippage Tolerance</span>
                                    <CircleHelp size={14} className="text-gray-400 cursor-help" xlinkTitle="Your transaction will revert if the price changes unfavorably by more than this percentage." />
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {[0.1, 0.5, 1.0, 2.0].map((val) => (
                                        <button
                                            key={val}
                                            onClick={() => setSlippageTolerance(val)}
                                            className={`flex-1 min-w-[60px] px-3 py-2.5 text-sm font-medium rounded-xl border transition-all ${slippageTolerance === val
                                                ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-100'
                                                : 'bg-white border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600'
                                                }`}
                                        >
                                            {val}%
                                        </button>
                                    ))}

                                    <div className="relative flex-[1.5] min-w-[80px]">
                                        <input
                                            type="number"
                                            value={slippageTolerance}
                                            onChange={(e) => setSlippageTolerance(parseFloat(e.target.value))}
                                            className={`w-full pl-3 pr-8 py-2.5 text-right rounded-xl border text-sm font-medium focus:outline-none transition-all ${![0.1, 0.5, 1.0, 2.0].includes(slippageTolerance)
                                                ? 'border-red-500 text-red-600 bg-red-50/50 ring-2 ring-red-100'
                                                : 'border-gray-200 text-gray-900 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                                                }`}
                                            placeholder="Custom"
                                        />
                                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium ${![0.1, 0.5, 1.0, 2.0].includes(slippageTolerance) ? 'text-red-600' : 'text-gray-400'
                                            }`}>
                                            %
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Save / Close Button (Optional, UX preference) */}
                            <button
                                onClick={() => setShowSettings(false)}
                                className="w-full mt-6 py-3 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-black transition-colors shadow-lg shadow-gray-200"
                            >
                                Save Settings
                            </button>
                        </div>
                        {/* Backdrop Click to Close */}
                        <div className="absolute inset-0 -z-10" onClick={() => setShowSettings(false)} />
                    </div>
                )}

                {/* Main Swap Area (Horizontal Layout) */}
                <div className="flex flex-col md:flex-row items-stretch gap-4 md:gap-6">

                    {/* FROM SECTION */}
                    <div className="flex-1 flex flex-col gap-3">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-sm font-medium text-gray-500">You Pay</span>
                            <span className="text-xs text-gray-400">
                                Available: <span className="text-gray-700 font-medium">{fromToken.balance.toFixed(4)}</span>
                            </span>
                        </div>

                        <div className="relative bg-gray-50 rounded-xl border border-gray-200 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-200 transition-all">
                            <div className="flex items-center p-3 gap-3">
                                <div className="relative" ref={fromDropdownRef}>
                                    <button
                                        onClick={() => setIsFromDropdownOpen(!isFromDropdownOpen)}
                                        className="flex items-center gap-2 bg-white pl-1 pr-3 py-1.5 rounded-full shadow-sm border border-gray-200 hover:bg-gray-50 transition-all shrink-0 min-w-[110px]"
                                    >
                                        <img src={fromToken.img} alt={fromToken.symbol} className="w-6 h-6 rounded-full" />
                                        <span className="font-semibold text-gray-900">{fromToken.symbol}</span>
                                        <ChevronDown size={16} className="text-gray-400 ml-auto" />
                                    </button>

                                    {isFromDropdownOpen && (
                                        <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                                            <div className="max-h-64 overflow-y-auto p-1">
                                                {tokens.filter(t => t.symbol !== toToken.symbol).map((token) => (
                                                    <button
                                                        key={token.symbol}
                                                        onClick={() => { setFromToken(token); setIsFromDropdownOpen(false); }}
                                                        className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg group"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <img src={token.img} alt={token.name} className="w-8 h-8 rounded-full border border-gray-100" />
                                                            <div className="text-left">
                                                                <div className="font-bold text-gray-900">{token.symbol}</div>
                                                                <div className="text-xs text-gray-500">{token.name}</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-sm font-medium text-gray-700">{token.balance > 0 ? token.balance.toFixed(2) : '0'}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="number"
                                    value={fromAmount}
                                    onChange={(e) => setFromAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-transparent text-right text-2xl font-bold text-gray-900 placeholder-gray-300 outline-none"
                                />
                            </div>
                        </div>

                        {/* Percentages */}
                        <div className="grid grid-cols-4 gap-2">
                            {[25, 50, 75, 100].map((pct) => (
                                <button
                                    key={pct}
                                    onClick={() => {
                                        const bal = parseFloat(fromToken.realBalance || '0')
                                        setFromAmount(((bal * pct) / 100).toFixed(6))
                                    }}
                                    className="py-1.5 rounded-lg bg-gray-50 text-xs font-semibold text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors border border-transparent hover:border-red-100"
                                >
                                    {pct === 100 ? 'MAX' : `${pct}%`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* SWITCH ARROW */}
                    <div className="flex items-center justify-center ">
                        <button
                            onClick={switchTokens}
                            className="p-3 rounded-full bg-gray-50 text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 transition-all shadow-sm active:scale-95"
                            aria-label="Switch tokens"
                        >
                            <ArrowRightLeft className="hidden md:block" size={20} />
                            <ArrowUpDown className="block md:hidden" size={20} />
                        </button>
                    </div>
                    {/* TO SECTION */}
                    <div className="flex-1 flex flex-col gap-3">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-sm font-medium text-gray-500">You Receive</span>
                            <span className="text-xs text-gray-400">
                                Balance: <span className="text-gray-700 font-medium">{toToken.balance.toFixed(4)}</span>
                            </span>
                        </div>

                        <div className="relative bg-gray-50 rounded-xl border border-gray-200 transition-all">
                            <div className="flex items-center p-3 gap-3">
                                <div className="flex items-center gap-2 bg-gray-100 pl-1 pr-3 py-1.5 rounded-full shadow-inner border border-gray-200 shrink-0 min-w-[110px] cursor-not-allowed opacity-80">
                                    <img src={toToken.img} alt={toToken.symbol} className="w-6 h-6 rounded-full grayscale-[0.2]" />
                                    <span className="font-semibold text-gray-800">{toToken.symbol}</span>
                                </div>

                                {isLoadingQuote ? (
                                    <div className="w-full flex justify-end">
                                        <Loader2 className="animate-spin text-gray-400" size={24} />
                                    </div>
                                ) : (
                                    <input
                                        type="number"
                                        value={toAmount}
                                        readOnly
                                        placeholder="0.00"
                                        className="w-full bg-transparent text-right text-2xl font-bold text-gray-900 placeholder-gray-300 outline-none cursor-default"
                                    />
                                )}
                            </div>
                        </div>

                        {/* Disabled Percentages (Placeholder for alignment) */}
                        <div className="grid grid-cols-4 gap-2 opacity-50 pointer-events-none">
                            {[25, 50, 75, 100].map((pct) => (
                                <div key={pct} className="py-1.5 rounded-lg bg-gray-50 text-xs font-semibold text-gray-400 text-center border border-transparent">
                                    {pct === 100 ? 'MAX' : `${pct}%`}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Info & Action Button */}
                <div className="mt-8 flex flex-col md:flex-row items-center gap-4">
                    <div className="flex-1 w-full">
                        <div className="flex justify-between md:flex-col md:items-start md:gap-1">
                            <span className="text-xs text-gray-500">Exchange Rate</span>
                            <div className="font-semibold text-gray-900">
                                {exchangeRate > 0
                                    ? `1 ${fromToken.symbol} ≈ ${exchangeRate.toFixed(6)} ${toToken.symbol}`
                                    : '--'}
                            </div>
                        </div>
                    </div>

                    <div className="flex-[2] w-full">
                        {!account ? (
                            <button className="w-full py-2.5 rounded-lg bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-all flex items-center justify-center gap-2">
                                <Wallet size={16} /> Connect Wallet
                            </button>
                        ) : (
                            <button
                                onClick={handleSwap}
                                disabled={isSwapping || !fromAmount || parseFloat(fromAmount) <= 0 || parseFloat(fromAmount) > fromToken.balance}
                                className={`w-full py-2.5 rounded-lg font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2
                                    ${(!fromAmount || parseFloat(fromAmount) <= 0 || parseFloat(fromAmount) > fromToken.balance)
                                        ? 'bg-gray-100 text-gray-400 shadow-none cursor-not-allowed'
                                        : 'bg-red-600 text-white hover:bg-red-700 shadow-red-200'
                                    }
                                `}
                            >
                                {isSwapping ? <><Loader2 className="animate-spin" size={16} /> Swapping...</> :
                                    parseFloat(fromAmount) > fromToken.balance ? `Insufficient ${fromToken.symbol}` :
                                        !fromAmount ? 'Enter Amount' : 'Swap Now'}
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}

export default Converter