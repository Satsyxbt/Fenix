// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";

/**
 * @title IVotingEscrow
 * @notice Interface for Voting Escrow, allowing users to lock tokens in exchange for veNFTs that are used in governance and other systems.
 */
interface IVotingEscrow is IERC721Upgradeable {
    /**
     * @notice Enum representing the types of deposits that can be made.
     * @dev Defines the context in which a deposit is made:
     * - `DEPOSIT_FOR_TYPE`: Regular deposit for an existing lock.
     * - `CREATE_LOCK_TYPE`: Creating a new lock.
     * - `INCREASE_UNLOCK_TIME`: Increasing the unlock time for an existing lock.
     * - `MERGE_TYPE`: Merging two locks together.
     */
    enum DepositType {
        DEPOSIT_FOR_TYPE,
        CREATE_LOCK_TYPE,
        INCREASE_UNLOCK_TIME,
        MERGE_TYPE
    }

    /**
     * @notice Structure representing the state of a token.
     * @dev This includes information about the lock, voting status, attachment status,
     *      the block of the last transfer, and the index (epoch) of its latest checkpoint.
     * @param locked The locked balance (amount + end timestamp + permanent status) of the token.
     * @param isVoted Whether the token has been used to vote in the current epoch.
     * @param isAttached Whether the token is attached to a managed NFT.
     * @param lastTranferBlock The block number of the last transfer.
     * @param pointEpoch The epoch (checkpoint index) for the token’s most recent voting power change.
     */
    struct TokenState {
        LockedBalance locked;
        bool isVoted;
        bool isAttached;
        uint256 lastTranferBlock;
        uint256 pointEpoch;
    }

    /**
     * @notice Structure representing a locked balance.
     * @dev Contains the amount locked, the end timestamp of the lock, and whether the lock is permanent.
     * @param amount The amount of tokens locked (signed integer for slope calculations).
     * @param end The timestamp when the lock ends (0 if permanently locked).
     * @param isPermanentLocked Whether the lock is permanent (no unlock time).
     */
    struct LockedBalance {
        int128 amount;
        uint256 end;
        bool isPermanentLocked;
    }

    /**
     * @notice Structure representing a point in time for calculating voting power.
     * @dev Used for slope/bias math across epochs.
     * @param bias The bias of the lock, representing the remaining voting power.
     * @param slope The rate at which voting power (bias) decays over time.
     * @param ts The timestamp of the checkpoint.
     * @param blk The block number of the checkpoint.
     * @param permanent The permanently locked amount at this checkpoint.
     */
    struct Point {
        int128 bias;
        int128 slope; // -dweight / dt
        uint256 ts;
        uint256 blk; // block
        int128 permanent;
    }

    /**
     * @notice Emitted when a boost is applied to a token's lock.
     * @param tokenId The ID of the token that received the boost.
     * @param value The amount of tokens used as a boost.
     */
    event Boost(uint256 indexed tokenId, uint256 value);

    /**
     * @notice Emitted when a deposit is made into a lock.
     * @param provider The address of the entity making the deposit.
     * @param tokenId The ID of the token associated with the deposit.
     * @param value The amount of tokens deposited.
     * @param locktime The time (timestamp) until which the lock is extended.
     * @param deposit_type The type of deposit (see {DepositType}).
     * @param ts The timestamp when the deposit was made.
     */
    event Deposit(address indexed provider, uint256 tokenId, uint256 value, uint256 indexed locktime, DepositType deposit_type, uint256 ts);

    /**
     * @notice Emitted when tokens are deposited to an attached NFT.
     * @param provider The address of the user making the deposit.
     * @param tokenId The ID of the NFT receiving the deposit.
     * @param managedTokenId The ID of the managed token receiving the voting power.
     * @param value The amount of tokens deposited.
     */
    event DepositToAttachedNFT(address indexed provider, uint256 tokenId, uint256 managedTokenId, uint256 value);

    /**
     * @notice Emitted when a withdrawal is made from a lock.
     * @param provider The address of the entity making the withdrawal.
     * @param tokenId The ID of the token associated with the withdrawal.
     * @param value The amount of tokens withdrawn.
     * @param ts The timestamp when the withdrawal occurred.
     */
    event Withdraw(address indexed provider, uint256 tokenId, uint256 value, uint256 ts);

