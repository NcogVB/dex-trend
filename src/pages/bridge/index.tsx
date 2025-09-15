import { ChevronDown, CircleQuestionMarkIcon } from 'lucide-react'
import { useState, useEffect } from 'react'
import AskExpertsSection from '../../components/AskExpertsSection'
import EarnPassiveIncomeSection from '../../components/EarnPassiveIncomeSection'
import WalletButton from '../../components/WalletButton'
import JoinCommunity from '../../components/JoinCommunity'
import { useBridge } from '../../contexts/Bridge'

interface DropdownStates {
    fromToken: boolean
    fromChain: boolean
    toToken: boolean
    toChain: boolean
    fromTokenSelect: boolean
    toTokenSelect: boolean
}

interface SelectedValues {
    fromToken: string
    fromChain: string
    toToken: string
    toChain: string
    fromTokenType: string
    toTokenType: string
}

interface InputValues {
    fromAmount: string
    toAmount: string
    price: string
    slippage: string
}

interface TokenOption {
    name: string
    img: string
    color: string
}

interface ChainOption {
    name: string
    img: string
}

type DropdownName = keyof DropdownStates
type SelectionType = keyof SelectedValues
type InputField = keyof InputValues

const Bridge = () => {
    const { getQuote, executeQuote, lastQuote, progress,isLoading, error } = useBridge()
    const [showProgressModal, setShowProgressModal] = useState(false)

    const [dropdownStates, setDropdownStates] = useState<DropdownStates>({
        fromToken: false,
        fromChain: false,
        toToken: false,
        toChain: false,
        fromTokenSelect: false,
        toTokenSelect: false,
    })

    const [selectedValues, setSelectedValues] = useState<SelectedValues>({
        fromToken: 'USDC',
        fromChain: 'Polygon Mainnet',
        toToken: 'USDC',
        toChain: 'Arbitrum',
        fromTokenType: 'USDC',
        toTokenType: 'USDC',
    })

    const [slippageTolerance, setSlippageTolerance] = useState<number>(1)

    const [inputValues, setInputValues] = useState<InputValues>({
        fromAmount: '0.000',
        toAmount: '0.000',
        price: '0.000',
        slippage: '1%',
    })

    const tokenOptions: TokenOption[] = [
        { name: 'USDCE', img: '/images/stock-2.png', color: '#EF4444' },
    ]

    const chainOptions: ChainOption[] = [
        {
            name: 'Polygon Mainnet',
            img: 'https://storage.googleapis.com/a1aa/image/6d94bf53-1009-4e09-cc33-08da0b192de7.jpg',
        },
        {
            name: 'Arbitrum',
            img: 'https://storage.googleapis.com/a1aa/image/6d94bf53-1009-4e09-cc33-08da0b192de7.jpg',
        },
    ]

    const toggleDropdown = (dropdownName: DropdownName): void => {
        setDropdownStates((prev) => ({
            ...prev,
            [dropdownName]: !prev[dropdownName],
        }))
    }

    const handleSelection = (type: SelectionType, value: string): void => {
        setSelectedValues((prev) => ({
            ...prev,
            [type]: value,
        }))

        const dropdownMap: Record<SelectionType, DropdownName> = {
            fromToken: 'fromToken',
            fromChain: 'fromChain',
            toToken: 'toToken',
            toChain: 'toChain',
            fromTokenType: 'fromTokenSelect',
            toTokenType: 'toTokenSelect',
        }

        setDropdownStates((prev) => ({
            ...prev,
            [dropdownMap[type]]: false,
        }))
    }

    const handleInputChange = (field: InputField, value: string): void => {
        setInputValues((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const handleSwap = (): void => {
        setSelectedValues((prev) => ({
            ...prev,
            fromToken: prev.toToken,
            fromChain: prev.toChain,
            toToken: prev.fromToken,
            toChain: prev.fromChain,
            fromTokenType: prev.toTokenType,
            toTokenType: prev.fromTokenType,
        }))

        setInputValues((prev) => ({
            ...prev,
            fromAmount: prev.toAmount,
            toAmount: prev.fromAmount,
        }))
    }

    // 🔑 Fetch quote whenever user types a new amount
    useEffect(() => {
        const fetchQuote = async () => {
            if (!inputValues.fromAmount || parseFloat(inputValues.fromAmount) <= 0) {
                handleInputChange('toAmount', '0.000')
                return
            }
            const quote = await getQuote(inputValues.fromAmount)
            if (quote) {
                handleInputChange('toAmount', quote.outputAmount)
            }
        }
        fetchQuote()
    }, [inputValues.fromAmount])

    // 🔑 Handle Exchange
    const handleExchange = async () => {
        if (!lastQuote) return
        setShowProgressModal(true) // open modal
        try {
            await executeQuote(lastQuote)
            // success -> close after short delay
            setTimeout(() => setShowProgressModal(false), 3000)
        } catch (err) {
            // error -> keep open so user sees it, but auto-close later
            setTimeout(() => setShowProgressModal(false), 5000)
        }
    }
    return (
        <>
            <div className="hero-section">
                <div className="flex-grow flex flex-col items-center px-4 pt-[40px] md:pt-[88px] container mx-auto w-full">
                    <JoinCommunity />
                    <h1 className="font-semibold text-[40px] leading-[48px] md:text-[80px] md:leading-[88px] align-middle capitalize mb-3 text-[#DC2626] max-w-[720px] text-center mx-auto">
                        <span className="text-[#B91C1C]"> Bridge </span>{' '}
                        Exchange with DEX.
                    </h1>
                    <p className="text-center font-normal md:text-[17.72px] md:leading-7 text-[#767676] max-w-[700px] mb-6">
                        At our cryptocurrency token exchange platform, we offer
                        an easy-to-use token swap service that allows you to
                        seamlessly exchange one type of token for another with
                        maximum efficiency.
                    </p>
                    <WalletButton />

                    <div className="modern-card mt-[100px] mb-[53px] w-full max-w-7xl mx-auto px-4">
                        <div className="w-full px-[20px] md:px-[40px] py-[30px] md:py-[40px]">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-[25px] md:gap-[51px]">
                                <div className="flex-1 w-full">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 mb-3 gap-3">

                                        <div className="relative min-w-[133px]">
                                            <button
                                                aria-expanded={
                                                    dropdownStates.fromChain
                                                }
                                                aria-haspopup="listbox"
                                                className="token-button bg-[#FFFFFF66] border rounded-xl border-solid border-[#FFFFFF1A] px-2 py-2 w-full flex items-center cursor-pointer select-none"
                                                type="button"
                                                onClick={() =>
                                                    toggleDropdown('fromChain')
                                                }
                                            >
                                                <img
                                                    src="https://storage.googleapis.com/a1aa/image/6d94bf53-1009-4e09-cc33-08da0b192de7.jpg"
                                                    className="token-img rounded-full shadow-[0px_6px_10px_0px_#00000013] size-[26px] min-w-[26px]"
                                                    alt=""
                                                />
                                                <div className="flex flex-col text-left ml-1.5 mr-4">
                                                    <span className="text-[#606060] font-normal text-[10px] leading-[100%] mb-1">
                                                        Chain
                                                    </span>
                                                    <span className="token-label text-[13px] font-normal text-black flex-grow">
                                                        {
                                                            selectedValues.fromChain
                                                        }
                                                    </span>
                                                </div>
                                                <ChevronDown
                                                    className={`ml-auto token-arrow transition-transform ${dropdownStates.fromChain
                                                        ? 'rotate-180'
                                                        : ''
                                                        }`}
                                                />
                                            </button>
                                            {dropdownStates.fromChain && (
                                                <ul className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-48 overflow-auto ring-1 ring-black ring-opacity-5 text-[13px] font-normal text-black">
                                                    {chainOptions.map(
                                                        (option, index) => (
                                                            <li
                                                                key={index}
                                                                className="cursor-pointer select-none relative py-2 pl-3 pr-9 flex items-center hover:bg-gray-100"
                                                                onClick={() =>
                                                                    handleSelection(
                                                                        'fromChain',
                                                                        option.name
                                                                    )
                                                                }
                                                            >
                                                                <img
                                                                    alt=""
                                                                    className="w-6 h-6 mr-2"
                                                                    src={
                                                                        option.img
                                                                    }
                                                                />
                                                                {option.name}
                                                            </li>
                                                        )
                                                    )}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                    <div className="modern-input px-[16px] py-[16px]">

                                        <div className="flex items-center justify-between">
                                            <input
                                                type="text"
                                                value={inputValues.fromAmount}
                                                onChange={(e) =>
                                                    handleInputChange(
                                                        'fromAmount',
                                                        e.target.value
                                                    )
                                                }
                                                className="text-[#333333] font-semibold text-[20px] leading-[31.43px] bg-transparent border-none outline-none w-full placeholder-[#888888]"
                                                placeholder="0.000"
                                            />
                                            <div className="relative min-w-[95px]">
                                                <button
                                                    aria-expanded={
                                                        dropdownStates.fromTokenSelect
                                                    }
                                                    aria-haspopup="listbox"
                                                    className="token-button w-full flex items-center cursor-pointer select-none"
                                                    type="button"
                                                    onClick={() =>
                                                        toggleDropdown(
                                                            'fromTokenSelect'
                                                        )
                                                    }
                                                >
                                                    <img
                                                        className="token-img rounded-full shadow-[0px_6px_10px_0px_#00000013] size-[23px] min-w-[23px]"
                                                        alt=""
                                                        src={
                                                            tokenOptions.find(
                                                                (t) =>
                                                                    t.name ===
                                                                    selectedValues.fromTokenType
                                                            )?.img ||
                                                            '/images/stock-2.png'
                                                        }
                                                    />
                                                    <span className="token-label text-[#000000] text-[16px] font-normal text-left flex-grow ml-3 mr-8">
                                                        {
                                                            selectedValues.fromTokenType
                                                        }
                                                    </span>
                                                    <ChevronDown
                                                        className={`ml-auto token-arrow transition-transform ${dropdownStates.fromTokenSelect
                                                            ? 'rotate-180'
                                                            : ''
                                                            }`}
                                                    />
                                                </button>
                                                {dropdownStates.fromTokenSelect && (
                                                    <ul className="token-list absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-48 overflow-auto ring-1 ring-black ring-opacity-5 text-[13px] font-normal text-black">
                                                        {tokenOptions.map(
                                                            (token, index) => (
                                                                <li
                                                                    key={index}
                                                                    className="token-item cursor-pointer select-none relative py-2 pl-3 pr-9 flex items-center hover:bg-gray-100"
                                                                    onClick={() =>
                                                                        handleSelection(
                                                                            'fromTokenType',
                                                                            token.name
                                                                        )
                                                                    }
                                                                >
                                                                    <img
                                                                        alt=""
                                                                        className="w-6 h-6 mr-2"
                                                                        src={
                                                                            token.img
                                                                        }
                                                                    />
                                                                    {token.name}
                                                                </li>
                                                            )
                                                        )}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <button
                                        onClick={handleSwap}
                                        className="transition-transform hover:scale-110"
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
                                <div className="flex-1 w-full">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 mb-3 gap-3">
                                        {/* Chain Dropdown */}
                                        <div className="relative min-w-[133px]">
                                            <button
                                                aria-expanded={
                                                    dropdownStates.toChain
                                                }
                                                aria-haspopup="listbox"
                                                className="token-button bg-[#FFFFFF66] border rounded-xl border-solid border-[#FFFFFF1A] px-2 py-2 w-full flex items-center cursor-pointer select-none"
                                                type="button"
                                                onClick={() =>
                                                    toggleDropdown('toChain')
                                                }
                                            >
                                                <img
                                                    src="https://storage.googleapis.com/a1aa/image/6d94bf53-1009-4e09-cc33-08da0b192de7.jpg"
                                                    className="token-img rounded-full shadow-[0px_6px_10px_0px_#00000013] size-[26px] min-w-[26px]"
                                                    alt=""
                                                />
                                                <div className="flex flex-col text-left ml-1.5 mr-4">
                                                    <span className="text-[#606060] font-normal text-[10px] leading-[100%] mb-1">
                                                        Chain
                                                    </span>
                                                    <span className="token-label text-[13px] font-normal text-black flex-grow">
                                                        {selectedValues.toChain}
                                                    </span>
                                                </div>
                                                <ChevronDown
                                                    className={`ml-auto token-arrow transition-transform ${dropdownStates.toChain
                                                        ? 'rotate-180'
                                                        : ''
                                                        }`}
                                                />
                                            </button>
                                            {dropdownStates.toChain && (
                                                <ul className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-48 overflow-auto ring-1 ring-black ring-opacity-5 text-[13px] font-normal text-black">
                                                    {chainOptions.map(
                                                        (option, index) => (
                                                            <li
                                                                key={index}
                                                                className="cursor-pointer select-none relative py-2 pl-3 pr-9 flex items-center hover:bg-gray-100"
                                                                onClick={() =>
                                                                    handleSelection(
                                                                        'toChain',
                                                                        option.name
                                                                    )
                                                                }
                                                            >
                                                                <img
                                                                    alt=""
                                                                    className="w-6 h-6 mr-2"
                                                                    src={
                                                                        option.img
                                                                    }
                                                                />
                                                                {option.name}
                                                            </li>
                                                        )
                                                    )}
                                                </ul>
                                            )}
                                        </div>
                                    </div>

                                    {/* Amount Input Section */}
                                    <div className="modern-input px-[16px] py-[16px]">
                                        <div className="flex items-center justify-between font-normal text-sm leading-[18.86px] text-[#888888] mb-3">

                                        </div>
                                        <div className="flex items-center justify-between">
                                            <input
                                                type="text"
                                                value={inputValues.toAmount}
                                                onChange={(e) =>
                                                    handleInputChange(
                                                        'toAmount',
                                                        e.target.value
                                                    )
                                                }
                                                className="text-[#333333] font-semibold text-[20px] leading-[31.43px] bg-transparent border-none outline-none w-full placeholder-[#888888]"
                                                placeholder="0.000"
                                            />
                                            <div className="relative min-w-[95px]">
                                                <button
                                                    aria-expanded={
                                                        dropdownStates.toTokenSelect
                                                    }
                                                    aria-haspopup="listbox"
                                                    className="token-button w-full flex items-center cursor-pointer select-none"
                                                    type="button"
                                                    onClick={() =>
                                                        toggleDropdown(
                                                            'toTokenSelect'
                                                        )
                                                    }
                                                >
                                                    <img
                                                        className="token-img rounded-full shadow-[0px_6px_10px_0px_#00000013] size-[23px] min-w-[23px]"
                                                        alt=""
                                                        src={
                                                            tokenOptions.find(
                                                                (t) =>
                                                                    t.name ===
                                                                    selectedValues.toTokenType
                                                            )?.img ||
                                                            '/images/stock-2.png'
                                                        }
                                                    />
                                                    <span className="token-label text-[#000000] text-[16px] font-normal text-left flex-grow ml-3 mr-8">
                                                        {
                                                            selectedValues.toTokenType
                                                        }
                                                    </span>
                                                    <ChevronDown
                                                        className={`ml-auto token-arrow transition-transform ${dropdownStates.toTokenSelect
                                                            ? 'rotate-180'
                                                            : ''
                                                            }`}
                                                    />
                                                </button>
                                                {dropdownStates.toTokenSelect && (
                                                    <ul className="token-list absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-48 overflow-auto ring-1 ring-black ring-opacity-5 text-[13px] font-normal text-black">
                                                        {tokenOptions.map(
                                                            (token, index) => (
                                                                <li
                                                                    key={index}
                                                                    className="token-item cursor-pointer select-none relative py-2 pl-3 pr-9 flex items-center hover:bg-gray-100"
                                                                    onClick={() =>
                                                                        handleSelection(
                                                                            'toTokenType',
                                                                            token.name
                                                                        )
                                                                    }
                                                                >
                                                                    <img
                                                                        alt=""
                                                                        className="w-6 h-6 mr-2"
                                                                        src={
                                                                            token.img
                                                                        }
                                                                    />
                                                                    {token.name}
                                                                </li>
                                                            )
                                                        )}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-[36px] modern-card px-[20px] py-[20px] flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex-1 font-normal text-sm leading-[18.86px] text-[#888888] text-center md:text-left">
                                    <span>Price</span>
                                    <p className="text-[#333333] font-semibold text-[18px] leading-[31.43px] mt-2">
                                        {/* {exchangeRate.toFixed(8)} */}
                                    </p>
                                </div>
                                <div className="flex-1">
                                    <span className="flex items-center gap-2 justify-center md:justify-end text-[#888888] text-sm">
                                        Slippage Tolerance
                                        <CircleQuestionMarkIcon size={16} />
                                    </span>
                                    <div className="flex items-center justify-center md:justify-end mt-2">
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
                                            className="font-semibold text-[18px] leading-[31.43px] text-[#DC2626] bg-transparent border-none outline-none w-12 text-right"
                                            min="0.1"
                                            max="50"
                                            step="0.1"
                                        />
                                        <span className="font-semibold text-[18px] leading-[31.43px] text-[#DC2626]">
                                            %
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {showProgressModal && (
                                <div className="fixed inset-0 flex items-center justify-center z-50">
                                    {/* Background with blur, not solid black */}
                                    <div className="absolute inset-0 bg-white/20 backdrop-blur-sm" />

                                    {/* Modal */}
                                    <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200">
                                        <h2 className="text-xl font-bold mb-4 text-gray-900">Bridge Progress</h2>

                                        <div className="space-y-3 max-h-64 overflow-y-auto">
                                            {progress.map((p, i) => {
                                                let statusColor =
                                                    p.status === "txSuccess"
                                                        ? "text-green-600"
                                                        : p.status === "pending"
                                                            ? "text-yellow-600"
                                                            : "text-red-600";
                                                return (
                                                    <div
                                                        key={i}
                                                        className="p-3 rounded-lg border border-gray-200 bg-gray-50 text-sm"
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-medium text-gray-800">
                                                                Step: {p.step}
                                                            </span>
                                                            <span className={`font-semibold ${statusColor}`}>
                                                                {p.status}
                                                            </span>
                                                        </div>

                                                        {p.txHash && (
                                                            <div className="mt-1">
                                                                <a
                                                                    href={`https://polygonscan.com/tx/${p.txHash}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-500 underline"
                                                                >
                                                                    View Tx
                                                                </a>
                                                            </div>
                                                        )}
                                                        {p.step === "waiting" && p.status === "pending" && (
                                                            <div className="mt-2 text-gray-600">
                                                                ⏳ Tokens are on the way... this usually takes 2–5 minutes.
                                                            </div>
                                                        )}
                                                        {p.depositId && (
                                                            <div className="text-gray-600 mt-1">
                                                                <strong>DepositId:</strong> {p.depositId}
                                                            </div>
                                                        )}
                                                        {p.fillTxTimestamp && (
                                                            <div className="text-gray-600 mt-1">
                                                                <strong>Fill Time:</strong>{" "}
                                                                {new Date(p.fillTxTimestamp * 1000).toLocaleString()}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {error && (
                                            <div className="mt-4 text-red-500 text-sm bg-red-50 border border-red-200 rounded p-2">
                                                <strong>Error:</strong> {error}
                                            </div>
                                        )}

                                        <div className="mt-6 flex justify-end">
                                            <button
                                                onClick={() => setShowProgressModal(false)}
                                                className="bg-blue-600 px-4 py-2 rounded-lg text-white font-medium hover:bg-blue-500 transition"
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <button
                                onClick={handleExchange}
                                disabled={showProgressModal || isLoading}
                                className="modern-button mt-[25px] md:mt-[40px] w-full p-[16px] text-center text-base font-semibold disabled:opacity-50"
                            >
                                {showProgressModal || isLoading ? 'Processing...' : 'Exchange'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <section className="md:py-[90px] py-[40px] px-4">
                <h2 className="font-medium lg:text-[64px] sm:text-[48px] text-[32px] md:leading-[70.4px] leading-[50px] text-center text-[#DC2626] max-w-[514px] mx-auto">
                    How <span className="text-[#B91C1C]">Cross Chain</span>{' '}
                    Exchange Works
                </h2>
                <p className="font-normal md:text-base text-xs md:leading-[25px] text-center text-[#767676] max-w-[910px] mx-auto pt-[30px]">
                    Ol regnbågsbarn sedan trigraf. Sus bloggosfär. Flexitarian
                    hemin i ben. Disamma. Sat diaren, i idyse. Pånen tiktigt.
                    Ningar polyna. Premussa. Tetrabelt dispere. Epinera.
                    Terranomi fabelt. Dore ser. Ponde nyn. Viter luvis utom
                    dide. Pansexuell låtir om än bobesm. Metrogram vekåvis.
                    Tjejsamla preligt i polig. Niseligen primatyp bibel. Prertad
                    lese. Mytogen bipod trevigon. Rorat filototal. Nepämohet
                    mongen. Rende okålig oaktat paraktiga. Kravallturism pahet.
                    Tick tral. Ananigt lask. Non. Otrohetskontroll egode. Vass
                    stenossade dekapött. Hint krislåda. Kvasise R-tal mivis.
                    Timent bonus malus, kalsongbadare. Plare. Klimatflykting
                    ohidengen. Robotjournalistik pernetik. Spere magisk lang.
                    Tell movis. Rögt lönöligen. Homor åtöligt, töposm. Prede
                    ament. Safariforskning tetrasasade förutom gågging. Reaska
                    multiren dial. Pren previs. Geosa progipäligt. Jypäng
                    snippa. Askbränd pådytining raligt. Platreck kollektomat i
                    mill. Pladade kynde. Andronomi. Progiras våsm fast intrase.
                    Semiren peteteles, homodent. Incel kaktig. Yck eska plus
                    pneumalog. Homon ol megan.
                </p>
                <div className="flex justify-center gap-3 md:mt-[60px] mt-[40px] items-center">
                    <WalletButton />
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
        </>
    )
}

export default Bridge
