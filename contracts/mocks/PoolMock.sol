// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import "@cryptoalgebra/integral-core/contracts/libraries/TickMath.sol";

contract PoolMock {
    address public token1;
    address public token0;
    bool public _unlocked;
    int24 public _tick;

    function setTokens(address token0_, address token1_) external {
        token0 = token0_;
        token1 = token1_;
    }

    function setUnlocked(bool unlocked_) external {
        _unlocked = unlocked_;
    }

    function setTick(int24 tick_) external {
        _tick = tick_;
    }

    function globalState()
        external
        view
        returns (uint160 price, int24 tick, uint16 lastFee, uint8 pluginConfig, uint16 communityFee, bool unlocked)
    {
        tick = _tick;
        unlocked = _unlocked;
    }

    function getTickAtSqrtRatio(uint160 price) external view returns (int24 tick) {
        return TickMath.getTickAtSqrtRatio(price);
    }
}
