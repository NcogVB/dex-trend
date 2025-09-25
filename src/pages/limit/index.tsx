import { useEffect, useRef, useState } from 'react'
import TradingDashboard from '../../components/TradingDashboard'
import { ChevronDown, CircleQuestionMarkIcon } from 'lucide-react'
import EarnPassiveIncomeSection from '../../components/EarnPassiveIncomeSection'
import AskExpertsSection from '../../components/AskExpertsSection'
import JoinCommunity from '../../components/JoinCommunity'
import { useOrder } from '../../contexts/OrderLimitContext'
import WalletModal from '../../components/WalletModel'

interface Token {
    symbol: string
    name: string
    img: string
    color: string
    balance: number
    address: string
}

const Limit = () => {
    const { quote, getQuote, createOrder, loading } = useOrder()
    const [isCreatingOrder, setIsCreatingOrder] = useState<boolean>(false)
    const tokens: Token[] = [
        {
            symbol: 'WPOL',
            name: 'Wrapped Polygon',
            img: '/images/pol.png',
            color: '#8247E5',
            balance: 1000.5,
            address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
        },
        {
            symbol: 'USDC.e',
            name: 'USD Coin (PoS)',
            img: 'https://polygonscan.com/token/images/centre-usdc_28.png',
            color: '#2775CA',
            balance: 2500.75,
            address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        },
    ]

    const [fromToken, setFromToken] = useState<Token>(tokens[0])
    const [toToken, setToToken] = useState<Token>(tokens[1])
    const [fromAmount, setFromAmount] = useState<string>('')
    const [toAmount, setToAmount] = useState<string>('')
    const [isFromDropdownOpen, setIsFromDropdownOpen] = useState<boolean>(false)
    const [isToDropdownOpen, setIsToDropdownOpen] = useState<boolean>(false)
    const [slippageTolerance, setSlippageTolerance] = useState<number>(1)

    const fromDropdownRef = useRef<HTMLDivElement>(null)
    const toDropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (
            fromAmount &&
            !isNaN(Number(fromAmount)) &&
            parseFloat(fromAmount) > 0
        ) {
            const handler = setTimeout(() => {
                const decimals =
                    fromToken.address.toLowerCase() ===
                    '0x2791bca1f2de4661ed88a30c99a7a9449aa84174'.toLowerCase()
                        ? 6 // USDC
                        : 18 // WPOL and others

                const amountInUnits = (
                    parseFloat(fromAmount) * Math.pow(10, decimals)
                ).toString()

                getQuote(fromToken.address, toToken.address, amountInUnits)
            }, 500)

            return () => clearTimeout(handler)
        } else {
            setToAmount('')
        }
    }, [fromAmount, fromToken, toToken, getQuote])

    useEffect(() => {
        if (quote?.outputAmount) {
            console.log('quote', quote)
            setToAmount(quote?.outputAmount)
        }
    }, [quote])

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

        if (!fromAmount || !toAmount || !quote) {
            alert('Please enter valid amounts')
            return
        }

        setIsCreatingOrder(true)
        try {
            const fromDecimals =
                fromToken.address.toLowerCase() ===
                '0x2791bca1f2de4661ed88a30c99a7a9449aa84174'.toLowerCase()
                    ? 6
                    : 18

            const makingAmount = (
                parseFloat(fromAmount) * Math.pow(10, fromDecimals)
            ).toString()

            const takingAmount = quote.dstAmount || quote.toAmount || '0'

            await createOrder({
                makerToken: fromToken.address,
                takerToken: toToken.address,
                makingAmount,
                takingAmount,
            })
        } catch (err: unknown) {
            const errorMessage =
                err instanceof Error ? err.message : String(err)
            alert(`Failed to create order: ${errorMessage}`)
        } finally {
            setIsCreatingOrder(false)
        }
    }

    return (
        <div>
            <div className="hero-section">
                <div className="flex-grow flex flex-col items-center px-4 pt-[40px] md:pt-[88px] container mx-auto w-full">
                    <JoinCommunity />
                    <h1 className="font-semibold text-[40px] leading-[48px] md:text-[80px] md:leading-[88px] text-center align-middle capitalize mb-3 text-[#DC2626] max-w-[720px] mx-auto">
                        <span className="text-[#B91C1C]"> Pool </span> Exchange
                        with DEX.
                    </h1>
                    <p className="text-center font-normal md:text-[17.72px] md:leading-7 text-[#767676] max-w-[700px] mb-6">
                        At our cryptocurrency token exchange platform, we offer
                        an easy-to-use token swap service that allows you to
                        seamlessly exchange one type of token for another with
                        maximum efficiency.
                    </p>
                    <WalletModal />
                    <div className="w-full">
                        <TradingDashboard fullScreen showOrders />
                        <div className="modern-card w-full px-[16px] sm:px-[20px] md:px-[40px] py-[20px] sm:py-[30px] md:py-[40px]">
                            <div className="flex flex-col lg:flex-row items-center gap-[20px] sm:gap-[25px] lg:gap-[51px]">
                                {/* FROM TOKEN SECTION */}
                                <div className="w-full lg:flex-1">
                                    <div className="modern-input px-[12px] sm:px-[16px] py-[12px] sm:py-[16px]">
                                        <div className="flex items-center justify-between gap-2">
                                            <input
                                                type="number"
                                                value={fromAmount}
                                                onChange={(e) =>
                                                    handleAmountChange(
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="0.000"
                                                className="text-[#333333] font-semibold text-[16px] sm:text-[18px] md:text-[20px] leading-[31.43px] bg-transparent border-none outline-none flex-1 mr-2 sm:mr-4 placeholder-[#888888] min-w-0"
                                            />
                                            <div
                                                className="relative min-w-[80px] sm:min-w-[95px] flex-shrink-0"
                                                ref={fromDropdownRef}
                                            >
                                                <button
                                                    onClick={() =>
                                                        setIsFromDropdownOpen(
                                                            !isFromDropdownOpen
                                                        )
                                                    }
                                                    aria-expanded={
                                                        isFromDropdownOpen
                                                    }
                                                    aria-haspopup="listbox"
                                                    className="w-full flex items-center cursor-pointer select-none hover:bg-[#F8F8F8] rounded-[6px] p-1 sm:p-2 transition-colors"
                                                    type="button"
                                                >
                                                    <img
                                                        className="token-img rounded-full shadow-[0px_6px_10px_0px_#00000013] size-[20px] sm:size-[23px] min-w-[20px] sm:min-w-[23px]"
                                                        alt={fromToken.name}
                                                        src={fromToken.img}
                                                    />
                                                    <span className="token-label text-[#000000] text-[14px] sm:text-[16px] font-normal text-left flex-grow ml-2 sm:ml-3 mr-2 sm:mr-8 truncate">
                                                        {fromToken.symbol}
                                                    </span>
                                                    <ChevronDown
                                                        className={`token-arrow transition-transform flex-shrink-0 ${
                                                            isFromDropdownOpen
                                                                ? 'rotate-180'
                                                                : ''
                                                        }`}
                                                    />
                                                </button>
                                                {isFromDropdownOpen && (
                                                    <ul
                                                        className="modern-dropdown absolute z-10 mt-1 w-full max-h-48 overflow-auto text-[13px] font-normal"
                                                        role="listbox"
                                                        tabIndex={-1}
                                                    >
                                                        {tokens
                                                            .filter(
                                                                (token) =>
                                                                    token.symbol !==
                                                                    toToken.symbol
                                                            )
                                                            .map((token) => (
                                                                <li
                                                                    key={
                                                                        token.symbol
                                                                    }
                                                                    onClick={() =>
                                                                        handleTokenSelect(
                                                                            token,
                                                                            true
                                                                        )
                                                                    }
                                                                    className="modern-dropdown-item flex items-center"
                                                                    role="option"
                                                                    tabIndex={0}
                                                                >
                                                                    <img
                                                                        alt={
                                                                            token.name
                                                                        }
                                                                        className="w-6 h-6 mr-2"
                                                                        height="24"
                                                                        src={
                                                                            token.img
                                                                        }
                                                                        width="24"
                                                                    />
                                                                    {
                                                                        token.symbol
                                                                    }
                                                                </li>
                                                            ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* SWAP BUTTON */}
                                <div className="flex justify-center lg:justify-start">
                                    <button
                                        onClick={handleSwapTokens}
                                        className="hover:bg-gray-100 p-2 sm:p-3 rounded-full transition-colors"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="24"
                                            height="25"
                                            className="sm:w-7 sm:h-7"
                                            fill="none"
                                        >
                                            <path
                                                fill="#000"
                                                d="M19.876.5H8.138C3.04.5 0 3.538 0 8.634v11.718c0 5.11 3.04 8.148 8.138 8.148h11.724C24.96 28.5 28 25.462 28 20.366V8.634C28.014 3.538 24.974.5 19.876.5Zm-7.284 21c0 .14-.028.266-.084.406a1.095 1.095 0 0 1-.574.574 1.005 1.005 0 0 1-.406.084 1.056 1.056 0 0 1-.743-.308l-4.132-4.13a1.056 1.056 0 0 1 0-1.484 1.057 1.057 0 0 1 1.485 0l2.34 2.338V7.5c0-.574.476-1.05 1.05-1.05.574 0 1.064.476 1.064 1.05v14Zm8.755-9.128a1.04 1.04 0 0 1-.743.308 1.04 1.04 0 0 1-.742-.308l-2.34-2.338V21.5c0 .574-.475 1.05-1.05 1.05-.574 0-1.05-.476-1.05-1.05v-14c0-.14.028-.266.084-.406.112-.252.308-.462.574-.574a.99.99 0 0 1 .798 0c.127.056.238.126.337.224l4.132 4.13c.406.42.406 1.092 0 1.498Z"
                                            />
                                        </svg>
                                    </button>
                                </div>

                                {/* TO TOKEN SECTION */}
                                <div className="w-full lg:flex-1">
                                    <div className="modern-input px-[12px] sm:px-[16px] py-[12px] sm:py-[16px]">
                                        <div className="flex items-center justify-between gap-2">
                                            <input
                                                type="number"
                                                value={toAmount}
                                                onChange={(e) =>
                                                    handleAmountChange(
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="0.000"
                                                className="text-[#333333] font-semibold text-[16px] sm:text-[18px] md:text-[20px] leading-[31.43px] bg-transparent border-none outline-none flex-1 mr-2 sm:mr-4 placeholder-[#888888] min-w-0"
                                            />
                                            <div
                                                className="relative min-w-[80px] sm:min-w-[95px] flex-shrink-0"
                                                ref={toDropdownRef}
                                            >
                                                <button
                                                    onClick={() =>
                                                        setIsToDropdownOpen(
                                                            !isToDropdownOpen
                                                        )
                                                    }
                                                    aria-expanded={
                                                        isToDropdownOpen
                                                    }
                                                    aria-haspopup="listbox"
                                                    className="w-full flex items-center cursor-pointer select-none hover:bg-[#F8F8F8] rounded-[6px] p-1 sm:p-2 transition-colors"
                                                    type="button"
                                                >
                                                    <img
                                                        className="token-img rounded-full shadow-[0px_6px_10px_0px_#00000013] size-[20px] sm:size-[23px] min-w-[20px] sm:min-w-[23px]"
                                                        alt={toToken.name}
                                                        src={toToken.img}
                                                    />
                                                    <span className="token-label text-[#000000] text-[14px] sm:text-[16px] font-normal text-left flex-grow ml-2 sm:ml-3 mr-2 sm:mr-8 truncate">
                                                        {toToken.symbol}
                                                    </span>
                                                    <ChevronDown
                                                        className={`ml-auto token-arrow transition-transform flex-shrink-0 ${
                                                            isToDropdownOpen
                                                                ? 'rotate-180'
                                                                : ''
                                                        }`}
                                                    />
                                                </button>
                                                {isToDropdownOpen && (
                                                    <ul
                                                        className="modern-dropdown absolute z-10 mt-1 w-full max-h-48 overflow-auto text-[13px] font-normal"
                                                        role="listbox"
                                                        tabIndex={-1}
                                                    >
                                                        {tokens
                                                            .filter(
                                                                (token) =>
                                                                    token.symbol !==
                                                                    fromToken.symbol
                                                            )
                                                            .map((token) => (
                                                                <li
                                                                    key={
                                                                        token.symbol
                                                                    }
                                                                    onClick={() =>
                                                                        handleTokenSelect(
                                                                            token,
                                                                            false
                                                                        )
                                                                    }
                                                                    className="modern-dropdown-item flex items-center"
                                                                    role="option"
                                                                    tabIndex={0}
                                                                >
                                                                    <img
                                                                        alt={
                                                                            token.name
                                                                        }
                                                                        className="w-6 h-6 mr-2"
                                                                        height="24"
                                                                        src={
                                                                            token.img
                                                                        }
                                                                        width="24"
                                                                    />
                                                                    {
                                                                        token.symbol
                                                                    }
                                                                </li>
                                                            ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* PRICE AND SLIPPAGE INFO */}
                            <div className="mt-[24px] sm:mt-[36px] modern-card px-[16px] sm:px-[20px] py-[16px] sm:py-[20px] flex flex-col lg:flex-row items-center justify-between gap-4">
                                <div className="w-full lg:flex-1 font-normal text-xs sm:text-sm leading-[18.86px] text-[#888888] text-center lg:text-left">
                                    <span>Exchange Rate</span>
                                    <p className="text-[#333333] font-semibold text-[16px] sm:text-[18px] leading-[31.43px] mt-1 sm:mt-2 break-all">
                                        {quote
                                            ? (
                                                  parseFloat(toAmount) /
                                                  parseFloat(fromAmount || '1')
                                              ).toFixed(8)
                                            : '0.00000000'}
                                    </p>
                                </div>

                                <div className="w-full lg:flex-1 font-normal text-xs sm:text-sm leading-[18.86px] text-[#888888] text-center">
                                    <span>
                                        Expiration Date:{' '}
                                        {new Date(
                                            Date.now() + 24 * 60 * 60 * 1000
                                        ).toLocaleDateString()}
                                    </span>
                                    <p className="text-[#333333] font-semibold text-[16px] sm:text-[18px] leading-[31.43px] mt-1 sm:mt-2">
                                        {fromToken.symbol} - {toToken.symbol}
                                    </p>
                                </div>
                                <div className="w-full lg:flex-1">
                                    <span className="flex items-center gap-2 justify-center lg:justify-end text-[#888888] text-xs sm:text-sm">
                                        Slippage Tolerance
                                        <CircleQuestionMarkIcon
                                            size={14}
                                            className="sm:w-4 sm:h-4"
                                        />
                                    </span>
                                    <div className="flex items-center justify-center lg:justify-end mt-1 sm:mt-2">
                                        <input
                                            type="number"
                                            value={slippageTolerance}
                                            onChange={(e) =>
                                                setSlippageTolerance(
                                                    parseFloat(
                                                        e.target.value
                                                    ) || 1
                                                )
                                            }
                                            className="font-semibold text-[16px] sm:text-[18px] leading-[31.43px] text-[#DC2626] bg-transparent border-none outline-none w-10 sm:w-12 text-right"
                                            min="0.1"
                                            max="50"
                                            step="0.1"
                                        />
                                        <span className="font-semibold text-[16px] sm:text-[18px] leading-[31.43px] text-[#DC2626]">
                                            %
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleCreateOrder}
                                disabled={
                                    !fromAmount ||
                                    !toAmount ||
                                    loading ||
                                    isCreatingOrder
                                }
                                className={`modern-button mt-[20px] sm:mt-[25px] md:mt-[40px] w-full p-[12px] sm:p-[16px] text-center text-sm sm:text-base font-semibold ${
                                    !fromAmount ||
                                    !toAmount ||
                                    loading ||
                                    isCreatingOrder
                                        ? '!bg-[#E5E5E5] !text-[#888888]'
                                        : ''
                                }`}
                            >
                                {isCreatingOrder
                                    ? 'Creating Order...'
                                    : 'Create Limit Order'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <section className="md:py-[90px] py-[40px] px-4">
                <h2 className="font-medium lg:text-[64px] sm:text-[48px] text-[32px] md:leading-[70.4px] leading-[50px] text-center text-[#DC2626] max-w-[514px] mx-auto">
                    How
                    <span className="text-[#DC2626]">Pool </span>Exchange Works
                </h2>
                <p className="font-normal md:text-base text-xs md:leading-[25px] text-center text-[#DC2626] max-w-[910px] mx-auto pt-[30px]">
                    Place limit orders on Dextrend to execute at your price,
                    with smart routing, transparent fees, and a clean interface
                    that keeps you focused on the trade.
                </p>
                <div className="flex justify-center gap-3 md:mt-[60px] mt-[40px] items-center">
                    <WalletModal />
                    <a
                        href="#"
                        className="border-2 border-[#E9E9E9] md:px-[32px] px-[20px] py-[16px] rounded-[80px] font-medium text-base text-[#000000]"
                    >
                        Learn More
                    </a>
                </div>
            </section>
            <AskExpertsSection />
            <EarnPassiveIncomeSection />
        </div>
    )
}

export default Limit
