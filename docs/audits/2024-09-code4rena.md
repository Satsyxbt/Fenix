---
sponsor: "Fenix Finance"
slug: "2024-09-fenix-finance"
date: "2024-10-11"
title: "Fenix Finance Invitational"
findings: "https://github.com/code-423n4/2024-09-fenix-finance-findings/issues"
contest: 440
---

# Overview

## About C4

Code4rena (C4) is an open organization consisting of security researchers, auditors, developers, and individuals with domain expertise in smart contracts.

A C4 audit is an event in which community participants, referred to as Wardens, review, audit, or analyze smart contract logic in exchange for a bounty provided by sponsoring projects.

During the audit outlined in this document, C4 conducted an analysis of the Fenix Finance smart contract system written in Solidity. The audit took place between September 18 — September 25, 2024.

## Wardens

In Code4rena's Invitational audits, the competition is limited to a small group of wardens; for this audit, 4 wardens participated:

  1. [KupiaSec](https://code4rena.com/@KupiaSec)
  2. [Ch\_301](https://code4rena.com/@Ch_301)
  3. [nnez](https://code4rena.com/@nnez)
  4. [K42](https://code4rena.com/@K42)

This audit was judged by [alcueca](https://code4rena.com/@alcueca).

Final report assembled by [thebrittfactor](https://twitter.com/brittfactorC4).

# Summary

The C4 analysis yielded an aggregated total of 7 unique vulnerabilities. Of these vulnerabilities, 1 received a risk rating in the category of HIGH severity and 6 received a risk rating in the category of MEDIUM severity.

Additionally, C4 analysis included 3 reports detailing issues with a risk rating of LOW severity or non-critical.

All of the issues presented here are linked back to their original finding.

# Scope

The code under review can be found within the [C4 Fenix Finance repository](https://github.com/code-423n4/2024-09-fenix-finance), and is composed of 3 smart contracts written in the Solidity programming language and includes 984 lines of Solidity code.

# Severity Criteria

C4 assesses the severity of disclosed vulnerabilities based on three primary risk categories: high, medium, and low/non-critical.

High-level considerations for vulnerabilities span the following key areas when conducting assessments:

- Malicious Input Handling
- Escalation of privileges
- Arithmetic
- Gas use

For more information regarding the severity criteria referenced throughout the submission review process, please refer to the documentation provided on [the C4 website](https://code4rena.com), specifically our section on [Severity Categorization](https://docs.code4rena.com/awarding/judging-criteria/severity-categorization).

# High Risk Findings (1)
## [[H-01] `killGauge()` will lead to wrong calculation of emission](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/8)
*Submitted by [Ch\_301](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/8), also found by [KupiaSec](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/15)*

<https://github.com/code-423n4/2024-09-fenix-finance/blob/main/contracts/core/VoterUpgradeableV2.sol#L239>

<https://github.com/code-423n4/2024-09-fenix-finance/blob/main/contracts/core/VoterUpgradeableV2.sol#L630-L639>

### Description

The `VoterUpgradeableV2.sol` contract has `killGauge()` that disables the gauge to prevent it from further rewards distribution, only the address with `GOVERNANCE_ROLE` role can call it.
the `killGauge()` only updates three state variables.

```solidity
File: VoterUpgradeableV2.sol
227:     function killGauge(address gauge_) external onlyRole(_GOVERNANCE_ROLE) {
...
232:         delete gaugesState[gauge_].isAlive;
...
236:             delete gaugesState[gauge_].claimable;
...
240:         totalWeightsPerEpoch[epochTimestamp] -= weightsPerEpoch[epochTimestamp][state.pool];
```

The `distribute()` function will distribute rewards to pools managed by the `VoterUpgradeableV2.sol` contract and it will call the Minter contract by triggering `update_period()` function before distributing rewards.

The timeline looks like this:

```
        Epoch_x                      Epoch_x+1  
        |-----------x-------------------|-x---------------------  
           call `killGauge()`             call `distribute()` 
```

When `distribute()` gets invoked in the timeline it will distribute the rewards of `Epoch_x`, The killed gauge has no weight in this epoch because its weight gets subtracted from `totalWeightsPerEpoch[]` in `killGauge()`.

When the Minter invokes `VoterUpgradeableV2.sol#notifyRewardAmount()` to notify the contract of the reward amount to be distributed for `Epoch_x`, we can also find in the same function how the `index` value gets increased.

```solidity
File: VoterUpgradeableV2.sol
382:     function notifyRewardAmount(uint256 amount_) external {
...
387:         uint256 weightAt = totalWeightsPerEpoch[_epochTimestamp() - _WEEK]; 
388:         if (weightAt > 0) {
389:             index += (amount_ * 1e18) / weightAt;
390:         }
```

The `index` is updated as the reward amount divided by the total weights of `Epoch_x,`
we know the weight of the disabled gauge is not included in `totalWeightsPerEpoch[Epoch_x]`.

Back to [`_distribute()`](https://github.com/code-423n4/2024-09-fenix-finance/blob/main/contracts/core/VoterUpgradeableV2.sol#L626-L651):

```solidity
File: VoterUpgradeableV2.sol
671:     function _distribute(address gauge_) internal {
...
677:             uint256 totalVotesWeight = weightsPerEpoch[currentTimestamp - _WEEK][state.pool];
678: 
679:             if (totalVotesWeight > 0) {
...
684:                     if (state.isAlive) {
685:                         gaugesState[gauge_].claimable += amount;
686:                     } else {
687:                         IERC20Upgradeable(token).safeTransfer(minter, amount);
}
```

Because `killGauge()` doesn't delete the values of `weightsPerEpoch[]`, it will send back `amount` of emissions back to Minter, which actually should get distributed between the existing pools.

To summarize, the `index` is directly related by the value of `totalWeightsPerEpoch[Epoch_x]`, and the `killGauge()` is subtracted from the `weightsPerEpoch` of the disabled gauge. Therefore, the `index` didn't include the weight of the killed gauge, but `_distribute` calculates its emission and sends it back to Minter.

To understand the impact, in case the total emissions for `Epoch_x` is `80e18` with three active gauges (with the same amount of votes), each pool will receive `26.5e18` tokens.

But in case one gauge gets killed, one scenario is the 1st gauge will receive `40e18` and the other `40e18` will get transferred back to Minter. This will leave the last gauge with 0 emissions (from here, the impact is related to how `gauge.sol#.notifyRewardAmount()` will handle this situation which is out of scope in this audit).

Another scenario is to send `40e18` to the two gauges but the disabled gauge gets revived in the next epoch and will be able to receive his `40e18` tokens because the `gaugesState[gauge_].index` is not updated (this will loop us to the above scenario again because the `40e18` tokens do not exist in the first time).

### Impact

- One or more gauges will not receive their emissions.
- Wrong calculation of `gaugesState[gauge_].claimable`.
- The distribution system will be broken if the killed gauge gets revived again.

The impact depends on the order of the gauges array that passed to `distribute()` function.

### Proof of Concept

Let's say now is `Epoch_x` +1:

- We have three pools with the same vote weight (500e18) for each of them.
- `index = 10e18`.
- Total emission is: `amount_ = 80e18`.
- The `totalWeightsPerEpoch` of `Epoch_x` is: `weightAt = 1500e18`.

**Scenario 1:** 

No gauge gets disabled and each gauge will receive `26.5e18` tokens as emission.

This is how we calculate it:

```
    How `notifyRewardAmount()` increase the `index`
    uint256 weightAt = 1500e18
    uint256 amount_ = 80e18

    index += (amount_ * 1e18) / weightAt;
                = (80e18 * 1e18)/1500e18
                = 5.3e16
    Now, index = 10.053e18

     How `distribute()` calcul the `amount` for the 3 pools
    uint256 delta = index - state.index;
                            =  10.053 e18- 10e18
                            = 0.053e18  

    uint256 amount = (totalVotesWeight * delta) / 1e18;
                                = (500e18 * 0.053e18)/1e18
                                = 26.5e18
```

**Scenario 2:**

One gauge gets disabled, so the `totalWeightsPerEpoch` of `Epoch_x` is now `weightAt = 1000e18`.
With the current logic, two gauges each will receive `40e18` tokens as emission and `40e18` should be sent back to Minter; which is larger than the total emission which is `80e18`.

This is how we calculate it:

```
    How `notifyRewardAmount()` increase the `index`
    uint256 weightAt = 1000e18
    uint256 amount_ = 80e18

    index += (amount_ * 1e18) / weightAt;
                = (80e18 * 1e18)/1000e18
                = 8e16
    Now, index = 10.08e18

     How `distribute()` calcul the `amount` for the 3 pools
    uint256 delta = index - state.index;
                            =  10.08 e18- 10e18
                            = 0.08e18  

    uint256 amount = (totalVotesWeight * delta) / 1e18;
                                = (500e18 * 0.08e18)/1e18
                                = 40e18
```

### Recommended Mitigation Steps

One fix is to delete the `weightsPerEpoch[][]` in `killGauge()`:

```diff
    function killGauge(address gauge_) external onlyRole(_GOVERNANCE_ROLE) {
...

        uint256 epochTimestamp = _epochTimestamp();
        totalWeightsPerEpoch[epochTimestamp] -= weightsPerEpoch[epochTimestamp][state.pool];
+      delete  weightsPerEpoch[epochTimestamp][state.pool];
        emit GaugeKilled(gauge_);
    }
```

However, the fix should take into consideration how the Minter calculates the emissions for every epoch (is it a fixed value every time or depending on how many gauges are active).

### Assessed type

Invalid Validation

**[b-hrytsak (Fenix) confirmed](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/8#event-14450286694)**

**[alcueca (judge) commented](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/8#issuecomment-2383155456):**
 > Killing gauges can be considered normal operation,; therefore, the finding and severity are valid.

***

# Medium Risk Findings (6)
## [[M-01] `mVeNFT` DOS can't trigger the vote function](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/21)
*Submitted by [Ch\_301](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/21), also found by [Ch\_301](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/9)*

<https://github.com/code-423n4/2024-09-fenix-finance/blob/main/contracts/core/VoterUpgradeableV2.sol#L485>

<https://github.com/code-423n4/2024-09-fenix-finance/blob/main/contracts/core/VoterUpgradeableV2.sol#L448>

### Description

The `VoterUpgradeableV2.sol` contract has the function `attachToManagedNFT()`, users use it to delegate their `veFNX` voting power to a `mVeNFT`. One of the things this function does after receiving the new voting power is sub-call to `_poke()` and it will update the last voted timestamp of the `mVeNFT`.

```solidity
lastVotedTimestamps[tokenId_] = _epochTimestamp() + 1;
```

At this point, the `mVeNFT` can't trigger the vote function until the next epoch starts due to the `_checkVoteDelay()`. Even this check inside the `vote()` doesn't help in this case.

```solidity
if (!managedNFTManagerCache.isWhitelistedNFT(tokenId_)) {
            _checkEndVoteWindow();
        }
```

However, to make things worse this protocol is deployed on Blast transactions are too cheap
malicious users can keep creating new locks every epoch with one wei in `amount`  to bypass the zero check.

```solidity
File: VotingEscrowUpgradeableV2.sol#_createLock()

 LibVotingEscrowValidation.checkNoValueZero(amount_);
```

Then at the start of every new epoch (after the start of the voting window), just call `attachToManagedNFT()`. By doing this it keeps forcing the `mVeNFT` to vote to the same gauges.

### Impact

DOS attack where `mVeNFT` can't invoke the vote function to change the weight of gauges; `mVeNFT` can't reset its votes.

### Recommended Mitigation Steps

One solution is to not check the vote delay, However, I believe this comes with some trade-offs.

```solidity
    function vote(
        uint256 tokenId_,
        address[] calldata poolsVotes_,
        uint256[] calldata weights_
    ) external nonReentrant onlyNftApprovedOrOwner(tokenId_) {
        if (poolsVotes_.length != weights_.length) {
            revert ArrayLengthMismatch();
        }
        bool x = managedNFTManagerCache.isWhitelistedNFT(tokenId_);
        if (!x) {
        _checkVoteDelay(tokenId_);
        }

        _checkStartVoteWindow();
        IManagedNFTManager managedNFTManagerCache = IManagedNFTManager(managedNFTManager);
        if (managedNFTManagerCache.isDisabledNFT(tokenId_)) {
            revert DisabledManagedNft();
        }
        if (!x) {
            _checkEndVoteWindow();
        }
        _vote(tokenId_, poolsVotes_, weights_);
        _updateLastVotedTimestamp(tokenId_);
    }
```

### Assessed type

DoS

**[b-hrytsak (Fenix) confirmed and commented via duplicate Issue #9](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/9#issuecomment-2382024977):**
> The `_updateLastVotedTimestamp` was not supposed to be in the `_poke` method, so cases like yours became possible.
> 
> ```
> /**
>      * @dev Updates the voting preferences for a given tokenId after changes in the system.
>      * @param tokenId_ The tokenId for which to update voting preferences.
>      */
>    function _poke(uint256 tokenId_) internal {
>       //** code **//
>        _updateLastVotedTimestamp(tokenId_);
>    }
>```

**[alcueca (judge) decreased severity to Medium](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/21#issuecomment-2383190704)**

***

## [[M-02] The `VoterUpgradeableV2.createV3Gauge` function incorrectly uses `v2GaugeFactory` instead of `v3GaugeFactory`](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/17)
*Submitted by [KupiaSec](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/17)*

The gauges for the V3 pool are managed incorrectly by `v2GaugeFactory` rather than `v3GaugeFactory`.

### Proof of Concept

In the `VoterUpgradeableV2.createV3Gauge` function, `v2GaugeFactory` is used instead of the appropriate `v3GaugeFactory`.

```solidity
File: contracts\core\VoterUpgradeableV2.sol
323:         externalBribe = IBribeFactory(bribeFactoryCache).createBribe(token0, token1, string.concat("Fenix Bribes: ", symbol));
324:         gauge = IGaugeFactory(v2GaugeFactory).createGauge(
325:             token,
326:             votingEscrow,
327:             pool_,
328:             address(this),
329:             internalBribe,
330:             externalBribe,
331:             true,
332:             feeVault
333:         );
```

As a result, `v2GaugeFactory` manages the gauges for the V3 pool instead of `v3GaugeFactory`. The `GaugeFactoryUpgradeable` contract includes the `defaultBlastGovernor` and `merklGaugeMiddleman` variables, and the `createGauge` function initializes the gauge using these variables.

```solidity
File: contracts\gauges\GaugeFactoryUpgradeable.sol
    function createGauge(
        address _rewardToken,
        address _ve,
        address _token,
        address _distribution,
        address _internal_bribe,
        address _external_bribe,
        bool _isDistributeEmissionToMerkle,
        address _feeVault
    ) external virtual override returns (address) {
        require(msg.sender == voter || msg.sender == owner(), "only voter or owner");

        address newLastGauge = address(new GaugeProxy());
        IGauge(newLastGauge).initialize(
            defaultBlastGovernor,
            _rewardToken,
            _ve,
            _token,
            _distribution,
            _internal_bribe,
            _external_bribe,
            _isDistributeEmissionToMerkle,
            merklGaugeMiddleman,
            _feeVault
        );

        last_gauge = newLastGauge;

        return newLastGauge;
    }
```

### Recommended Mitigation Steps

It is recommended to change the code in the `createV3Gauge` function as follows:

```diff
-       gauge = IGaugeFactory(v2GaugeFactory).createGauge(
+       gauge = IGaugeFactory(v3GaugeFactory).createGauge(
            token,
            votingEscrow,
            pool_,
            address(this),
            internalBribe,
            externalBribe,
            true,
            feeVault
        );
```

**[b-hrytsak (Fenix) confirmed and commented](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/17#issuecomment-2381942716):**
> The problem is valid. Although there are some mitigations, as the implementations of v2/v3 factories, gauges are the same and it would not have led to any consequences at first. It is more of a flexibility for the future, regarding possible updates. 
> 
> This submission is valid, it also seems to be **Overseverity** to the C4 description of problem severity.

**[alcueca (judge) decreased severity to Medium](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/17#issuecomment-2383174460)**

***

## [[M-03] If rewards are not distributed to some gauges in an epoch, it can lead to incorrect rewards distribution in the next epoch](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/16)
*Submitted by [KupiaSec](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/16), also found by [KupiaSec](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/19)*

Some gauges may receive more rewards, while others may not receive any rewards at all.

### Proof of Concept

In the `VoterUpgradeableV2.notifyRewardAmount` function, the `index` is accumulated for every reward distribution from the minter. When distributing rewards to gauges, the reward amount is calculated using the delta index and `weightsPerEpoch`.

```solidity
        uint256 totalVotesWeight = weightsPerEpoch[currentTimestamp - _WEEK][state.pool];
        uint256 delta = index - state.index;
        if (delta > 0) {
L634:       uint256 amount = (totalVotesWeight * delta) / 1e18;
            if (state.isAlive) {
                gaugesState[gauge_].claimable += amount;
            } else {
                IERC20Upgradeable(token).safeTransfer(minter, amount);
            }
        }
```

If rewards are not distributed to a gauge in the current epoch, they can be distributed in the next epoch. If `weightsPerEpoch` for that gauge changes in the next epoch, the reward amount may be calculated incorrectly, leading to unfair distribution among the gauges.

Let's consider the following scenario:

1. There are two pools, `poolA` and `poolB`, with corresponding gauges `gaugeA` and `gaugeB`.

2. Users vote 50 for each pool individually in the first week: `weightsPerEpoch = 50`, `totalWeightsPerEpoch = 100`.

3. In the second week, users call the `distribute` function only for `poolA`, and the minter transfers 100 FNX. Of this, 50 FNX is transferred to `gaugeA`, while the remaining 50 FNX stays in the contract. At that time, users never call the `distribute` function for `poolB`. This situation can occur if the creator of `poolB` intentionally does not call the `distribute` function and other users lack the incentive to call it.
    - `index = 100 * 1e18 / 100 = 1e18`.
    - Rewards amount for `gaugeA`: `50 * 1e18 / 1e18 = 50`.
    - `gaugesState[gaugeA].index = 1e18`.
    - `gaugesState[gaugeB].index = 0`.

4. In this week, users vote 10 for `poolA` and 90 for `poolB` individually.

5. In the third week, users call the `distribute` function for both pools, and the minter transfers another 100 FNX.
    - `index = index + 100 * 1e18 / 100 = 2e18`.
    - Rewards amount for `gaugeA`: `10 * 1e18 / 1e18 = 10`.
    - Rewards amount for `gaugeB`: `90 * 2e18 / 1e18 = 180`.

Even though the `VoterUpgradeableV2` contract has 150 FNX from the minter, it attempts to transfer 190 FNX to the gauges. As a result, the rewards distribution to the gauges is reverted.

As a result, if rewards are not distributed to some gauges in an epoch, it can lead to incorrect rewards distribution in the next epoch.

### Recommended Mitigation Steps

Rewards should be distributed to all gauges per epoch, or the reward index mechanism should be improved.

**[b-hrytsak (Fenix) acknowledged and commented](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/16#issuecomment-2382187938):**
> This issue is common for contracts like Voter ve(3,3), and it was also highlighted to us by the Hats audit providers [here](https://github.com/hats-finance/Fenix-Finance-0x83dbe5aa378f3ce160ed084daf85f621289fb92f/issues/26).
> 
> As you can see, we have the following mitigations:
> 1. The main method for distributing to the gaugeі is `Voter.distributeAll()`, which ensures that no gauge is skipped. In specific scenarios, other methods like `Voter.distribute` are also available.
> 
> 2. Although users may be interested in calling these methods, the protocol also itself will handle this process to ensure the protocol’s viability and prevent such cases from occurring. Additionally, a distribution window has been introduced during which these calls should be made.
> 
> 3. Skipping a gauge for an entire epoch is highly unlikely

**[alcueca (judge) decreased severity to Medium and commented](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/16#issuecomment-2383138002):**
 > While the sponsor seems to be aware of this issue, and have some mitigations prepared, under the audit rules this is a valid finding because it is present in the code and wasn't disclosed by the sponsor.
>
 > Downgraded to Medium since skipping rewards in an epoch would be an unusual precondition.

***

## [[M-04] `boostedValue` should be added to `permanentTotalSupply` for permanently locked tokens](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/11)
*Submitted by [KupiaSec](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/11), also found by [nnez](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/6)*

Unlocking tokens from the permanent locking can be DoSed.

### Proof of Concept

In the `VotingEscrowUpgradeableV2._processLockChange` function, `boostedValue` is added to the token's locked amount at L465. However, `boostedValue` is not added to `permanentTotalSupply` for permanently locked tokens at L470.

```solidity
File: contracts\core\VotingEscrowUpgradeableV2.sol
465:@>       newLocked.amount += LibVotingEscrowUtils.toInt128(boostedValue);
466:         uint256 diff = LibVotingEscrowUtils.toUint256(newLocked.amount - oldLocked_.amount);
467:         uint256 supplyBefore = supply;
468:         supply += diff;
469:         if (newLocked.isPermanentLocked) {
470:@>           permanentTotalSupply += amount_;
471:         }
```

In the `unlockPermanent` function, the token's locked amount is subtracted from `permanentTotalSupply` at L219.

```solidity
File: contracts\core\VotingEscrowUpgradeableV2.sol
219:         permanentTotalSupply -= LibVotingEscrowUtils.toUint256(state.locked.amount);
```

As a result, calling this function may be reverted by the underflow.

Let's consider the following scenario:

1. Alice and Bob each create locks with 100 FNX for a 1-week duration (`< veBoostCached.getMinLockedTimeForBoost`).
2. Alice and Bob lock their tokens permanently: `permanentTotalSupply = 100 + 100 = 200`.
3. Alice deposits 1000 FNX (`>= veBoostCached.getMinFNXAmountForBoost`), and `_boostFNXPercentage` is 1000 (10%):
    - `boostedValue`: 100.
    - Total locked amount: `100 + 1000 + 100 = 1200`.
    - `permanentTotalSupply`: `200 + 1000 = 1200`.
4. Alice unlocks her token from the permanent lock: `permanentTotalSupply = 1200 - 1200 = 0`.
5. Bob tries to unlock his token from the permanent lock, but it is reverted because `permanentTotalSupply` is 0.

### Recommended Mitigation Steps

It is recommended to change the code in the `VotingEscrowUpgradeableV2._processLockChange` function as the following:

```diff
        if (newLocked.isPermanentLocked) {
-           permanentTotalSupply += amount_;
+           permanentTotalSupply = permanentTotalSupply + amount_ + boostedValue;
        }
```

### Assessed type

DoS

**[b-hrytsak (Fenix) confirmed and commented](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/11#issuecomment-2381961966):**
> Indeed. After refactoring and changes, this point, although known, was missed in the new code.
> 
> It is difficult to understand the severity of this issue, it seems to be **Overseverity**. If we go with the worst-case scenario, the last user/users will not be able to unlock the permanent lock on their veNFTs, which will lead them to some additional temporary lock until the problem is resolved, as they would have to wait 182 days for full unlocking anyway.

**[alcueca (judge) decreased severity to Medium](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/11#issuecomment-2383163634)**

**[KupiaSec (warden) commented](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/11#issuecomment-2387546579):**
 > @alcueca - I think this is high severity. This vulnerability leads not only to a DoS but also to an incorrect calculation of voting power in the `_balanceOfNFT` function due to the incorrect accumulation of `permanentTotalSupply`.
> 
> ```solidity
> File: contracts\core\VotingEscrowUpgradeableV2.sol
> 532:     function _checkpoint(uint256 tokenId_, LockedBalance memory oldLocked_, LockedBalance memory newLocked_) internal {
>              [...]
> 616:@>       last_point.permanent = LibVotingEscrowUtils.toInt128(permanentTotalSupply);
> ```
> 
> ```solidity
> File: contracts\core\VotingEscrowUpgradeableV2.sol
> 647:     function _balanceOfNFT(uint256 tokenId_, uint256 timestamp_) internal view returns (uint256 balance) {
> 649:         if (pointEpoch > 0) {
> 650:             Point memory lastPoint = nftPointHistory[tokenId_][pointEpoch];
> 651:             if (lastPoint.permanent > 0) {
> 652:@>               return LibVotingEscrowUtils.toUint256(lastPoint.permanent);
> ```

**[alcueca (judge) increased severity to High and commented](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/11#issuecomment-2390526539):**
 > > This vulnerability leads ... also to an incorrect calculation of voting power
> 
> This was not pointed out in the original submission, but it is right.

**[b-hrytsak (Fenix) commented](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/11#issuecomment-2390739606):**
 > @KupiaSec, @alcueca - In the `balanceOfNFT` calculation, data regarding the `permanentTotalSupply` **is not used**, and the impact of not accounting `boostedValue` in `permanentTotalSupply` is limited only to the calculation of the **total voting power**. This does not affect on votes processing, but only the outcome (`votingPowerTotalSupply()`). **The voting power for a user's veNFT will still be calculated correctly.**
> 
> This statement most likely arose because similar structures and pieces of code are used for the general voting power calculation and for the user. However, `last_point` in `_checkpoint` is from `supplyPointsHistory`, whereas in `balanceOfNFT`, `nftPointHistory` is used.

**[Ch_301 (warden) commented](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/11#issuecomment-2391551339):**
 > @alcueca, @KupiaSec - I believe there is some wrong assumption in this issue. The `last_point.permanent` and `lastPoint.permanent` are not the same thing in this logic.
> 
> `last_point.permanent` is related to `supplyPointsHistory[]` [this mapping](https://github.com/code-423n4/2024-09-fenix-finance/blob/main/contracts/core/VotingEscrowUpgradeableV2.sol#L68) which is tracking the total supply changes.
> 
> However, `lastPoint.permanent` that used in `_balanceOfNFT()` is from `nftPointHistory[][]` [this mapping](https://github.com/code-423n4/2024-09-fenix-finance/blob/main/contracts/core/VotingEscrowUpgradeableV2.sol#L65) which is recording the changes over time for every veNFT.
> 
> The value of `lastPoint.permanent` is updated [here](https://github.com/code-423n4/2024-09-fenix-finance/blob/main/contracts/core/VotingEscrowUpgradeableV2.sol#L637)
>
> ```solidity
>             u_new.permanent = permanent;
>             nftPointHistory[tokenId_][nftStates[tokenId_].pointEpoch] = u_new;
>         }
> ```
>
> Which is acutely only this amount [here](https://github.com/code-423n4/2024-09-fenix-finance/blob/main/contracts/core/VotingEscrowUpgradeableV2.sol#L465). The impact is more like this [QA](https://github.com/code-423n4/2024-09-fenix-finance-findings/blob/main/data/Ch_301-Q.md#l-3-users-will-lose-their-locked-fund-inside-venft) (not a duplicate) last user can't call `unlockPermanent()` successfully.

**[KupiaSec (warden) commented](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/11#issuecomment-2391886988):**
 > There is a confusion for two variables and I agree there is no incorrect calculation of voting power by the `permanentTotalSupply`. But there still exists DoS vulnerability.

**[Ch_301 (warden) commented](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/11#issuecomment-2391932105):**
> @KupiaSec, I'm not sure if we can call this denial-of-service, because only the last permanent-lock is affected by losing his locked FNX tokens! 

**[alcueca (judge) decreased severity to Medium and commented](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/11#issuecomment-2392118543):**
 > I think the last permanent lock being affected reasonably often merits a medium severity. Thanks @KupiaSec for retracting your previous statement about `permanentTotalSupply`.

*Note: For full discussion, see [here](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/11).*

***

## [[M-05] `dettachFromManagedNFT` might revert and temporarily prevent users from detaching in certain situations](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/5)
*Submitted by [nnez](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/5)*

Users' veNFT might be temporarily undetachable, preventing users from performing action on their own veNFT.

### Proof-of-Concept

When users invoke `dettachFromManagedNFT` to get their veNFT back from `ManagedNFT`, `_poke` is called at the end of the function to update voting power across gauges voted by this `ManagedNFT`.

```solidity
function dettachFromManagedNFT(uint256 tokenId_) external nonReentrant onlyNftApprovedOrOwner(tokenId_) {
    _checkVoteDelay(tokenId_);
    _checkVoteWindow();
    IManagedNFTManager managedNFTManagerCache = IManagedNFTManager(managedNFTManager);
    uint256 managedTokenId = managedNFTManagerCache.getAttachedManagedTokenId(tokenId_);
    managedNFTManagerCache.onDettachFromManagedNFT(tokenId_);
    uint256 weight = IVotingEscrowV2(votingEscrow).balanceOfNftIgnoreOwnershipChange(managedTokenId);
    if (weight == 0) {
        _reset(managedTokenId);
        delete lastVotedTimestamps[managedTokenId];
    } else {
        _poke(managedTokenId);
    }
    emit DettachFromManagedNFT(tokenId_);
}

function _poke(uint256 tokenId_) internal {
    address[] memory _poolVote = poolVote[tokenId_];
    uint256[] memory _weights = new uint256[](_poolVote.length);

    for (uint256 i; i < _poolVote.length; ) {
        _weights[i] = votes[tokenId_][_poolVote[i]];
        unchecked {
            i++;
        }
    }
    _vote(tokenId_, _poolVote, _weights);
    _updateLastVotedTimestamp(tokenId_);
}

function _vote(uint256 tokenId_, address[] memory pools_, uint256[] memory weights_) internal {
    _reset(tokenId_);
    uint256 nftVotePower = IVotingEscrowV2(votingEscrow).balanceOfNFT(tokenId_);
    uint256 totalVotesWeight;
    uint256 totalVoterPower;
    for (uint256 i; i < pools_.length; i++) {
        GaugeState memory state = gaugesState[poolToGauge[pools_[i]]];
        if (!state.isAlive) {
            revert GaugeAlreadyKilled();
        }
        totalVotesWeight += weights_[i];
    }
    ...
    ... snipped ...
    ...
}
```

`_poke` loads a list of pools and weights voted by `ManagedNFT` then recast votes again to the same set of pools and weights via calling into `_vote`. However, `_vote` reverts when one of the pool/gauge has already been killed.

Now consider this situation:

1. Bob attaches his veNFT with `ManagedNFT`.
2. `ManagedNFT` votes for `[gaugeA, gaugeB]`.
3. `gaugeB` is killed.
4. Bob decides to detach his veNFT from `ManagedNFT`.
5. Bob's transaction reverts because `_poke` will attempt to recast the vote on `gaugeB`.
6. Bob can't detach his veNFT until `ManagedNFT` notices and recast the vote excluding `gaugeB`.

As a result, users' veNFT might be temporarily undetachable when the described scenario happens.

### Recommended Mitigation

Users are expected to only include active pools in normal `vote` flow. If one of the pool is inactive, we can safely set its weight to zero and skip over it (gracefully, ignore it).

```
    function _vote(uint256 tokenId_, address[] memory pools_, uint256[] memory weights_) internal {
        _reset(tokenId_);
        uint256 nftVotePower = IVotingEscrowV2(votingEscrow).balanceOfNFT(tokenId_);
        uint256 totalVotesWeight;
        uint256 totalVoterPower;
        for (uint256 i; i < pools_.length; i++) {
            GaugeState memory state = gaugesState[poolToGauge[pools_[i]]];
            if (!state.isAlive) {
                delete weights_[i];
                delete pools_[i];
                continue;
            }
            totalVotesWeight += weights_[i];
        }

        uint256 time = _epochTimestamp();
        for (uint256 i; i < pools_.length; i++) {
            address pool = pools_[i];
            if(pool == address(0)) continue;
            address gauge = poolToGauge[pools_[i]];

            uint256 votePowerForPool = (weights_[i] * nftVotePower) / totalVotesWeight;
            if (votePowerForPool == 0) {
                revert ZeroPowerForPool();
            }
            if (votes[tokenId_][pool] > 0) {
                revert NoResetBefore();
            }

            poolVote[tokenId_].push(pool);
            votes[tokenId_][pool] = votePowerForPool;
            weightsPerEpoch[time][pool] += votePowerForPool;
            totalVoterPower += votePowerForPool;
            IBribe(gaugesState[gauge].internalBribe).deposit(votePowerForPool, tokenId_);
            IBribe(gaugesState[gauge].externalBribe).deposit(votePowerForPool, tokenId_);
            emit Voted(_msgSender(), tokenId_, votePowerForPool);
        }
        if (totalVoterPower > 0) IVotingEscrowV2(votingEscrow).votingHook(tokenId_, true);
        totalWeightsPerEpoch[time] += totalVoterPower;
    }
```

### Assessed type

DoS

**[b-hrytsak (Fenix) confirmed and commented](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/5#issuecomment-2382080804):**
> Although there is a certain safe way to kill a gauge, etc., the described case is possible if the gauge is killed in the middle of an epoch for some reason, and as a result, the veNFT cannot be unhooked from the strategy for some time.
> 
> I am not sure that the recommended mitigation is optimal. Redistribution of votes between live pools decision is also not ideal 

***

## [[M-06] Potential incorrect index update in revived gauge under specific conditions](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/4)
*Submitted by [nnez](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/4)*

This vulnerability could allow revived gauges to claim more rewards than intended under specific circumstances, potentially leading to unfair distribution of rewards.

### Description

The `reviveGauge` function fails to update the gauge's index to the current global index when reviving a previously killed gauge. While this issue is mitigated in most scenarios by the `distributeAll` function, which updates all gauges' indices to the global index on each epoch, a vulnerability still exists under specific conditions.

Relevant code snippet:

```solidity
function reviveGauge(address gauge_) external onlyRole(_GOVERNANCE_ROLE) {
    if (gaugesState[gauge_].isAlive) {
        revert GaugeNotKilled();
    }
    gaugesState[gauge_].isAlive = true;
    emit GaugeRevived(gauge_);
}
function _distribute(address gauge_) internal {
    GaugeState memory state = gaugesState[gauge_];
    uint256 currentTimestamp = _epochTimestamp();
    if (state.lastDistributionTimestamp < currentTimestamp) {
        uint256 totalVotesWeight = weightsPerEpoch[currentTimestamp - _WEEK][state.pool];
        if (totalVotesWeight > 0) {
            uint256 delta = index - state.index; // @contest-info outdated index can cause problem here
            if (delta > 0) {
                uint256 amount = (totalVotesWeight * delta) / 1e18;
                if (state.isAlive) {
                    gaugesState[gauge_].claimable += amount;
                } else {
                    IERC20Upgradeable(token).safeTransfer(minter, amount);
                }
            }
        }
        gaugesState[gauge_].index = index;
        uint256 claimable = gaugesState[gauge_].claimable;
        if (claimable > 0 && state.isAlive) {
            gaugesState[gauge_].claimable = 0;
            gaugesState[gauge_].lastDistributionTimestamp = currentTimestamp;
            IGauge(gauge_).notifyRewardAmount(token, claimable);
            emit DistributeReward(_msgSender(), gauge_, claimable);
        }
    }
}
```

The vulnerability arises in scenarios where:

1. There's a large number of gauges in the protocol.
2. Due to gas limitations, `distributeAll` cannot update all gauges in a single transaction.
3. Manual iteration through gauges is required.
4. A killed gauge might not be updated before it's revived as there is no incentive to call `distribute` function for a killed gauge.

In this specific scenario, a revived gauge could retain an outdated index, leading to incorrect reward calculations.

### Example scenario

`Epoch x`:
- `Gauge A` is active with an index of 100.
- Global index is 100.

`Epoch x+1`:
- `Gauge A` is killed, its index stays at 100.
- Global index updates to 150.
- `distributeAll` fails to update all gauges due to gas limitations.

`Epoch x+2`:
- Before manual updates reach `Gauge A`, it is revived with index still at 100.
- Global index updates to 200.

When claiming rewards:
- `Gauge B` (updated correctly) gets `(200 - 150) * weight_B`.
- `Gauge A` incorrectly gets `(200 - 100) * weight_A`.

`Gauge A` claims excess rewards for the period it was killed. This discrepancy, while rare, could lead to unfair reward distribution for all gauges.

### Rationale on severity

High impact - Lead to loss of funds of other gauges.<br>
Low likelihood - Only happen in specific circumstances.<br>
Hence, Medium severity.

### Proof-of-Concept

The following test tries to demonstrate described scenario where `GaugeA` is killed and due to specific circumstance doesn't get update before being revived.

### Steps

1. Create a new test file, `reviveGaugeBug.ts` in `test/core/VoterV2/`.
2. Run `npx hardhat test test/core/VoterV2/reviveGaugeBug.ts --grep "reviveGaugeDoesNotUpdateToGlobalIndex" --trace`.
3. Observe that gaugeA gets more reward than `gaugeB`.

<details>

```
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture, mine, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  ERC20Mock,
  MinterUpgradeable,
  SingelTokenBuybackUpgradeableMock__factory,
  VoterUpgradeableV2,
  VotingEscrowUpgradeableV2,
} from '../../../typechain-types';
import completeFixture, { CoreFixtureDeployed, deployERC20MockToken, mockBlast, SignersList } from '../../utils/coreFixture';
import { ERRORS, getAccessControlError } from '../../utils/constants';

describe('VotingEscrow_V2', function () {
  let VotingEscrow: VotingEscrowUpgradeableV2;
  let Voter: VoterUpgradeableV2;
  let Minter: MinterUpgradeable;
  let signers: SignersList;
  let token: ERC20Mock;
  let token2: ERC20Mock;
  let deployed: CoreFixtureDeployed;

  beforeEach(async () => {
    deployed = await loadFixture(completeFixture);
    VotingEscrow = deployed.votingEscrow;
    Voter = deployed.voter;
    Minter = deployed.minter;
    signers = deployed.signers;
    token = await deployERC20MockToken(signers.deployer, 'MOK', 'MOK', 18);
    token2 = await deployERC20MockToken(signers.deployer, 'MOK2', 'MOK2', 18);
  });

  async function getNextEpochTime() {
    return (BigInt(await time.latest()) / 604800n) * 604800n + 604800n;
  }
    describe('reviveGaugeDoesNotUpdateToGlobalIndex', async () => {
        beforeEach(async () => {
            await deployed.fenix.transfer(signers.otherUser1.address, ethers.parseEther('2'));
            await deployed.fenix.connect(signers.otherUser1).approve(VotingEscrow.target, ethers.parseEther('100'));
            await VotingEscrow.connect(signers.otherUser1).create_lock_for_without_boost(ethers.parseEther('1'), 15724800, signers.otherUser1);
        });        
        it('reviveGaugeDoesNotUpdateToGlobalIndex', async() => {
            // update Minter
            await Voter.updateAddress('minter', deployed.minter);
            
            // Deploy two new pools and create new gauges, gaugeA and gaugeB
            let poolA = await deployed.v2PairFactory.createPair.staticCall(deployed.fenix.target, token.target, false);
            await deployed.v2PairFactory.createPair(deployed.fenix.target, token.target, false);
            let res = await Voter.createV2Gauge.staticCall(poolA);
            let gaugeA = res[0];
            let tx = await Voter.createV2Gauge(poolA);                

            let poolB = await deployed.v2PairFactory.createPair.staticCall(deployed.fenix.target, token2.target, false);
            await deployed.v2PairFactory.createPair(deployed.fenix.target, token2.target, false);
            res = await Voter.createV2Gauge.staticCall(poolB);
            let gaugeB = res[0];
            tx = await Voter.createV2Gauge(poolB);

            // Epoch X
            // vote for gaugeA and gaugeB (equally)
            await Voter.connect(signers.otherUser1).vote(1, [poolA, poolB], [100n, 100n]);
            expect(await Voter.totalWeightsPerEpoch(await Minter.active_period())).to.be.greaterThan(0n);
            
            // Advance to next epoch, call distributeAll
            // Epoch X+1
            let nextEpoch = await getNextEpochTime();
            await time.increaseTo(nextEpoch + 3601n);
            await Voter.distributeAll();
            
            // Kill gaugeA in this epoch
            await Voter.killGauge(gaugeA);
            // Vote for only gaugeB in this epoch
            await Voter.connect(signers.otherUser1).vote(1, [poolB], [100n]);
            expect(await Voter.totalWeightsPerEpoch(await Minter.active_period())).to.be.greaterThan(0n);
            
            // Advance to next epoch,
            // Epoch X+2
            // Supposed that there are large number of gauges, and gaugeA doesn't get update with distribute function
            nextEpoch = await getNextEpochTime();
            await time.increaseTo(nextEpoch + 3601n);
            await Voter.distribute([gaugeB]);
        
            // gaugeA is revived
            await Voter.reviveGauge(gaugeA);
            // gaugeA index is outdated after being revived
            expect((await Voter.gaugesState(gaugeA))[6]).to.be.lessThan(await Voter.index());
            
            // vote for gaugeA and gaugeB (equally)
            await Voter.connect(signers.otherUser1).vote(1, [poolA, poolB], [100n, 100n]);

            // Advance to next epoch
            // Epoch X+3
            nextEpoch = await getNextEpochTime();
            await time.increaseTo(nextEpoch + 3601n);
            
            /**
                Try each with gaugeA and gaugeB using --trace 
                Notice that gauageA get more reward despite getting the same vote weight

                If you distribute both gauges, it will fail due to insufficient balance in Voter contract
            */
            // await Voter.distribute([gaugeB]);
            await Voter.distribute([gaugeA]);
        });
    });
});
```

</details>

### Recommended Mitigation

```solidity
function reviveGauge(address gauge_) external onlyRole(_GOVERNANCE_ROLE) {
    if (gaugesState[gauge_].isAlive) {
        revert GaugeNotKilled();
    }
    gaugesState[gauge_].isAlive = true;
    gaugesState[gauge_].index = index; // <-- update to global index
    emit GaugeRevived(gauge_);
}
```

### Assessed type

Context

**[b-hrytsak (Fenix) acknowledged and commented](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/4#issuecomment-2382247853):**
> Still needs some specific conditions, although this is technically a valid submission.

***

# Low Risk and Non-Critical Issues

For this audit, 3 reports were submitted by wardens detailing low risk and non-critical issues. The [report highlighted below](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/20) by **KupiaSec** received the top score from the judge.

*The following wardens also submitted reports: [Ch\_301](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/10) and [K42](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/7).*

## [L-01] Users can not create the permanent lock directly

In the `_createLock` function, it calls the `_processLockChange` function with `nftStates[newTokenId].locked`, which is an empty variable at L420. This means it only initializes with the `isPermanentLocked` parameter set to `false`.

When users try to lock their tokens permanently, they should first create the lock and then call `lockPermanent`. Additionally, to receive boosted FNX, they must set the end of the lock to be greater than `veBoostCached.getMinLockedTimeForBoost()` when creating the lock.

```solidity
File: contracts\core\VotingEscrowUpgradeableV2.sol
415:         _mint(to_, newTokenId);
416:         _proccessLockChange(
417:             newTokenId,
418:             amount_,
419:             unlockTimestamp,
420:             nftStates[newTokenId].locked,
421:             DepositType.CREATE_LOCK_TYPE,
422:             shouldBoosted_
423:         );
```

### Recommended Mitigation Steps

Add a mechanism that allows users to set permanent locking when they create the lock.

## [L-02] There is an inconsistency in the `vote` and `poke` functions regarding the handling of the end of the voting window

The `VoterUpgradeableV2.vote` function allows voting at the end of the voting window, while the `VoterUpgradeableV2.poke` function does not accommodate this.

The `VoterUpgradeableV2.poke` function calls the `_checkVoteWindow` function to verify that the current time is within the allowed voting window.

```solidity
    function poke(uint256 tokenId_) external nonReentrant onlyNftApprovedOrOwner(tokenId_) {
@>      _checkVoteWindow();
        _poke(tokenId_);
    }
```

However, for whitelisted token in the `managedNFTManagerCache`, the `VoterUpgradeableV2.vote` function permits the current time to be at the end of the voting window.

```solidity
    function vote(
        uint256 tokenId_,
        address[] calldata poolsVotes_,
        uint256[] calldata weights_
    ) external nonReentrant onlyNftApprovedOrOwner(tokenId_) {
        [...]
        _checkStartVoteWindow();
        [...]
        if (!managedNFTManagerCache.isWhitelistedNFT(tokenId_)) {
@>          _checkEndVoteWindow();
        }
        [...]
    }
```

### Recommended Mitigation Steps

It is recommended to change the code as follows:

```diff
    function poke(uint256 tokenId_) external nonReentrant onlyNftApprovedOrOwner(tokenId_) {
-       _checkVoteWindow();
+       _checkStartVoteWindow();
+       if (!managedNFTManagerCache.isWhitelistedNFT(tokenId_)) {
+           _checkEndVoteWindow();
+       }
        _poke(tokenId_);
    }
```

## [L-03] The `VoterUpgradeableV2.distributeFees()` function always reverts

The `VoterUpgradeableV2.distributeFees()` function distributes fees to a list of gauges. It calls the `gauges.claimFees()` function at L400.

```solidity
File: core\VoterUpgradeableV2.sol
        function distributeFees(address[] calldata gauges_) external { 
            for (uint256 i; i < gauges_.length; i++) {
                GaugeState memory state = gaugesState[gauges_[i]];
                if (state.isGauge && state.isAlive) {
400: @>             IGauge(gauges_[i]).claimFees(); 
                }
            }
        }
```

The `gauges.claimFees()` function calls the `feeVault.claimFees()` function at L394.

```solidity
File: contracts\gauges\GaugeUpgradeable.sol
         function claimFees() external nonReentrant returns (uint256 claimed0, uint256 claimed1) { 
389: @>      return _claimFees();
         }
     
         function _claimFees() internal returns (uint256 claimed0, uint256 claimed1) {
             address _token = address(TOKEN);
394: @>      (claimed0, claimed1) = IFeesVault(feeVault).claimFees();
```

In the `feeVault.claimFees()` function, it checks if gauge is registered in the Voter at L72.

```solidity
File: contracts\fees\FeesVaultUpgradeable.sol
        function claimFees() external virtual override returns (uint256, uint256) {
            IFeesVaultFactory factoryCache = IFeesVaultFactory(factory);
            (uint256 toGaugeRate, address[] memory recipients, uint256[] memory rates_) = factoryCache.getDistributionConfig(address(this));
    
            address poolCache = pool;
            if (toGaugeRate > 0) {
                address voterCache = IFeesVaultFactory(factory).voter();
72: @>          if (!IVoter(voterCache).isGauge(msg.sender)) {
73:                 revert AccessDenied();
74:             }
75: @>          if (poolCache != IVoter(voterCache).poolForGauge(msg.sender)) {
76:                 revert PoolMismatch();
77:             }
```

However, as the `VoterUpgradeableV2` contract does not have the `isGauge` function, this function call is reverted.

### Recommended Mitigation Steps

Add the `isGauge` function and `poolForGauge` function to the `VoterUpgradeableV2` contract.

## [L-04] Unnecessary statements in the `_checkpoint` function

In the `VotingEscrowUpgradeableV2._checkpoint()` function, there are several unnecessary statements.

```solidity
File: core\VotingEscrowUpgradeableV2.sol
583:             if (last_point.bias < 0) {
584:                 // This can happen
585:                 last_point.bias;
586:             }
587:             if (last_point.slope < 0) {
588:                 // This cannot happen - just in case
589:                 last_point.slope;
590:             }

609:             if (last_point.slope < 0) {
610:                 last_point.slope;
611:             }
612:             if (last_point.bias < 0) {
613:                 last_point.bias;
614:             }
```

### Recommended Mitigation Steps

Remove these lines to reduce complexity.

## [L-05] The `lastDistributionTimestamp` variable should be always updated in the `_distribute` function

In the `VoterUpgradeableV2._distribute()` function, the `lastDistributionTimestamp` variable is only updated when `claimable` is greater than 0 and gauge is alive.

```solidity
File: contracts\core\VoterUpgradeableV2.sol
644:             if (claimable > 0 && state.isAlive) {
645:                 gaugesState[gauge_].claimable = 0;
646:                 gaugesState[gauge_].lastDistributionTimestamp = currentTimestamp;
647:                 IGauge(gauge_).notifyRewardAmount(token, claimable);
648:                 emit DistributeReward(_msgSender(), gauge_, claimable);
649:             }
```

### Recommended Mitigation Steps

It is recommended to change the code as follows:

```diff
        if (claimable > 0 && state.isAlive) {
            gaugesState[gauge_].claimable = 0;
-           gaugesState[gauge_].lastDistributionTimestamp = currentTimestamp;
            IGauge(gauge_).notifyRewardAmount(token, claimable);
            emit DistributeReward(_msgSender(), gauge_, claimable);
        }
+       gaugesState[gauge_].lastDistributionTimestamp = currentTimestamp;
```

## [L-06] The `poke` function does not check voting delay

In the `VoterUpgradeableV2.poke()` function, it does not check voting delay.

```solidity
File: contracts\core\VoterUpgradeableV2.sol
460:     function poke(uint256 tokenId_) external nonReentrant onlyNftApprovedOrOwner(tokenId_) {
461:         _checkVoteWindow();
462:         _poke(tokenId_);
463:     }
```

### Recommended Mitigation Steps

It is recommended to change the code as follows:

```diff
    function poke(uint256 tokenId_) external nonReentrant onlyNftApprovedOrOwner(tokenId_) {
+       _checkVoteDelay(tokenId_);
        _checkVoteWindow();
        _poke(tokenId_);
    }
```

## [L-07] Voting power of a NFT is not used completely

In the `VoterUpgradeableV2._vote()` function, it calculates the `votePowerForPool` from weights. However, the actual voting power of a NFT(`nftVotePower`) is bigger than final voting power(`totalVoterPower`) due to precision loss.

```solidity
File: core\VoterUpgradeableV2.sol
725:         uint256 nftVotePower = IVotingEscrowV2(votingEscrow).balanceOfNFT(tokenId_); 

737:         for (uint256 i; i < pools_.length; i++) {
738:             address pool = pools_[i];
739:             address gauge = poolToGauge[pools_[i]];
740:             uint256 votePowerForPool = (weights_[i] * nftVotePower) / totalVotesWeight;

751:             totalVoterPower += votePowerForPool;      
755:         }
```

### Recommended Mitigation Steps

It is recommend to change code as follows to reduce precision loss.

```diff
         for (uint256 i; i < pools_.length; i++) {
             address pool = pools_[i];
             address gauge = poolToGauge[pools_[i]];            
-            uint256 votePowerForPool = (weights_[i] * nftVotePower) / totalVotesWeight;
+            if (i == pools_.length - 1) {
+               uint256 votePowerForPool = nftVotePower - totalVoterPower;
+            }
+            else {
+               uint256 votePowerForPool = (weights_[i] * nftVotePower) / totalVotesWeight;
+            }
         }
```

## [L-08] The voting power is not calculated correctly according to the weights assigned by the user during poking

In the `VoterUpgradeableV2._vote` function, there is precision loss in calculation of `votePowerForPool`.

```solidity
File: contracts\core\VoterUpgradeableV2.sol
740:             uint256 votePowerForPool = (weights_[i] * nftVotePower) / totalVotesWeight;
                 [...]
749:             votes[tokenId_][pool] = votePowerForPool;
```

And `votePowerForPool` is used recursively in `_poke` function.

```solidity
File: contracts\core\VoterUpgradeableV2.sol
615:         for (uint256 i; i < _poolVote.length; ) {
616:             _weights[i] = votes[tokenId_][_poolVote[i]];
617:             unchecked {
618:                 i++;
619:             }
620:         }
621:         _vote(tokenId_, _poolVote, _weights);
```

At that time, due to precision loss, `votePowerForPool` is not calculated correctly according to the weights assigned by the user.

### Recommended Mitigation Steps

Store the array of weights corresponding to the pools during voting and use it instead of `votes[tokenId_][_poolVote[i]]` in the poking process.

**[b-hrytsak (Fenix) commented](https://github.com/code-423n4/2024-09-fenix-finance-findings/issues/20#issuecomment-2382485818):**
> [L-01] - Improvement.<br>
> [L-02] - Improvement.<br>
> [L-03] - Importantly.<br>
> [L-06] - Disputed, does not right, as `poke` is not a method of voting, but only of actualizing the power of the vote.

***

# Disclosures

C4 is an open organization governed by participants in the community.

C4 audits incentivize the discovery of exploits, vulnerabilities, and bugs in smart contracts. Security researchers are rewarded at an increasing rate for finding higher-risk issues. Audit submissions are judged by a knowledgeable security researcher and solidity developer and disclosed to sponsoring developers. C4 does not conduct formal verification regarding the provided code but instead provides final verification.

C4 does not provide any guarantee or warranty regarding the security of this project. All smart contract software should be used at the sole risk and responsibility of users.
