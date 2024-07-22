# Nest Example APR Calculation

This document provides an example and methodology for calculating the APR (Annual Percentage Rate) for users who have locked their veNFTs in the `CompoundVeFNXManagedNFTStrategy`. When a user connects their NFT to mVeNFT, the standard APR calculation becomes unavailable. Therefore, a specific calculation method is created for these users.

## Concept

Any rewards accumulated by this strategy are converted into FNX and distributed among users. The user's reward is the received amount once a week, which will be added to their veNFT balance after withdrawal.

### APR Calculation

APR is the expected percentage by which the user's veNFT balance will increase over the course of a year.

### Available Information

1. **Total FNX Deposited in the Strategy by Users:** The overall amount of FNX deposited by all users in the strategy.
2. **User's FNX Deposited in the Strategy per Epoch:** The amount of FNX deposited by a specific user in the strategy for a given epoch.
3. **Rewards in Previous Epochs:** The rewards in FNX distributed among all users in past epochs.
4. **Incoming Rewards to the Strategy for Users:** The amount of rewards entering the strategy for distribution to users.

### Example Calculation

!!! **Important** This calculation shows how much the APR will be in the case of the same reward for voting as in the previous epoch for the next year. For a more accurate calculation, you can use the arithmetic average of the last few epochs. Other remuneration or incentives that may be received are not taken into account. Only remuneration from voting converted into FNX is taken into account.

To calculate the APR based on the previous week's reward:

- **TotalSupply current epoch:** The sum of all user deposits at the start of the current epoch.
- **Reward previous epoch:** The total rewards distributed in the previous epoch.

#### Weekly Reward Percentage Calculation

```math
WeeklyPercentagOfReward = \frac{RewardAtPreviusEpoch}{TotalSupplyAtCurrentEpoch} * 100\%
```

#### Annual APR Calculation

```math
YearAPR = WeeklyPercentagOfReward * 52\ epoch
```

### Compound Interest Formula

To account for the weekly increase in user balance, the compound interest formula is used:
To take into account the fact that a new reward is added every week and used for accumulation (the so-called compound), you need to use the compound interest formula:

```math
A = P * (1 + \frac{r}{n})^{nt}
```

Where:
- \( A \) is the amount of money accumulated after \( n \) weeks, including interest.
- \( P \) is the principal amount (initial deposit).
- \( r \) is the annual interest rate (APR as a decimal).
- \( n \) is the number of times interest is compounded per year (52 weeks).
- \( t \) is the time the money is invested for in years.

#### Compound Interest Calculation for Weekly Increases

Considering the user's balance increases weekly, the formula adjusts as follows:

```math
Weekly Increase Balance = 1 + \frac{WeekRewardPercent}{100\%}
```

Over a year (52 weeks), the balance evolves to:

```math
YearEndBalance = P * (1 + \frac{WeekRewardPercent}{100\%})^{52}
```

Where \( P \) is the initial mVeNFT balance.

#### **Example:**
Last week, 1000 FNX were distributed as a reward to users in the compound strategy, after selling all bribes, etc. The TotalSupply was = 100000 FNX

Therefore, the weekly reward was:

```math
WeeklyPercentagOfReward = \frac{1,000\ FNX}{100,000\ FNX } * 100\\% = 1\\%
```

```math
YearAPR = 1\% * 52\ epoch = 52\% APR
```

```math
Year End Balance = 100,000\ FNX * (1 + \frac{1\%}{100\%})^{52} = 167,768.892\ FNX
```

```math
Compound Year APR = (\frac{167,768.892\ FNX}{100,000\ FNX} - 1) * 100\% = 67.7\%
```

## Contract Code and Methods

### Functions to Retrieve Information

- **getLockedRewardsBalance(uint256 tokenId_)** (`CompoundVeFNXManagedNFTStrategyUpgradeable`): Retrieves the total amount of locked rewards available for a specific NFT based on its tokenId.
- **balanceOf(uint256 tokenId_)** (`CompoundVeFNXManagedNFTStrategyUpgradeable` and `SingelTokenVirtualRewarderUpgradeable`): Retrieves the balance or stake associated with a specific NFT.
- **totalSupply()** (`CompoundVeFNXManagedNFTStrategyUpgradeable` and `SingelTokenVirtualRewarderUpgradeable`): Retrieves the total supply of stakes managed by the strategy.
- **calculateAvailableRewardsAmount(uint256 tokenId_)** (`SingelTokenVirtualRewarderUpgradeable`): Calculates the available rewards amount for a given tokenId.
- **balanceOfAt(uint256 tokenId_, uint256 timestamp_)** (`SingelTokenVirtualRewarderUpgradeable`): Provides the balance of a specific tokenId at a given timestamp.
- **totalSupplyAt(uint256 timestamp_)** (`SingelTokenVirtualRewarderUpgradeable`): Provides the total supply of tokens at a given timestamp.
- **rewardsPerEpoch(uint256 epoch_)** (`SingelTokenVirtualRewarderUpgradeable`): Providers the total rewards allocated for that epoch

### Events

- **OnAttach(uint256 tokenId_, uint256 userBalance_)** (`CompoundVeFNXManagedNFTStrategyUpgradeable`): Emitted when an NFT is attached to the strategy.
- **OnDettach(uint256 tokenId_, uint256 userBalance_, uint256 lockedRewards)** (`CompoundVeFNXManagedNFTStrategyUpgradeable`): Emitted when an NFT is detached from the strategy.
- **Compound(address indexed user, uint256 amount)** (`CompoundVeFNXManagedNFTStrategyUpgradeable`): Emitted when the earnings are compounded.
- **Deposit(uint256 tokenId_, uint256 amount_, uint256 epoch_)** (`SingelTokenVirtualRewarderUpgradeable`): Emitted when a deposit is made.
- **Withdraw(uint256 tokenId_, uint256 amount_, uint256 epoch_)** (`SingelTokenVirtualRewarderUpgradeable`): Emitted when a withdrawal is made.
- **Harvest(uint256 tokenId_, uint256 reward, uint256 epoch_)** (`SingelTokenVirtualRewarderUpgradeable`): Emitted when rewards are harvested.
- **NotifyReward(uint256 amount_, uint256 epoch_)** (`SingelTokenVirtualRewarderUpgradeable`): Emitted when a new reward amount is notified for the current epoch.

These methods and events will help in retrieving balances, calculating rewards, and tracking deposits and withdrawals for accurate APR calculation.
