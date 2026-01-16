import {
    Menu,
    X,
    Wallet,
    ChevronDown,
    Copy,
    ExternalLink,
    LogOut,
    // ArrowRightLeft,
    Layers,
    Globe,
    BarChart3,
    BookOpen,
    Rocket
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import ChainSwitcher from './ChainSwitcher';
import WalletModal from './WalletModel';

interface NavItem {
    name: string;
    href: string;
    path: string;
    external?: boolean;
    icon?: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
    { name: 'Bridge', href: 'https://bridge.skyhighblockchain.com/', path: '', external: true, icon: <Globe className="w-4 h-4" /> },
    { name: 'Exchange', href: 'exchange', path: '/exchange', icon: <BarChart3 className="w-4 h-4" /> },
    { name: 'Futures', href: 'Futures', path: '/Futures', icon: <BarChart3 className="w-4 h-4" /> },
    { name: 'Options', href: 'Options', path: '/Options', icon: <BarChart3 className="w-4 h-4" /> },
    // { name: 'Lending', href: 'LendingBorrowing', path: '/LendingBorrowing', icon: <BookOpen className="w-4 h-4" /> },
    // { name: 'Policy', href: 'policy', path: '/policy', icon: <Layers className="w-4 h-4" /> },
    { name: 'Presell', href: 'Presell', path: '/Presell', icon: <Rocket className="w-4 h-4" /> },
];

const Header: React.FC = () => {
    const location = useLocation();
    const [isNavOpen, setIsNavOpen] = useState(false);
    const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const lastScrollY = React.useRef(0);

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
    } = useWallet();

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            if (Math.abs(currentScrollY - lastScrollY.current) < 10) return;

            if (currentScrollY < lastScrollY.current) {
                setIsVisible(true);
            } else if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
                setIsVisible(false);
                setIsWalletDropdownOpen(false); // Close dropdown on scroll down
            }
            lastScrollY.current = currentScrollY;
        };

        let ticking = false;
        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        if (!isConnected) return;

        const pathsRequiringSkyHigh = new Set([
            "/bridge", "/exchange",
            "/policy", "/LendingBorrowing", "/PoolData"
        ]);

        if (location.pathname === "/Presell") {
            if (chainId === 1476 || (chainId !== 137 && chainId !== 56)) {
                switchToBSC();
            }
        } else if (pathsRequiringSkyHigh.has(location.pathname)) {
            if (chainId !== 1476) {
                switchToSkyHigh();
            }
        }
    }, [location.pathname, chainId, isConnected, switchToBSC, switchToSkyHigh]);

    useEffect(() => {
        setIsNavOpen(false);
    }, [location.pathname]);

    return (
        <>
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out will-change-transform ${isVisible ? 'translate-y-0' : '-translate-y-full'
                    }`}
            >
                {/* Backdrop with backdrop-filter creates a heavy GPU layer, ensure it's optimized */}
                <div className="absolute inset-0 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm"></div>

                <div className="container mx-auto relative h-[72px] flex items-center justify-between px-4 lg:px-8">

                    {/* Logo Area - Added fetchPriority for faster LCP */}
                    <Link to="/" className="flex items-center gap-3 group z-10 select-none">
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-500 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                            <img
                                src="/images/dex.jpeg"
                                alt="Dextrend"
                                className="h-10 w-10 rounded-full object-cover relative ring-2 ring-white shadow-sm"
                                width="40"
                                height="40"
                                // @ts-ignore
                                fetchpriority="high"
                            />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                            Dextrend
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center absolute left-1/2 -translate-x-1/2 bg-gray-100/80 p-1.5 rounded-full border border-gray-200/50 backdrop-blur-sm">
                        {NAV_ITEMS.map((item, index) => {
                            const isActive = location.pathname === item.path && !item.external;
                            return item.external ? (
                                <a
                                    key={index}
                                    href={item.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-500 rounded-full hover:text-gray-900 hover:bg-white hover:shadow-sm transition-all duration-200"
                                >
                                    {item.icon}
                                    {item.name}
                                </a>
                            ) : (
                                <Link
                                    key={index}
                                    to={item.href}
                                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${isActive
                                            ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
                                            : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
                                        }`}
                                >
                                    {item.icon}
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right Side Actions */}
                    <div className="flex items-center gap-3 z-10">
                        <div className="hidden sm:block">
                            <ChainSwitcher />
                        </div>

                        {/* WALLET BUTTON LOGIC INLINED FOR PERFORMANCE */}
                        {!isConnected ? (
                            <button
                                onClick={openModal}
                                className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-md hover:scale-105 hover:shadow-lg transition-all duration-200 active:scale-95"
                            >
                                <Wallet className="w-4 h-4" />
                                <span>Connect</span>
                            </button>
                        ) : (
                            <div className="relative">
                                <button
                                    onClick={() => setIsWalletDropdownOpen(!isWalletDropdownOpen)}
                                    className="flex items-center gap-2 bg-white/50 backdrop-blur-sm border border-gray-200 px-4 py-2 rounded-full text-sm font-medium hover:bg-white hover:shadow-sm transition-all duration-200"
                                >
                                    <div className={`w-2 h-2 rounded-full ${chainId ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></div>
                                    <span className="text-gray-700">{formatAddress(account!)}</span>
                                    <ChevronDown
                                        className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isWalletDropdownOpen ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                {isWalletDropdownOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setIsWalletDropdownOpen(false)}
                                        />
                                        <div className="absolute right-0 mt-3 w-72 z-20 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                            <div className="p-4 bg-gray-50/80 border-b border-gray-100">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Connected</span>
                                                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold border border-green-200">
                                                        Active
                                                    </span>
                                                </div>
                                                <p className="text-sm font-bold text-gray-800 break-all font-mono">{account}</p>
                                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                    via {connectedWallet}
                                                </p>
                                            </div>

                                            <div className="p-2 space-y-1">
                                                <button
                                                    onClick={copyAddress}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors group"
                                                >
                                                    <div className="p-1.5 rounded-md bg-gray-100 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                        <Copy className="w-4 h-4" />
                                                    </div>
                                                    {copySuccess ? <span className="text-green-600">Copied!</span> : "Copy Address"}
                                                </button>

                                                <button
                                                    onClick={viewOnExplorer}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors group"
                                                >
                                                    <div className="p-1.5 rounded-md bg-gray-100 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                        <ExternalLink className="w-4 h-4" />
                                                    </div>
                                                    View on Explorer
                                                </button>

                                                <div className="my-1 border-t border-gray-100"></div>

                                                <button
                                                    onClick={disconnect}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors group"
                                                >
                                                    <div className="p-1.5 rounded-md bg-red-100 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                        <LogOut className="w-4 h-4" />
                                                    </div>
                                                    Disconnect Wallet
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        <button
                            className="lg:hidden p-2 text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                            onClick={() => setIsNavOpen(!isNavOpen)}
                            aria-label="Toggle Menu"
                        >
                            {isNavOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                <div
                    className={`lg:hidden absolute top-[72px] left-0 w-full bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-xl transition-all duration-300 ease-in-out origin-top ${isNavOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 h-0 overflow-hidden'
                        }`}
                >
                    <div className="p-4 space-y-2">
                        <div className="sm:hidden mb-4 pb-4 border-b border-gray-100 flex justify-center">
                            <ChainSwitcher />
                        </div>

                        {NAV_ITEMS.map((item, index) => {
                            const isActive = location.pathname === item.path;
                            return item.external ? (
                                <a
                                    key={index}
                                    href={item.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-3 px-4 py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                                >
                                    <span className="p-2 bg-gray-100 rounded-lg text-gray-500">
                                        {item.icon}
                                    </span>
                                    {item.name}
                                    <ExternalLink className="w-3 h-3 ml-auto text-gray-400" />
                                </a>
                            ) : (
                                <Link
                                    key={index}
                                    to={item.href}
                                    onClick={() => setIsNavOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 font-medium rounded-xl transition-colors ${isActive
                                            ? "bg-blue-50 text-blue-600"
                                            : "text-gray-600 hover:bg-gray-50 active:bg-gray-100"
                                        }`}
                                >
                                    <span className={`p-2 rounded-lg ${isActive ? "bg-white text-blue-600 shadow-sm" : "bg-gray-100 text-gray-500"}`}>
                                        {item.icon}
                                    </span>
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </header>

            {/* Wallet Modal is heavy, ideally lazy load it or ensure it doesn't re-render often */}
            <WalletModal />

            {/* Spacer for fixed header */}
            <div className="h-[72px]" />
        </>
    );
};

export default React.memo(Header);