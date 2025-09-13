export const ERC20_ABI = [
    "function approve(address spender,uint256 amount) external returns (bool)",
    "function allowance(address owner,address spender) external view returns (uint256)",
    "function balanceOf(address owner) external view returns (uint256)",
    "function decimals() view returns (uint8)",
];

export const UNISWAP_V3_POOL_ABI = [
    "function tickSpacing() external view returns (int24)",
    "function fee() external view returns (uint24)",
    "function liquidity() external view returns (uint128)",
    "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
    "function token0() external view returns (address)",
    "function token1() external view returns (address)",
];

export const POSITION_MANAGER_MINIMAL_ABI = [
    "function mint(tuple(address token0,address token1,uint24 fee,int24 tickLower,int24 tickUpper,uint256 amount0Desired,uint256 amount1Desired,uint256 amount0Min,uint256 amount1Min,address recipient,uint256 deadline)) payable returns (uint256,uint128,uint256,uint256)",
    "function positions(uint256 tokenId) view returns (uint96,uint256, address,address,uint24,int24,int24,uint128,uint256,uint256,uint128,uint128)",
    "function decreaseLiquidity(tuple(uint256 tokenId,uint128 liquidity,uint256 amount0Min,uint256 amount1Min,uint256 deadline)) returns (uint256 amount0,uint256 amount1)",
    "function collect(tuple(uint256 tokenId,address recipient,uint128 amount0Max,uint128 amount1Max)) returns (uint256 amount0,uint256 amount1)",
];
