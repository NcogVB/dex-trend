import { polygon } from "viem/chains";

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
        symbol: "WPOL",
        name: "Wrapped Polygon",
        address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // ✅ real WPOL address
        chainId: polygon.id,
        decimals: 18,
        img: "/images/pol.png",
        color: "#8247E5",
    },
    {
        symbol: "USDC.e",
        name: "USD Coin (Bridged)",
        address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // ✅ Polygon USDC.e
        chainId: polygon.id,
        decimals: 6,
        img: "/images/stock-5.png",
        color: "#2775CA",
    },
    {
        symbol: "USDT",
        name: "USDT",
        address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", // ✅  Test USDC on Polygon
        decimals: 6,
        img: "/images/stock-3.png",
        color: "#2775CA",
        chainId: polygon.id,
    },
    {
        symbol: "USDC POL",
        name: "USD Coin",
        address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // ✅  Polygon USDC
        chainId: polygon.id,
        decimals: 6,
        img: "/images/stock-5.png",
        color: "#2775CA",
    },
];
