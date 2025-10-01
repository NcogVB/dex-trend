// src/config/tokens.ts
export interface Token {
    symbol: string;
    name: string;
    img: string;
    color: string;
    balance: number;
    address: string;
}

export const tokens: Token[] = [
    {
        symbol: 'BNB',
        name: 'BNB',
        img: '/images/stock-6.png',
        color: '#2775CA',
        balance: 2500.75,
        address: '0x61d1F08f42189257148D54550C9B089a638B59d5',
    },
    {
        symbol: 'USDT',
        name: 'USDT',
        img: '/images/stock-3.png',
        color: '#8247E5',
        balance: 1000.5,
        address: '0x8df8262960065c242c66efd42eacfb6ad971f962',
    },
    {
        symbol: "BTC",
        name: "Bitcoin",
        img: "/images/stock-1.png",
        color: "#F7931A",
        balance: 0.8,
        address: "0x6DB9BFdd160c25D254eae1F2d63d11649FD0c8dA", // placeholder
    },
    {
        symbol: "ETH",
        name: "Ethereum",
        img: "/images/stock-2.png",
        color: "#627EEA",
        balance: 12.3,
        address: "0x68FC90e1A41436E14dB2384d1e923a9F2B7b22AD",
    },
    {
        symbol: "USDC",
        name: "USD Coin",
        img: "/images/stock-5.png",
        color: "#2775CA",
        balance: 800.1,
        address: "0x654684135feea7fd632754d05e15f9886ec7bf28",
    },
    {
        symbol: "WPOL",
        name: "Polygon",
        img: "/images/pol.png",
        color: "#8247E5",
        balance: 5000,
        address: "0x6571351B56111627e68656Ed0851B026897fe6a8",
    },
];
