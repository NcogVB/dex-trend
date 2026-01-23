export const ERC20_ABI = [
    "function approve(address spender,uint256 amount) external returns (bool)",
    "function allowance(address owner,address spender) external view returns (uint256)",
    "function balanceOf(address owner) external view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() external view returns (string)",
];

export const UNISWAP_V3_POOL_ABI = [
    "function tickSpacing() external view returns (int24)",
    "function fee() external view returns (uint24)",
    "function liquidity() external view returns (uint128)",
    "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
    "function token0() external view returns (address)",
    "function token1() external view returns (address)",
];

export const ERC20ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 value) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() external view returns (string)",
];