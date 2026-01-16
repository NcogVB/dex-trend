import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

interface Token {
    symbol: string;
    name?: string;
    address: string;
    img?: string;
}

interface TokenSelectorProps {
    tokens: Token[];
    selected: Token;
    onSelect: (token: Token) => void;
    label?: string;
}

const TokenSelector: React.FC<TokenSelectorProps> = ({ tokens, selected, onSelect, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredTokens = useMemo(() => {
        return tokens.filter(t =>
            t.symbol.toLowerCase().includes(search.toLowerCase()) ||
            (t.name && t.name.toLowerCase().includes(search.toLowerCase()))
        );
    }, [tokens, search]);

    return (
        <div className="relative w-full" ref={dropdownRef}>
            {label && <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">{label}</label>}

            {/* TRIGGER BUTTON */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between p-2.5 bg-white border ${isOpen ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200'} rounded-xl text-sm shadow-sm hover:border-indigo-300 transition-all duration-200`}
            >
                <div className="flex items-center gap-3">
                    {selected.img ? (
                        <img src={selected.img} alt={selected.symbol} className="w-6 h-6 rounded-full object-cover border border-gray-100" />
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                            {selected.symbol[0]}
                        </div>
                    )}
                    <div className="flex flex-col items-start">
                        <span className="font-bold text-gray-900 leading-none">{selected.symbol}</span>
                        {selected.name && <span className="text-[10px] text-gray-400 font-medium leading-none mt-0.5">{selected.name}</span>}
                    </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* DROPDOWN MENU - Increased Z-Index to 9999 */}
            {isOpen && (
                <div
                    className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
                    style={{ zIndex: 9999, minWidth: '200px' }} // <--- This style line is critical
                >
                    {/* Search Bar */}
                    <div className="p-2 border-b border-gray-50 bg-gray-50/50">
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                            <input
                                type="text"
                                autoFocus
                                placeholder="Search..."
                                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Token List */}
                    <div className="max-h-60 overflow-y-auto">
                        {filteredTokens.length > 0 ? (
                            filteredTokens.map((token) => (
                                <div
                                    key={token.symbol}
                                    onClick={() => { onSelect(token); setIsOpen(false); setSearch(""); }}
                                    className={`flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors ${selected.symbol === token.symbol ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        {token.img ? (
                                            <img src={token.img} className="w-7 h-7 rounded-full border border-gray-100" />
                                        ) : (
                                            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">{token.symbol[0]}</div>
                                        )}
                                        <div className="flex flex-col">
                                            <span className={`text-sm ${selected.symbol === token.symbol ? 'font-bold text-indigo-900' : 'font-semibold text-gray-700'}`}>{token.symbol}</span>
                                            <span className="text-[10px] text-gray-400">{token.name || "Token"}</span>
                                        </div>
                                    </div>
                                    {selected.symbol === token.symbol && <Check className="w-4 h-4 text-indigo-600" />}
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-xs text-gray-400">No tokens found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TokenSelector;