
## VeBoost Overview

### Introduction

The VeBoost system is an integral component of the Fenix ecosystem, designed to enhance user rewards through the boosting of locked FNX tokens. This document provides an overview of the VeBoost system, explaining how it works, how rewards are calculated, and the factors influencing these rewards.

### How the System Works

The VeBoost system operates by allowing users to lock their FNX tokens in the Voting Escrow contract. Users can deposit FNX tokens, either creating a new lock or adding to an existing lock. Depending on certain conditions, these locked tokens can receive a boost, thereby increasing the effective amount of tokens considered for rewards and voting power.

### Conditions for Rewards
Rewards in the VeBoost system are accrued under the following conditions:
1. **The value to be deposited must be greater than 0**
2. **The user locks amount of FNX for more than the minimum amount for applying the system boost**
3. **The user lock FNX for the maximum period**
4. **VeBoost system has enough FNX to boost users locks**

### Rewards Calculation
In the VeBoost system, rewards are calculated **based on the amount of FNX tokens that the user blocks**. Under certain conditions, the system can also provide additional bonuses in the form of other tokens to the user for the blocked FNX. This is how the reward calculation works:

#### Boosting Locked FNX Amount
The amount of FNX tokens a user locks in the Voting Escrow contract can be boosted (added to amount that user will be locked. This boost depends on the user's amount FNX that will be locked and the boost percentage set in the contract.

**Formula for Boost Calculation:**
```math
 BoostedFnxAmount = UserFnxDepositAmount * BoostPercentage
```
The total effective locked amount is then:
```math
 TotalLockedAmount = UserFnxDepositAmount + BoostedFnxAmount
```

**Example:**

If a user deposits 1000 FNX and the boost percentage is 10%, the calculation will be as follows:

1. **Locked FNX Amount**: 1000 FNX
2. **Boost Percentage**: 10%
```math
 BoostedFnxAmount = 1000 * 10\% = 100\ FNX
```
So, the total effective locked amount will be:
```math
 TotalLockedAmount = 100 + 100 = 1100\ FNX
```
This means the user's effective locked amount is now 1100 FNX. These tokens are added to the user's balance and can be withdrawn along with the principal amount after the lock period ends.


#### Reward Distribution with Other Tokens
Apart from the FNX boost, the VeBoost system can also reward users with other tokens. These additional rewards are calculated based on the boosted FNX amount.

**Formula for Other Token Reward Calculation:**
```math
 TokenPercentage = \frac{BoostedFnxAmount * FnxBalanceOfVeBoost}{100\%}
```
```math
 TokenAmount = TokenPercentage * TokenBalanceOfVeBoost
```
**Example:**

1. **User FNX deposit amount**: 1000 FNX
2. **Total FNX Balance**: 5000 FNX (in the contract)
3. **Token A Balance**: 2000 Tokens (in the contract)
4. **Boost Percentage**: 10%

User boost:
```math
 BoostedFnxAmount = \frac{1000 * 10\%} {100\%} = 100\ FNX
```
```math
 TotalLockedAmount = 100 + 100 = 1100\ FNX
```

Additional reward in the Token A

```math
 TokenPercentage = \frac{100\ FNX}{5000\ FNX} * 100\%=2\%
```
```math
 TokenAmount = 2\%* 2000\ TokenA = 40\ TokenA
```

This means the user receives 40 reward Token A in addition to their FNX boost. **These additional tokens are transfer direct to the user's balance**

### VotingEscrow Methods supportings VeBoost System
The veBoost system is integrated into the `VotingEscrowUpgradeableV1_2` & `VotingEscrowUpgradeable` contract, allowing users to enhance their locked FNX tokens through various methods. The following methods support the veBoost system to boost user rewards:
1. **Deposit for Existing Lock (deposit_for):**
```js
    function deposit_for(uint _tokenId, uint _value) external;
```
2. **Create New Lock (create_lock):**
```js
    function create_lock(uint _value, uint _lock_duration) external;
```
2. **Create New Lock For (create_lock_for):**
```js
    function create_lock_for(uint _tokenId, uint _value, address _to) external;
```