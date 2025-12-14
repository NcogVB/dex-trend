// components/Header.tsx
import {
    Menu,
    X,
    Wallet,
    ChevronDown,
    Copy,
    ExternalLink,
    LogOut,
} from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import ChainSwitcher from './ChainSwitcher'
import WalletModal from './WalletModel'

interface NavItem {
    name: string
    href: string
    path: string
    external?: boolean
}

const Header: React.FC = () => {
    const location = useLocation()
    const [isNavOpen, setIsNavOpen] = useState<boolean>(false)
    const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState<boolean>(false)
    const [isVisible, setIsVisible] = useState<boolean>(true)
    const [lastScrollY, setLastScrollY] = useState<number>(0)

    const {
        account,
        connectedWallet,
        isConnected,
        openModal,
        disconnect,
        formatAddress,
        copyAddress,
        viewOnExplorer,
        chainId,
        switchToSkyHigh,
        switchToBSC,
        copySuccess,
    } = useWallet()

    const navItems: NavItem[] = [
        { name: 'Swap', href: 'swap', path: '/swap' },
        { name: 'Pool', href: 'pool', path: '/pool' },
        { name: 'Bridge', href: 'https://bridge.skyhighblockchain.com/', path: '', external: true },
        { name: 'Exchange', href: 'exchange', path: '/exchange' },
        { name: 'Presell', href: 'Presell', path: '/Presell' },
        // { name: 'Dashboard', href: 'Dashboard', path: '/Dashboard' },
    ]

    // Scroll hide logic
    useEffect(() => {
        const handleScroll = (): void => {
            const currentScrollY = window.scrollY

            if (currentScrollY < lastScrollY) {
                setIsVisible(true)
            } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
                setIsVisible(false)
                setIsWalletDropdownOpen(false)
            }

            setLastScrollY(currentScrollY)
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [lastScrollY])
    // Auto-switch to SkyHigh on specific pages
    useEffect(() => {
        if (!isConnected) return;

        const pathsRequiringSkyHigh = [
            "/swap",
            "/pool",
            "/bridge",
            "/exchange",
            "/PoolData"
        ];

        if (location.pathname === "/Presell") {
            if (chainId === 1476) {
                switchToBSC();
            } else if (chainId !== 137 && chainId !== 56) {
                switchToBSC();
            }
        } else if (pathsRequiringSkyHigh.includes(location.pathname)) {
            if (chainId !== 1476) {
                switchToSkyHigh();
            }
        }
    }, [location.pathname, chainId, isConnected]);

    const WalletButton = () => {
        if (!isConnected) {
            return (
                <button
                    onClick={openModal}
                    className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 px-5 py-2.5 rounded-lg text-white text-sm font-medium shadow hover:opacity-90 transition"
                >
                    <Wallet className="w-4 h-4" />
                    Connect Wallet
                </button>
            )
        }

        return (
            <div className="relative">
                <button
                    onClick={() => setIsWalletDropdownOpen(!isWalletDropdownOpen)}
                    className="flex items-center gap-2 bg-gray-100 px-4 py-2.5 rounded-lg text-sm font-medium border hover:bg-gray-200 transition"
                >
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    {formatAddress(account!)}
                    <ChevronDown
                        className={`w-4 h-4 transition-transform ${isWalletDropdownOpen ? 'rotate-180' : ''}`}
                    />
                </button>

                {isWalletDropdownOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsWalletDropdownOpen(false)}
                        />
                        <div className="absolute right-0 mt-2 w-64 z-20 bg-white border rounded-xl shadow-lg py-3">
                            <div className="px-4 pb-3 border-b">
                                <p className="text-xs text-gray-500">Connected via {connectedWallet}</p>
                                <p className="text-sm font-mono mt-1 break-all">{account}</p>
                            </div>

                            <button
                                onClick={copyAddress}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
                            >
                                <Copy className="w-4 h-4" />
                                {copySuccess ? "Copied!" : "Copy Address"}
                            </button>

                            <button
                                onClick={viewOnExplorer}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
                            >
                                <ExternalLink className="w-4 h-4" />
                                View on Explorer
                            </button>

                            <button
                                onClick={disconnect}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t mt-2 pt-2"
                            >
                                <LogOut className="w-4 h-4" />
                                Disconnect
                            </button>
                        </div>
                    </>
                )}
            </div>
        )
    }

    return (
        <>
            <header
                className={`sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md transition-transform duration-300 
            ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}
            >
                <div className="container mx-auto flex h-16 items-center justify-between px-4">

                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2">
                        <img src="/images/dex.jpeg" alt="Dextrend Logo" className="h-9 w-9 rounded-full object-cover" />
                        <span className="text-lg font-bold tracking-wide">Dextrend</span>
                    </Link>

                    {/* Centered Navigation */}
                    <nav className="absolute left-1/2 transform -translate-x-1/2 hidden md:flex items-center gap-8">
                        {navItems.map((item, index) =>
                            item.external ? (
                                <a
                                    key={index}
                                    href={item.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm font-medium transition text-gray-600 hover:text-gray-900"
                                >
                                    {item.name}
                                </a>
                            ) : (
                                <Link
                                    key={index}
                                    to={item.href}
                                    className={`text-sm font-medium transition ${location.pathname === item.path
                                        ? "text-red-600"
                                        : "text-gray-600 hover:text-gray-900"
                                        }`}
                                >
                                    {item.name}
                                </Link>
                            )
                        )}
                    </nav>


                    {/* Right Controls */}
                    <div className="flex items-center gap-3">
                        <ChainSwitcher />
                        <WalletButton />

                        {/* Mobile nav toggle */}
                        <button
                            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
                            onClick={() => setIsNavOpen(!isNavOpen)}
                        >
                            {isNavOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {isNavOpen && (
                    <>
                        <div className="md:hidden border-t bg-white shadow-md">
                            <nav className="px-4 py-4 space-y-3">
                                {navItems.map((item, index) =>
                                    item.external ? (
                                        <a
                                            key={index}
                                            href={item.href}
                                            target="_blank"
                                            className="block text-gray-700 font-medium"
                                        >
                                            {item.name}
                                        </a>
                                    ) : (
                                        <Link
                                            key={index}
                                            to={item.href}
                                            className="block text-gray-700 font-medium"
                                            onClick={() => setIsNavOpen(false)}
                                        >
                                            {item.name}
                                        </Link>
                                    )
                                )}
                            </nav>
                        </div>
                    </>
                )}
            </header>
            <WalletModal />
        </>
    )
}

export default Header
