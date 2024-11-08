# BlastRebasingTokensGovernor Overview

## Introduction
The `BlastRebasingTokensGovernor` contract is responsible for managing rebasing tokens and their holders within the Blast ecosystem. The primary purpose of this contract is to facilitate yield distribution across different predefined directions and allow users to claim tokens based on the system's rebasing mechanics.

It provides functionalities for adding token holders, claiming tokens, managing yield distribution, performing token swaps, and managing roles related to these actions. The contract integrates closely with `BlastGovernorClaimableSetup` and utilizes OpenZeppelin's access control mechanisms.

## Key Functionalities
- **Adding Token Holders**: Manage the registration of rebasing token holders.
- **Claim Tokens**: Claim and distribute tokens across multiple yield distribution directions.
- **Yield Distribution Management**: Set percentage allocations and availability of yield for each direction.
- **Token Swaps**: Swap tokens directly using a Uniswap V3 router.
- **Withdraw Tokens**: Withdraw tokens allocated for specific yield distribution directions.
- **Role-Based Access Control**: Manage roles for various actions like adding token holders, swapping, and claiming.

## Functions (Listed)
- `initialize(address blastGovernor_)`
- `updateAddress(string memory key_, address value_)`
- `addTokenHolder(address token_, address contractAddress_)`
- `setDirectionAvailableToSwapToTargetToken(YieldDistributionDirection yieldDirectionType_, bool isAvailableToSwapToTargetTokens_)`
- `setYieldDistributionDirectionsPercentage(uint256 toOthersPercentage_, uint256 toIncentivesPercentage_, uint256 toRisePercentage_, uint256 toBribesPercentage_)`
- `directV3Swap(YieldDistributionDirection yieldDirectionType_, address token_, uint256 amount_, uint256 minAmountOut_, uint160 limitSqrtPrice_, uint256 deadline_)`
- `withdraw(YieldDistributionDirection yieldDirectionType_, address token_, address recipient_, uint256 amount_)`
- `claimFromSpecifiedTokenHolders(address token_, address[] memory holders_)`
- `claim(address token_, uint256 offset_, uint256 limit_)`
- `readClaimableAmounts(address token_, uint256 offset_, uint256 limit_)`
- `readClaimableAmountsFromSpecifiedTokenHolders(address token_, address[] memory holders_)`
- `isRegisteredTokenHolder(address token_, address contractAddress_)`
- `swapInfo() returns (address targetToken, address swapRouter)`
- `getYieldDirectionTokenInfo(YieldDistributionDirection direction_, address token_) returns (TokenAccountingInfo memory)`
- `getYieldDirectionsInfo(address[] calldata tokens_) returns (YieldDistributionDiresctionsInfoView[] memory)`
- `listRebasingTokenHolders(address token_, uint256 offset_, uint256 limit_) returns (address[] memory)`

## Events (Listed)
- `AddRebasingTokenHolder(address indexed token, address indexed contractAddress)`
- `Claim(address indexed caller, address indexed token, uint256 indexed totalClaimedAmount, uint256 toOthersYieldDirectionDistributed, uint256 toIncentivesYieldDirectionDistributed, uint256 toRiseYieldDirectionDistributed, uint256 toBribesYieldDirectionDistributed)`
- `UpdateYieldDistributionPercentage(uint256 toOthersPercentage, uint256 indexed toIncentivesPercentage, uint256 indexed toRisePercentage, uint256 indexed toBribesPercentage)`
- `UpdateDirectionAvailableToSwapToTargetToken(YieldDistributionDirection direction, bool isAvailableToSwapToTargetTokens)`
- `UpdateAddress(string key, address indexed value)`
- `Withdraw(address caller, address indexed recipient, YieldDistributionDirection indexed direction, address indexed token, uint256 amount)`
- `DirectV3Swap(address indexed caller, YieldDistributionDirection indexed direction, address indexed tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut)`

## Errors (Listed)
- `AlreadyRegistered()`
- `NotRegisteredBefore()`
- `InvalidAddressKey()`
- `InvalidSwapSourceToken()`
- `AddressNotSetupForSupportSwap()`
- `ZeroTokensToClaim()`
- `InvalidPercentageSum()`
- `AmountMoreThenAvailabelToSwapByThisDirection()`
- `InsufficientAvailableAmountToWithdraw()`
- `SwapNotAvailableForDirection()`

