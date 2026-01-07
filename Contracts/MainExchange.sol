// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked);
    function token0() external view returns (address);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

interface IInsuranceVault {
    function payClaim(address token, address recipient, uint256 amount) external;
}

contract MainExchange {
    address public owner;
    address public constant USDT = 0x0F7782ef1Bd024E75a47d344496022563F0C1A38;
    address public constant FACTORY = 0x339A0Da8ffC7a6fc98Bf2FC53a17dEEf36F0D9c3;
    
    address public insuranceVault;
    uint256 public nextOrderId = 1;
    uint256 public policyCounter;

    uint256 constant RAY = 1e27;
    uint256 constant WAD = 1e18;
    uint256 constant SECONDS_PER_YEAR = 31536000;
    
    // Interest Rate Model
    uint256 constant BASE_RATE = 2 * 1e25;
    uint256 constant SLOPE_1 = 4 * 1e25;
    uint256 constant SLOPE_2 = 75 * 1e25;
    uint256 constant OPTIMAL_UTILIZATION = 80 * 1e25;
    uint256 constant RESERVE_FACTOR = 1000; 

    // Insurance Config
    uint256 public premiumRateBps = 200; 

    enum OrderType { BUY, SELL }
    enum InsuranceType { NONE, PRINCIPAL_PROTECTION, STOP_LOSS }

    struct ReserveData {
        uint256 liquidityIndex;
        uint256 variableBorrowIndex;
        uint40 lastUpdateTimestamp;
        uint256 totalLiquidity;
        uint256 totalBorrows;
        uint256 accruedProtocolFees;
    }

    struct UserReserveData {
        uint256 scaledCollateral;
        uint256 scaledDebt;
        uint256 lockedCollateral;
    }

    struct Order {
        uint256 id;
        address maker;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOutMin;
        uint256 targetPrice1e18;
        uint256 expiry;
        bool filled;
        bool cancelled;
        OrderType orderType;
        bool useInternal;
    }

    struct Policy {
        uint256 id;
        address holder;
        address assetToken;
        address quoteToken;
        uint256 notional;
        uint256 coverageDuration;
        uint256 thresholdPercentage;
        uint256 premium;
        uint256 purchaseTime;
        uint256 expiryTime;
        uint256 strikePrice;
        bool claimed;
        bool active;
    }

    struct ExecutedPrice {
        uint256 price1e18;
        uint256 blockNum;
        uint256 buyOrderId;
        uint256 sellOrderId;
    }

    struct MatchVars {
        uint256 executionPrice;
        uint256 qty;
        uint256 cost;
    }

    mapping(address => ReserveData) public reserves;
    mapping(address => mapping(address => UserReserveData)) public userReserves;
    mapping(uint256 => Order) public orders;
    mapping(uint256 => Policy) public policies;
    mapping(address => mapping(address => ExecutedPrice)) public lastExecutedPrice;
    
    address[] public activeAssets;
    mapping(address => bool) public isAssetActive;

    bool private locked;

    event OrderCreated(uint256 indexed orderId, address indexed maker, address tokenIn, address tokenOut, uint256 amountIn, uint256 targetPrice1e18, OrderType orderType);
    event OrderCancelled(uint256 indexed orderId, uint256 refundedAmount);
    event OrderMatched(uint256 buyOrderId, uint256 sellOrderId, uint256 cost, uint256 qty, uint256 executionPrice1e18);
    event Deposit(address indexed user, address indexed asset, uint256 amount);
    event Borrow(address indexed user, address indexed asset, uint256 amount);
    event Repay(address indexed user, address indexed asset, uint256 amount);
    event Withdraw(address indexed user, address indexed asset, uint256 amount);
    event PolicyPurchased(uint256 indexed policyId, address indexed user, address asset, uint256 premium);
    event ClaimPaid(uint256 indexed policyId, address indexed user, uint256 amount);

    constructor() {
        owner = msg.sender;
        activeAssets.push(USDT);
        isAssetActive[USDT] = true;
    }

    function setInsuranceVault(address _vault) external {
        require(msg.sender == owner);
        insuranceVault = _vault;
    }

    modifier nonReentrant() {
        require(!locked, "Reentrancy");
        locked = true;
        _;
        locked = false;
    }

    function calculatePremium(address token, uint256 amount, uint256 duration, uint256 threshold) public view returns (uint256) {
        uint256 decimals = IERC20(token).decimals();
        uint256 amountWAD = amount * (10 ** (18 - decimals));
        uint256 price = getPrice(token); 
        uint256 valueInUSD = (amountWAD * price) / WAD;
        uint256 basePremiumUSD = (valueInUSD * premiumRateBps) / 10000;
        uint256 timeWeight = (duration * WAD) / SECONDS_PER_YEAR;
        uint256 timeAdjusted = (basePremiumUSD * timeWeight) / WAD;
        uint256 riskFactor = (10000 * WAD) / (threshold + 1000);
        uint256 finalPremiumWAD = (timeAdjusted * riskFactor) / WAD;
        uint256 finalPremium = finalPremiumWAD / (10 ** (18 - decimals));
        return finalPremium > 0 ? finalPremium : 1; 
    }

    function purchasePolicy(address _assetToken, address _quoteToken, uint256 _notional, uint256 _duration, uint256 _threshold) external nonReentrant {
        require(_notional > 0, "Zero amount");
        uint256 premium = calculatePremium(_assetToken, _notional, _duration, _threshold);
        IERC20(_quoteToken).transferFrom(msg.sender, insuranceVault, premium);
        
        uint256 currentPrice = getPrice(_assetToken);
        uint256 strike = (currentPrice * (10000 - _threshold)) / 10000;

        policyCounter++;
        policies[policyCounter] = Policy({
            id: policyCounter, holder: msg.sender, assetToken: _assetToken, quoteToken: _quoteToken, notional: _notional, coverageDuration: _duration, thresholdPercentage: _threshold, premium: premium, purchaseTime: block.timestamp, expiryTime: block.timestamp + _duration, strikePrice: strike, claimed: false, active: true
        });
        emit PolicyPurchased(policyCounter, msg.sender, _assetToken, premium);
    }

    function submitClaim(uint256 _policyId) external nonReentrant {
        Policy storage p = policies[_policyId];
        require(p.holder == msg.sender, "Auth");
        require(p.active && !p.claimed, "Inactive");
        require(block.timestamp <= p.expiryTime, "Expired");

        uint256 currentPrice = getPrice(p.assetToken);
        require(currentPrice < p.strikePrice, "Price not below strike");

        uint256 priceDiff = p.strikePrice - currentPrice;
        uint256 payout = (priceDiff * p.notional) / 1e18; 

        p.claimed = true;
        p.active = false;
        IInsuranceVault(insuranceVault).payClaim(p.quoteToken, p.holder, payout);
        emit ClaimPaid(_policyId, p.holder, payout);
    }

    function executeStrategy(address tokenIn, uint256 amountIn, uint256 borrowAmount, address tokenOut, uint256 targetPrice, uint8 insType, uint256 coveragePct) external nonReentrant returns (uint256 orderId) {
        require(amountIn > 0, "Zero amount");
        _updateReserve(tokenIn);
        if (!isAssetActive[tokenIn]) {
            activeAssets.push(tokenIn);
            isAssetActive[tokenIn] = true;
        }

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        if (borrowAmount > 0) _borrowInternal(msg.sender, tokenIn, borrowAmount);

        uint256 totalCapital = amountIn + borrowAmount;

        if (InsuranceType(insType) != InsuranceType.NONE) {
            uint256 premium = calculatePremium(tokenIn, totalCapital, 30 days, 2000);
            require(totalCapital > premium, "Premium > Capital");
            
            totalCapital -= premium;
            IERC20(tokenIn).transfer(insuranceVault, premium);

            uint256 price = getPrice(tokenIn);
            uint256 strike = (price * (10000 - coveragePct)) / 10000;
            
            policyCounter++;
            policies[policyCounter] = Policy({
                id: policyCounter, holder: msg.sender, assetToken: tokenIn, quoteToken: tokenIn, notional: amountIn, coverageDuration: 30 days, thresholdPercentage: coveragePct, premium: premium, purchaseTime: block.timestamp, expiryTime: block.timestamp + 30 days, strikePrice: strike, claimed: false, active: true
            });
            emit PolicyPurchased(policyCounter, msg.sender, tokenIn, premium);
        }

        ReserveData storage reserve = reserves[tokenIn];
        if (reserve.liquidityIndex == 0) reserve.liquidityIndex = RAY;
        
        uint256 scaledLock = (totalCapital * RAY) / reserve.liquidityIndex;
        userReserves[msg.sender][tokenIn].lockedCollateral += scaledLock;

        uint256 calcAmountOutMin = (totalCapital * 1e18) / targetPrice;
        orderId = _createOrderInternal(msg.sender, tokenIn, tokenOut, totalCapital, calcAmountOutMin, targetPrice, 30 days, OrderType.BUY, true);
        require(_checkHealth(msg.sender) >= WAD, "Account Unhealthy");
    }

    function createOrder(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, uint256 targetPrice1e18, uint256 ttlSeconds, OrderType orderType) external nonReentrant returns (uint256 orderId) {
        require(amountIn > 0, "Invalid");
        _updateReserve(tokenIn);
        
        UserReserveData storage u = userReserves[msg.sender][tokenIn];
        ReserveData storage r = reserves[tokenIn];
        if (r.liquidityIndex == 0) r.liquidityIndex = RAY;

        uint256 internalBalance = (u.scaledCollateral * r.liquidityIndex) / RAY;
        bool useInternal = false;

        if (internalBalance >= amountIn) {
            uint256 scaledAmount = (amountIn * RAY) / r.liquidityIndex;
            if (scaledAmount > u.scaledCollateral) u.scaledCollateral = 0;
            else u.scaledCollateral -= scaledAmount;
            
            u.lockedCollateral += scaledAmount;
            useInternal = true;
        } else {
            if (!isAssetActive[tokenIn]) {
                activeAssets.push(tokenIn);
                isAssetActive[tokenIn] = true;
            }
            IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        }
        return _createOrderInternal(msg.sender, tokenIn, tokenOut, amountIn, amountOutMin, targetPrice1e18, ttlSeconds, orderType, useInternal);
    }

    function _createOrderInternal(address maker, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, uint256 targetPrice1e18, uint256 ttlSeconds, OrderType orderType, bool useInternal) internal returns (uint256 orderId) {
        orderId = nextOrderId++;
        orders[orderId] = Order({
            id: orderId, maker: maker, tokenIn: tokenIn, tokenOut: tokenOut, amountIn: amountIn, amountOutMin: amountOutMin, targetPrice1e18: targetPrice1e18, expiry: block.timestamp + ttlSeconds, filled: false, cancelled: false, orderType: orderType, useInternal: useInternal
        });
        emit OrderCreated(orderId, maker, tokenIn, tokenOut, amountIn, targetPrice1e18, orderType);
    }

    function matchOrders(uint256 buyId, uint256 sellId) external nonReentrant {
        Order storage buy = orders[buyId];
        Order storage sell = orders[sellId];
        require(!buy.filled && !sell.filled && !buy.cancelled && !sell.cancelled);
        require(buy.orderType == OrderType.BUY && sell.orderType == OrderType.SELL);
        require(buy.tokenIn == sell.tokenOut && buy.tokenOut == sell.tokenIn);

        MatchVars memory vars;
        vars.executionPrice = sell.targetPrice1e18;
        vars.qty = (buy.amountIn * 1e18) / vars.executionPrice;
        if (vars.qty > sell.amountIn) vars.qty = sell.amountIn;
        vars.cost = (vars.qty * vars.executionPrice) / 1e18;

        buy.amountIn -= vars.cost;
        sell.amountIn -= vars.qty;

        if (sell.amountIn == 0) sell.filled = true;
        if (buy.amountOutMin <= vars.qty) {
            buy.filled = true;
            if (buy.amountIn > 0) {
                if (buy.useInternal) {
                    _updateReserve(buy.tokenIn);
                    ReserveData storage r = reserves[buy.tokenIn];
                    if (r.liquidityIndex == 0) r.liquidityIndex = RAY;
                    uint256 scaled = (buy.amountIn * RAY) / r.liquidityIndex;
                    if (userReserves[buy.maker][buy.tokenIn].lockedCollateral >= scaled) {
                        userReserves[buy.maker][buy.tokenIn].lockedCollateral -= scaled;
                    } else { userReserves[buy.maker][buy.tokenIn].lockedCollateral = 0; }
                    userReserves[buy.maker][buy.tokenIn].scaledCollateral += scaled;
                } else {
                    IERC20(buy.tokenIn).transfer(buy.maker, buy.amountIn);
                }
                buy.amountIn = 0;
            }
        } else {
            buy.amountOutMin -= vars.qty;
            buy.filled = false;
        }

        if (buy.useInternal) {
            _updateReserve(buy.tokenIn);
            ReserveData storage r = reserves[buy.tokenIn];
            if (r.liquidityIndex == 0) r.liquidityIndex = RAY;
            uint256 scaledCost = (vars.cost * RAY) / r.liquidityIndex;
            if (userReserves[buy.maker][buy.tokenIn].lockedCollateral >= scaledCost) {
                userReserves[buy.maker][buy.tokenIn].lockedCollateral -= scaledCost;
            } else { userReserves[buy.maker][buy.tokenIn].lockedCollateral = 0; }
        }

        if (sell.useInternal) {
            _updateReserve(sell.tokenIn);
            ReserveData storage r = reserves[sell.tokenIn];
            if (r.liquidityIndex == 0) r.liquidityIndex = RAY;
            uint256 scaledQty = (vars.qty * RAY) / r.liquidityIndex;
            if (userReserves[sell.maker][sell.tokenIn].lockedCollateral >= scaledQty) {
                userReserves[sell.maker][sell.tokenIn].lockedCollateral -= scaledQty;
            } else { userReserves[sell.maker][sell.tokenIn].lockedCollateral = 0; }
        }

        if (buy.useInternal) {
            _updateReserve(buy.tokenOut);
            ReserveData storage r = reserves[buy.tokenOut];
            if (r.liquidityIndex == 0) r.liquidityIndex = RAY;
            uint256 scaledQty = (vars.qty * RAY) / r.liquidityIndex;
            userReserves[buy.maker][buy.tokenOut].scaledCollateral += scaledQty;
            r.totalLiquidity += vars.qty;
        } else { IERC20(buy.tokenOut).transfer(buy.maker, vars.qty); }

        if (sell.useInternal) {
            _updateReserve(sell.tokenOut);
            ReserveData storage r = reserves[sell.tokenOut];
            if (r.liquidityIndex == 0) r.liquidityIndex = RAY;
            uint256 scaledCost = (vars.cost * RAY) / r.liquidityIndex;
            userReserves[sell.maker][sell.tokenOut].scaledCollateral += scaledCost;
            r.totalLiquidity += vars.cost;
        } else { IERC20(sell.tokenOut).transfer(sell.maker, vars.cost); }

        lastExecutedPrice[buy.tokenIn][buy.tokenOut] = ExecutedPrice(vars.executionPrice, block.number, buyId, sellId);
        lastExecutedPrice[buy.tokenOut][buy.tokenIn] = ExecutedPrice(vars.executionPrice, block.number, buyId, sellId);
        emit OrderMatched(buyId, sellId, vars.cost, vars.qty, vars.executionPrice);
    }

    function repay(address asset, uint256 amount) external nonReentrant {
        _updateReserve(asset);
        ReserveData storage reserve = reserves[asset];
        UserReserveData storage u = userReserves[msg.sender][asset];

        uint256 userDebt = (u.scaledDebt * reserve.variableBorrowIndex) / RAY;
        uint256 repayAmount = amount > userDebt ? userDebt : amount;
        require(repayAmount > 0, "No debt or 0 amount");

        IERC20(asset).transferFrom(msg.sender, address(this), repayAmount);

        uint256 scaledRepay = (repayAmount * RAY) / reserve.variableBorrowIndex;
        if (scaledRepay >= u.scaledDebt) u.scaledDebt = 0;
        else u.scaledDebt -= scaledRepay;
        
        reserve.totalBorrows -= repayAmount;
        reserve.totalLiquidity += repayAmount;
        emit Repay(msg.sender, asset, repayAmount);
    }

    function repayWithCollateral(address asset, uint256 amount) external nonReentrant {
        _updateReserve(asset);
        ReserveData storage reserve = reserves[asset];
        UserReserveData storage u = userReserves[msg.sender][asset];

        uint256 userDebt = (u.scaledDebt * reserve.variableBorrowIndex) / RAY;
        uint256 repayAmount = amount > userDebt ? userDebt : amount;
        require(repayAmount > 0, "No debt or 0 amount");

        uint256 internalValue = (u.scaledCollateral * reserve.liquidityIndex) / RAY;
        uint256 burnFromInternal;
        uint256 pullFromWallet;

        if (internalValue >= repayAmount) {
            burnFromInternal = repayAmount;
            pullFromWallet = 0;
        } else {
            burnFromInternal = internalValue;
            pullFromWallet = repayAmount - internalValue;
        }

        if (burnFromInternal > 0) {
            uint256 scaledBurn = (burnFromInternal * RAY) / reserve.liquidityIndex;
            if (scaledBurn >= u.scaledCollateral) u.scaledCollateral = 0;
            else u.scaledCollateral -= scaledBurn;
        }

        if (pullFromWallet > 0) {
            IERC20(asset).transferFrom(msg.sender, address(this), pullFromWallet);
            reserve.totalLiquidity += pullFromWallet;
        }

        uint256 scaledRepay = (repayAmount * RAY) / reserve.variableBorrowIndex;
        if (scaledRepay >= u.scaledDebt) u.scaledDebt = 0;
        else u.scaledDebt -= scaledRepay;
        
        reserve.totalBorrows -= repayAmount;
        emit Repay(msg.sender, asset, repayAmount);
    }

    function _borrowInternal(address user, address asset, uint256 amount) internal {
        _updateReserve(asset);
        ReserveData storage reserve = reserves[asset];
        require(reserve.totalLiquidity >= amount, "Low Liq");
        uint256 scaledAmount = (amount * RAY) / reserve.variableBorrowIndex;
        userReserves[user][asset].scaledDebt += scaledAmount;
        reserve.totalBorrows += amount;
        reserve.totalLiquidity -= amount;
        emit Borrow(user, asset, amount);
    }

    function _updateReserve(address asset) internal {
        ReserveData storage r = reserves[asset];
        if (block.timestamp == r.lastUpdateTimestamp) return;
        if (r.liquidityIndex == 0) r.liquidityIndex = RAY;
        if (r.variableBorrowIndex == 0) r.variableBorrowIndex = RAY;
        uint256 timeDelta = block.timestamp - r.lastUpdateTimestamp;
        if (timeDelta > 0 && r.totalBorrows > 0) {
            (, uint256 borrowRate) = calculateInterestRates(r.totalLiquidity, r.totalBorrows);
            uint256 cumulatedInterest = (borrowRate * timeDelta * r.totalBorrows) / (SECONDS_PER_YEAR * RAY);
            uint256 fee = (cumulatedInterest * RESERVE_FACTOR) / 10000;
            uint256 toLenders = cumulatedInterest - fee;
            r.liquidityIndex = (r.liquidityIndex * (RAY + (toLenders * RAY) / r.totalLiquidity)) / RAY;
            r.variableBorrowIndex = (r.variableBorrowIndex * (RAY + (cumulatedInterest * RAY) / r.totalBorrows)) / RAY;
            r.totalBorrows += cumulatedInterest;
            r.totalLiquidity += toLenders;
            r.accruedProtocolFees += fee;
        }
        r.lastUpdateTimestamp = uint40(block.timestamp);
    }

    function calculateInterestRates(uint256 totalLiquidity, uint256 totalBorrows) public pure returns (uint256 liquidityRate, uint256 borrowRate) {
        uint256 utilizationRate;
        if (totalLiquidity == 0) utilizationRate = 0;
        else utilizationRate = (totalBorrows * RAY) / totalLiquidity;

        if (utilizationRate < OPTIMAL_UTILIZATION) {
            borrowRate = BASE_RATE + (utilizationRate * SLOPE_1) / OPTIMAL_UTILIZATION;
        } else {
            uint256 excessUtilization = utilizationRate - OPTIMAL_UTILIZATION;
            borrowRate = BASE_RATE + SLOPE_1 + (excessUtilization * SLOPE_2) / (RAY - OPTIMAL_UTILIZATION);
        }
        uint256 percentToLenders = RAY - (RESERVE_FACTOR * 1e23);
        liquidityRate = (borrowRate * utilizationRate) / RAY;
        liquidityRate = (liquidityRate * percentToLenders) / RAY;
    }

    function getPrice(address token) public view returns (uint256) {
        if (token == USDT) return 1e18;
        address pool = address(0);
        uint24[3] memory fees = [uint24(500), uint24(3000), uint24(10000)];
        for (uint256 i = 0; i < 3; i++) {
            pool = IUniswapV3Factory(FACTORY).getPool(token, USDT, fees[i]);
            if (pool != address(0)) break;
        }
        if (pool == address(0)) return 0;
        (uint160 sqrtPriceX96,,,,,,) = IUniswapV3Pool(pool).slot0();
        if (sqrtPriceX96 == 0) return 0;
        address token0 = IUniswapV3Pool(pool).token0();
        uint256 priceX96 = uint256(sqrtPriceX96) * uint256(sqrtPriceX96);
        uint256 price1e18 = (token0 == token) ? (priceX96 * 1e18) >> 192 : (1e18 << 192) / priceX96;
        uint256 decimalsToken = IERC20(token).decimals();
        uint256 decimalsQuote = 6;
        if (decimalsToken >= decimalsQuote) return price1e18 * (10 ** (decimalsToken - decimalsQuote));
        else return price1e18 / (10 ** (decimalsQuote - decimalsToken));
    }

    function _checkHealth(address user) internal view returns (uint256) {
        (uint256 totalCol, uint256 totalDebt) = _calculateUserAccountData(user);
        if (totalDebt == 0) return type(uint256).max;
        return (totalCol * 80 * 1e16) / totalDebt;
    }

    function _calculateUserAccountData(address user) internal view returns (uint256 totalCollateralUSD, uint256 totalDebtUSD) {
        for (uint i = 0; i < activeAssets.length; i++) {
            address asset = activeAssets[i];
            UserReserveData memory data = userReserves[user][asset];
            if (data.scaledCollateral == 0 && data.scaledDebt == 0 && data.lockedCollateral == 0) continue;
            uint256 price = getPrice(asset);
            ReserveData memory reserve = reserves[asset];
            if (data.scaledCollateral > 0) totalCollateralUSD += ((data.scaledCollateral * reserve.liquidityIndex) / RAY * price) / WAD;
            if (data.lockedCollateral > 0) totalCollateralUSD += ((data.lockedCollateral * reserve.liquidityIndex) / RAY * price) / WAD;
            if (data.scaledDebt > 0) totalDebtUSD += ((data.scaledDebt * reserve.variableBorrowIndex) / RAY * price) / WAD;
        }
    }

    function getUserAccountData(address user, address token) external view returns (uint256 totalCollateralUSD, uint256 totalDebtUSD, uint256 healthFactor, uint256 availableToBorrowUSD, uint256 tokenCollateralBalance, uint256 tokenDebtBalance) {
        (totalCollateralUSD, totalDebtUSD) = _calculateUserAccountData(user);
        healthFactor = totalDebtUSD > 0 ? (totalCollateralUSD * 80 * 1e16) / totalDebtUSD : type(uint256).max;
        uint256 maxBorrow = (totalCollateralUSD * 75) / 100;
        availableToBorrowUSD = maxBorrow > totalDebtUSD ? maxBorrow - totalDebtUSD : 0;
        ReserveData storage r = reserves[token];
        UserReserveData storage u = userReserves[user][token];
        uint256 liqIndex = r.liquidityIndex == 0 ? RAY : r.liquidityIndex;
        uint256 borrowIndex = r.variableBorrowIndex == 0 ? RAY : r.variableBorrowIndex;
        tokenCollateralBalance = ((u.scaledCollateral + u.lockedCollateral) * liqIndex) / RAY;
        tokenDebtBalance = (u.scaledDebt * borrowIndex) / RAY;
    }
    
    function deposit(address asset, uint256 amount) external nonReentrant {
        if (!isAssetActive[asset]) {
            activeAssets.push(asset);
            isAssetActive[asset] = true;
        }
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        _updateReserve(asset);
        ReserveData storage reserve = reserves[asset];
        if (reserve.liquidityIndex == 0) reserve.liquidityIndex = RAY;
        uint256 scaledAmount = (amount * RAY) / reserve.liquidityIndex;
        userReserves[msg.sender][asset].scaledCollateral += scaledAmount;
        reserve.totalLiquidity += amount;
        emit Deposit(msg.sender, asset, amount);
    }
    
    function withdraw(address asset, uint256 amount) external nonReentrant {
        _updateReserve(asset);
        ReserveData storage reserve = reserves[asset];
        if (reserve.liquidityIndex == 0) reserve.liquidityIndex = RAY;
        uint256 scaledAmount = (amount * RAY) / reserve.liquidityIndex;
        require(userReserves[msg.sender][asset].scaledCollateral >= scaledAmount, "Low Bal");
        userReserves[msg.sender][asset].scaledCollateral -= scaledAmount;
        reserve.totalLiquidity -= amount;
        require(_checkHealth(msg.sender) >= WAD, "Unhealthy");
        IERC20(asset).transfer(msg.sender, amount);
        emit Withdraw(msg.sender, asset, amount);
    }
    
    function cancelOrder(uint256 orderId) external nonReentrant {
        Order storage o = orders[orderId];
        require(o.maker == msg.sender, "Auth");
        require(!o.filled && !o.cancelled, "Active only");
        o.cancelled = true;
        uint256 refund = o.amountIn;
        o.amountIn = 0;
        if (o.useInternal) {
            ReserveData storage reserve = reserves[o.tokenIn];
            if (reserve.liquidityIndex == 0) reserve.liquidityIndex = RAY;
            uint256 scaledRefund = (refund * RAY) / reserve.liquidityIndex;
            if (userReserves[msg.sender][o.tokenIn].lockedCollateral >= scaledRefund) userReserves[msg.sender][o.tokenIn].lockedCollateral -= scaledRefund;
            else userReserves[msg.sender][o.tokenIn].lockedCollateral = 0;
            userReserves[msg.sender][o.tokenIn].scaledCollateral += scaledRefund;
        } else { IERC20(o.tokenIn).transfer(msg.sender, refund); }
        emit OrderCancelled(orderId, refund);
    }

    function getPolicyDetails(uint256 _policyId) external view returns (address holder, address assetToken, address quoteToken, uint256 notional, uint256 coverageDuration, uint256 thresholdPercentage, uint256 premium, uint256 purchaseTime, uint256 expiryTime, bool claimed, bool active) {
        Policy memory p = policies[_policyId];
        return (p.holder, p.assetToken, p.quoteToken, p.notional, p.coverageDuration, p.thresholdPercentage, p.premium, p.purchaseTime, p.expiryTime, p.claimed, p.active);
    }
}