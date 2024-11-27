// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IVoter {
    /**
     * @notice Represents the state of a gauge.
     * @param isGauge Indicates if the address is a gauge.
     * @param isAlive Indicates if the gauge is active.
     * @param internalBribe The address of the internal bribe contract.
     * @param externalBribe The address of the external bribe contract.
     * @param pool The address of the associated pool.
     * @param claimable The amount of rewards claimable by the gauge.
     * @param index The current index used for reward distribution calculations.
     * @param lastDistributionTimestamp The last time rewards were distributed.
     */
    struct GaugeState {
        bool isGauge;
        bool isAlive;
        address internalBribe;
        address externalBribe;
        address pool;
        uint256 claimable;
        uint256 index;
        uint256 lastDistributionTimestamp;
    }
    /**
     * @notice Parameters for claiming bribes using a specific tokenId.
     * @param tokenId The token ID to claim bribes for.
     * @param bribes The array of bribe contract addresses.
     * @param tokens The array of arrays containing token addresses for each bribe.
     */
    struct AggregateClaimBribesByTokenIdParams {
        uint256 tokenId;
        address[] bribes;
        address[][] tokens;
    }

    /**
     * @notice Parameters for claiming bribes.
     * @param bribes The array of bribe contract addresses.
     * @param tokens The array of arrays containing token addresses for each bribe.
     */
    struct AggregateClaimBribesParams {
        address[] bribes;
        address[][] tokens;
    }

    /**
     * @notice Parameters for claiming Merkl data.
     * @param users The array of user addresses to claim for.
     * @param tokens The array of token addresses.
     * @param amounts The array of amounts to claim.
     * @param proofs The array of arrays containing Merkle proofs.
     */
    struct AggregateClaimMerklDataParams {
        address[] users;
        address[] tokens;
        uint256[] amounts;
        bytes32[][] proofs;
    }

    /**
     * @notice Parameters for claiming VeFnx Merkl airdrop data.
     * @param inPureTokens_ Boolean indicating if the claim is in pure tokens.
     * @param amount The amount to claim.
     * @param withPermanentLock_ Whether the lock should be permanent.
     * @param managedTokenIdForAttach_ The ID of the managed NFT to attach, if any. 0 for ignore
     * @param proofs The array of Merkle proofs.
     */
    struct AggregateClaimVeFnxMerklAirdrop {
        bool inPureTokens;
        uint256 amount;
        bool withPermanentLock;
        uint256 managedTokenIdForAttach;
        bytes32[] proofs;
    }

    /**
     * @notice Emitted when a gauge is created.
     * @param gauge The address of the created gauge.
     * @param creator The address of the creator.
     * @param internalBribe The address of the created internal bribe.
     * @param externalBribe The address of the created external bribe.
     * @param pool The address of the associated pool.
     */
    event GaugeCreated(address indexed gauge, address creator, address internalBribe, address indexed externalBribe, address indexed pool);

    /**
     * @notice Emitted when a gauge is created.
     * @param gauge The address of the created gauge.
     * @param gaugeType Type identifier of the created gauge.
     */
    event GaugeCreatedType(address indexed gauge, uint256 indexed gaugeType);

    /**
     * @notice Emitted when a gauge is killed.
     * @param gauge The address of the killed gauge.
     */
    event GaugeKilled(address indexed gauge);

    /**
     * @notice Emitted when a gauge is revived.
     * @param gauge The address of the revived gauge.
     */
    event GaugeRevived(address indexed gauge);

    /**
     * @notice Emitted when a vote is cast.
     * @param voter The address of the voter.
     * @param tokenId The ID of the token used for voting.
     * @param weight The weight of the vote.
     */
    event Voted(address indexed voter, uint256 tokenId, uint256 weight);

    /**
     * @notice Emitted when a vote is reset.
     * @param tokenId The ID of the token that had its vote reset.
     * @param weight The weight of the vote that was reset.
     */
    event Abstained(uint256 tokenId, uint256 weight);

    /**
     * @notice Emitted when rewards are notified for distribution.
     * @param sender The address of the sender.
     * @param reward The address of the reward token.
     * @param amount The amount of rewards to distribute.
     */
    event NotifyReward(address indexed sender, address indexed reward, uint256 amount);

    /**
     * @notice Emitted when rewards are distributed to a gauge.
     * @param sender The address of the sender.
     * @param gauge The address of the gauge receiving the rewards.
     * @param amount The amount of rewards distributed.
     */
    event DistributeReward(address indexed sender, address indexed gauge, uint256 amount);

    /**
     * @notice Emitted when the vote delay is updated.
     * @param old The previous vote delay.
     * @param latest The new vote delay.
     */
    event SetVoteDelay(uint256 old, uint256 latest);

    /**
     * @notice Emitted when a contract address is updated.
     * @param key The key representing the contract.
     * @param value The new address of the contract.
     */
    event UpdateAddress(string key, address indexed value);

    /// @notice Event emitted when voting is paused or unpaused.
    /// @dev Emits the current paused state of voting.
    /// @param paused Indicates whether voting is paused (true) or unpaused (false).
    event VotingPaused(bool indexed paused);

    /**
     * @notice Emitted when the distribution window duration is set or updated.
     * @param duration New duration of the distribution window in seconds.
     */
    event SetDistributionWindowDuration(uint256 indexed duration);

    /**
     * @notice Emitted when a token is attached to a managed NFT.
     * @param tokenId ID of the user's token that is being attached.
     * @param managedTokenId ID of the managed token to which the user's token is attached.
     */
    event AttachToManagedNFT(uint256 indexed tokenId, uint256 indexed managedTokenId);

    /**
     * @notice Emitted when a token is detached from a managed NFT.
     * @param tokenId ID of the user's token that is being detached.
     */
    event DettachFromManagedNFT(uint256 indexed tokenId);

    /**
     * @notice Updates the address of a specified contract.
     * @param key_ The key representing the contract.
     * @param value_ The new address of the contract.
     */
    function updateAddress(string memory key_, address value_) external;

    /**
     * @notice Sets the duration of the distribution window for voting.
     * @param distributionWindowDuration_ The duration in seconds.
     */
    function setDistributionWindowDuration(uint256 distributionWindowDuration_) external;

    /**
     * @notice Disables a gauge, preventing further rewards distribution.
     * @param gauge_ The address of the gauge to be disabled.
     */
    function killGauge(address gauge_) external;

    /**
     * @notice Revives a previously disabled gauge, allowing it to distribute rewards again.
     * @param gauge_ The address of the gauge to be revived.
     */
    function reviveGauge(address gauge_) external;

    /**
     * @notice Creates a new V2 gauge for a specified pool.
     * @param pool_ The address of the pool for which to create a gauge.
     * @return gauge The address of the created gauge.
     * @return internalBribe The address of the created internal bribe.
     * @return externalBribe The address of the created external bribe.
     */
    function createV2Gauge(address pool_) external returns (address gauge, address internalBribe, address externalBribe);

    /**
     * @notice Creates a new V3 gauge for a specified pool.
     * @param pool_ The address of the pool for which to create a gauge.
     * @return gauge The address of the created gauge.
     * @return internalBribe The address of the created internal bribe.
     * @return externalBribe The address of the created external bribe.
     */
    function createV3Gauge(address pool_) external returns (address gauge, address internalBribe, address externalBribe);

    /**
     * @notice Creates a custom gauge with specified parameters.
     * @param gauge_ The address of the custom gauge.
     * @param pool_ The address of the pool for which to create a gauge.
     * @param tokenA_ The address of token A in the pool.
     * @param tokenB_ The address of token B in the pool.
     * @param externalBribesName_ The name of the external bribe.
     * @param internalBribesName_ The name of the internal bribe.
     * @return gauge The address of the created gauge.
     * @return internalBribe The address of the created internal bribe.
     * @return externalBribe The address of the created external bribe.
     */
    function createCustomGauge(
        address gauge_,
        address pool_,
        address tokenA_,
        address tokenB_,
        string memory externalBribesName_,
        string memory internalBribesName_
    ) external returns (address gauge, address internalBribe, address externalBribe);

    /**
     * @notice Notifies the contract of a reward amount to be distributed.
     * @param amount_ The amount of rewards to distribute.
     */
    function notifyRewardAmount(uint256 amount_) external;

    /**
     * @notice Distributes fees to a list of gauges.
     * @param gauges_ An array of gauge addresses to distribute fees to.
     */
    function distributeFees(address[] calldata gauges_) external;

    /**
     * @notice Distributes rewards to all pools managed by the contract.
     */
    function distributeAll() external;

    /**
     * @notice Distributes rewards to a specified range of pools.
     * @param start_ The starting index of the pool array.
     * @param finish_ The ending index of the pool array.
     */
    function distribute(uint256 start_, uint256 finish_) external;

    /**
     * @notice Distributes rewards to a specified list of gauges.
     * @param gauges_ An array of gauge addresses to distribute rewards to.
     */
    function distribute(address[] calldata gauges_) external;

    /**
     * @notice Resets the votes for a given NFT token ID.
     * @param tokenId_ The token ID for which to reset votes.
     */
    function reset(uint256 tokenId_) external;

    /**
     * @notice Updates the voting preferences for a given token ID.
     * @param tokenId_ The token ID for which to update voting preferences.
     */
    function poke(uint256 tokenId_) external;

    /**
     * @notice Casts votes for a given NFT token ID.
     * @param tokenId_ The token ID for which to cast votes.
     * @param poolsVotes_ An array of pool addresses to vote for.
     * @param weights_ An array of weights corresponding to the pools.
     */
    function vote(uint256 tokenId_, address[] calldata poolsVotes_, uint256[] calldata weights_) external;

    /**
     * @notice Claims rewards from multiple gauges.
     * @param _gauges An array of gauge addresses to claim rewards from.
     */
    function claimRewards(address[] memory _gauges) external;

    /**
     * @notice Claims bribes for a given NFT token ID from multiple bribe contracts.
     * @param _bribes An array of bribe contract addresses to claim bribes from.
     * @param _tokens An array of token arrays, specifying the tokens to claim.
     * @param tokenId_ The token ID for which to claim bribes.
     */
    function claimBribes(address[] memory _bribes, address[][] memory _tokens, uint256 tokenId_) external;

    /**
     * @notice Claims bribes from multiple bribe contracts.
     * @param _bribes An array of bribe contract addresses to claim bribes from.
     * @param _tokens An array of token arrays, specifying the tokens to claim.
     */
    function claimBribes(address[] memory _bribes, address[][] memory _tokens) external;

    /**
     * @notice Handles the deposit of voting power to a managed NFT.
     * @dev This function is called after tokens are deposited into the Voting Escrow contract for a managed NFT.
     *      Only callable by the Voting Escrow contract.
     * @param tokenId_ The ID of the token that has received the deposit.
     * @param managedTokenId_ The ID of the managed token receiving the voting power.
     * @custom:error AccessDenied Thrown if the caller is not the Voting Escrow contract.
     */
    function onDepositToManagedNFT(uint256 tokenId_, uint256 managedTokenId_) external;

    /**
     * @notice Attaches a tokenId to a managed tokenId.
     * @param tokenId_ The user's tokenId to be attached.
     * @param managedTokenId_ The managed tokenId to attach to.
     */
    function attachToManagedNFT(uint256 tokenId_, uint256 managedTokenId_) external;

    /**
     * @notice Detaches a tokenId from its managed tokenId.
     * @param tokenId_ The user's tokenId to be detached.
     */
    function dettachFromManagedNFT(uint256 tokenId_) external;

    /**
     * @notice Checks if the provided address is a registered gauge.
     * @param gauge_ The address of the gauge to check.
     * @return True if the address is a registered gauge, false otherwise.
     */
    function isGauge(address gauge_) external view returns (bool);

    /**
     * @notice Returns the state of a specific gauge.
     * @param gauge_ The address of the gauge.
     * @return GaugeState The current state of the specified gauge.
     */
    function getGaugeState(address gauge_) external view returns (GaugeState memory);

    /**
     * @notice Checks if the specified gauge is alive (i.e., enabled for reward distribution).
     * @param gauge_ The address of the gauge to check.
     * @return True if the gauge is alive, false otherwise.
     */
    function isAlive(address gauge_) external view returns (bool);

    /**
     * @notice Returns the pool address associated with a specified gauge.
     * @param gauge_ The address of the gauge to query.
     * @return The address of the pool associated with the specified gauge.
     */
    function poolForGauge(address gauge_) external view returns (address);

    /**
     * @notice Returns the gauge address associated with a specified pool.
     * @param pool_ The address of the pool to query.
     * @return The address of the gauge associated with the specified pool.
     */
    function poolToGauge(address pool_) external view returns (address);

    /**
     * @notice Returns the address of the Voting Escrow contract.
     * @return The address of the Voting Escrow contract.
     */
    function votingEscrow() external view returns (address);

    /**
     * @notice Returns the address of the Minter contract.
     * @return The address of the Minter contract.
     */
    function minter() external view returns (address);

    /**
     * @notice Returns the address of the V2 Pool Factory contract.
     * @return The address of the V2 Pool Factory contract.
     */
    function v2PoolFactory() external view returns (address);

    /**
     * @notice Returns the address of the V3 Pool Factory contract.
     * @return The address of the V3 Pool Factory contract.
     */
    function v3PoolFactory() external view returns (address);

    /**
     * @notice Returns the V2 pool address at a specific index.
     * @param index The index of the V2 pool.
     * @return The address of the V2 pool at the specified index.
     */
    function v2Pools(uint256 index) external view returns (address);

    /**
     * @notice Returns the V3 pool address at a specific index.
     * @param index The index of the V3 pool.
     * @return The address of the V3 pool at the specified index.
     */
    function v3Pools(uint256 index) external view returns (address);

    /**
     * @notice Returns the total number of pools, V2 pools, and V3 pools managed by the contract.
     * @return totalCount The total number of pools.
     * @return v2PoolsCount The total number of V2 pools.
     * @return v3PoolsCount The total number of V3 pools.
     */
    function poolsCounts() external view returns (uint256 totalCount, uint256 v2PoolsCount, uint256 v3PoolsCount);

    /**
     * @notice Returns the current epoch timestamp used for reward calculations.
     * @return The current epoch timestamp.
     */
    function epochTimestamp() external view returns (uint256);

    /**
     * @notice Returns the weight for a specific pool in a given epoch.
     * @param timestamp The timestamp of the epoch.
     * @param pool The address of the pool.
     * @return The weight of the pool in the specified epoch.
     */
    function weightsPerEpoch(uint256 timestamp, address pool) external view returns (uint256);

    /**
     * @notice Returns the vote weight of a specific NFT token ID for a given pool.
     * @param tokenId The ID of the NFT.
     * @param pool The address of the pool.
     * @return The vote weight of the token for the specified pool.
     */
    function votes(uint256 tokenId, address pool) external view returns (uint256);

    /**
     * @notice Returns the number of pools that an NFT token ID has voted for.
     * @param tokenId The ID of the NFT.
     * @return The number of pools the token has voted for.
     */
    function poolVoteLength(uint256 tokenId) external view returns (uint256);

    /**
     * @notice Returns the pool address at a specific index for which the NFT token ID has voted.
     * @param tokenId The ID of the NFT.
     * @param index The index of the pool.
     * @return The address of the pool at the specified index.
     */
    function poolVote(uint256 tokenId, uint256 index) external view returns (address);

    /**
     * @notice Returns the last timestamp when an NFT token ID voted.
     * @param tokenId The ID of the NFT.
     * @return The timestamp of the last vote.
     */
    function lastVotedTimestamps(uint256 tokenId) external view returns (uint256);
}
