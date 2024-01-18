// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {IERC20Upgradeable, SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import {IPair} from "./interfaces/external/IPair.sol";
import {IPairFactory} from "./interfaces/external/IPairFactory.sol";

import {IGaugeFactoryUpgradeable} from "./interfaces/factories/IGaugeFactoryUpgradeable.sol";
import {IBribeFactoryUpgradeable} from "./interfaces/factories/IBribeFactoryUpgradeable.sol";
import {IBribeUpgradeable} from "./interfaces/IBribeUpgradeable.sol";
import {IBaseGaugeUpgradeable} from "./interfaces/gauges/IBaseGaugeUpgradeable.sol";

import {IEmissionManagerUpgradeable} from "./interfaces/IEmissionManagerUpgradeable.sol";
import {IVotingEscrowUpgradeable} from "./interfaces/IVotingEscrowUpgradeable.sol";
import {IPermissionsRegistry} from "./interfaces/IPermissionsRegistry.sol";
import {IVoterUpgradeable} from "./interfaces/IVoterUpgradeable.sol";

import {IVault} from "./interfaces/external/IVault.sol";
import {IUniV3Factory} from "./interfaces/external/IUniV3Factory.sol";

contract VoterUpgradeable is IVoterUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    uint256 public constant MAX_VOTE_DELAY = 7 days;

    address public override votingEscrow;
    address public override emissionManager;
    address public override bribeFactory;
    address public override permissionRegistry;
    address public override emissionToken;

    mapping(address => GaugeState) public gaugesState;
    mapping(uint256 => uint256) public override totalWeightsPerEpoch; // epoch timestamp => total weights
    mapping(address => address) public override gaugeByPool; // pool     => gauge
    mapping(address => bool) public override isWhitelisted; // token    => boolean [is an allowed token?]
    mapping(address => bool) public override factoryForGaugeTypeIsAdded;

    uint256 public voteDelay; // delay between votes in seconds
    mapping(uint256 => uint256) public lastVoted; // nft      => timestamp of last vote

    uint256 public index; // gauge index
    mapping(uint256 => mapping(address => uint256)) public votes; // nft      => pool     => votes
    mapping(uint256 => mapping(address => uint256)) public override weightsPerEpoch; // timestamp => pool => weights
    mapping(uint256 => address[]) public poolVote; // nft      => pools

    address[] public pools;
    GaugeType[] public gaugeTypes;

    modifier onlyVoterAdmin() {
        if (!IPermissionsRegistry(permissionRegistry).hasRole("VOTER_ADMIN", msg.sender)) {
            revert AccessDenied();
        }
        _;
    }

    modifier onlyEmissionManager() {
        if (msg.sender != emissionManager) {
            revert AccessDenied();
        }
        _;
    }

    modifier onlyGovernance() {
        if (!IPermissionsRegistry(permissionRegistry).hasRole("GOVERNANCE", msg.sender)) {
            revert AccessDenied();
        }
        _;
    }

    modifier onlyContract(address addr_) {
        if (addr_.code.length == 0) {
            revert NotContract();
        }
        _;
    }
    modifier onlyRealGauge(address addr_) {
        if (!gaugesState[addr_].isGauge) {
            revert NotGauge();
        }
        _;
    }
    modifier notZero(address addr_) {
        if (addr_ == address(0)) {
            revert ZeroAdress();
        }
        _;
    }

    modifier onlyTokenApprovedOrOwner(uint256 tokenId_) {
        if (!IVotingEscrowUpgradeable(votingEscrow).isApprovedOrOwner(msg.sender, tokenId_)) {
            revert NotTokenOwnerOrApproved();
        }
        _;
    }

    modifier onlyVoteDelay(uint256 tokenId_) {
        require(block.timestamp > lastVoted[tokenId_] + voteDelay, "ERR: VOTE_DELAY");
        _;
    }

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address votingEscrow_,
        address bribeFactory_,
        address permissionsRegistry_,
        address emissionManager_,
        address[] calldata tokens_,
        GaugeType calldata gaugeType_
    ) external virtual override initializer {
        __ReentrancyGuard_init();

        votingEscrow = votingEscrow_;
        emissionToken = IVotingEscrowUpgradeable(votingEscrow_).token();

        gaugeTypes.push(GaugeType({pairFactory: gaugeType_.pairFactory, gaugeFactory: gaugeType_.gaugeFactory}));

        factoryForGaugeTypeIsAdded[gaugeType_.pairFactory] = true;
        factoryForGaugeTypeIsAdded[gaugeType_.gaugeFactory] = true;

        bribeFactory = bribeFactory_;

        emissionManager = emissionManager_;
        permissionRegistry = permissionsRegistry_;

        voteDelay = 0;

        for (uint256 i; i < tokens_.length; ) {
            _whitelist(tokens_[i]);
            unchecked {
                i++;
            }
        }
    }

    function setVoteDelay(uint256 delay_) external virtual override onlyVoterAdmin {
        if (delay_ > MAX_VOTE_DELAY) {
            revert MaxVoteDelayLimit();
        }
        emit SetVoteDelay(voteDelay, delay_);
        voteDelay = delay_;
    }

    function setEmissionManager(
        address emissionManager_
    ) external virtual override onlyVoterAdmin notZero(emissionManager_) onlyContract(emissionManager_) {
        emit SetEmissionManager(emissionManager, emissionManager_);
        emissionManager = emissionManager_;
    }

    function setBribeFactory(
        address bribeFactory_
    ) external virtual override onlyVoterAdmin notZero(bribeFactory_) onlyContract(bribeFactory_) {
        emit SetBribeFactory(bribeFactory, bribeFactory_);
        bribeFactory = bribeFactory_;
    }

    function setPermissionsRegistry(
        address permissionRegistry_
    ) external virtual override onlyVoterAdmin notZero(permissionRegistry_) onlyContract(permissionRegistry_) {
        emit SetPermissionRegistry(permissionRegistry, permissionRegistry_);
        permissionRegistry = permissionRegistry_;
    }

    function setNewBribes(
        address gauge_,
        address internalBribe_,
        address externalBribe_
    ) external virtual override onlyVoterAdmin onlyRealGauge(gauge_) {
        _setInternalBribe(gauge_, internalBribe_);
        _setExternalBribe(gauge_, externalBribe_);
    }

    function setInternalBribeFor(address gauge_, address internalBribe_) external virtual override onlyVoterAdmin onlyRealGauge(gauge_) {
        _setInternalBribe(gauge_, internalBribe_);
    }

    function setExternalBribeFor(address gauge_, address externalBribe_) external virtual override onlyVoterAdmin onlyRealGauge(gauge_) {
        _setExternalBribe(gauge_, externalBribe_);
    }

    function addFactory(
        GaugeType calldata gaugeType_
    )
        external
        virtual
        override
        onlyVoterAdmin
        notZero(gaugeType_.pairFactory)
        notZero(gaugeType_.gaugeFactory)
        onlyContract(gaugeType_.pairFactory)
        onlyContract(gaugeType_.gaugeFactory)
    {
        if (factoryForGaugeTypeIsAdded[gaugeType_.pairFactory]) {
            revert PairFactoryExist();
        }
        if (factoryForGaugeTypeIsAdded[gaugeType_.gaugeFactory]) {
            revert GaugeFactoryExist();
        }

        gaugeTypes.push(gaugeType_);

        factoryForGaugeTypeIsAdded[gaugeType_.pairFactory] = true;
        factoryForGaugeTypeIsAdded[gaugeType_.gaugeFactory] = true;

        emit AddFactories(gaugeType_.pairFactory, gaugeType_.gaugeFactory);
    }

    function replaceFactory(
        GaugeType calldata gaugeType_,
        uint256 pos_
    )
        external
        virtual
        override
        onlyVoterAdmin
        notZero(gaugeType_.pairFactory)
        notZero(gaugeType_.gaugeFactory)
        onlyContract(gaugeType_.pairFactory)
        onlyContract(gaugeType_.gaugeFactory)
    {
        if (factoryForGaugeTypeIsAdded[gaugeType_.pairFactory]) {
            revert PairFactoryExist();
        }
        if (factoryForGaugeTypeIsAdded[gaugeType_.gaugeFactory]) {
            revert GaugeFactoryExist();
        }

        GaugeType memory oldGaugeType = gaugeTypes[pos_];
        delete factoryForGaugeTypeIsAdded[oldGaugeType.pairFactory];
        delete factoryForGaugeTypeIsAdded[oldGaugeType.gaugeFactory];

        gaugeTypes[pos_] = gaugeType_;

        factoryForGaugeTypeIsAdded[gaugeType_.pairFactory] = true;
        factoryForGaugeTypeIsAdded[gaugeType_.gaugeFactory] = true;

        emit SetGaugeFactory(oldGaugeType.gaugeFactory, gaugeType_.gaugeFactory);
        emit SetPairFactory(oldGaugeType.pairFactory, gaugeType_.pairFactory);
    }

    function removeFactory(uint256 pos_) external virtual override onlyVoterAdmin {
        GaugeType memory gaugeType = gaugeTypes[pos_];

        if (!factoryForGaugeTypeIsAdded[gaugeType.pairFactory]) {
            revert PairFactoryNotExist();
        }
        if (!factoryForGaugeTypeIsAdded[gaugeType.gaugeFactory]) {
            revert GaugeFactoryNotExist();
        }

        uint256 size = gaugeTypes.length;
        if (size > 1) {
            gaugeTypes[pos_] = gaugeTypes[size - 1];
        }

        gaugeTypes.pop();

        delete factoryForGaugeTypeIsAdded[gaugeType.pairFactory];
        delete factoryForGaugeTypeIsAdded[gaugeType.gaugeFactory];

        emit SetGaugeFactory(gaugeType.gaugeFactory, address(0));
        emit SetPairFactory(gaugeType.pairFactory, address(0));
    }

    function whitelist(address[] calldata tokens_) external virtual override onlyGovernance {
        for (uint256 i; i < tokens_.length; ) {
            _whitelist(tokens_[i]);
            unchecked {
                i++;
            }
        }
    }

    function blacklist(address[] calldata tokens_) external virtual override onlyGovernance {
        for (uint256 i; i < tokens_.length; ) {
            _blacklist(tokens_[i]);
            unchecked {
                i++;
            }
        }
    }

    function killGauge(address gauge_) external virtual override onlyGovernance {
        if (!gaugesState[gauge_].isAlive) {
            revert GaugeArleadyKilled();
        }

        delete gaugesState[gauge_].isAlive;
        delete gaugesState[gauge_].claimable;

        uint256 time = _epochTimestamp();
        totalWeightsPerEpoch[time] -= weightsPerEpoch[time][gaugesState[gauge_].pool];

        emit GaugeKilled(gauge_);
    }

    function reviveGauge(address gauge_) external virtual override onlyGovernance onlyRealGauge(gauge_) {
        if (gaugesState[gauge_].isAlive) {
            revert GaugeNotKilled();
        }
        gaugesState[gauge_].isAlive = true;
        emit GaugeRevived(gauge_);
    }

    function reset(uint256 tokenId_) external virtual override nonReentrant onlyTokenApprovedOrOwner(tokenId_) onlyVoteDelay(tokenId_) {
        _reset(tokenId_);
        IVotingEscrowUpgradeable(votingEscrow).abstain(tokenId_);
        lastVoted[tokenId_] = _epochTimestamp() + 1;
    }

    function poke(uint256 tokenId_) external virtual override nonReentrant onlyTokenApprovedOrOwner(tokenId_) onlyVoteDelay(tokenId_) {
        address[] memory _poolVote = poolVote[tokenId_];
        uint256 _poolCnt = _poolVote.length;
        uint256[] memory _weights = new uint256[](_poolCnt);

        for (uint256 i; i < _poolCnt; i++) {
            _weights[i] = votes[tokenId_][_poolVote[i]];
            unchecked {
                i++;
            }
        }

        _vote(tokenId_, _poolVote, _weights);
        lastVoted[tokenId_] = _epochTimestamp() + 1;
    }

    /// @notice Vote for pools
    /// @param  tokenId_    veNFT tokenID used to vote
    /// @param  poolVote_   array of LPs addresses to vote  (eg.: [sAMM usdc-usdt   , sAMM busd-usdt, vAMM wbnb-the ,...])
    /// @param  weights_    array of weights for each LPs   (eg.: [10               , 90            , 45             ,...])
    function vote(
        uint256 tokenId_,
        address[] calldata poolVote_,
        uint256[] calldata weights_
    ) external virtual override nonReentrant onlyTokenApprovedOrOwner(tokenId_) onlyVoteDelay(tokenId_) {
        if (poolVote_.length != weights_.length) {
            revert MismatchArrayLen();
        }
        _vote(tokenId_, poolVote_, weights_);
        lastVoted[tokenId_] = _epochTimestamp() + 1;
    }

    /// @notice claim LP gauge rewards
    function claimRewards(address[] calldata gauges_) external virtual override {
        for (uint256 i; i < gauges_.length; ) {
            IBaseGaugeUpgradeable(gauges_[i]).getReward(msg.sender);
            unchecked {
                i++;
            }
        }
    }

    /// @notice claim bribes rewards given a TokenID
    function claimBribes(
        address[] calldata bribes_,
        address[][] calldata tokens_,
        uint256 tokenId_
    ) external virtual override onlyTokenApprovedOrOwner(tokenId_) {
        for (uint256 i; i < bribes_.length; ) {
            IBribeUpgradeable(bribes_[i]).getRewardForTokenOwner(tokenId_, tokens_[i]);
            unchecked {
                i++;
            }
        }
    }

    function claimFees(
        address[] calldata fees_,
        address[][] calldata tokens_,
        uint256 tokenId_
    ) external virtual override onlyTokenApprovedOrOwner(tokenId_) {
        for (uint256 i; i < fees_.length; ) {
            IBribeUpgradeable(fees_[i]).getRewardForTokenOwner(tokenId_, tokens_[i]);
            unchecked {
                i++;
            }
        }
    }

    /// @notice claim bribes rewards given an address
    function claimBribes(address[] calldata _bribes, address[][] calldata _tokens) external virtual override {
        for (uint256 i; i < _bribes.length; ) {
            IBribeUpgradeable(_bribes[i]).getRewardForAddress(msg.sender, _tokens[i]);
            unchecked {
                i++;
            }
        }
    }

    /// @notice claim fees rewards given an address
    function claimFees(address[] calldata _bribes, address[][] calldata _tokens) external virtual override {
        for (uint256 i; i < _bribes.length; ) {
            IBribeUpgradeable(_bribes[i]).getRewardForAddress(msg.sender, _tokens[i]);
            unchecked {
                i++;
            }
        }
    }

    function createGauges(
        address[] calldata pool_,
        uint256[] calldata gaugesType_
    ) external virtual override nonReentrant returns (address[] memory, address[] memory, address[] memory) {
        if (pool_.length != gaugesType_.length) {
            revert MismatchArrayLen();
        }
        address[] memory gauge_ = new address[](pool_.length);
        address[] memory _int = new address[](pool_.length);
        address[] memory _ext = new address[](pool_.length);

        for (uint256 i; i < pool_.length; ) {
            (gauge_[i], _int[i], _ext[i]) = _createGauge(pool_[i], gaugesType_[i]);
            unchecked {
                i++;
            }
        }
        return (gauge_, _int, _ext);
    }

    /// @notice create a gauge
    function createGauge(
        address pool_,
        uint256 gaugeTypeIndex_
    ) external virtual override nonReentrant returns (address gauge, address internal_bribe, address external_bribe) {
        return _createGauge(pool_, gaugeTypeIndex_);
    }

    /// @notice notify reward amount for gauge
    /// @dev    the function is called by the minter each epoch. Anyway anyone can top up some extra rewards.
    /// @param  amount  amount to distribute
    function notifyRewardAmount(uint256 amount) external virtual override onlyEmissionManager {
        IERC20Upgradeable(emissionToken).safeTransferFrom(msg.sender, address(this), amount);

        uint256 totalWeightTemp = totalWeightsPerEpoch[_epochTimestamp() - 1 weeks]; // minter call notify after updates active_period, loads votes - 1 week

        uint256 ratio;

        if (totalWeightTemp > 0) ratio = (amount * 1e18) / totalWeightTemp; // 1e18 adjustment is removed during claim
        if (ratio > 0) {
            index += ratio;
        }

        emit NotifyReward(msg.sender, emissionToken, amount);
    }

    function distributeFees(address[] calldata gauges_) external virtual override {
        for (uint256 i; i < gauges_.length; ) {
            if (gaugesState[gauges_[i]].isGauge && gaugesState[gauges_[i]].isAlive) {
                IBaseGaugeUpgradeable(gauges_[i]).claimFees();
            }
            unchecked {
                i++;
            }
        }
    }

    function distributeAll() external virtual override nonReentrant {
        IEmissionManagerUpgradeable(emissionManager).updatePeriod();
        for (uint256 i; i < pools.length; ) {
            _distribute(gaugeByPool[pools[i]]);
            unchecked {
                i++;
            }
        }
    }

    function distribute(uint256 start, uint256 finish) external virtual override nonReentrant {
        IEmissionManagerUpgradeable(emissionManager).updatePeriod();
        for (uint256 i = start; i < finish; ) {
            _distribute(gaugeByPool[pools[i]]);
            unchecked {
                i++;
            }
        }
    }

    function distribute(address[] calldata gauges_) external virtual override nonReentrant {
        IEmissionManagerUpgradeable(emissionManager).updatePeriod();
        for (uint256 i; i < gauges_.length; ) {
            _distribute(gauges_[i]);
            unchecked {
                i++;
            }
        }
    }

    function isGauge(address gauge_) external view virtual override returns (bool) {
        return gaugesState[gauge_].isGauge;
    }

    function poolForGauge(address gauge_) external view virtual override returns (address) {
        return gaugesState[gauge_].pool;
    }

    function internalBribe(address gauge_) external view virtual override returns (address) {
        return gaugesState[gauge_].internalBribe;
    }

    function externalBribe(address gauge_) external view virtual override returns (address) {
        return gaugesState[gauge_].externalBribe;
    }

    /// @notice view the total length of the pools
    function length() external view virtual override returns (uint256) {
        return pools.length;
    }

    /// @notice view the total length of the voted pools given a tokenId
    function poolVoteLength(uint256 tokenId) external view virtual override returns (uint256) {
        return poolVote[tokenId].length;
    }

    function weights(address pool_) external view virtual override returns (uint256) {
        return weightsPerEpoch[_epochTimestamp()][pool_];
    }

    function totalWeight() external view virtual override returns (uint256) {
        return totalWeightsPerEpoch[_epochTimestamp()];
    }

    function _epochTimestamp() internal view returns (uint256) {
        return IEmissionManagerUpgradeable(emissionManager).activePeriod();
    }

    function _createGauge(
        address pool_,
        uint256 gaugeTypeIndex_
    ) internal onlyContract(pool_) returns (address deployedGauge, address deployedInternalBribe, address deployedExternalBribe) {
        if (gaugeTypeIndex_ >= gaugeTypes.length) {
            revert GaugeTypeNotExist();
        }
        if (gaugeByPool[pool_] != address(0x0)) {
            revert GaugeAlreadyExist();
        }

        GaugeType memory gaugeType = gaugeTypes[gaugeTypeIndex_];
        if (gaugeType.pairFactory == address(0)) {
            revert PairFactoryNotExist();
        }
        if (gaugeType.gaugeFactory == address(0)) {
            revert GaugeFactoryNotExist();
        }

        bool isPair;

        address tokenA = IPair(pool_).token0();
        address tokenB = IPair(pool_).token1();

        // for future implementation add isPair() in factory
        if (gaugeTypeIndex_ == 0) {
            isPair = IPairFactory(gaugeType.pairFactory).isPair(pool_);
        } else if (gaugeTypeIndex_ == 1) {
            address _pool_factory = IUniV3Factory(gaugeType.pairFactory).poolByPair(tokenA, tokenB);
            address _pool_hyper = IVault(pool_).pool();
            require(_pool_hyper == _pool_factory, "wrong tokens");
            isPair = true;
        }

        // gov can create for any pool, even non-Fenix pairs
        if (!IPermissionsRegistry(permissionRegistry).hasRole("GOVERNANCE", msg.sender)) {
            if (!isPair) {
                revert IncorrectPool();
            }
            if (!isWhitelisted[tokenA] || !isWhitelisted[tokenB]) {
                revert TokenNotInWhitelist();
            }
            if (tokenA != address(0) || tokenB != address(0)) {
                revert ZeroAdress();
            }
        }

        // create internal and external bribe
        address fenixMultisig = IPermissionsRegistry(permissionRegistry).fenixTeamMultisig();

        deployedInternalBribe = IBribeFactoryUpgradeable(bribeFactory).createBribe(
            fenixMultisig,
            tokenA,
            tokenB,
            string.concat("Fenix LP Fees: ", IERC20Metadata(pool_).symbol())
        );
        deployedExternalBribe = IBribeFactoryUpgradeable(bribeFactory).createBribe(
            fenixMultisig,
            tokenA,
            tokenB,
            string.concat("Fenix Bribes: ", IERC20Metadata(pool_).symbol())
        );

        // create gauge
        deployedGauge = IGaugeFactoryUpgradeable(gaugeType.gaugeFactory).createGauge(
            emissionToken,
            votingEscrow,
            pool_,
            address(this),
            deployedInternalBribe,
            deployedExternalBribe,
            isPair
        );

        // approve spending for $fenix
        IERC20Upgradeable(emissionToken).approve(deployedGauge, type(uint256).max);

        gaugesState[deployedGauge] = GaugeState({
            internalBribe: deployedInternalBribe,
            externalBribe: deployedExternalBribe,
            pool: pool_,
            isAlive: true,
            isGauge: true,
            supplyIndex: index,
            claimable: 0,
            lastDistributiontime: 0
        });

        gaugeByPool[pool_] = deployedGauge;
        pools.push(pool_);

        emit GaugeCreated(deployedGauge, msg.sender, deployedInternalBribe, deployedExternalBribe, pool_);
    }

    function _vote(uint256 _tokenId, address[] memory _poolVote, uint256[] memory _weights) internal {
        _reset(_tokenId);
        uint256 _poolCnt = _poolVote.length;
        uint256 _weight = IVotingEscrowUpgradeable(votingEscrow).balanceOfNFT(_tokenId);
        uint256 _totalVoteWeight = 0;
        uint256 _totalWeight = 0;
        uint256 _usedWeight = 0;
        uint256 _time = _epochTimestamp();

        for (uint256 i; i < _poolCnt; ) {
            if (gaugesState[gaugeByPool[_poolVote[i]]].isAlive) _totalVoteWeight += _weights[i];
            unchecked {
                i++;
            }
        }

        for (uint256 i; i < _poolCnt; ) {
            address _pool = _poolVote[i];
            address gauge_ = gaugeByPool[_pool];

            if (gaugesState[gauge_].isGauge && gaugesState[gauge_].isAlive) {
                uint256 _poolWeight = (_weights[i] * _weight) / _totalVoteWeight;

                require(votes[_tokenId][_pool] == 0);
                require(_poolWeight != 0);

                poolVote[_tokenId].push(_pool);
                weightsPerEpoch[_time][_pool] += _poolWeight;

                votes[_tokenId][_pool] += _poolWeight;

                IBribeUpgradeable(gaugesState[gauge_].internalBribe).deposit(uint256(_poolWeight), _tokenId);
                IBribeUpgradeable(gaugesState[gauge_].externalBribe).deposit(uint256(_poolWeight), _tokenId);

                _usedWeight += _poolWeight;
                _totalWeight += _poolWeight;
                emit Voted(msg.sender, _tokenId, _poolWeight);
            }
            unchecked {
                i++;
            }
        }
        if (_usedWeight > 0) IVotingEscrowUpgradeable(votingEscrow).voting(_tokenId);
        totalWeightsPerEpoch[_time] += _totalWeight;
    }

    function _distribute(address gauge_) internal {
        uint256 lastTimestamp = gaugesState[gauge_].lastDistributiontime;
        uint256 currentTimestamp = _epochTimestamp();
        if (lastTimestamp < currentTimestamp) {
            _updateForAfterDistribution(gauge_); // should set claimable to 0 if killed

            uint256 claimable = gaugesState[gauge_].claimable;

            // distribute only if claimable is > 0, currentEpoch != lastepoch and gauge is alive
            if (claimable > 0 && gaugesState[gauge_].isAlive) {
                delete gaugesState[gauge_].claimable;
                gaugesState[gauge_].lastDistributiontime = currentTimestamp;
                IBaseGaugeUpgradeable(gauge_).notifyRewardAmount(emissionToken, claimable);
                emit DistributeReward(msg.sender, gauge_, claimable);
            }
        }
    }

    /// @notice update info for gauges
    /// @dev    this function track the gauge index to emit the correct $fnx amount after the distribution
    function _updateForAfterDistribution(address gauge_) internal {
        address pool = gaugesState[gauge_].pool;
        uint256 time = _epochTimestamp() - 604800;
        uint256 supplied = weightsPerEpoch[time][pool];

        if (supplied > 0) {
            uint256 supplyIndex = gaugesState[gauge_].supplyIndex;
            gaugesState[gauge_].supplyIndex = index; // update gauge_ current position to global position
            uint256 delta = index - supplyIndex; // see if there is any difference that need to be accrued
            if (delta > 0) {
                uint256 _share = (supplied * delta) / 1e18; // add accrued difference for each supplied token
                if (gaugesState[gauge_].isAlive) {
                    gaugesState[gauge_].claimable += _share;
                }
            }
        } else {
            gaugesState[gauge_].supplyIndex = index; // new users are set to the default global state
        }
    }

    function _setInternalBribe(address gauge_, address internalBribe_) internal notZero(internalBribe_) onlyContract(internalBribe_) {
        emit SetBribeFor(true, gaugesState[gauge_].internalBribe, internalBribe_, gauge_);
        gaugesState[gauge_].internalBribe = internalBribe_;
    }

    function _setExternalBribe(address gauge_, address externalBribe_) internal notZero(externalBribe_) onlyContract(externalBribe_) {
        emit SetBribeFor(false, gaugesState[gauge_].externalBribe, externalBribe_, gauge_);
        gaugesState[gauge_].externalBribe = externalBribe_;
    }

    function _blacklist(address token_) internal {
        if (!isWhitelisted[token_]) {
            revert TokenNotInWhitelist();
        }
        delete isWhitelisted[token_];
        emit Blacklisted(msg.sender, token_);
    }

    function _whitelist(address token_) internal onlyContract(token_) {
        if (isWhitelisted[token_]) {
            revert TokenInWhitelist();
        }
        isWhitelisted[token_] = true;
        emit Whitelisted(msg.sender, token_);
    }

    function _reset(uint256 tokenId_) internal {
        address[] memory _poolVote = poolVote[tokenId_];
        uint256 _poolVoteCnt = _poolVote.length;
        uint256 _totalWeight = 0;
        uint256 time = _epochTimestamp();

        for (uint256 i; i < _poolVoteCnt; ) {
            address _pool = _poolVote[i];
            uint256 _votes = votes[tokenId_][_pool];

            if (_votes != 0) {
                // if user last vote is < than epochTimestamp then votes are 0! IF not underflow occur
                if (lastVoted[tokenId_] > time) weightsPerEpoch[time][_pool] -= _votes;

                votes[tokenId_][_pool] -= _votes;
                address gauge = gaugeByPool[_pool];
                IBribeUpgradeable(gaugesState[gauge].internalBribe).withdraw(_votes, tokenId_);
                IBribeUpgradeable(gaugesState[gauge].externalBribe).withdraw(_votes, tokenId_);

                // if is alive remove _votes, else don't because we already done it in killGauge()
                if (gaugesState[gauge].isAlive) _totalWeight += _votes;

                emit Abstained(tokenId_, _votes);
            }
            unchecked {
                i++;
            }
        }

        // if user last vote is < than epochTimestamp then _totalWeight is 0! IF not underflow occur
        if (lastVoted[tokenId_] < time) _totalWeight = 0;

        totalWeightsPerEpoch[time] -= _totalWeight;
        delete poolVote[tokenId_];
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] __gap;
}