    /**
     * @notice Emitted when the merging process of two veNFT locks is initiated.
     * @param tokenFromId The ID of the token being merged from.
     * @param tokenToId The ID of the token being merged into.
     */
    event MergeInit(uint256 tokenFromId, uint256 tokenToId);

    /**
     * @notice Emitted when two veNFT locks are successfully merged.
     * @param provider The address of the entity initiating the merge.
     * @param tokenIdFrom The ID of the token being merged from.
     * @param tokenIdTo The ID of the token being merged into.
     */
    event Merge(address indexed provider, uint256 tokenIdFrom, uint256 tokenIdTo);

    /**
     * @notice Emitted when the total supply of voting power changes.
     * @param prevSupply The previous total supply of voting power.
     * @param supply The new total supply of voting power.
     */
    event Supply(uint256 prevSupply, uint256 supply);

    /**
     * @notice Emitted when an address associated with the contract is updated.
     * @param key The key representing the contract being updated.
     * @param value The new address of the contract.
     */
    event UpdateAddress(string key, address indexed value);

    /**
     * @notice Emitted when a token is permanently locked by a user.
     * @param sender The address of the user who initiated the lock.
     * @param tokenId The ID of the token that has been permanently locked.
     */
    event LockPermanent(address indexed sender, uint256 indexed tokenId);

    /**
     * @notice Emitted when a token is unlocked from a permanent lock state by a user.
     * @param sender The address of the user who initiated the unlock.
     * @param tokenId The ID of the token that has been unlocked from its permanent state.
     */
    event UnlockPermanent(address indexed sender, uint256 indexed tokenId);

    /**
     * @notice Emitted when a veFNX NFT lock is burned and the underlying FNX is released for use in bribes.
     * @param sender The address which initiated the burn-to-bribes operation.
     * @param tokenId The identifier of the veFNX NFT that was burned.
     * @param value The amount of FNX tokens released from the burned lock.
     */
    event BurnToBribes(address indexed sender, uint256 indexed tokenId, uint256 value);

    /**
     * @notice Returns the address of the token used in voting escrow.
     * @return The address of the token contract.
     */
    function token() external view returns (address);

    /**
     * @notice Returns the address of the voter contract.
     * @return The address of the voter.
     */
    function voter() external view returns (address);

    /**
     * @notice Checks if the specified address is approved or the owner of the given token.
     * @param sender The address to check.
     * @param tokenId The ID of the token to check.
     * @return True if `sender` is approved or the owner of `tokenId`, otherwise false.
     */
    function isApprovedOrOwner(address sender, uint256 tokenId) external view returns (bool);

    /**
     * @notice Checks if a specific NFT token is transferable.
     * @dev In the current implementation, this function always returns `true`,
     *      meaning the contract does not enforce non-transferability at code level.
     * @param tokenId_ The ID of the NFT to check.
     * @return bool Always returns true in the current version.
     */
    function isTransferable(uint256 tokenId_) external view returns (bool);

    /**
     * @notice Retrieves the state of a specific NFT.
     * @param tokenId_ The ID of the NFT to query.
     * @return The current {TokenState} of the specified NFT.
     */
    function getNftState(uint256 tokenId_) external view returns (TokenState memory);

    /**
     * @notice Returns the total supply of voting power at the current block timestamp.
     * @return The total supply of voting power.
     */
    function votingPowerTotalSupply() external view returns (uint256);

    /**
     * @notice Returns the balance of a veNFT at the current block timestamp.
     * @dev Balance is determined by the lock’s slope and bias at this moment.
     * @param tokenId_ The ID of the veNFT to query.
     * @return The current voting power (balance) of the veNFT.
     */
    function balanceOfNFT(uint256 tokenId_) external view returns (uint256);

    /**
     * @notice Returns the balance of a veNFT at the current block timestamp, ignoring ownership changes.
     * @dev This function is similar to {balanceOfNFT} but does not zero out the balance
     *      if the token was transferred in the same block.
     * @param tokenId_ The ID of the veNFT to query.
     * @return The current voting power (balance) of the veNFT.
     */
    function balanceOfNftIgnoreOwnershipChange(uint256 tokenId_) external view returns (uint256);

