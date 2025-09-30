
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
        symbol: "skybnb",
        name: "skybnb",
        address: "0x54f6bf8d07240c4b353d70cb6d15fa47745db3c2",
        chainId: 1476,
        decimals: 6,
        img: "/images/stock-6.png",
        color: "#2775CA",
    },
];
