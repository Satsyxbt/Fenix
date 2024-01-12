// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

interface IVoterUpgradeable {
    struct GaugeState {
        uint256 lastDistributiontime;
        uint256 supplyIndex;
        uint256 claimable;
        address internalBribe;
        address externalBribe;
        address pool;
        bool isGauge;
        bool isAlive;
    }
    struct GaugeType {
        address gaugeFactory;
        address pairFactory;
    }
    event GaugeCreated(
        address indexed gauge,
        address creator,
        address internal_bribe,
        address indexed external_bribe,
        address indexed pool
    );

    event GaugeKilled(address indexed gauge);
    event GaugeRevived(address indexed gauge);
    event Voted(address indexed voter, uint256 tokenId, uint256 weight);
    event Abstained(uint256 tokenId, uint256 weight);
    event NotifyReward(address indexed sender, address indexed reward, uint256 amount);
    event DistributeReward(address indexed sender, address indexed gauge, uint256 amount);
    event Whitelisted(address indexed whitelister, address indexed token);
    event Blacklisted(address indexed blacklister, address indexed token);

    event SetEmissionManager(address indexed old, address indexed latest);
    event SetBribeFactory(address indexed old, address indexed latest);
    event SetPairFactory(address indexed old, address indexed latest);
    event SetPermissionRegistry(address indexed old, address indexed latest);
    event SetGaugeFactory(address indexed old, address indexed latest);
    event SetBribeFor(bool isInternal, address indexed old, address indexed latest, address indexed gauge);
    event SetVoteDelay(uint256 old, uint256 latest);
    event AddFactories(address indexed pairfactory, address indexed gaugefactory);

    error NotGauge();
    error NotContract();
    error ZeroAdress();
    error PairFactoryExist();
    error GaugeFactoryExist();
    error TokenNotInWhitelist();
    error TokenInWhitelist();
    error NotTokenOwnerOrApproved();
    error MaxVoteDelayLimit();
    error GaugeArleadyKilled();
    error MismatchArrayLen();
    error AccessDenied();
    error GaugeTypeExist();
    error GaugeTypeNotExist();

    function initialize(
        address votingEscrow_,
        address bribeFactory_,
        address permissionsRegistry_,
        address emissionManager_,
        address[] calldata _tokens_,
        GaugeType calldata gaugeType_
    ) external;

    function setEmissionManager(address emissionManager_) external;

    function setBribeFactory(address bribeFactory_) external;

    function setPermissionsRegistry(address permissionRegistry_) external;

    function setNewBribes(address gauge_, address _internal, address _external) external;

    function setInternalBribeFor(address gauge_, address _internal) external;

    function setExternalBribeFor(address gauge_, address _external) external;

    function addFactory(GaugeType calldata gaugeType_) external;

    function replaceFactory(GaugeType calldata gaugeType_, uint256 pos_) external;

    function removeFactory(uint256 pos_) external;

    function whitelist(address[] calldata tokens_) external;

    function blacklist(address[] calldata tokens_) external;

    function killGauge(address gauge_) external;

    function reviveGauge(address gauge_) external;

    function reset(uint256 tokenId_) external;

    function poke(uint256 tokenId_) external;

    /// @notice Vote for pools
    /// @param  tokenId_    veNFT tokenID used to vote
    /// @param  poolVote_   array of LPs addresses to vote  (eg.: [sAMM usdc-usdt   , sAMM busd-usdt, vAMM wbnb-the ,...])
    /// @param  weights_    array of weights for each LPs   (eg.: [10               , 90            , 45             ,...])
    function vote(uint256 tokenId_, address[] calldata poolVote_, uint256[] calldata weights_) external;

    /// @notice claim LP gauge rewards
    function claimRewards(address[] calldata gauge_s) external;

    /// @notice claim bribes rewards given a TokenID
    function claimBribes(address[] calldata bribes_, address[][] calldata tokens_, uint256 tokenId_) external;

    function claimFees(address[] calldata fees_, address[][] calldata tokens_, uint256 tokenId_) external;

    /// @notice claim bribes rewards given an address
    function claimBribes(address[] calldata _bribes, address[][] calldata _tokens) external;

    /// @notice claim fees rewards given an address
    function claimFees(address[] calldata _bribes, address[][] calldata _tokens) external;

    function createGauges(
        address[] calldata pool_,
        uint256[] calldata gaugesType_
    ) external returns (address[] memory, address[] memory, address[] memory);

    /// @notice create a gauge
    function createGauge(
        address _pool,
        uint256 gauge_Type
    ) external returns (address gauge_, address _internal_bribe, address _external_bribe);

    /// @notice notify reward amount for gauge
    /// @dev    the function is called by the minter each epoch. Anyway anyone can top up some extra rewards.
    /// @param  amount  amount to distribute
    function notifyRewardAmount(uint256 amount) external;

    function distribute(uint256 start, uint256 finish) external;

    function distribute(address[] calldata gauges_) external;

    function gaugeByPair(address gauge_) external view returns (bool);

    function internalBribe(address gauge_) external view returns (address);

    function externalBribe(address gauge_) external view returns (address);

    /// @notice view the total length of the pools
    function length() external view returns (uint256);

    function weights(address _pool) external view returns (uint256);

    function weightsAt(address _pool, uint256 _time) external view returns (uint256);

    function totalWeight() external view returns (uint256);

    function totalWeightAt(uint256 _time) external view returns (uint256);

    function setVoteDelay(uint256 delay_) external;

    function votingEscrow() external view returns (address);

    function emissionManager() external view returns (address);

    function permissionRegistry() external view returns (address);

    function emissionToken() external view returns (address);

    function bribeFactory() external view returns (address);

    function isGauge(address _gauge) external view returns (bool);

    function poolForGauge(address _gauge) external view returns (address);

    function isWhitelisted(address token) external view returns (bool);

    function distributeAll() external;

    function distributeFees(address[] memory _gauges) external;

    function lastVoted(uint256 id) external view returns (uint256);

    function poolVote(uint256 id, uint256 _index) external view returns (address _pair);

    function votes(uint256 id, address _pool) external view returns (uint256 votes);

    function poolVoteLength(uint256 tokenId) external view returns (uint256);
}
