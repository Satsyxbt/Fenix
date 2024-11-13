# VotingEscrowUpgradeable Contract Events

## Events

### Boost

```solidity
  event Boost(uint256 indexed tokenId, uint256 value);
```

**Description**: Emitted when a boost is applied to a token's lock.

- `tokenId` (uint256): The ID of the token that received the boost.
- `value` (uint256): The value of the boost applied.

**When Emitted**: When a token's locked balance is boosted, usually after meeting certain conditions involving the token amount and lock time.

**Methods Emitting**:
- `createLockFor`
  - **Possible Emissions**: 0 or 1 per method call, depending on whether boosting conditions are met.
- `depositFor`
  - **Possible Emissions**: 0 or 1 per method call, depending on whether boosting conditions are met.
- `depositWithIncreaseUnlockTime`
  - **Possible Emissions**: 0 or 1 per method call, depending on whether boosting conditions are met.

### Deposit

```solidity
    /**
     * @notice Emitted when a deposit is made into a lock.
     * @param provider The address of the entity making the deposit.
     * @param tokenId The ID of the token associated with the deposit.
     * @param value The value of the deposit made.
     * @param locktime The time until which the lock is extended.
     * @param deposit_type The type of deposit being made.
     * @param ts The timestamp when the deposit was made.
     */
    event Deposit(address indexed provider, uint256 tokenId, uint256 value, uint256 indexed locktime, DepositType deposit_type, uint256 ts);
```

**Description**: Emitted when a deposit is made into a not attached lock.

- `provider` (address): The address of the entity making the deposit.
- `tokenId` (uint256): The ID of the token associated with the deposit.
- `value` (uint256): The value of the deposit made.
- `locktime` (uint256): The time until which the lock is extended.
- `deposit_type` (DepositType): The type of deposit being made (e.g., create lock, increase time, merge).
- `ts` (uint256): The timestamp when the deposit was made.

**When Emitted**: When a deposit is made into a voting escrow lock, either by creating a new lock or adding to an existing one.

**Methods Emitting**:
- `createLockFor`
  - **Possible Emissions**: 1 per method call.
- `depositFor`
  - **Possible Emissions**: 1 per method call.
- `depositWithIncreaseUnlockTime`
  - **Possible Emissions**: 2 per method call. (One for increase unlock time, and one for deposit to NFT)

### DepositToAttachedNFT

```solidity
    /**
     * @notice Emitted when tokens are deposited to an attached NFT.
     * @param provider The address of the user making the deposit.
     * @param tokenId The ID of the NFT receiving the deposit.
     * @param managedTokenId The ID of the managed token receiving the voting power.
     * @param value The amount of tokens deposited.
     */
    event DepositToAttachedNFT(address indexed provider, uint256 tokenId, uint256 managedTokenId, uint256 value);
```

**Description**: Emitted when tokens are deposited to an attached NFT.

- `provider` (address): The address of the user making the deposit.
- `tokenId` (uint256): The ID of the NFT receiving the deposit.
- `managedTokenId` (uint256): The ID of the managed token receiving the voting power.
- `value` (uint256): The amount of tokens deposited.

**When Emitted**: When a user deposits tokens into a attached NFT

**Methods Emitting**:
- `depositToAttachedNFT`
  - **Possible Emissions**: 1 per method call.

### Withdraw

```solidity
    /**
     * @notice Emitted when a withdrawal is made from a lock.
     * @param provider The address of the entity making the withdrawal.
     * @param tokenId The ID of the token associated with the withdrawal.
     * @param value The value of the withdrawal made.
     * @param ts The timestamp when the withdrawal was made.
     */
    event Withdraw(address indexed provider, uint256 tokenId, uint256 value, uint256 ts);
```

**Description**: Emitted when a withdrawal is made from a lock.

- `provider` (address): The address of the entity making the withdrawal.
- `tokenId` (uint256): The ID of the token associated with the withdrawal.
- `value` (uint256): The value of the withdrawal made. It is assumed that it will always be a value for the user's full balance
- `ts` (uint256): The timestamp when the withdrawal was made.

**When Emitted**: When a user withdraws tokens from a voting escrow lock, releasing the locked tokens.

**Methods Emitting**:
- `withdraw`
  - **Possible Emissions**: 1 per method call.

### Supply

```solidity
  event Supply(uint256 prevSupply, uint256 supply);
```

**Description**: Emitted when the total supply of voting power changes.

- `prevSupply` (uint256): The previous total supply of voting power.
- `supply` (uint256): The new total supply of voting power.

**When Emitted**: When the total supply of voting power changes due to deposits, withdrawals, or other actions affecting locked tokens.

**Methods Emitting**:
- `createLockFor`
  - **Possible Emissions**: 1 per method call.
- `depositFor`
  - **Possible Emissions**: 1 per method call.
- `withdraw`
  - **Possible Emissions**: 1 per method call.
- `depositWithIncreaseUnlockTime`
  - **Possible Emissions**: 2 per method call. (One for increase unlock time, and one for deposit to NFT)
- `depositToAttachedNFT`
  - **Possible Emissions**: 1 per method call.

### LockPermanent

```solidity
    /**
     * @notice Emitted when a token is permanently locked by a user.
     * @param sender The address of the user who initiated the lock.
     * @param tokenId The ID of the token that has been permanently locked.
     */
    event LockPermanent(address indexed sender, uint256 indexed tokenId);
```

**Description**: Emitted when a token is permanently locked by a user.

- `sender` (address): The address of the user who initiated the lock.
- `tokenId` (uint256): The ID of the token that has been permanently locked.

**When Emitted**: When a user permanently locks a voting escrow token to obtain additional benefits or voting power.

**Methods Emitting**:
- `lockPermanent`
  - **Possible Emissions**: 1 per method call.

### UnlockPermanent

```solidity
    /**
     * @notice Emitted when a token is unlocked from a permanent lock state by a user.
     * @param sender The address of the user who initiated the unlock.
     * @param tokenId The ID of the token that has been unlocked from its permanent state.
     */
    event UnlockPermanent(address indexed sender, uint256 indexed tokenId);
```

**Description**: Emitted when a token is unlocked from a permanent lock state by a user.

- `sender` (address): The address of the user who initiated the unlock.
- `tokenId` (uint256): The ID of the token that has been unlocked from its permanent state.

**When Emitted**: When a user unlocks a previously permanently locked token, allowing the token to be withdrawn or modified.

**Methods Emitting**:
- `unlockPermanent`
  - **Possible Emissions**: 1 per method call.

