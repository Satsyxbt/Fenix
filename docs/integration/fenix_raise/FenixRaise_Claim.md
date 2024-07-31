
# FenixRaise Claim Functionality

## Function: `claim`

### Description
This function allows users to claim their reward tokens and veNFTs based on their deposited amount. It performs several checks before allowing the claim and calculates the amount of tokens to be transferred and locked as veNFT.

### Function Signature
```solidity
/**
 * @notice Claim tokens after the raise
 * @dev Users can claim their reward tokens and veNFTs based on their deposited amount.
 *      If the user has already claimed, it reverts with `AlreadyClaimed`.
 *      If the deposited amount is zero, it reverts with `ZeroAmount`.
 *      If the claim phase not started, it reverts with `ClaimPhaseNotStarted`.
 */
function claim() external;
```

### How to Call
To call the `claim` function, a user simply needs to execute the function on the smart contract from their address. The function does not take any parameters.

### Preconditions
Before calling the `claim` function, ensure the following conditions are met:
1. **Claim Phase Active:** The claim phase must have started. If the claim phase has not started, the function will revert with `ClaimPhaseNotStarted`.
2. **Not Already Claimed:** The user must not have already claimed their tokens. If the user has already claimed, the function will revert with `AlreadyClaimed`.
3. **Non-zero Deposit:** The user must have a non-zero deposited amount. If the deposited amount is zero, the function will revert with `ZeroAmount`.

### Process
When the `claim` function is called, the following steps occur:
1. **Check Claim Phase:** The contract checks if the claim phase is active.
2. **Check Already Claimed:** The contract verifies if the user has already claimed their tokens.
3. **Check Deposit Amount:** The contract ensures the user has a non-zero deposit amount.
4. **Calculate Rewards:** The contract calculates the amount of reward tokens and veNFT tokens the user is entitled to based on their deposit.
5. **Update State:** The contract updates the internal state to mark the user as having claimed their tokens.
6. **Transfer Tokens:** The contract transfers the calculated amount of reward tokens to the user.
7. **Lock veNFT:** If applicable, the contract locks the calculated amount of tokens as veNFT and assigns the veNFT to the user.

### Rewards Calculation
The amount of reward tokens and veNFT tokens a user will receive is calculated as follows:
1. **Total Rewards:** The total rewards are calculated based on the user's deposited amount and the conversion rate (`amountOfRewardTokenPerDepositToken`).
2. **veNFT Allocation:** A percentage (`toVeNftPercentage`) of the total rewards is allocated to be locked as veNFT.
3. **Direct Transfer:** The remaining rewards are transferred directly to the user as reward tokens.

### Example
Assume a user has deposited 100 tokens, and the conversion rate is 2 reward tokens per deposit token. If the `toVeNftPercentage` is 50%, the user will receive:
- **veNFT Tokens:** 100 tokens * 2 reward tokens per token * 50% = 100 Reward Token in veNFT token.
- **Reward Tokens:** 100 tokens * 2 reward tokens per token * 50% = 100 reward tokens.

### Events
Upon successful claim, the following event is emitted:
```solidity
event Claim(address indexed user, uint256 claimAmount, uint256 toTokenAmount, uint256 toVeNFTAmount, uint256 tokenId);
```
- **Parameters:**
  - `user`: The address of the user.
  - `claimAmount`: The total amount of tokens claimed.
  - `toTokenAmount`: The amount of tokens transferred directly to the user.
  - `toVeNFTAmount`: The amount of tokens locked as veNFT.
  - `tokenId`: The ID of the veNFT lock created.
- **Emitted when:** A user successfully claims their allocated tokens and veNFT.