    /**
     * @notice Updates the address of a specified contract.
     * @param key_ The key representing the contract.
     * @param value_ The new address of the contract.
     * @dev Reverts with `InvalidAddressKey` if the key does not match any known setting.
     * Emits an {UpdateAddress} event on success.
     */
    function updateAddress(string memory key_, address value_) external;

    /**
     * @notice Hooks the voting state for a specified NFT.
     * @dev Only callable by the voter contract. Used to mark a veNFT as having voted or not.
     * @param tokenId_ The ID of the NFT.
     * @param state_ True if the NFT is now considered “voted,” false otherwise.
     * @custom:error AccessDenied If called by any address other than the voter.
     */
    function votingHook(uint256 tokenId_, bool state_) external;

    /**
     * @notice Creates a new lock for a specified recipient.
     * @param amount_ The amount of tokens to lock.
     * @param lockDuration_ The duration in seconds for which the tokens will be locked.
     * @param to_ The address of the recipient who will receive the new veNFT.
     * @param shouldBoosted_ Whether the deposit should attempt to get a veBoost.
     * @param withPermanentLock_ Whether the lock should be created as a permanent lock.
     * @param managedTokenIdForAttach_ (Optional) The ID of the managed NFT to attach. Pass 0 to ignore.
     * @return The ID of the newly created veNFT.
     * @dev Reverts with `InvalidLockDuration` if lockDuration_ is 0 or too large.
     *      Reverts with `ValueZero` if amount_ is 0.
     * Emits a {Deposit} event on success.
     */
    function createLockFor(
        uint256 amount_,
        uint256 lockDuration_,
        address to_,
        bool shouldBoosted_,
        bool withPermanentLock_,
        uint256 managedTokenIdForAttach_
    ) external returns (uint256);

    /**
     * @notice Deposits tokens for a specific NFT, increasing its locked balance.
     * @param tokenId_ The ID of the veNFT to top up.
     * @param amount_ The amount of tokens to deposit.
     * @param shouldBoosted_ Whether this deposit should attempt to get a veBoost.
     * @param withPermanentLock_ Whether to apply a permanent lock alongside the deposit.
     * @dev Reverts with `ValueZero` if amount_ is 0.
     * Emits a {Deposit} event upon success.
     */
    function depositFor(uint256 tokenId_, uint256 amount_, bool shouldBoosted_, bool withPermanentLock_) external;

    /**
     * @notice Increases the unlock time for an existing lock.
     * @param tokenId_ The ID of the veNFT to extend.
     * @param lockDuration_ The additional duration in seconds to add to the current unlock time.
     * @dev Reverts with `InvalidLockDuration` if the new unlock time is invalid.
     *      Reverts with `AccessDenied` if the caller is not the owner or approved.
     * Emits a {Deposit} event with the deposit type set to {INCREASE_UNLOCK_TIME}.
     */
    function increase_unlock_time(uint256 tokenId_, uint256 lockDuration_) external;

    /**
     * @notice Deposits tokens and extends the lock duration for a veNFT in one call.
     * @dev This may trigger veBoost if conditions are met.
     * @param tokenId_ The ID of the veNFT.
     * @param amount_ The amount of tokens to deposit.
     * @param lockDuration_ The duration in seconds to add to the current unlock time.
     * Emits one {Deposit} event for the deposit itself
     * and another {Deposit} event for the unlock time increase.
     */
    function depositWithIncreaseUnlockTime(uint256 tokenId_, uint256 amount_, uint256 lockDuration_) external;

    /**
     * @notice Deposits tokens directly into a veNFT that is attached to a managed NFT.
     * @dev This updates the locked balance on the managed NFT, adjusts total supply,
     *      and emits {DepositToAttachedNFT} and {Supply} events.
     * @param tokenId_ The ID of the attached veNFT.
     * @param amount_ The amount of tokens to deposit.
     * @custom:error NotManagedNft if the managed token ID is invalid or not recognized.
     */
    function depositToAttachedNFT(uint256 tokenId_, uint256 amount_) external;

