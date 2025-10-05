// components/WalletModal.tsx
import React, { useEffect, useState } from 'react'
import { X, Loader2, CheckCircle } from 'lucide-react'
import { useWallet } from '../contexts/WalletContext'

const WalletModal: React.FC = () => {
  const {
    isModalOpen,
    closeModal,
    connect,
    isConnecting,
    isConnected,
    provider,
    signer,
    account,
    connectedWallet
  } = useWallet()

  const [loadingWallet, setLoadingWallet] = useState<"metamask" | "trust" | null>(null)
  const [connectionStep, setConnectionStep] = useState<'connecting' | 'loading' | 'success' | null>(null)

  // Reset states when modal opens/closes
  useEffect(() => {
    if (isModalOpen && !isConnected) {
      setLoadingWallet(null)
      setConnectionStep(null)
    }
  }, [isModalOpen, isConnected])

  // Handle successful connection
  // Close modal automatically once wallet is connected
  useEffect(() => {
    if (isConnected && account && provider && signer) {
      // Mark success if not already
      if (connectionStep !== 'success') setConnectionStep('success');

      const timer = setTimeout(() => {
        closeModal();
      }, 1200); // Close after success message

      return () => clearTimeout(timer);
    }
  }, [isConnected, account, provider, signer, connectionStep, closeModal]);


  if (!isModalOpen) return null

  const handleConnect = async (walletType: "metamask" | "trust") => {
    try {
      setLoadingWallet(walletType)
      setConnectionStep('connecting')

      await connect(walletType)

      // Set loading state to wait for provider and signer
      setConnectionStep('loading')

    } catch (error) {
      console.error('Connection failed:', error)
      setLoadingWallet(null)
      setConnectionStep(null)
      // Error handling is done in the context with alerts
    }
  }

  const handleClose = () => {
    if (!isConnecting && connectionStep !== 'loading') {
      closeModal()
    }
  }

  const renderConnectionStatus = () => {
    if (connectionStep === 'connecting') {
      return (
        <div className="text-center py-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-red-500 mb-2" />
          <p className="text-sm text-gray-600">Connecting to {loadingWallet}...</p>
          <p className="text-xs text-gray-500 mt-1">Check your wallet for connection request</p>
        </div>
      )
    }

    if (connectionStep === 'loading') {
      return (
        <div className="text-center py-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-500 mb-2" />
          <p className="text-sm text-gray-600">Initializing wallet...</p>
          <p className="text-xs text-gray-500 mt-1">Loading provider and signer</p>
        </div>
      )
    }

    if (connectionStep === 'success') {
      return (
        <div className="text-center py-4">
          <CheckCircle className="w-8 h-8 mx-auto text-green-500 mb-2" />
          <p className="text-sm text-gray-600">Successfully connected!</p>
          <p className="text-xs text-gray-500 mt-1">Wallet ready for transactions</p>
        </div>
      )
    }

    return null
  }

  return (
    <>
      {/* Overlay - Only blur, no black background */}
      <div
        className="fixed inset-0 backdrop-blur-md z-50 flex items-center justify-center p-4"
        onClick={handleClose}
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)' // Very light overlay
        }}
      >
        {/* Modal */}
        <div
          className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 w-full max-w-md relative shadow-2xl border border-white/20"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Connect Wallet
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
              disabled={isConnecting || connectionStep === 'loading'}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Connection Status */}
          {connectionStep && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              {renderConnectionStatus()}
            </div>
          )}

          {/* Wallet Options - Hidden during connection process */}
          {!connectionStep && (
            <div className="space-y-3">
              {/* MetaMask */}
              <button
                onClick={() => handleConnect('metamask')}
                disabled={isConnecting || !!connectionStep}
                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-orange-300 hover:bg-orange-50/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center group-hover:bg-orange-100 transition-colors duration-200">
                    <img
                      src="/images/metamask.png"
                      alt="MetaMask"
                      className="w-8 h-8 object-contain"
                    />
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900">MetaMask</h3>
                    <p className="text-sm text-gray-500">
                      Connect using MetaMask wallet
                    </p>
                  </div>
                </div>
                {loadingWallet === 'metamask' && (
                  <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                )}
                {connectedWallet === 'metamask' && !connectionStep && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
              </button>

              {/* Trust Wallet */}
              <button
                onClick={() => handleConnect('trust')}
                disabled={isConnecting || !!connectionStep}
                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-red-300 hover:bg-red-50/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center group-hover:bg-red-100 transition-colors duration-200">
                    <img
                      src="/images/trust.png"
                      alt="Trust Wallet"
                      className="w-8 h-8 object-contain"
                    />
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900">Trust Wallet</h3>
                    <p className="text-sm text-gray-500">
                      Connect using Trust Wallet
                    </p>
                  </div>
                </div>
                {loadingWallet === 'trust' && (
                  <Loader2 className="w-5 h-5 animate-spin text-red-500" />
                )}
                {connectedWallet === 'trust' && !connectionStep && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
              </button>
            </div>
          )}

          {/* Footer - Hidden during connection */}
          {!connectionStep && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <p className="text-xs text-gray-600 font-medium">
                  SkyHigh Chain
                </p>
              </div>
              <p className="text-xs text-gray-500 text-center">
                By connecting a wallet, you agree to our{' '}
                <span className="text-red-600 hover:underline cursor-pointer">
                  Terms of Service
                </span>{' '}
                and{' '}
                <span className="text-red-600 hover:underline cursor-pointer">
                  Privacy Policy
                </span>
              </p>
            </div>
          )}

          {/* Debug Info - Remove in production */}
          {process.env.NODE_ENV === 'development' && isConnected && (
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
              <div>Connected: {isConnected ? '✅' : '❌'}</div>
              <div>Provider: {provider ? '✅' : '❌'}</div>
              <div>Signer: {signer ? '✅' : '❌'}</div>
              <div>Account: {account ? account.slice(0, 10) + '...' : '❌'}</div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default WalletModal