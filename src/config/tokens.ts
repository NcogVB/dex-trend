// src/config/tokens.ts
// Token Configuration for your Uniswap V3 Integration

import { ethers } from "ethers";

// Interface for token configuration
export interface TokenConfig {
    address: string;
    decimals: number;
    symbol: string;
    name: string;
    logoURI?: string;
}

// You need to replace these addresses with actual deployed ERC20 token addresses on your network
// The current addresses might not exist or might not be proper ERC20 tokens

// Example configuration for different networks:

// MAINNET TOKENS (for reference)
export const MAINNET_TOKENS: Record<string, TokenConfig> = {
    WETH: {
        address: "0xC02aaA39b223FE8053c4d3c5c5020ef59dD77f3E7",
        decimals: 18,
        symbol: "WETH",
        name: "Wrapped Ether"
    },
    USDC: {
        address: "0xA0b86a33E6441E9b8ED6d9Cc5B9E3B8c3a6Eb7E9",
        decimals: 6,
        symbol: "USDC",
        name: "USD Coin"
    },
    USDT: {
        address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        decimals: 6,
        symbol: "USDT",
        name: "Tether USD"
    }
};

// SEPOLIA TESTNET TOKENS (example addresses - you need to deploy your own)
export const SEPOLIA_TOKENS: Record<string, TokenConfig> = {
    WETH: {
        address: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9", // Sepolia WETH
        decimals: 18,
        symbol: "WETH",
        name: "Wrapped Ether"
    },
    // You need to deploy your own test tokens for USDC/USDT
    USDC: {
        address: "0x1B85E9d02A6f756A90D08f0b36aFbE6cE546c4C1", // Replace with your deployed USDC
        decimals: 6,
        symbol: "USDC",
        name: "USD Coin"
    },
    USDT: {
        address: "0x55d398326f99059fF775485246999027B3197955", // Replace with your deployed USDT
        decimals: 6,
        symbol: "USDT",
        name: "Tether USD"
    }
};

// YOUR CUSTOM NETWORK TOKENS
export const CUSTOM_TOKENS: Record<string, TokenConfig> = {
    WETH: {
        address: "0x1fa28BdE74ce95451F77f1D248c674FfDD994d29", // Your WETH address
        decimals: 18,
        symbol: "WETH",
        name: "Wrapped Ether"
    },
    USDC: {
        address: "0x1B85E9d02A6f756A90D08f0b36aFbE6cE546c4C1", // Your USDC address
        decimals: 6,
        symbol: "USDC",
        name: "USD Coin"
    },
    USDT: {
        address: "0x55d398326f99059fF775485246999027B3197955", // Your USDT address
        decimals: 6,
        symbol: "USDT",
        name: "Tether USD"
    }
};

// Function to validate token contract
export async function validateTokenContract(
    address: string, 
    provider: ethers.Provider
): Promise<{ isValid: boolean; error?: string }> {
    try {
        // Check if contract exists
        const code = await provider.getCode(address);
        if (code === "0x") {
            return { isValid: false, error: "Contract does not exist" };
        }

        // Try to call standard ERC20 functions
        const tokenContract = new ethers.Contract(address, [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)",
            "function totalSupply() view returns (uint256)"
        ], provider);

        // Test basic ERC20 functions
        await tokenContract.symbol();
        await tokenContract.decimals();
        await tokenContract.totalSupply();

        return { isValid: true };
    } catch (error) {
        return { 
            isValid: false, 
            error: `Token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        };
    }
}

// Function to deploy a simple test token (for development)
export const TEST_TOKEN_ABI = [
    "constructor(string memory name, string memory symbol, uint8 decimals, uint256 totalSupply)",
    "function mint(address to, uint256 amount) public",
    "function balanceOf(address account) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)"
];

// Simple ERC20 contract bytecode (for deploying test tokens)
// You would need to compile and deploy actual ERC20 contracts
export const SIMPLE_ERC20_BYTECODE = "0x608060405234801561001057600080fd5b50..." // Truncated for brevity

// Network configuration
export interface NetworkConfig {
    chainId: number;
    name: string;
    tokens: Record<string, TokenConfig>;
    swapRouter: string;
    factory: string;
    positionManager: string;
}

export const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
    mainnet: {
        chainId: 1,
        name: "Ethereum Mainnet",
        tokens: MAINNET_TOKENS,
        swapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
        factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
        positionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"
    },
    sepolia: {
        chainId: 11155111,
        name: "Sepolia Testnet",
        tokens: SEPOLIA_TOKENS,
        swapRouter: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E", // Example
        factory: "0x0227628f3F023bb0B980b67D528571c95c6DaC1c", // Example
        positionManager: "0x1238536071E1c677A632429e3655c799b22cDA52" // Example
    },
    custom: {
        chainId: 31337, // Your custom chain ID
        name: "Custom Network",
        tokens: CUSTOM_TOKENS,
        swapRouter: "0xe485622bCC5864Eb76b81328d98938b81376DD0d", // Your router
        factory: "0x1ca212Ace64C59fa571CbcD9Cc9AFD7D0aAe5907", // Your factory
        positionManager: "0x4bA728E28566AeBe4d736AD1616ec1D3Acf73578" // Your position manager
    }
};

// Get current network config based on chain ID
export function getNetworkConfig(chainId: number): NetworkConfig | null {
    return Object.values(NETWORK_CONFIGS).find(config => config.chainId === chainId) || null;
}

// Instructions for setting up tokens:
/* 
SETUP INSTRUCTIONS:

1. Deploy ERC20 Test Tokens:
   - Deploy a simple ERC20 contract for USDC (6 decimals)
   - Deploy a simple ERC20 contract for USDT (6 decimals) 
   - Use existing WETH contract or deploy wrapped ETH

2. Create Uniswap V3 Pool:
   - Call factory.createPool(tokenA, tokenB, fee) for each pair
   - Initialize pool with initial price using pool.initialize()

3. Add Liquidity:
   - Use position manager to add initial liquidity
   - Mint some tokens to your address for testing

4. Update Token Addresses:
   - Replace the addresses in CUSTOM_TOKENS with your deployed addresses
   - Make sure the decimals match your token contracts

5. Test Contract Validation:
   - Use validateTokenContract() function to verify your tokens work
   - Check that balanceOf, allowance, etc. work properly

Example Test Token Contract (Solidity):

contract TestToken {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    constructor(string memory _name, string memory _symbol, uint8 _decimals, uint256 _totalSupply) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply = _totalSupply * 10**_decimals;
        balanceOf[msg.sender] = totalSupply;
    }
    
    // ... implement transfer, approve, transferFrom functions
}
*/