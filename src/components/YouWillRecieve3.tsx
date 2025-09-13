import React, { useState, useCallback } from 'react'

interface TransactionData {
    transactionHash: string
    etherscanUrl: string
    tokenSymbol: string
}

interface TransactionSubmittedProps {
    isOpen?: boolean
    onClose?: () => void
    onAddToMetamask?: () => void
    transactionData?: TransactionData
}

const TransactionSubmittedModal: React.FC<TransactionSubmittedProps> = ({
    isOpen = true,
    onClose,
    onAddToMetamask,
    transactionData = {
        transactionHash: '0x1234567890abcdef...',
        etherscanUrl: 'https://etherscan.io/tx/0x1234567890abcdef',
        tokenSymbol: 'SWAP-LP',
    },
}) => {
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

    const handleBackdropClick = useCallback(
        (e: React.MouseEvent) => {
            if (e.target === e.currentTarget) {
                handleClose()
            }
        },
        [handleClose]
    )

    const handleViewOnEtherscan = useCallback(() => {
        if (transactionData.etherscanUrl) {
            window.open(
                transactionData.etherscanUrl,
                '_blank',
                'noopener,noreferrer'
            )
        }
    }, [transactionData.etherscanUrl])

    const handleAddToMetamask = useCallback(() => {
        if (onAddToMetamask) {
            onAddToMetamask()
        } else {
            // Default MetaMask integration logic
            console.log('Adding SWAP-LP token to MetaMask...')
            alert('Adding token to MetaMask...')
        }
    }, [onAddToMetamask])

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
                className={`hero-border mx-4 max-w-[570px] w-full md:rounded-[40px] rounded-[20px] p-[3px] transform transition-all duration-200 ${
                    isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
                }`}
                style={{
                    background: `radial-gradient(98% 49.86% at 100.03% 100%, #33a36d 0%, rgba(51, 163, 109, 0.05) 100%), 
                      radial-gradient(24.21% 39.21% at 0% 0%, rgba(255, 255, 255, 0.81) 0%, rgba(255, 255, 255, 0.19) 100%),
                      radial-gradient(21.19% 40.1% at 100.03% 0%, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 100%)`,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-white relative shadow-lg border border-gray-200 w-full md:rounded-[40px] rounded-[20px] px-[15px] md:px-[50px] py-[15px] md:py-[34px]">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold sm:text-3xl text-xl text-black">
                            You will receive
                        </h3>
                        <span
                            className="cursor-pointer hover:bg-white/20 rounded-full p-1 transition-all duration-200"
                            onClick={handleClose}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="28"
                                height="28"
                                fill="none"
                            >
                                <path
                                    fill="#fff"
                                    fillRule="evenodd"
                                    d="M27.334 14c0 7.364-5.97 13.333-13.334 13.333C6.637 27.333.667 21.363.667 14 .667 6.636 6.637.667 14 .667 21.364.667 27.334 6.636 27.334 14ZM9.96 9.96a1 1 0 0 1 1.414 0L14 12.585l2.627-2.627a1 1 0 1 1 1.414 1.415L15.414 14l2.627 2.626a1 1 0 0 1-1.415 1.414L14 15.414l-2.626 2.626a1 1 0 1 1-1.414-1.414L12.586 14 9.96 11.374a1 1 0 0 1 0-1.415Z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </span>
                    </div>
                    <div className="sm:mt-[22px] mt-[10px] border border-gray-200 bg-gray-50 sm:pt-20 pt-10 sm:pb-[60px] pb-[30px] sm:px-[77px] px-[15px] rounded-[12px] text-center">
                        <span className="flex justify-center sm:size-[100px] size-[50px] mx-auto">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-full h-full"
                                viewBox="0 0 74 74"
                            >
                                <path
                                    fill="#3DBEA3"
                                    d="M47.29 18.376a3.125 3.125 0 1 0 4.42-4.42l-12.5-12.5a3.125 3.125 0 0 0-4.42 0l-12.5 12.5a3.125 3.125 0 1 0 4.42 4.42l7.165-7.165v34.122a3.125 3.125 0 1 0 6.25 0V11.211l7.166 7.165Z"
                                />
                                <path
                                    fill="#3DBEA3"
                                    d="M73.459 37a3.125 3.125 0 0 0-6.25 0c0 16.683-13.525 30.208-30.209 30.208C20.317 67.208 6.792 53.683 6.792 37a3.125 3.125 0 1 0-6.25 0C.542 57.135 16.865 73.458 37 73.458c20.136 0 36.46-16.323 36.46-36.458Z"
                                />
                            </svg>
                        </span>
                        <h4 className="font-bold sm:text-[26px] text-[20px] text-black sm:mt-[28px] mt-[10px] sm:mb-[12px] mb-[8px]">
                            Transaction Submitted
                        </h4>
                        <p
                            className="font-normal sm:text-[22px] text-[18px] text-[#2A8576] cursor-pointer hover:underline transition-all duration-200"
                            onClick={handleViewOnEtherscan}
                        >
                            View on EtherScan
                        </p>
                        <div className="mt-[28px] bg-[#FFFFFF99] sm:py-[30px] py-[15px] sm:px-[20px] px-[15px] rounded-[16px] flex justify-between items-center">
                            <h5 className="font-normal sm:text-lg text-sm text-black text-left">
                                Add {transactionData.tokenSymbol} to Metamask
                            </h5>
                            <button
                                onClick={handleAddToMetamask}
                                className="sm:size-[38px] size-[28px] rounded-full bg-orange-500 flex items-center justify-center hover:bg-orange-600 transition-colors duration-200"
                                aria-label="Add to MetaMask"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    className="w-5 h-5 text-white"
                                    fill="currentColor"
                                >
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="bg-[#3DBEA3] sm:p-[16px] p-[10px] w-full mt-[26px] rounded-[150px] font-semibold text-base leading-[17px] text-white hover:bg-[#2A8576] active:scale-95 transition-all duration-200"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

const YouWillRecieve3: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [transactionData] = useState<TransactionData>({
        transactionHash: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12',
        etherscanUrl:
            'https://etherscan.io/tx/0x1a2b3c4d5e6f7890abcdef1234567890abcdef12',
        tokenSymbol: 'SWAP-LP',
    })

    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false)
    }, [])

    const handleAddToMetamask = useCallback(() => {
        console.log('Adding token to MetaMask:', transactionData.tokenSymbol)
        alert(`Adding ${transactionData.tokenSymbol} token to MetaMask...`)
    }, [transactionData.tokenSymbol])

    const handleShowModal = useCallback(() => {
        setIsModalOpen(true)
    }, [])

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            {!isModalOpen && (
                <button
                    onClick={handleShowModal}
                    className="bg-[#3DBEA3] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#2A8576] transition-colors"
                >
                    Show Transaction Submitted Modal
                </button>
            )}

            <TransactionSubmittedModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onAddToMetamask={handleAddToMetamask}
                transactionData={transactionData}
            />
        </div>
    )
}

export default YouWillRecieve3
