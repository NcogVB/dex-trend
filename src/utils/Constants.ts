export const TOKENS = {
    WPOL: {
        address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
        decimals: 18,
        symbol: "WPOL",
        name: "Wrapped Polygon"
    },
    "USDC.e": {
        address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        decimals: 6,
        symbol: "USDC.e",
        name: "USD Coin (Ethereum)"
    },
    "USDT": {
        address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        decimals: 6,
        symbol: "USDT",
        name: "USDCT",
    },
    "USDC POL": {
        address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
        decimals: 6,
        symbol: "USDC",
        name: "USD Coin"
    },
    "USDC ARB": {
        address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        decimals: 6,
        symbol: "USDC",
        name: "USD Coin"
    }
} as const;

export const FEE_TIERS = [100, 500, 3000, 10000];


// Polygon mainnet addresses
const SWAP_ROUTER_ADDRESS = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"; // SwapRouter02
const QUOTER_ADDRESS = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e"; // QuoterV2

// === Constants for WPOL/USDC.e 0.05% Pool on Polygon ===
const POSITION_MANAGER_ADDRESS = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"; // official NFT position manager
const POOL_ADDRESS = "0xA374094527e1673A86dE625aa59517c5dE346d32"; // WPOL/USDC.e 0.05% Uniswap V3 pool on Polygon
const WPOL_ADDRESS = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
const USDCe_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

export { SWAP_ROUTER_ADDRESS, QUOTER_ADDRESS, POSITION_MANAGER_ADDRESS, POOL_ADDRESS, WPOL_ADDRESS, USDCe_ADDRESS };