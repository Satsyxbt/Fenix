// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/**
 * @title IVotingEscrowV2
 * @notice Interface for Voting Escrow, allowing users to lock tokens in exchange for veNFTs that are used in governance and other systems.
 */
interface IVotingEscrowV2 {
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
     * @dev This includes information about the lock, voting status, attachment status, last transfer block, and point epoch.
     * @param locked The locked balance associated with the token.
     * @param isVoted Whether the token has been used to vote.
     * @param isAttached Whether the token is attached to a managed NFT.
     * @param lastTranferBlock The block number of the last transfer.
     * @param pointEpoch The epoch of the last point associated with the token.
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
     * @dev Contains the amount locked, the end time of the lock, and whether the lock is permanent.
     * @param amount The amount of tokens locked.
     * @param end The timestamp when the lock ends.
     * @param isPermanentLocked Whether the lock is permanent.
     */
    struct LockedBalance {
        int128 amount;
        uint256 end;
        bool isPermanentLocked;
    }

    /**
     * @notice Structure representing a point in time for calculating voting power.
     * @dev Used for calculating the slope and bias for lock balances over time.
     * @param bias The bias of the lock, representing the remaining voting power.
     * @param slope The rate at which the voting power decreases.
     * @param ts The timestamp of the point.
     * @param blk The block number of the point.
     * @param permanent The permanent amount associated with the lock.
     */
    struct Point {
        int128 bias;
        int128 slope; // # -dweight / dt
        uint256 ts;
        uint256 blk; // block
        int128 permanent;
    }

    /**
     * @notice Emitted when a boost is applied to a token's lock.
     * @param tokenId The ID of the token that received the boost.
     * @param value The value of the boost applied.
     */
    event Boost(uint256 indexed tokenId, uint256 value);

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

    /**
     * @notice Emitted when a withdrawal is made from a lock.
     * @param provider The address of the entity making the withdrawal.
     * @param tokenId The ID of the token associated with the withdrawal.
     * @param value The value of the withdrawal made.
     * @param ts The timestamp when the withdrawal was made.
     */
    event Withdraw(address indexed provider, uint256 tokenId, uint256 value, uint256 ts);

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
     * @notice Returns the address of the token used in voting escrow.
     * @return The address of the token.
     */
    function token() external view returns (address);

    /**
     * @notice Returns the address of the voter.
     * @return The address of the voter.
     */
    function voter() external view returns (address);

    /**
     * @notice Checks if the specified address is approved or the owner of the given token.
     * @param sender The address to check.
     * @param tokenId The ID of the token to check against.
     * @return True if the sender is approved or the owner of the token, false otherwise.
     */
    function isApprovedOrOwner(address sender, uint256 tokenId) external view returns (bool);

    /**
     * @notice Returns the total supply of voting power at the current block timestamp.
     * @return The total supply of voting power.
     */
    function votingPowerTotalSupply() external view returns (uint256);

    /**
     * @notice Returns the balance of an NFT at the current block timestamp.
     * @param tokenId_ The ID of the NFT to query.
     * @return The balance of the NFT.
     */
    function balanceOfNFT(uint256 tokenId_) external view returns (uint256);

    /**
     * @notice Returns the balance of an NFT at the current block timestamp, ignoring ownership changes.
     * @param tokenId_ The ID of the NFT to query.
     * @return The balance of the NFT.
     */
    function balanceOfNftIgnoreOwnershipChange(uint256 tokenId_) external view returns (uint256);

    /**
     * @notice Updates the address of a specified contract.
     * @param key_ The key representing the contract.
     * @param value_ The new address of the contract.
     * @dev Reverts with `InvalidAddressKey` if the key does not match any known contracts.
     * Emits an {UpdateAddress} event on successful address update.
     */
    function updateAddress(string memory key_, address value_) external;

    /**
     * @notice Hooks the voting state for a specified NFT.
     * @param tokenId_ The ID of the NFT.
     * @param state_ The voting state to set.
     * @dev Reverts with `AccessDenied` if the caller is not the voter.
     */
    function votingHook(uint256 tokenId_, bool state_) external;

    /**
     * @notice Creates a new lock for a specified amount and duration on behalf of an address.
     * @param amount_ The amount of tokens to lock.
     * @param lockDuration_ The duration of the lock in seconds.
     * @param to_ The address to receive the locked tokens.
     * @return The ID of the newly created lock.
     * @dev Reverts with `InvalidLockDuration` if the lock duration is invalid.
     * Emits a {Deposit} event on successful lock creation.
     */
    function create_lock_for(uint256 amount_, uint256 lockDuration_, address to_) external returns (uint256);

    /**
     * @notice Creates a new lock without boost for a specified amount and duration on behalf of an address.
     * @param amount_ The amount of tokens to lock.
     * @param lockDuration_ The duration of the lock in seconds.
     * @param to_ The address to receive the locked tokens.
     * @return The ID of the newly created lock.
     * @dev Reverts with `InvalidLockDuration` if the lock duration is invalid.
     * Emits a {Deposit} event on successful lock creation.
     */
    function create_lock_for_without_boost(uint256 amount_, uint256 lockDuration_, address to_) external returns (uint256);

