# Events
## Emitters:

### Voter
```js
    /// @notice Emitted when the distribution window duration is set or updated.
    /// @param duration New duration of the distribution window in seconds.
    event SetDistributionWindowDuration(uint256 indexed duration);

    /// @notice Emitted when the managed NFT manager is set or updated.
    /// @param managedNFTManager Address of the new managed NFT manager.
    event SetManagedNFTManager(address indexed managedNFTManager);

    /// @notice Emitted when a token is attached to a managed NFT.
    /// @param tokenId ID of the user's token that is being attached.
    /// @param managedTokenId ID of the managed token to which the user's token is attached.
    event AttachToManagedNFT(uint256 indexed tokenId, uint256 indexed managedTokenId);

    /// @notice Emitted when a token is detached from a managed NFT.
    /// @param tokenId ID of the user's token that is being detached.
    event DettachFromManagedNFT(uint256 indexed tokenId);
```
### ManagedNFTManagerUpgradeable
```js
    /**
     * @dev Emitted when the disabled state of a managed NFT is toggled.
     * @param sender The address that triggered the state change.
     * @param tokenId The ID of the managed NFT affected.
     * @param isDisable True if the NFT is now disabled, false if it is enabled.
     */
    event ToggleDisableManagedNFT(address indexed sender, uint256 indexed tokenId, bool indexed isDisable);

    /**
     * @dev Emitted when a new managed NFT is created and attached to a strategy.
     * @param sender The address that performed the creation.
     * @param strategy The address of the strategy to which the NFT is attached.
     * @param tokenId The ID of the newly created managed NFT.
     */
    event CreateManagedNFT(address indexed sender, address indexed strategy, uint256 indexed tokenId);

    /**
     * @dev Emitted when an NFT is whitelisted or removed from the whitelist.
     * @param tokenId The ID of the NFT being modified.
     * @param isWhitelisted True if the NFT is being whitelisted, false if it is being removed from the whitelist.
     */
    event SetWhitelistedNFT(uint256 indexed tokenId, bool indexed isWhitelisted);

    /**
     * @dev Emitted when an authorized user is set for a managed NFT.
     * @param managedTokenId The ID of the managed NFT.
     * @param authorizedUser The address being authorized.
     */
    event SetAuthorizedUser(uint256 indexed managedTokenId, address authorizedUser);
 ```

### VotingEscrow
```js
    /**
     * @notice Emitted when a token is permanently locked by a user.
     * @dev This event is fired to signal that the specified token has been moved to a permanently locked state
     * @param sender The address of the user who initiated the lock.
     * @param tokenId The ID of the token that has been permanently locked.
     */
    event LockPermanent(address indexed sender, uint256 indexed tokenId);

    /**
     * @notice Emitted when a token is unlocked from a permanent lock state by a user.
     * @dev This event indicates that the specified token has been released from its permanent lock status
     * @param sender The address of the user who initiated the unlock.
     * @param tokenId The ID of the token that has been unlocked from its permanent state.
     */
    event UnlockPermanent(address indexed sender, uint256 indexed tokenId);
```

### CompoundStrategy
```js
    /**
     * @dev Emitted when rewards are compounded by the caller.
     *
     * @param caller The address of the account that called the compound function.
     * @param amount The amount of VeFNX tokens that were compounded.
     */
    event Compound(address indexed caller, uint256 indexed amount);

    /**
     * @dev Emitted when an NFT is attached to the strategy, initializing reward mechanisms for it.
     *
     * @param tokenId The ID of the NFT that is being attached.
     * @param userBalance The balance associated with the NFT at the time of attachment.
     */
    event OnAttach(uint256 indexed tokenId, uint256 indexed userBalance);

    /**
     * @dev Emitted when an NFT is detached from the strategy, concluding reward mechanisms for it.
     *
     * @param tokenId The ID of the NFT that is being detached.
     * @param userBalance The balance associated with the NFT at the time of detachment.
     * @param lockedRewards The rewards that were locked and harvested upon detachment.
     */
    event OnDettach(uint256 indexed tokenId, uint256 indexed userBalance, uint256 indexed lockedRewards);

    /**
     * @dev Emitted when ERC20 tokens are recovered from the contract by an admin.
     *
     * @param caller The address of the caller who initiated the recovery.
     * @param recipient The recipient address where the recovered tokens were sent.
     * @param token The address of the token that was recovered.
     * @param amount The amount of the token that was recovered.
     */
    event Erc20Recover(address indexed caller, address indexed recipient, address indexed token, uint256 amount);
```

### CompoundStrategy.VirtualRewarder
```js
  /**
     * @dev Emitted when a deposit is made.
     * @param tokenId The identifier of the token being deposited.
     * @param amount The amount of tokens deposited.
     * @param epoch The epoch during which the deposit occurs.
     */
    event Deposit(uint256 indexed tokenId, uint256 indexed amount, uint256 indexed epoch);

    /**
     * @dev Emitted when a withdrawal is made.
     * @param tokenId The identifier of the token being withdrawn.
     * @param amount The amount of tokens withdrawn.
     * @param epoch The epoch during which the withdrawal occurs.
     */
    event Withdraw(uint256 indexed tokenId, uint256 indexed amount, uint256 indexed epoch);

    /**
     * @dev Emitted when rewards are harvested.
     * @param tokenId The identifier of the token for which rewards are harvested.
     * @param rewardAmount The amount of rewards harvested.
     * @param epochCount The epoch during which the harvest occurs.
     */
    event Harvest(uint256 indexed tokenId, uint256 indexed rewardAmount, uint256 indexed epochCount);

    /**
     * @dev Emitted when a new reward amount is notified to be added to the pool.
     * @param rewardAmount The amount of rewards added.
     * @param epoch The epoch during which the reward is added.
     */
    event NotifyReward(uint256 indexed rewardAmount, uint256 indexed epoch);
```