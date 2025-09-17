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
import WalletModal from './WalletModel'

interface NavItem {
    name: string
    href: string
    path: string
}

const Header: React.FC = () => {
    const location = useLocation()
    const [isNavOpen, setIsNavOpen] = useState<boolean>(false)
    const [isWalletDropdownOpen, setIsWalletDropdownOpen] =
        useState<boolean>(false)
    const [isVisible, setIsVisible] = useState<boolean>(true)
    const [lastScrollY, setLastScrollY] = useState<number>(0)

    // Use wallet context
    const {
        account,
        connectedWallet,
        isConnected,
        openModal,
        disconnect,
        formatAddress,
        copyAddress,
        viewOnExplorer,
        copySuccess,
    } = useWallet()

    const navItems: NavItem[] = [
        { name: 'Home', href: 'home', path: '/home' },
        { name: 'Pool', href: 'pool', path: '/pool' },
        { name: 'Bridge', href: 'bridge', path: '/bridge' },
        { name: 'Exchange', href: 'exchange', path: '/exchange' },
    ]

    // Handle scroll behavior
    useEffect(() => {
        const handleScroll = (): void => {
            const currentScrollY = window.scrollY

            if (currentScrollY < lastScrollY) {
                // Scrolling up
                setIsVisible(true)
            } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
                // Scrolling down and past 100px
                setIsVisible(false)
                // Close dropdowns when hiding navbar
                setIsWalletDropdownOpen(false)
            }

            setLastScrollY(currentScrollY)
        }

        // Add scroll listener
        window.addEventListener('scroll', handleScroll, { passive: true })

        // Cleanup
        return () => {
            window.removeEventListener('scroll', handleScroll)
        }
    }, [lastScrollY])

    const toggleNav = (): void => {
        setIsNavOpen(!isNavOpen)
    }

    const toggleWalletDropdown = (): void => {
        setIsWalletDropdownOpen(!isWalletDropdownOpen)
    }

    const isActiveLink = (path: string): boolean => {
        return location.pathname === path
    }

    const handleDisconnect = (): void => {
        disconnect()
        setIsWalletDropdownOpen(false)
    }

    // Wallet Button Component
    const WalletButton = () => {
        if (!isConnected) {
            return (
                <button
                    onClick={openModal}
                    className="modern-button flex cursor-pointer items-center space-x-2 px-[16px] py-4"
                >
                    <Wallet className="w-5 h-5" />
                    <span>Connect Wallet</span>
                </button>
            )
        }

        return (
            <div className="relative">
                <button
                    onClick={toggleWalletDropdown}
                    className="flex items-center space-x-2 bg-[#F8F8F8] text-[#333333] font-medium px-[16px] py-4 rounded-[8px] border hover:bg-[#E5E5E5] transition"
                >
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>{formatAddress(account!)}</span>
                    <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                            isWalletDropdownOpen ? 'rotate-180' : ''
                        }`}
                    />
                </button>

                {isWalletDropdownOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsWalletDropdownOpen(false)}
                        />
                        <div className="modern-dropdown absolute top-full right-0 mt-2 w-80 z-20 bg-white border rounded-xl shadow-lg py-2">
                            <div className="px-4 py-3 border-b">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-medium">
                                            Connected with {connectedWallet}
                                        </p>
                                        <p className="text-sm font-mono text-gray-900 mt-1 break-all">
                                            {account}
                                        </p>
                                    </div>
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    </div>
                                </div>
                            </div>

                            <div className="py-2">
                                <button
                                    onClick={copyAddress}
                                    className="modern-dropdown-item flex items-center gap-3 text-sm w-full"
                                >
                                    <Copy className="w-4 h-4" />
                                    {copySuccess ? 'Copied!' : 'Copy Address'}
                                </button>

                                <button
                                    onClick={viewOnExplorer}
                                    className="modern-dropdown-item flex items-center gap-3 text-sm w-full"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    View on Explorer
                                </button>
                            </div>

                            <div className="border-t pt-2">
                                <button
                                    onClick={handleDisconnect}
                                    className="modern-dropdown-item flex items-center gap-3 text-sm text-blue-600 w-full"
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

    return (
        <>
            <header
                className={`sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 transition-transform duration-300 ${
                    isVisible ? 'translate-y-0' : '-translate-y-full'
                }`}
            >
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    {/* Logo */}
                    <div className="flex items-center space-x-2">
                        <Link to="/" className="flex items-center space-x-2">
                            {/* <div className="h-8 w-8 rounded-full bg-blue-600"></div> */}
                            <span className="text-xl font-bold text-gray-900">
                                Dextrand
                            </span>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-8">
                        {navItems.map((item: NavItem, index: number) => (
                            <Link
                                key={index}
                                to={item.href}
                                className={`text-sm font-medium transition-colors relative ${
                                    isActiveLink(item.path)
                                        ? 'text-blue-600'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                {item.name}
                                {/* Active link indicator */}
                                {isActiveLink(item.path) && (
                                    <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                                )}
                            </Link>
                        ))}
                    </nav>

                    {/* Right side controls */}
                    <div className="flex items-center space-x-4">
                        {/* Wallet Button */}
                        <WalletButton />

                        {/* Mobile menu button */}
                        <button
                            className="md:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors"
                            onClick={toggleNav}
                            type="button"
                            aria-label="Toggle navigation menu"
                        >
                            {isNavOpen ? (
                                <X className="w-6 h-6" />
                            ) : (
                                <Menu className="w-6 h-6" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {isNavOpen && (
                    <>
                        {/* Overlay */}
                        <div
                            className="fixed inset-0 z-10 bg-black/20 backdrop-blur-sm md:hidden"
                            onClick={toggleNav}
                        />

                        {/* Mobile menu */}
                        <div className="absolute top-full left-0 right-0 z-20 bg-white border-b border-gray-200 shadow-lg md:hidden">
                            <nav className="container mx-auto px-4 py-4 space-y-4">
                                {navItems.map(
                                    (item: NavItem, index: number) => (
                                        <Link
                                            key={index}
                                            to={item.href}
                                            onClick={toggleNav}
                                            className={`block text-sm font-medium transition-colors ${
                                                isActiveLink(item.path)
                                                    ? 'text-blue-600'
                                                    : 'text-gray-600 hover:text-gray-900'
                                            }`}
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

            {/* Wallet Modal - Rendered outside header context */}
            <WalletModal />
        </>
    )
}

export default Header