    /**
     * @notice Withdraws tokens from an expired lock (non-permanent).
     * @param tokenId_ The ID of the veNFT to withdraw from.
     * @dev Reverts with `AccessDenied` if caller is not owner or approved.
     *      Reverts with `TokenNoExpired` if the lock is not yet expired.
     *      Reverts with `PermanentLocked` if the lock is permanent.
     * Emits a {Withdraw} event and a {Supply} event.
     */
    function withdraw(uint256 tokenId_) external;

    /**
     * @notice Merges one veNFT (tokenFromId_) into another (tokenToId_).
     * @param tokenFromId_ The ID of the source veNFT being merged.
     * @param tokenToId_ The ID of the target veNFT receiving the locked tokens.
     * @dev Reverts with `MergeTokenIdsTheSame` if both IDs are the same.
     *      Reverts with `AccessDenied` if the caller isn't owner or approved for both IDs.
     * Emits a {MergeInit} event at the start, and a {Merge} event upon completion.
     * Also emits a {Deposit} event reflecting the updated lock in the target token.
     */
    function merge(uint256 tokenFromId_, uint256 tokenToId_) external;

    /**
     * @notice Permanently locks a veNFT.
     * @param tokenId_ The ID of the veNFT to be permanently locked.
     * @dev Reverts with `AccessDenied` if caller isn't owner or approved.
     *      Reverts with `TokenAttached` if the token is attached to a managed NFT.
     *      Reverts with `PermanentLocked` if the token already permanent lcoked
     * Emits {LockPermanent} on success.
     */
    function lockPermanent(uint256 tokenId_) external;

    /**
     * @notice Unlocks a permanently locked veNFT, reverting it to a temporary lock.
     * @param tokenId_ The ID of the veNFT to unlock.
     * @dev Reverts with `AccessDenied` if caller isn't owner or approved.
     *      Reverts with `TokenAttached` if the token is attached.
     *      Reverts with `NotPermanentLocked` if the lock isn't actually permanent.
     * Emits {UnlockPermanent} on success.
     */
    function unlockPermanent(uint256 tokenId_) external;

    /**
     * @notice Creates a new managed NFT for a given recipient.
     * @param recipient_ The address that will receive the newly created managed NFT.
     * @return The ID of the newly created managed NFT.
     * @dev Reverts with `AccessDenied` if caller is not the managed NFT manager.
     */
    function createManagedNFT(address recipient_) external returns (uint256);

    /**
     * @notice Attaches a veNFT (user’s token) to a managed NFT, combining their locked balances.
     * @param tokenId_ The ID of the user’s veNFT being attached.
     * @param managedTokenId_ The ID of the managed NFT.
     * @return The amount of tokens locked during the attachment.
     * @dev Reverts with `AccessDenied` if caller is not the managed NFT manager.
     *      Reverts with `ZeroVotingPower` if the user’s token has zero voting power.
     *      Reverts with `NotManagedNft` if the target is not recognized as a managed NFT.
     */
    function onAttachToManagedNFT(uint256 tokenId_, uint256 managedTokenId_) external returns (uint256);

    /**
     * @notice Detaches a veNFT from a managed NFT.
     * @param tokenId_ The ID of the user’s veNFT being detached.
     * @param managedTokenId_ The ID of the managed NFT from which it’s being detached.
     * @param newBalance_ The new locked balance the veNFT will hold after detachment.
     * @dev Reverts with `AccessDenied` if caller is not the managed NFT manager.
     *      Reverts with `NotManagedNft` if the target is not recognized as a managed NFT.
     */
    function onDettachFromManagedNFT(uint256 tokenId_, uint256 managedTokenId_, uint256 newBalance_) external;

    /**
     * @notice Burns a veFNX NFT to reclaim the underlying FNX tokens for use in bribes.
     * @dev Must be called by `customBribeRewardRouter`.
     *      The token must not be permanently locked or attached.
     *      Also resets any votes before burning.
     * Emits a {BurnToBribes} event on successful burn.
     * @param tokenId_ The ID of the veFNX NFT to burn.
     */
    function burnToBribes(uint256 tokenId_) external;
}
