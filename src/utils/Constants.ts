export const TOKENS = {
  
    "USDT": {
        address: "0x8df8262960065c242c66efd42eacfb6ad971f962",
        decimals: 18,
        symbol: "USDT",
        name: "USDCT",
    },
    "USDC": {
        address: "0x654684135feea7fd632754d05e15f9886ec7bf28",
        decimals: 18,
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
const POOL_ADDRESS = "0xc9e139Aa8eFAdBc814c5dD922f489875E309838a"; // WPOL/USDC.e 0.05% Uniswap V3 pool on Polygon
const WPOL_ADDRESS = "0x8df8262960065c242c66efd42eacfb6ad971f962";
const USDCe_ADDRESS = "0x654684135feea7fd632754d05e15f9886ec7bf28";

const USDC_ADDRESS= "0x654684135feea7fd632754d05e15f9886ec7bf28";
const USDT_ADDRESS= "0x8df8262960065c242c66efd42eacfb6ad971f962";

export { SWAP_ROUTER_ADDRESS, QUOTER_ADDRESS, POSITION_MANAGER_ADDRESS, POOL_ADDRESS, WPOL_ADDRESS, USDCe_ADDRESS };