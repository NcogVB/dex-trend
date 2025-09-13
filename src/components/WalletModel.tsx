// components/WalletModal.tsx
import React from 'react'
import { X, AlertCircle, Loader2 } from 'lucide-react'
import { useWallet } from '../hooks/useWallet'

const WalletModal: React.FC = () => {
  const {
    isModalOpen,
    closeModal,
    connectMetaMask,
    connectWalletConnect,
    isConnecting,
    error,
  } = useWallet()

  if (!isModalOpen) return null

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

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Wallet Options */}
          <div className="space-y-3">
            {/* MetaMask */}
            <button
              onClick={connectMetaMask}
              disabled={isConnecting}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  {/* MetaMask Icon */}
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22.56 5.443l-3.715-2.83c-.38-.29-.926-.22-1.22.157l-2.573 3.302c-.294.377-.227.925.15 1.218l3.715 2.83c.38.29.926.22 1.22-.157l2.573-3.302c.294-.377.227-.925-.15-1.218z"
                      fill="#E17726"
                    />
                    <path
                      d="M1.44 5.443l3.715-2.83c.38-.29.926-.22 1.22.157l2.573 3.302c.294.377.227.925-.15 1.218l-3.715 2.83c-.38.29-.926.22-1.22-.157L1.29 6.661c-.294-.377-.227-.925.15-1.218z"
                      fill="#E27625"
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

            {/* WalletConnect */}
            <button
              onClick={connectWalletConnect}
              disabled={isConnecting}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  {/* WalletConnect Icon */}
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M7.168 8.832c3.29-3.22 8.625-3.22 11.915 0l.396.388c.164.16.164.42 0 .58l-1.355 1.326c-.082.08-.215.08-.297 0l-.545-.534c-2.295-2.246-6.016-2.246-8.311 0l-.584.572c-.082.08-.215.08-.297 0L6.735 9.838c-.164-.16-.164-.42 0-.58l.433-.426zm14.708 2.742l1.207 1.182c.164.16.164.42 0 .58l-5.442 5.326c-.164.16-.43.16-.594 0l-3.861-3.778c-.041-.04-.107-.04-.148 0l-3.861 3.778c-.164.16-.43.16-.594 0L3.141 13.336c-.164-.16-.164-.42 0-.58l1.207-1.182c.164-.16.43-.16.594 0l3.861 3.778c.041.04.107.04.148 0l3.861-3.778c.164-.16.43-.16.594 0l3.861 3.778c.041.04.107.04.148 0l3.861-3.778c.164-.16.43-.16.594 0z"
                      fill="#3B99FC"
                    />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">WalletConnect</h3>
                  <p className="text-sm text-gray-500">
                    Connect using WalletConnect
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