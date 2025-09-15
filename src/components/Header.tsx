// components/Header.tsx
import { Menu, X, Wallet, ChevronDown, Copy, ExternalLink, LogOut } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import WalletModal from './WalletButton'

interface NavItem {
    name: string
    href: string
    path: string
}

const Header: React.FC = () => {
    const location = useLocation()
    const [isNavOpen, setIsNavOpen] = useState<boolean>(false)
    const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState<boolean>(false)
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
        copySuccess
    } = useWallet()

    const navItems: NavItem[] = [
        { name: 'Exchange', href: 'swap', path: '/swap' },
        { name: 'Pool', href: 'pool', path: '/pool' },
        { name: 'Bridge', href: 'bridge', path: '/bridge' },
        { name: 'Limit Order', href: 'limit', path: '/limit' },
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
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>{formatAddress(account!)}</span>
                    <ChevronDown
                        className={`w-4 h-4 transition-transform ${isWalletDropdownOpen ? 'rotate-180' : ''
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
                                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
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
                                    className="modern-dropdown-item flex items-center gap-3 text-sm text-red-600 w-full"
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
            <div
                className={`fixed top-0 left-0 right-0 z-50 pb-3 transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'
                    }`}
            >
                {/* Overlay */}
                <div
                    className={`fixed w-full h-screen bg-black/15 z-10 backdrop-blur-sm left-0 top-0 transition-opacity duration-300 ${isNavOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        } lg:hidden`}
                    onClick={toggleNav}
                />

                {/* Main Navigation */}
                <nav
                    className={`flex lg:flex-row flex-col lg:items-center bg-black text-white backdrop-blur-md px-4 py-2.5 lg:rounded-b-[12px] lg:static fixed top-0 right-0 lg:h-auto h-screen z-20 lg:gap-0 gap-8 w-full lg:max-w-full max-w-[300px] transition-transform duration-300 ease-in-out shadow-lg lg:shadow-md ${isNavOpen ? 'translate-x-0' : 'translate-x-full'
                        } lg:translate-x-0`}
                >
                    {/* Logo */}
                    <div className="lg:order-1 order-1 flex items-center justify-between gap-3">
                        <Link to="/" className="flex items-center">
                            <img
                                alt="logo"
                                className="w-[50px] max-w-[50px] hover:scale-75 transition-transform duration-200"
                                src="/images/logo.svg"
                            />
                        </Link>

                        {/* Close button for mobile */}
                        <button
                            className="lg:hidden p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                            onClick={toggleNav}
                            type="button"
                            aria-label="Close navigation menu"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Navigation Links */}
                    <ul className="lg:order-2 order-2 flex lg:flex-row flex-col gap-6 font-normal text-sm lg:ml-8">
                        {navItems.map((item: NavItem, index: number) => (
                            <li key={index} className="relative group">
                                <Link
                                    to={item.href}
                                    className={`relative block transition-all duration-200 text-white ${isActiveLink(item.path)
                                            ? 'text-[#333333] font-semibold'
                                            : 'text-[#888888]'
                                        }`}
                                >
                                    {item.name}
                                    {/* Green dot indicator */}
                                    <span
                                        className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-[#B91C1C] rounded-full transition-all duration-200 ${isActiveLink(item.path)
                                                ? 'opacity-100'
                                                : 'opacity-0 group-hover:opacity-100'
                                            }`}
                                    />
                                </Link>
                            </li>
                        ))}
                    </ul>

                    {/* Spacer for desktop */}
                    <div className="lg:order-3 order-3 lg:flex-1 hidden lg:block"></div>

                    {/* Right side controls */}
                    <div className="lg:order-4 order-4 flex lg:flex-row flex-col lg:items-center xl:gap-[40px] lg:gap-5 gap-6">
                        {/* Wallet Button */}
                        <WalletButton />
                    </div>
                </nav>

                {/* Mobile Navigation Toggle */}
                <div className="lg:hidden flex items-center justify-end gap-3 mt-2 px-4">
                    <button
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                        onClick={toggleNav}
                        type="button"
                        aria-label="Open navigation menu"
                    >
                        <Menu className="w-8 h-8" />
                    </button>
                </div>
            </div>

            {/* Wallet Modal - Rendered outside header context */}
            <WalletModal />
        </>
    )
}

export default Header