# Fixes for Hats Audit for Fenix

## Table of Contents
- [Fixes for Hats Audit for Fenix](#fixes-for-hats-audit-for-fenix)
  - [Overview](#overview)
  - [Audit Repositories and Resources](#audit-repositories-and-resources)
  - [Issues and fixes](#issues-and-fixes)
    - [[HIGH] Adversary can steal all bribe rewards](#high-adversary-can-steal-all-bribe-rewards)
    - [[HIGH] First liquidity provider of a stable pair can DOS the pool](#high-first-liquidity-provider-of-a-stable-pair-can-dos-the-pool)
    - [[Medium] Protocol fees collected in PairFees are lost due to accrued yield](#medium-protocol-fees-collected-in-pairfees-are-lost-due-to-accrued-yield)
    - [[Low] `GaugeFactoryUpgradeable.setDistribution()` would revert due to incorrect access control](#low-gaugefactoryupgradeablesetdistribution-would-revert-due-to-incorrect-access-control)
    - [[Low] Missing events for functions that change critical parameters](#low-missing-events-for-functions-that-change-critical-parameters)

## Overview
This document provides a fixes of the audit/bug bounty conducted for Fenix.

## Audit Repositories and Resources
* Audit Repository: https://github.com/hats-finance/Fenix-Finance-0x83dbe5aa378f3ce160ed084daf85f621289fb92f
* Hats Audit Page: https://app.hats.finance/audit-competitions/fenix-0x83dbe5aa378f3ce160ed084daf85f621289fb92f 
  
## Issues and fixes

### [HIGH] Adversary can steal all bribe rewards
* GitHub Issue: https://github.com/hats-finance/Fenix-Finance-0x83dbe5aa378f3ce160ed084daf85f621289fb92f/issues/2
* Status: **Fixed**
* Fixs commit: https://github.com/Satsyxbt/Fenix/commit/d0c94ae8a4cbd3b4b2bf20fa570ee30080654138

#### Description:
A condition was added to ensure methods are not invoked when there are no user votes in the current epoch
```diff
contracts/core/VoterUpgradeable.sol

        for (uint256 i = 0; i < _poolVoteCnt; i++) {
            address _pool = _poolVote[i];
            uint256 _votes = votes[_tokenId][_pool];
            if (_votes != 0) {
-               // if user last vote is < than epochTimestamp then votes are 0! IF not underflow occur
-               if (lastVoted[_tokenId] > _time) weightsPerEpoch[_time][_pool] -= _votes;

                votes[_tokenId][_pool] -= _votes;

                // if user last vote is < than epochTimestamp then votes are 0! IF not underflow occur
+               if (lastVoted[_tokenId] > _time) {
+                   weightsPerEpoch[_time][_pool] -= _votes;

                    IBribe(internal_bribes[gauges[_pool]]).withdraw(uint256(_votes), _tokenId);
                    IBribe(external_bribes[gauges[_pool]]).withdraw(uint256(_votes), _tokenId);

                    // if is alive remove _votes, else don't because we already done it in killGauge()
                    if (isAlive[gauges[_pool]]) _totalWeight += _votes;
+               }

                emit Abstained(_tokenId, _votes);
            }
```

### [HIGH] First liquidity provider of a stable pair can DOS the pool
* GitHub Issue: https://github.com/hats-finance/Fenix-Finance-0x83dbe5aa378f3ce160ed084daf85f621289fb92f/issues/28
* Status: **Fixed**
* Fixs commit: https://github.com/Satsyxbt/Fenix/commit/945b23c6659bd1f5d22f13718eaab0460c23198c
#### Description
Additional restrictions on initial liquidity for stable pairs were introduced to prevent rounding errors and miscalculations that could DOS the pool.
```diff
contracts/dexV2/Pair.sol

@@ -31,6 +31,7 @@ contract Pair is IPair, BlastGovernorSetup, BlastERC20RebasingManage {
    mapping(address => uint) public nonces;

    uint internal constant MINIMUM_LIQUIDITY = 10 ** 3;
+   uint256 internal constant MINIMUM_K = 10 ** 10;

    address public token0;
    address public token1;

@@ -363,6 +364,10 @@ contract Pair is IPair, BlastGovernorSetup, BlastERC20RebasingManage {
        if (_totalSupply == 0) {
            liquidity = Math.sqrt(_amount0 * _amount1) - MINIMUM_LIQUIDITY;
            _mint(address(0), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens
+           if (stable) {
+               require((_amount0 * 1e18) / decimals0 == (_amount1 * 1e18) / decimals1, "Pair: stable deposits must be equal");
+               require(_k(_amount0, _amount1) > MINIMUM_K, "Pair: stable deposits must be above minimum k");
+           }
        } else {
            liquidity = Math.min((_amount0 * _totalSupply) / _reserve0, (_amount1 * _totalSupply) / _reserve1);
        }
    }
```

### [Medium] Protocol fees collected in PairFees are lost due to accrued yield
* GitHub Issue: https://github.com/hats-finance/Fenix-Finance-0x83dbe5aa378f3ce160ed084daf85f621289fb92f/issues/36
* Status: **Fixed**
* Fixs commit: https://github.com/Satsyxbt/Fenix/commit/91da9fb49221603ba8b2aba7bee0d47e1524d3fe
  
#### Description
Introduced inheritance from `BlastERC20RebasingManage` and implemented management settings for blast rebasing tokens.
```diff
contracts/dexV2/Pair.sol
@@ -107,7 +107,7 @@ contract Pair is IPair, BlastGovernorSetup, BlastERC20RebasingManage {

        (token0, token1, stable, communityVault) = (_token0, _token1, _stable, _communityVault);

-       fees = address(new PairFees(_token0, _token1));
+       fees = address(new PairFees(_blastGovernor, msg.sender, _token0, _token1));

        _unlocked = 1;

contracts/dexV2/PairFees.sol
@@ -2,17 +2,25 @@
pragma solidity =0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
+import {BlastGovernorSetup} from "../integration/BlastGovernorSetup.sol";
+import {BlastERC20RebasingManage} from "../integration/BlastERC20RebasingManage.sol";
+
+import {IPairFactory} from "./interfaces/IPairFactory.sol";

// Pair Fees contract is used as a 1:1 pair relationship to split out fees, this ensures that the curve does not need to be modified for LP shares
-contract PairFees {
+contract PairFees is BlastGovernorSetup, BlastERC20RebasingManage {
    address internal immutable pair; // The pair it is bonded to
    address internal immutable token0; // token0 of pair, saved localy and statically for gas optimization
    address internal immutable token1; // Token1 of pair, saved localy and statically for gas optimization
+    address internal immutable factory; // The pair factory

+    constructor(address _blastGovernor, address _factory, address _token0, address _token1) {
+        __BlastGovernorSetup_init(_blastGovernor);

-    constructor(address _token0, address _token1) {
        pair = msg.sender;
        token0 = _token0;
        token1 = _token1;
+        factory = _factory;
    }

    function _safeTransfer(address token, address to, uint256 value) internal {
@@ -27,4 +35,12 @@ contract PairFees {
        if (amount0 > 0) _safeTransfer(token0, recipient, amount0);
        if (amount1 > 0) _safeTransfer(token1, recipient, amount1);
    }

+    function _checkAccessForManageBlastERC20Rebasing() internal virtual override {
+        IPairFactory factoryCache = IPairFactory(factory);
+        require(
+            msg.sender == address(factoryCache) || factoryCache.hasRole(factoryCache.PAIRS_ADMINISTRATOR_ROLE(), msg.sender),
+            "ACCESS_DENIED"
+        );
+    }
}
```



### [Low] `GaugeFactoryUpgradeable.setDistribution()` would revert due to incorrect access control
* GitHub Issue: https://github.com/hats-finance/Fenix-Finance-0x83dbe5aa378f3ce160ed084daf85f621289fb92f/issues/23
* Status: **Fixed**
* Fixs commit: https://github.com/Satsyxbt/Fenix/commit/7a0443967729581983f3d7edeec8dcefadff885c
#### Description
Removed the setDistribution function which had redundant functionality and posed issues with access control.
```diff
@@ -94,11 +94,6 @@ contract GaugeFactoryUpgradeable is IGaugeFactory, BlastGovernorSetup, OwnableUp
        merklGaugeMiddleman = _newMerklGaugeMiddleman;
    }

-   function setDistribution(address _gauge, address _newDistribution) external onlyOwner {
-       _checkAddressZero(_newDistribution);
-       IGauge(_gauge).setDistribution(_newDistribution);
-   }
-
    /**
     * @dev Checked provided address on zero value, throw AddressZero error in case when addr_ is zero
     *
```

### [Low] Missing events for functions that change critical parameters
* GitHub Issue: https://github.com/hats-finance/Fenix-Finance-0x83dbe5aa378f3ce160ed084daf85f621289fb92f/issues/25
* Status: **Partial Fixed/Not fixed**
#### Description
The submission is generalized for the entire project, so a complete correction is impossible for one reason or another, such as the limitation of the contract in size, the vagueness of the need for emit `event` in one place or another. Users can also track a particular call, albeit in a more complex way 