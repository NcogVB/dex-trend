// components/WalletModal.tsx
import React from 'react'
import { X, Loader2 } from 'lucide-react'
import { useWallet } from '../contexts/WalletContext'

const WalletModal: React.FC = () => {
  const {
    isModalOpen,
    closeModal,
    connect,
    isConnecting,
  } = useWallet()

  if (!isModalOpen) return null

  const handleConnect = async (walletType: "metamask" | "trust") => {
    try {
      await connect(walletType)
      closeModal()
    } catch (error) {
      console.error('Connection failed:', error)
      // Error handling is done in the context with alerts
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={closeModal}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-2xl p-6 w-full max-w-md relative shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Connect Wallet
            </h2>
            <button
              onClick={closeModal}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
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
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  {/* MetaMask Icon */}
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 318 318"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M274.3 35.9l-99.5 73.9L193.1 65.8z"
                      fill="#E17726"
                      stroke="#E17726"
                      strokeWidth="0.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M44.4 35.9l98.7 74.6-17.5-44.3z"
                      fill="#E27625"
                      stroke="#E27625"
                      strokeWidth="0.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M238.3 206.8l-26.5 40.6 56.7 15.6 16.3-55.3z"
                      fill="#E27625"
                      stroke="#E27625"
                      strokeWidth="0.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M33.9 207.7l16.2 55.3 56.7-15.6-26.5-40.6z"
                      fill="#E27625"
                      stroke="#E27625"
                      strokeWidth="0.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">MetaMask</h3>
                  <p className="text-sm text-gray-500">
                    Connect using MetaMask wallet
                  </p>
                </div>
              </div>
              {isConnecting && (
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              )}
            </button>

            {/* Trust Wallet */}
            <button
              onClick={() => handleConnect('trust')}
              disabled={isConnecting}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  {/* Trust Wallet Icon */}
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2C12 2 8.5 3.5 8.5 8.5V13.5C8.5 18.5 12 22 12 22C12 22 15.5 18.5 15.5 13.5V8.5C15.5 3.5 12 2 12 2Z"
                      fill="#3375BB"
                    />
                    <path
                      d="M12 4.5C12 4.5 9.5 5.5 9.5 8.5V13C9.5 16.5 12 19 12 19C12 19 14.5 16.5 14.5 13V8.5C14.5 5.5 12 4.5 12 4.5Z"
                      fill="#FFFFFF"
                    />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">Trust Wallet</h3>
                  <p className="text-sm text-gray-500">
                    Connect using Trust Wallet
                  </p>
                </div>
              </div>
              {isConnecting && (
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center mb-2">
              Will automatically switch to Polygon Mainnet
            </p>
            <p className="text-xs text-gray-500 text-center">
              By connecting a wallet, you agree to our{' '}
              <span className="text-blue-600 hover:underline cursor-pointer">
                Terms of Service
              </span>{' '}
              and{' '}
              <span className="text-blue-600 hover:underline cursor-pointer">
                Privacy Policy
              </span>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default WalletModal