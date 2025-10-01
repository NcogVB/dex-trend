// src/config/TOKENS.ts
export const TOKENS = {
    "BNB": {
        address: "0x61d1F08f42189257148D54550C9B089a638B59d5",
        decimals: 18,
        symbol: "BNB",
        name: "BNB",
    },
    "USDT": {
        address: "0x8df8262960065c242c66efd42eacfb6ad971f962",
        decimals: 18,
        symbol: "USDT",
        name: "Tether USD",
    },
    "BTC": {
        address: "0x6DB9BFdd160c25D254eae1F2d63d11649FD0c8dA", // ✅ placeholder from your tokens[]
        decimals: 18,
        symbol: "BTC",
        name: "Bitcoin",
    },
    "ETH": {
        address: "0x68FC90e1A41436E14dB2384d1e923a9F2B7b22AD",
        decimals: 18,
        symbol: "ETH",
        name: "Ethereum",
    },
    "USDC": {
        address: "0x654684135feea7fd632754d05e15f9886ec7bf28",
        decimals: 18,
        symbol: "USDC",
        name: "USD Coin",
    },
    "WPOL": {
        address: "0x6571351B56111627e68656Ed0851B026897fe6a8",
        decimals: 18,
        symbol: "WPOL",
        name: "Wrapped Polygon",
    },
    "skybnb": {
        address: "0x54f6bf8d07240c4b353d70cb6d15fa47745db3c2",
        decimals: 18,
        symbol: "skybnb",
        name: "Sky BNB",
    },
    "USDC_ARB": {
        address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        decimals: 6,
        symbol: "USDC",
        name: "USD Coin (Arbitrum)",
    },
} as const;


export const FEE_TIERS = [500];


// Polygon mainnet addresses
const SWAP_ROUTER_ADDRESS = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"; // SwapRouter02
const QUOTER_ADDRESS = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e"; // QuoterV2

// === Constants for WPOL/USDC.e 0.05% Pool on Polygon ===
const POSITION_MANAGER_ADDRESS = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"; // official NFT position manager
const POOL_ADDRESS = "0x8d58183fE3b84d62bbd2d633b1980604a2368ee5"; // WPOL/USDC.e 0.05% Uniswap V3 pool on Polygon
const WPOL_ADDRESS = "0x8df8262960065c242c66efd42eacfb6ad971f962";
const USDCe_ADDRESS = "0x654684135feea7fd632754d05e15f9886ec7bf28";

export { SWAP_ROUTER_ADDRESS, QUOTER_ADDRESS, POSITION_MANAGER_ADDRESS, POOL_ADDRESS, WPOL_ADDRESS, USDCe_ADDRESS };