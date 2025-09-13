import React, { useState, useCallback, useRef } from 'react'

interface SuccessModalProps {
    isOpen?: boolean
    onClose?: () => void
    transactionHash?: string
    explorerUrl?: string
}

const SuccessModalComponent: React.FC<SuccessModalProps> = ({
    isOpen = true,
    onClose,
    transactionHash = '294b392054ef1c66c33cb92712d54392712d543',
    explorerUrl = 'https://etherscan.io',
}) => {
    const [isCopied, setIsCopied] = useState(false)
    const [isClosing, setIsClosing] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const copyToClipboard = useCallback(async () => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                // Use modern clipboard API
                await navigator.clipboard.writeText(transactionHash)
            } else {
                // Fallback for older browsers
                if (inputRef.current) {
                    inputRef.current.select()
                    inputRef.current.setSelectionRange(0, 99999) // For mobile devices
                    document.execCommand('copy')
                }
            }

            setIsCopied(true)

            // Reset copied state after 2 seconds
            setTimeout(() => {
                setIsCopied(false)
            }, 2000)
        } catch (error) {
            console.error('Failed to copy to clipboard:', error)
            alert('Failed to copy transaction hash')
        }
    }, [transactionHash])

    const handleClose = useCallback(() => {
        setIsClosing(true)

        // Add a small delay for smooth closing animation
        setTimeout(() => {
            setIsClosing(false)
            if (onClose) {
                onClose()
            }
        }, 200)
    }, [onClose])

    const handleOkClick = useCallback(() => {
        handleClose()
    }, [handleClose])

    const handleExplorerClick = useCallback(() => {
        const fullUrl = `${explorerUrl}/tx/${transactionHash}`
        window.open(fullUrl, '_blank', 'noopener,noreferrer')
    }, [explorerUrl, transactionHash])

    const handleBackdropClick = useCallback(
        (e: React.MouseEvent) => {
            if (e.target === e.currentTarget) {
                handleClose()
            }
        },
        [handleClose]
    )

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
                className={`hero-border w-full p-[3.5px] md:rounded-[40px] rounded-[20px] max-w-[567px] transform transition-all duration-200 ${
                    isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
                }`}
                style={{ fontFamily: '"Noto Sans", sans-serif' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-white relative shadow-lg border border-gray-200 w-full md:rounded-[40px] rounded-[20px] px-[15px] md:px-[50px] py-[20px] md:py-[34px]">
                    <div className="flex items-center justify-between mb-[22px]">
                        <h2 className="font-bold text-2xl sm:text-3xl leading-[100%] text-black">
                            Success
                        </h2>
                        <button
                            onClick={handleClose}
                            className="hover:bg-white/20 rounded-full p-1 transition-all duration-200"
                            aria-label="Close modal"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="32"
                                height="32"
                                fill="none"
                            >
                                <path
                                    fill="#fff"
                                    fillRule="evenodd"
                                    d="M29.334 16c0 7.364-5.97 13.334-13.334 13.334-7.363 0-13.333-5.97-13.333-13.334C2.667 8.637 8.637 2.667 16 2.667c7.364 0 13.334 5.97 13.334 13.333ZM11.96 11.96a1 1 0 0 1 1.414 0L16 14.586l2.627-2.626a1 1 0 0 1 1.414 1.414L17.414 16l2.627 2.627a1 1 0 0 1-1.415 1.414L16 17.414l-2.626 2.627a1 1 0 1 1-1.414-1.415L14.586 16l-2.626-2.626a1 1 0 0 1 0-1.414Z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    </div>

                    <div className="bg-[#FFFFFF66] rounded-[12px] pb-[34px] px-[30px] text-black border border-solid border-[#FFFFFF1A] text-center">
                        <div className="mt-[88px]">
                            <div className="mb-[36px] flex items-center justify-center">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="84"
                                    height="84"
                                    fill="none"
                                >
                                    <path
                                        fill="#3DBEA3"
                                        fillRule="evenodd"
                                        d="M83.666 42c0 23.011-18.654 41.666-41.666 41.666C18.988 83.666.333 65.012.333 42 .333 18.988 18.988.333 42 .333 65.01.333 83.666 18.988 83.666 42ZM58.793 29.373a3.125 3.125 0 0 1 0 4.42L37.959 54.626a3.125 3.125 0 0 1-4.419 0l-8.333-8.333a3.125 3.125 0 1 1 4.42-4.42l6.123 6.124 9.312-9.312 9.311-9.312a3.125 3.125 0 0 1 4.42 0Z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </div>

                            <h3 className="text-black font-bold text-[22px] sm:text-[26px] leading-[100%] mb-[18px]">
                                Transaction Success
                            </h3>

                            <p className="text-black font-normal text-[18px] sm:text-[22px] leading-[100%] mb-[22px]">
                                Transaction hash
                            </p>

                            <div className="flex items-center justify-center mb-[22px] gap-3">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={transactionHash}
                                    className="py-[14px] px-[20px] bg-[#FFFFFF99] rounded-[10px] font-normal text-lg leading-[100%] w-full truncate focus:outline-none focus:ring-2 focus:ring-[#3DBEA3]"
                                    readOnly
                                />
                                <button
                                    onClick={copyToClipboard}
                                    className={`min-w-[52px] size-[52px] rounded-[12px] flex items-center justify-center transition-all duration-200 ${
                                        isCopied
                                            ? 'bg-[#3DBEA3] scale-95'
                                            : 'bg-[#FFFFFF99] hover:bg-[#FFFFFF] hover:scale-105'
                                    }`}
                                    title={
                                        isCopied
                                            ? 'Copied!'
                                            : 'Copy transaction hash'
                                    }
                                >
                                    {isCopied ? (
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="24"
                                            height="24"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                fill="white"
                                                fillRule="evenodd"
                                                d="M20.707 5.293a1 1 0 0 1 0 1.414l-11 11a1 1 0 0 1-1.414 0l-5-5a1 1 0 1 1 1.414-1.414L9 15.586l10.293-10.293a1 1 0 0 1 1.414 0Z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    ) : (
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="24"
                                            height="24"
                                            fill="none"
                                        >
                                            <path
                                                fill="#2A8576"
                                                fillRule="evenodd"
                                                d="M15 1.25h-4.056c-1.838 0-3.294 0-4.433.153-1.172.158-2.121.49-2.87 1.238-.748.749-1.08 1.698-1.238 2.87-.153 1.14-.153 2.595-.153 4.433V16a3.751 3.751 0 0 0 3.166 3.705c.137.764.402 1.416.932 1.947.602.602 1.36.86 2.26.982.867.116 1.97.116 3.337.116h3.11c1.367 0 2.47 0 3.337-.116.9-.122 1.658-.38 2.26-.982.602-.602.86-1.36.982-2.26.116-.867.116-1.97.116-3.337v-5.11c0-1.367 0-2.47-.116-3.337-.122-.9-.38-1.658-.982-2.26-.531-.53-1.183-.795-1.947-.932A3.751 3.751 0 0 0 15 1.25Zm2.13 3.021A2.25 2.25 0 0 0 15 2.75h-4c-1.907 0-3.261.002-4.29.14-1.005.135-1.585.389-2.008.812-.423.423-.677 1.003-.812 2.009-.138 1.028-.14 2.382-.14 4.289v6a2.25 2.25 0 0 0 1.521 2.13c-.021-.61-.021-1.3-.021-2.075v-5.11c0-1.367 0-2.47.117-3.337.12-.9.38-1.658.981-2.26.602-.602 1.36-.86 2.26-.981.867-.117 1.97-.117 3.337-.117h3.11c.775 0 1.464 0 2.074.021ZM7.408 6.41c.277-.277.665-.457 1.4-.556.754-.101 1.756-.103 3.191-.103h3c1.435 0 2.436.002 3.192.103.734.099 1.122.28 1.399.556.277.277.457.665.556 1.4.101.754.103 1.756.103 3.191v5c0 1.435-.002 2.436-.103 3.192-.099.734-.28 1.122-.556 1.399-.277.277-.665.457-1.4.556-.755.101-1.756.103-3.191.103h-3c-1.435 0-2.437-.002-3.192-.103-.734-.099-1.122-.28-1.399-.556-.277-.277-.457-.665-.556-1.4-.101-.755-.103-1.756-.103-3.191v-5c0-1.435.002-2.437.103-3.192.099-.734.28-1.122.556-1.399Z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    )}
                                </button>
                            </div>

                            <p className="text-black font-normal text-[18px] sm:text-[22px] leading-[100%]">
                                View your transaction in
                                <button
                                    onClick={handleExplorerClick}
                                    className="font-extrabold text-[#2A8576] hover:text-[#3DBEA3] transition-colors duration-200 ml-1 hover:underline"
                                >
                                    Explorer
                                </button>
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleOkClick}
                        className="mt-10 w-full bg-[#3DBEA3] text-white rounded-full py-4 font-medium text-base leading-[17.6px] hover:bg-[#2A8576] transition-all duration-200 active:scale-95"
                        type="button"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    )
}

// Demo wrapper component to show how to use it
const Success: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [demoTransactionHash] = useState(
        '294b392054ef1c66c33cb92712d54392712d543'
    )

    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false)
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
                    Show Success Modal
                </button>
            )}

            <SuccessModalComponent
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                transactionHash={demoTransactionHash}
                explorerUrl="https://etherscan.io"
            />
        </div>
    )
}

export default Success
