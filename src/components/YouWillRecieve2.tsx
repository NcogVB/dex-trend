import React, { useState, useCallback } from 'react'

interface ExchangeData {
    usdtAmount: number
    ethAmount: number
    usdtEthBurned: number
    usdtToEthRate: number
    ethToUsdtRate: number
}

interface YouWillReceive2Props {
    isOpen?: boolean
    onClose?: () => void
    onConfirm?: (data: ExchangeData) => void
    exchangeData?: ExchangeData
}

const YouWillReceive2Modal: React.FC<YouWillReceive2Props> = ({
    isOpen = true,
    onClose,
    onConfirm,
    exchangeData = {
        usdtAmount: 0.263337,
        ethAmount: 0.263337,
        usdtEthBurned: 0.00000000252446,
        usdtToEthRate: 0.00009192,
        ethToUsdtRate: 10879.2,
    },
}) => {
    const [isProcessing, setIsProcessing] = useState(false)
    const [isClosing, setIsClosing] = useState(false)

    const handleClose = useCallback(() => {
        setIsClosing(true)

        setTimeout(() => {
            setIsClosing(false)
            if (onClose) {
                onClose()
            }
        }, 200)
    }, [onClose])

    const handleConfirm = useCallback(async () => {
        setIsProcessing(true)

        try {
            // Simulate processing delay
            await new Promise((resolve) => setTimeout(resolve, 2000))

            if (onConfirm) {
                onConfirm(exchangeData)
            }

            // Close modal after successful confirmation
            setTimeout(() => {
                handleClose()
            }, 500)
        } catch (error) {
            console.error('Exchange failed:', error)
            alert('Exchange failed. Please try again.')
        } finally {
            setIsProcessing(false)
        }
    }, [exchangeData, onConfirm, handleClose])

    const handleBackdropClick = useCallback(
        (e: React.MouseEvent) => {
            if (e.target === e.currentTarget && !isProcessing) {
                handleClose()
            }
        },
        [handleClose, isProcessing]
    )

    const formatNumber = useCallback((num: number, decimals: number = 6) => {
        return num.toFixed(decimals).replace(/\.?0+$/, '')
    }, [])

    if (!isOpen && !isClosing) {
        return null
    }

    return (
        <div
            className={`fixed inset-0 bg-black/50 flex items-center justify-center px-4 min-h-screen z-50 transition-opacity duration-200 ${
                isClosing ? 'opacity-0' : 'opacity-100'
            }`}
            onClick={handleBackdropClick}
        >
            <div
                className={`hero-border w-full p-1 md:rounded-[40px] rounded-[20px] max-w-[567px] transform transition-all duration-200 ${
                    isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
                }`}
                style={{ fontFamily: '"Noto Sans", sans-serif' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-white relative shadow-lg border border-gray-200 w-full md:rounded-[40px] rounded-[20px] px-[15px] lg:px-[50px] py-[30px] lg:py-[40px]">
                    <div className="flex items-center justify-between">
                        <h2 className="text-[#000000] font-bold md:text-[30px] text-lg">
                            You will receive
                        </h2>
                        <button
                            className="cursor-pointer hover:bg-white/20 rounded-full p-1 transition-all duration-200 disabled:opacity-50"
                            onClick={handleClose}
                            disabled={isProcessing}
                            aria-label="Close modal"
                        >
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

                    <div className="overflow-x-auto md:my-[33px] my-[16px] bg-gray-50 border border-solid border-gray-200 rounded-[12px] md:p-[24px_28px] p-[15px_20px] space-y-6">
                        <div className="">
                            <div className="flex items-center gap-2.5 text-[#000] md:text-[26px] text-lg font-bold">
                                <h3 className="flex-grow truncate">
                                    {formatNumber(exchangeData.usdtAmount)}
                                </h3>
                                <div className="md:size-[32px] size-[20px] bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs md:text-sm">
                                    E
                                </div>
                                <h4>USDT</h4>
                            </div>
                            <h6 className="text-[#000] text-lg font-normal my-1">
                                +
                            </h6>
                            <div className="flex items-center gap-2.5 text-[#000] md:text-[26px] text-lg font-bold">
                                <h3 className="flex-grow truncate">
                                    {formatNumber(exchangeData.ethAmount)}
                                </h3>
                                <div className="md:size-[32px] size-[20px] bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-xs md:text-sm">
                                    U
                                </div>
                                <h4>USDT</h4>
                            </div>
                        </div>

                        <p className="text-[#000] md:text-lg text-xs font-normal my-7 italic">
                            Output is estimated if the prices changes by more
                            than 0.5% your transaction will revert
                        </p>

                        <div className="space-y-7">
                            <div className="flex items-center justify-between gap-2.5">
                                <h3 className="text-[#000] md:text-lg text-sm font-normal">
                                    USDT/ETH Burned
                                </h3>
                                <div className="flex items-center md:gap-2 gap-1">
                                    <div className="md:size-[24px] size-[18px] bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                        E
                                    </div>
                                    <div className="md:size-[24px] size-[18px] bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                        U
                                    </div>
                                    <h3 className="md:text-lg text-xs font-bold text-black truncate">
                                        {formatNumber(
                                            exchangeData.usdtEthBurned,
                                            11
                                        )}
                                    </h3>
                                </div>
                            </div>
                            <div className="flex items-start justify-between gap-2.5">
                                <h3 className="text-[#000] md:text-lg text-sm font-normal">
                                    Rates
                                </h3>
                                <div className="text-right">
                                    <h3 className="md:text-lg text-xs font-bold text-black truncate">
                                        1 USDT ={' '}
                                        {formatNumber(
                                            exchangeData.usdtToEthRate,
                                            8
                                        )}{' '}
                                        ETH
                                    </h3>
                                    <h3 className="md:text-lg text-xs font-bold text-black truncate">
                                        1 ETH ={' '}
                                        {exchangeData.ethToUsdtRate.toLocaleString()}{' '}
                                        USDT
                                    </h3>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleConfirm}
                        disabled={isProcessing}
                        className={`block w-full p-[16px_72px] text-center text-white text-base font-normal rounded-[33px] transition-all duration-200 ${
                            isProcessing
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-[#3DBEA3] hover:bg-[#2A8576] active:scale-95'
                        }`}
                    >
                        {isProcessing ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                Processing...
                            </div>
                        ) : (
                            'Confirm Exchange'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

const YouWillReceive2: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [exchangeData] = useState<ExchangeData>({
        usdtAmount: 0.263337,
        ethAmount: 0.263337,
        usdtEthBurned: 0.00000000252446,
        usdtToEthRate: 0.00009192,
        ethToUsdtRate: 10879.2,
    })

    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false)
    }, [])

    const handleConfirmExchange = useCallback((data: ExchangeData) => {
        console.log('Exchange confirmed with data:', data)
        alert('Exchange confirmed successfully!')
    }, [])

    const handleReopenModal = useCallback(() => {
        setIsModalOpen(true)
    }, [])

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            {!isModalOpen && (
                <button
                    onClick={handleReopenModal}
                    className="bg-[#3DBEA3] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#2A8576] transition-colors"
                >
                    Show You Will Receive Modal
                </button>
            )}

            <YouWillReceive2Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onConfirm={handleConfirmExchange}
                exchangeData={exchangeData}
            />
        </div>
    )
}

export default YouWillReceive2
