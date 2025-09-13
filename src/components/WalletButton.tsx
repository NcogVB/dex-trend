// components/WalletButton.tsx
import React, { useState } from 'react'
import { Wallet, ChevronDown, Copy, ExternalLink, LogOut } from 'lucide-react'
import { useSwap } from '../contexts/SwapContext'

interface WalletButtonProps {
    className?: string
    variant?: 'default' | 'compact'
}

const WalletButton: React.FC<WalletButtonProps> = ({
    className = '',
    variant = 'default',
}) => {
    // Using your SwapContext hook instead of useWallet
    const { isConnected, account, connect, disconnect, isConnecting } =
        useSwap()
    const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false)
    const [copySuccess, setCopySuccess] = useState<boolean>(false)

    // Format address for display
    const formatAddress = (addr: string): string => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`
    }

    // Copy address to clipboard
    const copyAddress = async (): Promise<void> => {
        if (account) {
            try {
                await navigator.clipboard.writeText(account)
                setCopySuccess(true)
                console.log('Address copied to clipboard:', account)
                setTimeout(() => setCopySuccess(false), 2000)
            } catch (err) {
                console.error('Failed to copy address:', err)
            }
        }
    }

    // Open address in block explorer
    const viewOnExplorer = (): void => {
        if (account) {
            const explorerUrl = `https://etherscan.io/address/${account}`
            window.open(explorerUrl, '_blank')
        }
    }

    // Handle connect wallet
    const handleConnect = async (): Promise<void> => {
        try {
            await connect()
            console.log('Wallet connected successfully')
        } catch (error: any) {
            console.error('Connection failed:', error.message)
            // You can add toast notification here
        }
    }

    // Handle disconnect
    const handleDisconnect = (): void => {
        disconnect()
        setIsDropdownOpen(false)
        console.log('Wallet disconnected')
    }

    // Debug logging
    React.useEffect(() => {
        console.log('WalletButton state:', {
            isConnected,
            account,
            isConnecting,
            hasAccount: !!account,
        })
    }, [isConnected, account, isConnecting])

    if (!isConnected || !account) {
        return (
            <button
                onClick={handleConnect}
                disabled={isConnecting}
                className={`modern-button flex cursor-pointer items-center space-x-2 px-[16px] py-4 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            >
                <Wallet className="w-5 h-5" />
                <span>{isConnecting ? 'Connecting...' : 'Connect wallet'}</span>
            </button>
        )
    }

    if (variant === 'compact') {
        return (
            <div className="relative">
                <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`flex items-center space-x-2 bg-red-100 text-red-800 font-medium px-3 py-2 rounded-full hover:bg-red-200 transition-colors duration-200 ${className}`}
                >
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-sm">{formatAddress(account)}</span>
                    <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                    />
                </button>

                {/* Dropdown */}
                {isDropdownOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsDropdownOpen(false)}
                        />
                        <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-2">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                                    MetaMask
                                </p>
                                <p className="text-sm font-mono text-gray-900 mt-1">
                                    {account}
                                </p>
                            </div>

                            <button
                                onClick={copyAddress}
                                className="modern-dropdown-item w-full flex items-center gap-3 text-sm"
                            >
                                <Copy className="w-4 h-4" />
                                {copySuccess ? 'Copied!' : 'Copy Address'}
                            </button>

                            <button
                                onClick={viewOnExplorer}
                                className="modern-dropdown-item w-full flex items-center gap-3 text-sm"
                            >
                                <ExternalLink className="w-4 h-4" />
                                View on Explorer
                            </button>

                            <div className="border-t border-gray-100 mt-2 pt-2">
                                <button
                                    onClick={handleDisconnect}
                                    className="modern-dropdown-item w-full flex items-center gap-3 text-sm text-[#DC2626]"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Disconnect
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        )
    }

    return (
        <div className="relative cursor-pointer">
            <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex items-center space-x-2 bg-[#F8F8F8] text-[#333333] font-medium text-base leading-[17.6px] px-[16px] py-4 rounded-[8px] hover:bg-[#E5E5E5] transition-colors duration-200 border border-[#E5E5E5] ${className}`}
            >
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>{formatAddress(account)}</span>
                <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsDropdownOpen(false)}
                    />

                    {/* Dropdown Content */}
                    <div className="modern-dropdown absolute top-full right-0 mt-2 w-80 z-20 py-2">
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                                        Connected with MetaMask
                                    </p>
                                    <p className="text-sm font-mono text-gray-900 mt-1 break-all">
                                        {account}
                                    </p>
                                </div>
                                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="py-2">
                            <button
                                onClick={copyAddress}
                                className="modern-dropdown-item w-full flex items-center gap-3 text-sm"
                            >
                                <Copy className="w-4 h-4" />
                                {copySuccess ? 'Copied!' : 'Copy Address'}
                            </button>

                            <button
                                onClick={viewOnExplorer}
                                className="modern-dropdown-item w-full flex items-center gap-3 text-sm"
                            >
                                <ExternalLink className="w-4 h-4" />
                                View on Etherscan
                            </button>
                        </div>

                        {/* Disconnect */}
                        <div className="border-t border-gray-100 pt-2">
                            <button
                                onClick={handleDisconnect}
                                className="modern-dropdown-item w-full flex items-center gap-3 text-sm text-[#DC2626]"
                            >
                                <LogOut className="w-4 h-4" />
                                Disconnect Wallet
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export default WalletButton
