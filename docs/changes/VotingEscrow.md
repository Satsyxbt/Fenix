# VotinEscrow Contract Changes

## Function Changes
### Functions Removed
- setTeam
- setArtProxy
- setVeBoost
- setVoter
- ownership_change
- locked (replace by getNftState)
- checkpoint
- **deposit_for** (replace by depositFor)
- **deposit_for_without_boost** (replace by depositFor)
- **create_lock** (replace by createLockFor)
- **create_lock_for** (replace by createLockFor)
- **create_lock_for_without_boost** (replace by createLockFor)
- balanceOfAtNFT
- totalSupplyAt
- tokensOfOwner

### Functions Added
- **createLockFor**
```solidity
    /**
     * @notice Creates a new lock for a specified recipient.
     * @param amount_ The amount of tokens to lock.
     * @param lockDuration_ The duration for which the tokens will be locked.
     * @param to_ The address of the recipient who will receive the veNFT.
     * @param shouldBoosted_ Whether the deposit should be boosted.
     * @param withPermanentLock_ Whether the lock should be permanent.
     * @param managedTokenIdForAttach_ The ID of the managed NFT to attach, if any. 0 for ignore
     * @return The ID of the newly created veNFT.
     * @dev Reverts with `InvalidLockDuration` if the lock duration is invalid.
     * Emits a {Deposit} event on successful lock creation.
     */
    function createLockFor(
        uint256 amount_,
        uint256 lockDuration_,
        address to_,
        bool shouldBoosted_,
        bool withPermanentLock_,
        uint256 managedTokenIdForAttach_
    ) external returns (uint256);
```

- **depositFor**
```solidity
    /**
     * @notice Deposits tokens for a specific NFT, increasing its locked balance.
     * @param tokenId_ The ID of the NFT.
     * @param amount_ The amount of tokens to deposit.
     * @param shouldBoosted_ Whether the deposit should be boosted.
     * @param withPermanentLock_ Whether to apply a permanent lock.
     * @dev Reverts with `InvalidAmount` if the amount is zero.
     * Emits a {Deposit} event on successful deposit.
     */
    function depositFor(uint256 tokenId_, uint256 amount_, bool shouldBoosted_, bool withPermanentLock_) external;

```
- **votingPowerTotalSupply**
```solidity

    /**
     * @notice Returns the total supply of voting power at the current block timestamp.
     * @return The total supply of voting power.
     */
    function votingPowerTotalSupply() external view returns (uint256);
```

- **getNftState**
```solidity
    /**
     * @notice Retrieves the state of a specific NFT.
     * @param tokenId_ The ID of the NFT to query.
     * @return The current state of the specified NFT.
     */
    function getNftState(uint256 tokenId_) external view returns (TokenState memory);
```