    /**
     * @notice Deposits tokens into an existing lock on behalf of a specified NFT.
     * @param tokenId_ The ID of the NFT to deposit tokens for.
     * @param amount_ The amount of tokens to deposit.
     * @dev Reverts with `AccessDenied` if the caller is not approved or the owner of the NFT.
     * Emits a {Deposit} event on successful deposit.
     */
    function deposit_for(uint256 tokenId_, uint256 amount_) external;

    /**
     * @notice Deposits tokens without boost into an existing lock on behalf of a specified NFT.
     * @param tokenId_ The ID of the NFT to deposit tokens for.
     * @param amount_ The amount of tokens to deposit.
     * @dev Reverts with `AccessDenied` if the caller is not approved or the owner of the NFT.
     * Emits a {Deposit} event on successful deposit.
     */
    function deposit_for_without_boost(uint256 tokenId_, uint256 amount_) external;

    /**
     * @notice Increases the unlock time for a specified NFT.
     * @param tokenId_ The ID of the NFT to increase unlock time for.
     * @param lockDuration_ The additional duration to add to the unlock time.
     * @dev Reverts with `InvalidLockDuration` if the new unlock time is invalid.
     * Reverts with `AccessDenied` if the caller is not approved or the owner of the NFT.
     * Emits a {Deposit} event on successful unlock time increase.
     */
    function increase_unlock_time(uint256 tokenId_, uint256 lockDuration_) external;

    /**
     * @notice Withdraws tokens from a specified NFT lock.
     * @param tokenId_ The ID of the NFT to withdraw tokens from.
     * @dev Reverts with `AccessDenied` if the caller is not approved or the owner of the NFT.
     * Emits a {Supply} event reflecting the change in total supply.
     */
    function withdraw(uint256 tokenId_) external;

    /**
     * @notice Merges two NFTs into one.
     * @param tokenFromId_ The ID of the NFT to merge from.
     * @param tokenToId_ The ID of the NFT to merge into.
     * @dev Reverts with `MergeTokenIdsTheSame` if the token IDs are the same.
     * Reverts with `AccessDenied` if the caller is not approved or the owner of both NFTs.
     * Emits a {Deposit} event reflecting the merge.
     */
    function merge(uint256 tokenFromId_, uint256 tokenToId_) external;

    /**
     * @notice Permanently locks a specified NFT.
     * @param tokenId_ The ID of the NFT to lock permanently.
     * @dev Reverts with `AccessDenied` if the caller is not approved or the owner of the NFT.
     * Emits a {LockPermanent} event on successful permanent lock.
     */
    function lockPermanent(uint256 tokenId_) external;

    /**
     * @notice Unlocks a permanently locked NFT.
     * @param tokenId_ The ID of the NFT to unlock.
     * @dev Reverts with `AccessDenied` if the caller is not approved or the owner of the NFT.
     * Emits an {UnlockPermanent} event on successful unlock.
     */
    function unlockPermanent(uint256 tokenId_) external;

    /**
     * @notice Creates a new managed NFT for a given recipient.
     * @param recipient_ The address of the recipient to receive the newly created managed NFT.
     * @return The ID of the newly created managed NFT.
     * @dev Reverts with `AccessDenied` if the caller is not the managed NFT manager.
     * Emits a {Deposit} event on successful creation.
     */
    function createManagedNFT(address recipient_) external returns (uint256);

    /**
     * @notice Attaches a token to a managed NFT.
     * @param tokenId_ The ID of the user's token being attached.
     * @param managedTokenId_ The ID of the managed token to which the user's token is being attached.
     * @return The amount of tokens locked during the attach operation.
     * @dev Reverts with `AccessDenied` if the caller is not the managed NFT manager.
     * Reverts with `ZeroVotingPower` if the NFT has no voting power.
     * Reverts with `NotManagedNft` if the target is not a managed NFT.
     * Emits a {Deposit} event reflecting the attachment.
     */
    function onAttachToManagedNFT(uint256 tokenId_, uint256 managedTokenId_) external returns (uint256);

    /**
     * @notice Detaches a token from a managed NFT.
     * @param tokenId_ The ID of the user's token being detached.
     * @param managedTokenId_ The ID of the managed token from which the user's token is being detached.
     * @param newBalance_ The new balance to set for the user's token post detachment.
     * @dev Reverts with `AccessDenied` if the caller is not the managed NFT manager.
     * Reverts with `NotManagedNft` if the target is not a managed NFT.
     * Emits a {Deposit} event reflecting the detachment.
     */
    function onDettachFromManagedNFT(uint256 tokenId_, uint256 managedTokenId_, uint256 newBalance_) external;
}
