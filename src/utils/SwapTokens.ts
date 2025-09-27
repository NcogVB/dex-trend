
export interface Token {
    symbol: string;
    name: string;
    address: string;
    chainId: number;
    decimals: number;
    img: string;
    color: string;
}

export const TOKENS: Token[] = [

    {
        symbol: "USDT",
        name: "USDT",
        address: "0x8df8262960065c242c66efd42eacfb6ad971f962", // ✅  Test USDC on Polygon
        decimals: 6,
        img: "/images/stock-3.png",
        color: "#2775CA",
        chainId: 1476,
    },
    {
        symbol: "USDC",
        name: "USD Coin",
        address: "0x654684135feea7fd632754d05e15f9886ec7bf28", // ✅  Polygon USDC
        chainId: 1476,
        decimals: 6,
        img: "/images/stock-5.png",
        color: "#2775CA",
    },
];
