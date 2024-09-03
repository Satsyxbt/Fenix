// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IVoterV2 {
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
     * @param amount The amount to claim.
     * @param proofs The array of Merkle proofs.
     */
    struct AggregateClaimVeFnxMerklAirdrop {
        uint256 amount;
        bytes32[] proofs;
    }

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
     * @notice Emitted when a gauge is created.
     * @param gauge The address of the created gauge.
     * @param creator The address of the creator.
     * @param internalBribe The address of the created internal bribe.
     * @param externalBribe The address of the created external bribe.
     * @param pool The address of the associated pool.
     */
    event GaugeCreated(address indexed gauge, address creator, address internalBribe, address indexed externalBribe, address indexed pool);

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
     * @notice Sets the delay period before a vote can be cast again.
     * @param newVoteDelay_ The new delay period in seconds.
     */
    function setVoteDelay(uint256 newVoteDelay_) external;

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
}
