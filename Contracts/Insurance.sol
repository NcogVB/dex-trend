// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
}

contract InsuranceVault {
    address public owner;
    address public exchange;

    constructor() {
        owner = msg.sender;
    }

    function setExchange(address _exchange) external {
        require(msg.sender == owner, "Only Owner");
        exchange = _exchange;
    }

    modifier onlyExchange() {
        require(msg.sender == exchange, "Only Exchange");
        _;
    }

    function payClaim(address token, address recipient, uint256 amount) external onlyExchange {
        IERC20(token).transfer(recipient, amount);
    }

    function withdrawSurplus(address token, address to, uint256 amount) external {
        require(msg.sender == owner, "Only Owner");
        IERC20(token).transfer(to, amount);
    }
}