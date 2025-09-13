import React, { useState, useEffect } from 'react'

interface Token {
    id: string
    name: string
    symbol: string
    image: string
    color: string
}

interface SwapData {
    fromAmount: string
    toAmount: string
    fromToken: Token
    toToken: Token
    fromChain: Token
    toChain: Token
}

const ConfirmExchange: React.FC = () => {
    const [swapData, setSwapData] = useState<SwapData>({
        fromAmount: '0.000',
        toAmount: '10000',
        fromToken: {
            id: 'usdt',
            name: 'USDT',
            symbol: 'USDT',
            image: './images/stock-2.png',
            color: '#00B67A',
        },
        toToken: {
            id: 'usdt',
            name: 'USDT',
            symbol: 'USDT',
            image: './images/stock-2.png',
            color: '#00B67A',
        },
        fromChain: {
            id: 'ethereum',
            name: 'Ethereum Mainnet',
            symbol: 'ETH',
            image: 'https://storage.googleapis.com/a1aa/image/6d94bf53-1009-4e09-cc33-08da0b192de7.jpg',
            color: '#F7931A',
        },
        toChain: {
            id: 'bnb',
            name: 'BNB Chain',
            symbol: 'BNB',
            image: './images/stock-1.svg',
            color: '#3B3B3B',
        },
    })

    const [openDropdown, setOpenDropdown] = useState<string | null>(null)
    //   const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

    const tokens: Token[] = [
        {
            id: 'usdt',
            name: 'USDT',
            symbol: 'USDT',
            image: './images/stock-2.png',
            color: '#00B67A',
        },
        {
            id: 'btc',
            name: 'BTC',
            symbol: 'BTC',
            image: 'https://storage.googleapis.com/a1aa/image/6d94bf53-1009-4e09-cc33-08da0b192de7.jpg',
            color: '#F7931A',
        },
        {
            id: 'eth',
            name: 'ETH',
            symbol: 'ETH',
            image: './images/stock-1.svg',
            color: '#3B3B3B',
        },
    ]

    const chains: Token[] = [
        {
            id: 'ethereum',
            name: 'Ethereum Mainnet',
            symbol: 'ETH',
            image: 'https://storage.googleapis.com/a1aa/image/6d94bf53-1009-4e09-cc33-08da0b192de7.jpg',
            color: '#F7931A',
        },
        {
            id: 'bnb',
            name: 'BNB Chain',
            symbol: 'BNB',
            image: './images/stock-1.svg',
            color: '#3B3B3B',
        },
        {
            id: 'usdt-chain',
            name: 'USDT',
            symbol: 'USDT',
            image: './images/stock-2.png',
            color: '#00B67A',
        },
    ]

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement
            if (!target.closest('.dropdown-container')) {
                setOpenDropdown(null)
            }
        }

        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
    }, [])

    const toggleDropdown = (dropdownId: string) => {
        setOpenDropdown(openDropdown === dropdownId ? null : dropdownId)
    }

    const selectToken = (
        type: 'fromToken' | 'toToken' | 'fromChain' | 'toChain',
        token: Token
    ) => {
        setSwapData((prev) => ({
            ...prev,
            [type]: token,
        }))
        setOpenDropdown(null)
    }

    const swapTokens = () => {
        setSwapData((prev) => ({
            ...prev,
            fromToken: prev.toToken,
            toToken: prev.fromToken,
            fromChain: prev.toChain,
            toChain: prev.fromChain,
            fromAmount: prev.toAmount,
            toAmount: prev.fromAmount,
        }))
    }

    const TokenDropdown: React.FC<{
        id: string
        selectedToken: Token
        tokens: Token[]
        onSelect: (token: Token) => void
        buttonClassName?: string
        isChain?: boolean
    }> = ({
        id,
        selectedToken,
        tokens,
        onSelect,
        buttonClassName = '',
        isChain = false,
    }) => {
        const isOpen = openDropdown === id

        return (
            <div
                className={`relative dropdown-container ${
                    isChain ? 'min-w-[133px]' : 'min-w-[95px]'
                }`}
            >
                <button
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                    className={`token-button w-full flex items-center cursor-pointer select-none ${buttonClassName}`}
                    type="button"
                    onClick={() => toggleDropdown(id)}
                >
                    <img
                        src={selectedToken.image}
                        className={`token-img rounded-full shadow-[0px_6px_10px_0px_#00000013] ${
                            isChain
                                ? 'size-[26px] min-w-[26px]'
                                : 'size-[23px] min-w-[23px]'
                        }`}
                        alt=""
                    />
                    <span
                        className={`token-label font-normal text-black flex-grow text-left ${
                            isChain
                                ? 'text-[13px] ml-1.5 mr-4'
                                : 'text-[16px] ml-1.5 mr-5'
                        }`}
                    >
                        {isChain ? selectedToken.name : selectedToken.symbol}
                    </span>
                    <svg
                        className="token-arrow"
                        xmlns="http://www.w3.org/2000/svg"
                        width="15"
                        height="7"
                        fill="none"
                    >
                        <path
                            fill="#000"
                            d="M7 7a1 1 0 0 1-.64-.23l-6-5A1.001 1.001 0 0 1 1.64.23L7 4.71 12.36.39a1 1 0 0 1 1.41.15A1 1 0 0 1 13.63 2l-6 4.83A1 1 0 0 1 7 7Z"
                        />
                    </svg>
                </button>
                {isOpen && (
                    <ul
                        className="token-list absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-48 overflow-auto ring-1 ring-black ring-opacity-5 text-[13px] font-normal text-black"
                        role="listbox"
                    >
                        {tokens.map((token, index) => (
                            <li
                                key={token.id}
                                className="token-item cursor-pointer select-none relative py-2 pl-3 pr-9 flex items-center hover:bg-gray-100"
                                role="option"
                                tabIndex={index === 0 ? 0 : -1}
                                onClick={() => onSelect(token)}
                            >
                                <img
                                    alt=""
                                    className="w-6 h-6 mr-2"
                                    height="24"
                                    src={token.image}
                                    width="24"
                                />
                                {isChain ? token.name : token.symbol}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        )
    }

    const InfoIcon = () => (
        <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <g clipPath="url(#clip0_2210_315)">
                <path
                    d="M6 0C2.68661 0 0 2.68661 0 6C0 9.31339 2.68661 12 6 12C9.31339 12 12 9.31339 12 6C12 2.68661 9.31339 0 6 0ZM6 10.9821C3.24911 10.9821 1.01786 8.75089 1.01786 6C1.01786 3.24911 3.24911 1.01786 6 1.01786C8.75089 1.01786 10.9821 3.24911 10.9821 6C10.9821 8.75089 8.75089 10.9821 6 10.9821Z"
                    fill="black"
                />
                <path
                    d="M5.35742 3.64286C5.35742 3.81335 5.42515 3.97687 5.54571 4.09743C5.66627 4.21799 5.82978 4.28571 6.00028 4.28571C6.17078 4.28571 6.33429 4.21799 6.45485 4.09743C6.57541 3.97687 6.64314 3.81335 6.64314 3.64286C6.64314 3.47236 6.57541 3.30885 6.45485 3.18829C6.33429 3.06773 6.17078 3 6.00028 3C5.82978 3 5.66627 3.06773 5.54571 3.18829C5.42515 3.30885 5.35742 3.47236 5.35742 3.64286ZM6.32171 5.14286H5.67885C5.61992 5.14286 5.57171 5.19107 5.57171 5.25V8.89286C5.57171 8.95179 5.61992 9 5.67885 9H6.32171C6.38064 9 6.42885 8.95179 6.42885 8.89286V5.25C6.42885 5.19107 6.38064 5.14286 6.32171 5.14286Z"
                    fill="black"
                />
            </g>
            <defs>
                <clipPath id="clip0_2210_315">
                    <rect width="12" height="12" fill="white" />
                </clipPath>
            </defs>
        </svg>
    )

    const QuestionIcon = () => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            fill="none"
        >
            <g clipPath="url(#a)">
                <circle cx="9" cy="9" r="7.5" stroke="#000" strokeWidth="1.5" />
                <path
                    stroke="#000"
                    strokeLinecap="round"
                    strokeWidth="1.5"
                    d="M7.594 6.656a1.406 1.406 0 1 1 2.121 1.211c-.356.211-.715.531-.715.946v.937"
                />
                <circle cx="9" cy="12" r=".75" fill="#000" />
            </g>
            <defs>
                <clipPath id="a">
                    <path fill="#fff" d="M0 0h18v18H0z" />
                </clipPath>
            </defs>
        </svg>
    )

    return (
        <div className="flex items-center justify-center px-4 min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
            <div
                className="hero-border w-full p-1 md:rounded-[40px] rounded-[20px] max-w-[1220px]"
                style={{
                    background:
                        'linear-gradient(45deg, #3DBEA3, #2A8576, #1E6B5F)',
                }}
            >
                <div className="bg-gradient-to-br from-black/30 to-black/10 relative backdrop-blur-[80px] w-full md:rounded-[40px] rounded-[20px] px-[15px] lg:px-[50px] py-[30px] lg:py-[40px]">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-[30px]">
                        <h2 className="text-[#000000] font-bold md:text-[30px] text-lg">
                            Confirm Exchange
                        </h2>
                        <button className="cursor-pointer hover:opacity-70 transition-opacity">
                            <svg
                                width="28"
                                height="28"
                                viewBox="0 0 28 28"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M27.3337 14C27.3337 21.3638 21.3641 27.3334 14.0003 27.3334C6.63653 27.3334 0.666992 21.3638 0.666992 14C0.666992 6.63622 6.63653 0.666687 14.0003 0.666687C21.3641 0.666687 27.3337 6.63622 27.3337 14ZM9.95983 9.95955C10.3504 9.56903 10.9835 9.56903 11.374 9.95955L14.0003 12.5858L16.6265 9.95958C17.017 9.56906 17.6502 9.56906 18.0407 9.95958C18.4312 10.3501 18.4312 10.9833 18.0407 11.3738L15.4145 14L18.0407 16.6262C18.4312 17.0167 18.4312 17.6499 18.0407 18.0404C17.6502 18.4309 17.017 18.4309 16.6265 18.0404L14.0003 15.4142L11.3741 18.0404C10.9835 18.431 10.3504 18.431 9.95986 18.0404C9.56933 17.6499 9.56933 17.0167 9.95986 16.6262L12.5861 14L9.95983 11.3738C9.5693 10.9832 9.5693 10.3501 9.95983 9.95955Z"
                                    fill="white"
                                />
                            </svg>
                        </button>
                    </div>

                    {/* Main Swap Interface */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-[20px] lg:gap-[51px]">
                        {/* From Section */}
                        <div className="flex-1 w-full">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2.5">
                                    <label className="text-[#000000] font-bold md:text-2xl text-base leading-[100%]">
                                        From
                                    </label>
                                    <TokenDropdown
                                        id="fromChain"
                                        selectedToken={swapData.fromChain}
                                        tokens={chains}
                                        onSelect={(token) =>
                                            selectToken('fromChain', token)
                                        }
                                        buttonClassName="bg-[#FFFFFF66] border rounded-xl border-solid border-[#FFFFFF1A] px-2 py-2"
                                        isChain
                                    />
                                </div>
                                <button className="hover:opacity-70 transition-opacity">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="24"
                                        height="24"
                                        fill="none"
                                    >
                                        <path
                                            fill="#000"
                                            fillRule="evenodd"
                                            d="M18.628 6.285A2.654 2.654 0 0 1 20 8.607v5.727c0 .965-.525 1.854-1.372 2.322l-5.333 2.95a2.676 2.676 0 0 1-2.59 0l-5.333-2.95A2.654 2.654 0 0 1 4 14.334V8.607c0-.965.525-1.853 1.372-2.322l5.333-2.95a2.676 2.676 0 0 1 2.59 0l5.333 2.95Zm-8.406 5.185c0-.978.796-1.77 1.778-1.77s1.778.793 1.778 1.77c0 .978-.796 1.77-1.778 1.77a1.774 1.774 0 0 1-1.778-1.77ZM12 7.93a3.548 3.548 0 0 0-3.556 3.54A3.548 3.548 0 0 0 12 15.011a3.548 3.548 0 0 0 3.556-3.54A3.548 3.548 0 0 0 12 7.928Z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </button>
                            </div>

                            <div className="bg-[#FFFFFF66] border border-solid border-[#FFFFFF1A] rounded-[12px] px-[15px] py-[18px]">
                                <div className="flex items-center justify-between font-normal text-sm leading-[18.86px] text-black mb-3">
                                    <span>Send:</span>
                                    <span className="underline cursor-pointer hover:no-underline">
                                        Max: 0
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <input
                                        className="text-black font-bold text-[22px] leading-[31.43px] outline-none"
                                        value={swapData.fromAmount}
                                        onChange={(e) => {
                                            setSwapData((prev) => {
                                                return {
                                                    ...prev,
                                                    fromAmount: e.target.value,
                                                }
                                            })
                                        }}
                                        type="number"
                                    />
                                    <TokenDropdown
                                        id="fromToken"
                                        selectedToken={swapData.fromToken}
                                        tokens={tokens}
                                        onSelect={(token) =>
                                            selectToken('fromToken', token)
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Swap Button */}
                        <button
                            className="cursor-pointer md:mt-[50px] hover:scale-110 transition-transform"
                            onClick={swapTokens}
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

                        {/* To Section */}
                        <div className="flex-1 w-full">
                            <div className="flex items-center gap-2.5 mb-3">
                                <label className="text-[#000000] font-bold md:text-2xl text-base leading-[100%]">
                                    To
                                </label>
                                <TokenDropdown
                                    id="toChain"
                                    selectedToken={swapData.toChain}
                                    tokens={chains}
                                    onSelect={(token) =>
                                        selectToken('toChain', token)
                                    }
                                    buttonClassName="bg-[#FFFFFF66] border rounded-xl border-solid border-[#FFFFFF1A] px-2 py-2"
                                    isChain
                                />
                            </div>

                            <div className="bg-[#FFFFFF66] border border-solid border-[#FFFFFF1A] rounded-[12px] px-[15px] py-[18px]">
                                <div className="flex items-center justify-between font-normal text-sm leading-[18.86px] text-black mb-3">
                                    <div className="flex items-center gap-1.5">
                                        <button className="hover:opacity-70 transition-opacity">
                                            <InfoIcon />
                                        </button>
                                        Receive (estimated):
                                    </div>
                                </div>
                                <input
                                    className="text-black font-bold text-[22px] leading-[31.43px] outline-none"
                                    value={swapData.toAmount}
                                    onChange={(e) => {
                                        setSwapData((prev) => {
                                            return {
                                                ...prev,
                                                toAmount: e.target.value,
                                            }
                                        })
                                    }}
                                    type="number"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Transaction Details */}
                    <div className="overflow-x-auto my-[33px] bg-[#FFFFFF66] border border-solid border-[#FFFFFF1A] rounded-[12px] p-[18px_28px]">
                        <div className="min-w-[1050px]">
                            <p className="text-[#000000] text-lg font-normal">
                                Output is estimated. You will receive at least{' '}
                                <span className="text-[#2A8576] font-bold">
                                    1.07148 USDT
                                </span>{' '}
                                of the transaction will revert.
                            </p>

                            <div className="grid grid-cols-4 gap-3 items-start mt-[32px]">
                                <div className="text-left">
                                    <div className="flex items-center gap-2 mb-3">
                                        Price
                                        <QuestionIcon />
                                    </div>
                                    <h3 className="text-[#000000] text-[22px] font-bold">
                                        10768.2 USDT / ETH
                                    </h3>
                                </div>

                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-2 mb-3">
                                        Minimum Received
                                        <QuestionIcon />
                                    </div>
                                    <h3 className="text-[#000000] text-[22px] font-bold">
                                        1.071-USDT
                                    </h3>
                                </div>

                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-2 mb-3">
                                        Price Impact
                                        <QuestionIcon />
                                    </div>
                                    <h3 className="text-[#2A8576] text-[22px] font-bold">
                                        0.72%
                                    </h3>
                                </div>

                                <div className="text-end">
                                    <div className="flex items-center justify-end gap-2 mb-3">
                                        Liquidity Provider fee
                                        <QuestionIcon />
                                    </div>
                                    <h3 className="text-[#000000] text-[22px] font-bold">
                                        0.0000003 ETH
                                    </h3>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Confirm Button */}
                    <button className="bg-[#3DBEA3] hover:bg-[#2A8576] transition-colors block w-max p-[16px_72px] text-center text-white text-base font-normal rounded-[33px]">
                        Confirm Exchange
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ConfirmExchange
