// components/WalletModal.tsx
import React from 'react'
import { createPortal } from 'react-dom'
import { Wallet, X } from 'lucide-react'
import { useWallet } from '../contexts/WalletContext'

const WalletModal: React.FC = () => {
    const {
        isModalOpen,
        closeModal,
        connect,
        isConnecting
    } = useWallet()

    if (!isModalOpen) return null

    const handleConnect = async (walletType: "metamask" | "trust") => {
        try {
            await connect(walletType)
            closeModal()
        } catch (error) {
            console.error('Connection failed:', error)
            // Error is already handled in the context with alerts
        }
    }

    const modalContent = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl transform transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">
                        Connect Wallet
                    </h2>
                    <button
                        onClick={closeModal}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        disabled={isConnecting}
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Wallet Options */}
                <div className="space-y-3">
                    {/* MetaMask */}
                    <button
                        onClick={() => handleConnect('metamask')}
                        disabled={isConnecting}
                        className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <img
                                src="/images/metamask.svg"
                                alt="MetaMask"
                                className="w-8 h-8"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                    const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon')
                                    if (fallback) (fallback as HTMLElement).style.display = 'flex'
                                }}
                            />
                            <Wallet className="w-6 h-6 text-gray-600 fallback-icon hidden" />
                        </div>
                        <div className="text-left flex-1">
                            <p className="font-semibold text-gray-900">MetaMask</p>
                            <p className="text-sm text-gray-500">
                                Connect using MetaMask wallet
                            </p>
                        </div>
                        {isConnecting && (
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        )}
                    </button>

                    {/* Trust Wallet */}
                    <button
                        onClick={() => handleConnect('trust')}
                        disabled={isConnecting}
                        className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <img
                                src="/images/trustwallet.svg"
                                alt="Trust Wallet"
                                className="w-8 h-8"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                    const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon')
                                    if (fallback) (fallback as HTMLElement).style.display = 'flex'
                                }}
                            />
                            <Wallet className="w-6 h-6 text-gray-600 fallback-icon hidden" />
                        </div>
                        <div className="text-left flex-1">
                            <p className="font-semibold text-gray-900">Trust Wallet</p>
                            <p className="text-sm text-gray-500">
                                Connect using Trust Wallet
                            </p>
                        </div>
                        {isConnecting && (
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        )}
                    </button>
                </div>

                {/* Footer */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-gray-500">
                        By connecting, you agree to our Terms of Service
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        Will automatically switch to Polygon network
                    </p>
                </div>
            </div>
        </div>
    )

    // Use portal to render outside of header context
    return createPortal(modalContent, document.body)
}

export default WalletModal