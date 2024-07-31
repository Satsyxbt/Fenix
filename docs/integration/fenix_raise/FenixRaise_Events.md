
# FenixRaiseUpgradeable Events

## Events

### Deposit
```solidity
    /**
     * @notice Emitted when a deposit is made
     * @param user The address of the user making the deposit
     * @param amount The amount of tokens deposited
     */
    event Deposit(address indexed user, uint256 indexed amount);
```
- **Parameters:**
  - `user`: The address of the user making the deposit.
  - `amount`: The amount of tokens deposited.
- **Emitted when:** A user deposits tokens into the contract during the raise.

### UpdateTimestamps
```solidity
    /**
     * @notice Emitted when timestamps are updated
     * @param startWhitelistPhaseTimestamp The new timestamp for the start of the whitelist phase
     * @param startPublicPhaseTimestamp The new timestamp for the start of the public phase
     * @param endPublicPhaseTimestamp The new timestamp for the end of the public phase
     * @param startClaimPhaseTimestamp The new timestamp for the start of the claim phase
     */
    event UpdateTimestamps(
        uint256 indexed startWhitelistPhaseTimestamp,
        uint256 indexed startPublicPhaseTimestamp,
        uint256 indexed endPublicPhaseTimestamp,
        uint256 startClaimPhaseTimestamp
    );
```
- **Parameters:**
  - `startWhitelistPhaseTimestamp`: The new timestamp for the start of the whitelist phase.
  - `startPublicPhaseTimestamp`: The new timestamp for the start of the public phase.
  - `endPublicPhaseTimestamp`: The new timestamp for the end of the public phase.
  - `startClaimPhaseTimestamp`: The new timestamp for the start of the claim phase.
- **Emitted when:** The timestamps for the different phases of the raise are updated by the owner.

### Claim
```solidity
    /**
     * @dev Emitted when a user claims their tokens.
     * @param user The address of the user.
     * @param claimAmount The total amount of tokens claimed.
     * @param toTokenAmount The amount of tokens transferred directly to the user.
     * @param toVeNFTAmount The amount of tokens locked as veNft.
     * @param tokenId The ID of the veNft lock created.
     */
    event Claim(address indexed user, uint256 claimAmount, uint256 toTokenAmount, uint256 toVeNFTAmount, uint256 tokenId);
```
- **Parameters:**
  - `user`: The address of the user.
  - `claimAmount`: The total amount of tokens claimed.
  - `toTokenAmount`: The amount of tokens transferred directly to the user.
  - `toVeNFTAmount`: The amount of tokens locked as veNft.
  - `tokenId`: The ID of the veNft lock created.
- **Emitted when:** A user successfully claims their allocated tokens and veNFT.

### UpdateDepositCaps
```solidity
    /**
     * @notice Emitted when deposit caps are updated
     * @param totalDepositCap The new total deposit cap
     * @param whitelistPhaseUserCap The new user cap for the whitelist phase
     * @param publicPhaseUserCap The new user cap for the public phase
     */
    event UpdateDepositCaps(uint256 indexed totalDepositCap, uint256 indexed whitelistPhaseUserCap, uint256 indexed publicPhaseUserCap);
```
- **Parameters:**
  - `totalDepositCap`: The new total deposit cap.
  - `whitelistPhaseUserCap`: The new user cap for the whitelist phase.
  - `publicPhaseUserCap`: The new user cap for the public phase.
- **Emitted when:** The deposit caps are updated by the owner.

### UpdateWhitelistRoot
```solidity
    /**
     * @notice Emitted when the whitelist root is updated
     * @param root The new whitelist root
     */
    event UpdateWhitelistRoot(bytes32 indexed root);
```
- **Parameters:**
  - `root`: The new whitelist root.
- **Emitted when:** The Merkle root for the whitelist is updated by the owner.

### WithdrawDeposits
```solidity
    /**
     * @notice Emitted when deposits are withdrawn
     * @param caller The address of the caller withdrawing the deposits
     * @param depositsReciever The address receiving the deposits
     * @param amount The amount of tokens withdrawn
     */
    event WithdrawDeposits(address indexed caller, address indexed depositsReciever, uint256 indexed amount);
```
- **Parameters:**
  - `caller`: The address of the caller withdrawing the deposits.
  - `depositsReciever`: The address receiving the deposits.
  - `amount`: The amount of tokens withdrawn.
- **Emitted when:** Deposits are withdrawn by the owner.

### WithdrawExcessiveRewardTokens
```solidity
    /**
     * @notice Emitted when excessive rewards are withdrawn
     * @param caller The address of the caller withdrawing the excessive rewards
     * @param tokensReciever The address receiving the excessive rewards
     * @param amount The amount of rewards tokens withdrawn
     */
    event WithdrawExcessiveRewardTokens(address indexed caller, address indexed tokensReciever, uint256 indexed amount);
```
- **Parameters:**
  - `caller`: The address of the caller withdrawing the excessive rewards.
  - `tokensReciever`: The address receiving the excessive rewards.
  - `amount`: The amount of reward tokens withdrawn.
- **Emitted when:** Excessive reward tokens are withdrawn by the owner.