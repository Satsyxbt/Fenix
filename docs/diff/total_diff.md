```diff
diff --git a/contracts/core/VoterUpgradeableV1_2.sol b/contracts/core/VoterUpgradeableV1_2.sol
new file mode 100644
index 0000000..786e7d4
--- /dev/null
+++ b/contracts/core/VoterUpgradeableV1_2.sol
@@ -0,0 +1,971 @@
+// SPDX-License-Identifier: MIT
+pragma solidity =0.8.19;
+
+import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
+import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
+import {SafeERC20Upgradeable, IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
+import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
+
+import {IAlgebraFactory} from "@cryptoalgebra/integral-core/contracts/interfaces/IAlgebraFactory.sol";
+
+import {BlastGovernorSetup} from "../integration/BlastGovernorSetup.sol";
+import {IBribe} from "../bribes/interfaces/IBribe.sol";
+import {IBribeFactory} from "../bribes/interfaces/IBribeFactory.sol";
+import {IGauge} from "../gauges/interfaces/IGauge.sol";
+import {IGaugeFactory} from "../gauges/interfaces/IGaugeFactory.sol";
+import {IMinter} from "./interfaces/IMinter.sol";
+import {IPairInfo} from "../dexV2/interfaces/IPairInfo.sol";
+import {IPairFactory} from "../dexV2/interfaces/IPairFactory.sol";
+import {IVotingEscrow} from "./interfaces/IVotingEscrow.sol";
+import {IVault} from "./interfaces/IVault.sol";
+import {IVoter} from "./interfaces/IVoter.sol";
+import {IPairIntegrationInfo} from "../integration/interfaces/IPairIntegrationInfo.sol";
+import {IManagedNFTManager} from "../nest/interfaces/IManagedNFTManager.sol";
+import {IVotingEscrowV1_2} from "./interfaces/IVotingEscrowV1_2.sol";
+
+contract VoterUpgradeableV1_2 is IVoter, BlastGovernorSetup, ReentrancyGuardUpgradeable {
+    using SafeERC20Upgradeable for IERC20Upgradeable;
+
+    bool internal initflag;
+
+    address public _ve; // the ve token that governs these contracts
+    address[] internal _factories; // Array with all the pair factories
+    address internal base; // $fnx token
+    address[] internal _gaugeFactories; // array with all the gauge factories
+    address public bribefactory; // bribe factory (internal and external)
+    address public minter; // minter mints $fnx each epoch
+    address[] public pools; // all pools viable for incentives
+    address public admin;
+    address public governance;
+
+    uint256 internal index; // gauge index
+    uint256 internal constant DURATION = 7 days; // rewards are released over 7 days
+    uint256 public VOTE_DELAY; // delay between votes in seconds
+    uint256 public constant MAX_VOTE_DELAY = 7 days; // Max vote delay allowed
+
+    mapping(address => uint256) internal supplyIndex; // gauge    => index
+    mapping(address => uint256) public claimable; // gauge    => claimable $fnx
+    mapping(address => address) public gauges; // pool     => gauge
+    mapping(address => uint256) public gaugesDistributionTimestmap; // gauge    => last Distribution Time
+    mapping(address => address) public poolForGauge; // gauge    => pool
+    mapping(address => address) public internal_bribes; // gauge    => internal bribe (only fees)
+    mapping(address => address) public external_bribes; // gauge    => external bribe (real bribes)
+    mapping(uint256 => mapping(address => uint256)) public votes; // nft      => pool     => votes
+    mapping(uint256 => address[]) public poolVote; // nft      => pools
+    mapping(uint256 => mapping(address => uint256)) public weightsPerEpoch; // timestamp => pool => weights
+    mapping(uint256 => uint256) internal totalWeightsPerEpoch; // timestamp => total weights
+    mapping(uint256 => uint256) public lastVoted; // nft      => timestamp of last vote
+    mapping(address => bool) public isGauge; // gauge    => boolean [is a gauge?]
+    mapping(address => bool) public isWhitelisted; // token    => boolean [is an allowed token?]
+    mapping(address => bool) public isAlive; // gauge    => boolean [is the gauge alive?]
+    mapping(address => bool) public isFactory; // factory  => boolean [the pair factory exists?]
+    mapping(address => bool) public isGaugeFactory; // g.factory=> boolean [the gauge factory exists?]
+
+    event GaugeCreated(
+        address indexed gauge,
+        address creator,
+        address internal_bribe,
+        address indexed external_bribe,
+        address indexed pool
+    );
+    event GaugeKilled(address indexed gauge);
+    event GaugeRevived(address indexed gauge);
+    event Voted(address indexed voter, uint256 tokenId, uint256 weight);
+    event Abstained(uint256 tokenId, uint256 weight);
+    event NotifyReward(address indexed sender, address indexed reward, uint256 amount);
+    event DistributeReward(address indexed sender, address indexed gauge, uint256 amount);
+    event Whitelisted(address indexed whitelister, address indexed token);
+    event Blacklisted(address indexed blacklister, address indexed token);
+
+    event SetMinter(address indexed old, address indexed latest);
+    event SetBribeFactory(address indexed old, address indexed latest);
+    event SetPairFactory(address indexed old, address indexed latest);
+    event SetGaugeFactory(address indexed old, address indexed latest);
+    event SetBribeFor(bool isInternal, address indexed old, address indexed latest, address indexed gauge);
+    event SetVoteDelay(uint256 old, uint256 latest);
+    event AddFactories(address indexed pairfactory, address indexed gaugefactory);
+
+    event SetGovernance(address indexed oldGovernance, address indexed newGovernance);
+    event SetVoterAdmin(address indexed oldAdmin, address indexed newAdmin);
+
+    constructor() {
+        _disableInitializers();
+    }
+
+    address[] public clPools; // all pools viable for incentives
+
+    function initialize(
+        address blastGovernor_,
+        address __ve,
+        address _pairFactory,
+        address _gaugeFactory,
+        address _bribes
+    ) external initializer {
+        __BlastGovernorSetup_init(blastGovernor_);
+        __ReentrancyGuard_init();
+
+        admin = msg.sender;
+        governance = msg.sender;
+        _ve = __ve;
+        base = IVotingEscrow(__ve).token();
+
+        _factories.push(_pairFactory);
+        isFactory[_pairFactory] = true;
+
+        _gaugeFactories.push(_gaugeFactory);
+        isGaugeFactory[_gaugeFactory] = true;
+
+        bribefactory = _bribes;
+
+        minter = msg.sender;
+
+        VOTE_DELAY = 0;
+        initflag = false;
+    }
+
+    /* -----------------------------------------------------------------------------
+    --------------------------------------------------------------------------------
+    --------------------------------------------------------------------------------
+                                    MODIFIERS
+    --------------------------------------------------------------------------------
+    --------------------------------------------------------------------------------
+    ----------------------------------------------------------------------------- */
+
+    modifier VoterAdmin() {
+        require(msg.sender == admin, "VOTER_ADMIN");
+        _;
+    }
+
+    modifier Governance() {
+        require(msg.sender == governance, "GOVERNANCE");
+        _;
+    }
+
+    /// @notice initialize the voter contract
+    /// @param  _tokens array of tokens to whitelist
+    /// @param  _minter the minter of $fnx
+    function _init(address[] memory _tokens, address _minter) external {
+        require(msg.sender == admin);
+        require(!initflag);
+        for (uint256 i = 0; i < _tokens.length; i++) {
+            _whitelist(_tokens[i]);
+        }
+        minter = _minter;
+        initflag = true;
+    }
+
+    /* -----------------------------------------------------------------------------
+    --------------------------------------------------------------------------------
+    --------------------------------------------------------------------------------
+                                    VoterAdmin
+    --------------------------------------------------------------------------------
+    --------------------------------------------------------------------------------
+    ----------------------------------------------------------------------------- */
+
+    /// @notice set vote delay in seconds
+    function setVoteDelay(uint256 _delay) external VoterAdmin {
+        require(_delay != VOTE_DELAY, "already set");
+        require(_delay <= MAX_VOTE_DELAY, "max delay");
+        emit SetVoteDelay(VOTE_DELAY, _delay);
+        VOTE_DELAY = _delay;
+    }
+
+    /// @notice Set a new VoterAdmin
+    function setVoterAdmin(address _admin) external VoterAdmin {
+        require(_admin != address(0), "addr0");
+        emit SetVoterAdmin(admin, _admin);
+        admin = _admin;
+    }
+
+    /// @notice Set a new Governance
+    function setGovernance(address _governance) external Governance {
+        require(_governance != address(0), "addr0");
+        emit SetGovernance(governance, _governance);
+        governance = _governance;
+    }
+
+    /// @notice Set a new Minter
+    function setMinter(address _minter) external VoterAdmin {
+        require(_minter != address(0), "addr0");
+        require(_minter.code.length > 0, "!contract");
+        emit SetMinter(minter, _minter);
+        minter = _minter;
+    }
+
+    /// @notice Set a new Bribe Factory
+    function setBribeFactory(address _bribeFactory) external VoterAdmin {
+        require(_bribeFactory.code.length > 0, "!contract");
+        require(_bribeFactory != address(0), "addr0");
+        emit SetBribeFactory(bribefactory, _bribeFactory);
+        bribefactory = _bribeFactory;
+    }
+
+    /// @notice Set a new bribes for a given gauge
+    function setNewBribes(address _gauge, address _internal, address _external) external VoterAdmin {
+        require(isGauge[_gauge], "!gauge");
+        require(_gauge.code.length > 0, "!contract");
+        _setInternalBribe(_gauge, _internal);
+        _setExternalBribe(_gauge, _external);
+    }
+
+    /// @notice Set a new internal bribe for a given gauge
+    function setInternalBribeFor(address _gauge, address _internal) external VoterAdmin {
+        require(isGauge[_gauge], "!gauge");
+        _setInternalBribe(_gauge, _internal);
+    }
+
+    /// @notice Set a new External bribe for a given gauge
+    function setExternalBribeFor(address _gauge, address _external) external VoterAdmin {
+        require(isGauge[_gauge], "!gauge");
+        _setExternalBribe(_gauge, _external);
+    }
+
+    function _setInternalBribe(address _gauge, address _internal) private {
+        require(_internal.code.length > 0, "!contract");
+        emit SetBribeFor(true, internal_bribes[_gauge], _internal, _gauge);
+        internal_bribes[_gauge] = _internal;
+    }
+
+    function _setExternalBribe(address _gauge, address _external) private {
+        require(_external.code.length > 0, "!contract");
+        emit SetBribeFor(false, internal_bribes[_gauge], _external, _gauge);
+        external_bribes[_gauge] = _external;
+    }
+
+    function addFactory(address _pairFactory, address _gaugeFactory) external VoterAdmin {
+        require(_pairFactory != address(0), "addr0");
+        require(_gaugeFactory != address(0), "addr0");
+        //require(!isFactory[_pairFactory], "fact");
+        //require(!isGaugeFactory[_gaugeFactory], 'gFact');
+        require(_pairFactory.code.length > 0, "!contract");
+        require(_gaugeFactory.code.length > 0, "!contract");
+
+        _factories.push(_pairFactory);
+        _gaugeFactories.push(_gaugeFactory);
+        isFactory[_pairFactory] = true;
+        isGaugeFactory[_gaugeFactory] = true;
+        emit AddFactories(_pairFactory, _gaugeFactory);
+    }
+
+    function replaceFactory(address _pairFactory, address _gaugeFactory, uint256 _pos) external VoterAdmin {
+        require(_pairFactory != address(0), "addr0");
+        require(_gaugeFactory != address(0), "addr0");
+        require(isFactory[_pairFactory], "!fact");
+        require(isGaugeFactory[_gaugeFactory], "!gFact");
+        address oldPF = _factories[_pos];
+        address oldGF = _gaugeFactories[_pos];
+        isFactory[oldPF] = false;
+        isGaugeFactory[oldGF] = false;
+
+        _factories[_pos] = (_pairFactory);
+        _gaugeFactories[_pos] = (_gaugeFactory);
+        isFactory[_pairFactory] = true;
+        isGaugeFactory[_gaugeFactory] = true;
+
+        emit SetGaugeFactory(oldGF, _gaugeFactory);
+        emit SetPairFactory(oldPF, _pairFactory);
+    }
+
+    function removeFactory(uint256 _pos) external VoterAdmin {
+        address oldPF = _factories[_pos];
+        address oldGF = _gaugeFactories[_pos];
+
+        require(isFactory[oldPF], "!fact");
+        require(isGaugeFactory[oldGF], "!gFact");
+        _factories[_pos] = address(0);
+        _gaugeFactories[_pos] = address(0);
+        isFactory[oldPF] = false;
+        isGaugeFactory[oldGF] = false;
+        emit SetGaugeFactory(oldGF, address(0));
+        emit SetPairFactory(oldPF, address(0));
+    }
+
+    /* -----------------------------------------------------------------------------
+    --------------------------------------------------------------------------------
+    --------------------------------------------------------------------------------
+                                    GOVERNANCE
+    --------------------------------------------------------------------------------
+    --------------------------------------------------------------------------------
+    ----------------------------------------------------------------------------- */
+
+    /// @notice Whitelist a token for gauge creation
+    function whitelist(address[] memory _token) external Governance {
+        uint256 i = 0;
+        for (i = 0; i < _token.length; i++) {
+            _whitelist(_token[i]);
+        }
+    }
+
+    function _whitelist(address _token) private {
+        require(!isWhitelisted[_token], "in");
+        require(_token.code.length > 0, "!contract");
+        isWhitelisted[_token] = true;
+        emit Whitelisted(msg.sender, _token);
+    }
+
+    /// @notice Blacklist a malicious token
+    function blacklist(address[] memory _token) external Governance {
+        uint256 i = 0;
+        for (i = 0; i < _token.length; i++) {
+            _blacklist(_token[i]);
+        }
+    }
+
+    function _blacklist(address _token) private {
+        require(isWhitelisted[_token], "out");
+        isWhitelisted[_token] = false;
+        emit Blacklisted(msg.sender, _token);
+    }
+
+    /// @notice Kill a malicious gauge
+    /// @param  _gauge gauge to kill
+    function killGauge(address _gauge) external Governance {
+        require(isAlive[_gauge], "killed");
+        isAlive[_gauge] = false;
+        claimable[_gauge] = 0;
+
+        uint _time = _epochTimestamp();
+        totalWeightsPerEpoch[_time] -= weightsPerEpoch[_time][poolForGauge[_gauge]];
+
+        emit GaugeKilled(_gauge);
+    }
+
+    /// @notice Revive a malicious gauge
+    /// @param  _gauge gauge to revive
+    function reviveGauge(address _gauge) external Governance {
+        require(!isAlive[_gauge], "alive");
+        require(isGauge[_gauge], "killed");
+        isAlive[_gauge] = true;
+        emit GaugeRevived(_gauge);
+    }
+
+    /* -----------------------------------------------------------------------------
+    --------------------------------------------------------------------------------
+    --------------------------------------------------------------------------------
+                                    USER INTERACTION
+    --------------------------------------------------------------------------------
+    --------------------------------------------------------------------------------
+    ----------------------------------------------------------------------------- */
+
+    /// @notice Reset the votes of a given TokenID
+    function reset(uint256 _tokenId) external nonReentrant {
+        _voteDelay(_tokenId);
+
+        require(IVotingEscrow(_ve).isApprovedOrOwner(msg.sender, _tokenId), "!approved/Owner");
+        _reset(_tokenId);
+        IVotingEscrow(_ve).abstain(_tokenId);
+        lastVoted[_tokenId] = _epochTimestamp() + 1;
+    }
+
+    function _reset(uint256 _tokenId) internal {
+        address[] storage _poolVote = poolVote[_tokenId];
+        uint256 _poolVoteCnt = _poolVote.length;
+        uint256 _totalWeight = 0;
+        uint256 _time = _epochTimestamp();
+
+        for (uint256 i = 0; i < _poolVoteCnt; i++) {
+            address _pool = _poolVote[i];
+            uint256 _votes = votes[_tokenId][_pool];
+            if (_votes != 0) {
+                votes[_tokenId][_pool] -= _votes;
+
+                // if user last vote is < than epochTimestamp then votes are 0! IF not underflow occur
+                if (lastVoted[_tokenId] > _time) {
+                    weightsPerEpoch[_time][_pool] -= _votes;
+
+                    IBribe(internal_bribes[gauges[_pool]]).withdraw(uint256(_votes), _tokenId);
+                    IBribe(external_bribes[gauges[_pool]]).withdraw(uint256(_votes), _tokenId);
+
+                    // if is alive remove _votes, else don't because we already done it in killGauge()
+                    if (isAlive[gauges[_pool]]) _totalWeight += _votes;
+                }
+
+                emit Abstained(_tokenId, _votes);
+            }
+        }
+
+        // if user last vote is < than epochTimestamp then _totalWeight is 0! IF not underflow occur
+        if (lastVoted[_tokenId] < _time) _totalWeight = 0;
+
+        totalWeightsPerEpoch[_time] -= _totalWeight;
+        delete poolVote[_tokenId];
+    }
+
+    /// @notice Recast the saved votes of a given TokenID
+    function poke(uint256 _tokenId) external nonReentrant {
+        _checkStartVoteWindow();
+        require(IVotingEscrow(_ve).isApprovedOrOwner(msg.sender, _tokenId), "!approved/Owner");
+        _poke(_tokenId);
+    }
+
+    /// @notice Vote for pools
+    /// @param  _tokenId    veNFT tokenID used to vote
+    /// @param  _poolVote   array of LPs addresses to vote  (eg.: [sAMM usdc-usdt   , sAMM busd-usdt, vAMM wbnb-the ,...])
+    /// @param  _weights    array of weights for each LPs   (eg.: [10               , 90            , 45             ,...])
+    function vote(uint256 _tokenId, address[] calldata _poolVote, uint256[] calldata _weights) external nonReentrant {
+        _voteDelay(_tokenId);
+
+        require(IVotingEscrow(_ve).isApprovedOrOwner(msg.sender, _tokenId), "!approved/Owner");
+        require(_poolVote.length == _weights.length, "Pool/Weights length !=");
+
+        IManagedNFTManager managedNFTManagerCache = IManagedNFTManager(managedNFTManager);
+        require(!managedNFTManagerCache.isDisabledNFT(_tokenId), "disabled managed nft");
+
+        if (!managedNFTManagerCache.isWhitelistedNFT(_tokenId)) {
+            _checkEndVoteWindow();
+        }
+
+        _vote(_tokenId, _poolVote, _weights);
+
+        lastVoted[_tokenId] = _epochTimestamp() + 1;
+    }
+
+    function _vote(uint256 _tokenId, address[] memory _poolVote, uint256[] memory _weights) internal {
+        _reset(_tokenId);
+        uint256 _poolCnt = _poolVote.length;
+        uint256 _weight = IVotingEscrow(_ve).balanceOfNFT(_tokenId);
+        uint256 _totalVoteWeight = 0;
+        uint256 _totalWeight = 0;
+        uint256 _usedWeight = 0;
+        uint256 _time = _epochTimestamp();
+
+        for (uint i = 0; i < _poolCnt; i++) {
+            if (isAlive[gauges[_poolVote[i]]]) _totalVoteWeight += _weights[i];
+        }
+
+        for (uint256 i = 0; i < _poolCnt; i++) {
+            address _pool = _poolVote[i];
+            address _gauge = gauges[_pool];
+
+            if (isGauge[_gauge] && isAlive[_gauge]) {
+                uint256 _poolWeight = (_weights[i] * _weight) / _totalVoteWeight;
+
+                require(votes[_tokenId][_pool] == 0);
+                require(_poolWeight != 0);
+
+                poolVote[_tokenId].push(_pool);
+                weightsPerEpoch[_time][_pool] += _poolWeight;
+
+                votes[_tokenId][_pool] += _poolWeight;
+
+                IBribe(internal_bribes[_gauge]).deposit(uint256(_poolWeight), _tokenId);
+                IBribe(external_bribes[_gauge]).deposit(uint256(_poolWeight), _tokenId);
+
+                _usedWeight += _poolWeight;
+                _totalWeight += _poolWeight;
+                emit Voted(msg.sender, _tokenId, _poolWeight);
+            }
+        }
+        if (_usedWeight > 0) IVotingEscrow(_ve).voting(_tokenId);
+        totalWeightsPerEpoch[_time] += _totalWeight;
+    }
+
+    /// @notice claim LP gauge rewards
+    function claimRewards(address[] memory _gauges) external {
+        for (uint256 i = 0; i < _gauges.length; i++) {
+            IGauge(_gauges[i]).getReward(msg.sender);
+        }
+    }
+
+    /// @notice claim bribes rewards given a TokenID
+    function claimBribes(address[] memory _bribes, address[][] memory _tokens, uint256 _tokenId) external {
+        require(IVotingEscrow(_ve).isApprovedOrOwner(msg.sender, _tokenId), "!approved/Owner");
+        for (uint256 i = 0; i < _bribes.length; i++) {
+            IBribe(_bribes[i]).getRewardForOwner(_tokenId, _tokens[i]);
+        }
+    }
+
+    /// @notice claim fees rewards given a TokenID
+    function claimFees(address[] memory _fees, address[][] memory _tokens, uint256 _tokenId) external {
+        require(IVotingEscrow(_ve).isApprovedOrOwner(msg.sender, _tokenId), "!approved/Owner");
+        for (uint256 i = 0; i < _fees.length; i++) {
+            IBribe(_fees[i]).getRewardForOwner(_tokenId, _tokens[i]);
+        }
+    }
+
+    /// @notice claim bribes rewards given an address
+    function claimBribes(address[] memory _bribes, address[][] memory _tokens) external {
+        for (uint256 i = 0; i < _bribes.length; i++) {
+            IBribe(_bribes[i]).getRewardForAddress(msg.sender, _tokens[i]);
+        }
+    }
+
+    /// @notice claim fees rewards given an address
+    function claimFees(address[] memory _bribes, address[][] memory _tokens) external {
+        for (uint256 i = 0; i < _bribes.length; i++) {
+            IBribe(_bribes[i]).getRewardForAddress(msg.sender, _tokens[i]);
+        }
+    }
+
+    /// @notice check if user can vote
+    function _voteDelay(uint256 _tokenId) internal view {
+        require(block.timestamp > lastVoted[_tokenId] + VOTE_DELAY, "ERR: VOTE_DELAY");
+        _checkStartVoteWindow();
+    }
+
+    /* -----------------------------------------------------------------------------
+    --------------------------------------------------------------------------------
+    --------------------------------------------------------------------------------
+                                    GAUGE CREATION
+    --------------------------------------------------------------------------------
+    --------------------------------------------------------------------------------
+    ----------------------------------------------------------------------------- */
+    /// @notice create multiple gauges
+    function createGauges(
+        address[] memory _pool,
+        uint256[] memory _gaugeTypes
+    ) external nonReentrant Governance returns (address[] memory, address[] memory, address[] memory) {
+        require(_pool.length == _gaugeTypes.length, "len mismatch");
+        require(_pool.length <= 10, "max 10");
+        address[] memory _gauge = new address[](_pool.length);
+        address[] memory _int = new address[](_pool.length);
+        address[] memory _ext = new address[](_pool.length);
+
+        uint256 i = 0;
+        for (i; i < _pool.length; i++) {
+            (_gauge[i], _int[i], _ext[i]) = _createGauge(_pool[i], _gaugeTypes[i]);
+        }
+        return (_gauge, _int, _ext);
+    }
+
+    /// @notice create a gauge
+    function createGauge(
+        address _pool,
+        uint256 _gaugeType
+    ) external nonReentrant Governance returns (address _gauge, address _internal_bribe, address _external_bribe) {
+        (_gauge, _internal_bribe, _external_bribe) = _createGauge(_pool, _gaugeType);
+    }
+
+    function _prepareBeforeCreate(
+        address _pool,
+        uint256 _gaugeType
+    ) internal returns (address gaugeFactory, address tokenA, address tokenB, address feeVault, bool isDistributeEmissionToMerkle) {
+        require(_gaugeType < _factories.length, "gaugetype");
+        require(gauges[_pool] == address(0x0), "!exists");
+        require(_pool.code.length > 0, "!contract");
+
+        bool isPair;
+        address _factory = _factories[_gaugeType];
+        gaugeFactory = _gaugeFactories[_gaugeType];
+        require(_factory != address(0), "addr0");
+        require(gaugeFactory != address(0), "addr0");
+
+        tokenA = IPairIntegrationInfo(_pool).token0();
+        tokenB = IPairIntegrationInfo(_pool).token1();
+
+        // for future implementation add isPair() in factory
+        if (_gaugeType == 0) {
+            // v2 pairs
+            isPair = IPairFactory(_factory).isPair(_pool);
+            feeVault = IPairIntegrationInfo(_pool).communityVault();
+        } else if (_gaugeType == 1) {
+            // v3 pairs
+            address poolFromFactory = IAlgebraFactory(_factory).poolByPair(tokenA, tokenB);
+            require(_pool == poolFromFactory, "wrong tokens");
+            isPair = true;
+            isDistributeEmissionToMerkle = true;
+            clPools.push(_pool);
+            feeVault = IPairIntegrationInfo(_pool).communityVault();
+        } else if (_gaugeType == 2) {
+            // v3 pairs but with ICHI Vault
+            address poolFromFactory = IAlgebraFactory(_factory).poolByPair(tokenA, tokenB);
+
+            address poolFromIchi = IVault(_pool).pool();
+
+            require(poolFromIchi == poolFromFactory, "wrong tokens");
+            isDistributeEmissionToMerkle = true;
+            clPools.push(_pool);
+            feeVault = IPairIntegrationInfo(poolFromFactory).communityVault();
+        }
+
+        // gov can create for any pool, even non-Fenix pairs
+        if (!(governance == msg.sender)) {
+            require(isPair, "!_pool");
+            require(isWhitelisted[tokenA] && isWhitelisted[tokenB], "!whitelisted");
+            require(tokenA != address(0) && tokenB != address(0), "!pair.tokens");
+        }
+    }
+
+    /// @notice create a gauge
+    /// @param  _pool       LP address
+    /// @param  _gaugeType  the type of the gauge you want to create
+    /// @dev    To create stable/Volatile pair gaugeType = 0, Concentrated liqudity = 1, ...
+    ///         Make sure to use the corrcet gaugeType or it will fail
+
+    function _createGauge(
+        address _pool,
+        uint256 _gaugeType
+    ) internal returns (address _gauge, address _internal_bribe, address _external_bribe) {
+        (address gaugeFactory, address tokenA, address tokenB, address feeVault, bool isDistributeEmissionToMerkle) = _prepareBeforeCreate(
+            _pool,
+            _gaugeType
+        );
+
+        string memory symbol;
+        if (_gaugeType == 1) {
+            symbol = string.concat(IERC20Metadata(tokenA).symbol(), "/", IERC20Metadata(tokenB).symbol());
+        } else {
+            symbol = IERC20Metadata(_pool).symbol();
+        }
+
+        // create internal and external bribe
+        string memory _type = string.concat("Fenix LP Fees: ", symbol);
+        _internal_bribe = IBribeFactory(bribefactory).createBribe(tokenA, tokenB, _type);
+
+        _type = string.concat("Fenix Bribes: ", symbol);
+        _external_bribe = IBribeFactory(bribefactory).createBribe(tokenA, tokenB, _type);
+
+        // create gauge
+        _gauge = IGaugeFactory(gaugeFactory).createGauge(
+            base,
+            _ve,
+            _pool,
+            address(this),
+            _internal_bribe,
+            _external_bribe,
+            isDistributeEmissionToMerkle,
+            feeVault
+        );
+
+        // approve spending for $fnx
+        IERC20Upgradeable(base).approve(_gauge, type(uint256).max);
+
+        // save data
+        internal_bribes[_gauge] = _internal_bribe;
+        external_bribes[_gauge] = _external_bribe;
+        gauges[_pool] = _gauge;
+        poolForGauge[_gauge] = _pool;
+        isGauge[_gauge] = true;
+        isAlive[_gauge] = true;
+        pools.push(_pool);
+
+        // update index
+        supplyIndex[_gauge] = index; // new gauges are set to the default global state
+
+        emit GaugeCreated(_gauge, msg.sender, _internal_bribe, _external_bribe, _pool);
+    }
+
+    /* -----------------------------------------------------------------------------
+    --------------------------------------------------------------------------------
+    --------------------------------------------------------------------------------
+                                    VIEW FUNCTIONS
+    --------------------------------------------------------------------------------
+    --------------------------------------------------------------------------------
+    ----------------------------------------------------------------------------- */
+
+    /// @notice view the total length of the pools
+    function length() external view returns (uint256) {
+        return pools.length;
+    }
+
+    /// @notice view the total length of the pools
+    function poolsList() external view returns (address[] memory) {
+        return pools;
+    }
+
+    /// @notice view the total length of the pools
+    function clLength() external view returns (uint256) {
+        return clPools.length;
+    }
+
+    /// @notice view the total length of the pools
+    function clPoolsList() external view returns (address[] memory) {
+        return clPools;
+    }
+
+    /// @notice view the total length of the voted pools given a tokenId
+    function poolVoteLength(uint256 tokenId) external view returns (uint256) {
+        return poolVote[tokenId].length;
+    }
+
+    function factories() external view returns (address[] memory) {
+        return _factories;
+    }
+
+    function factoryLength() external view returns (uint256) {
+        return _factories.length;
+    }
+
+    function gaugeFactories() external view returns (address[] memory) {
+        return _gaugeFactories;
+    }
+
+    function gaugeFactoriesLength() external view returns (uint256) {
+        return _gaugeFactories.length;
+    }
+
+    function weights(address _pool) public view returns (uint256) {
+        uint256 _time = _epochTimestamp();
+        return weightsPerEpoch[_time][_pool];
+    }
+
+    function weightsAt(address _pool, uint256 _time) public view returns (uint256) {
+        return weightsPerEpoch[_time][_pool];
+    }
+
+    function totalWeight() public view returns (uint256) {
+        uint256 _time = _epochTimestamp();
+        return totalWeightsPerEpoch[_time];
+    }
+
+    function totalWeightAt(uint256 _time) public view returns (uint256) {
+        return totalWeightsPerEpoch[_time];
+    }
+
+    function _epochTimestamp() public view returns (uint256) {
+        return IMinter(minter).active_period();
+    }
+
+    /* -----------------------------------------------------------------------------
+    --------------------------------------------------------------------------------
+    --------------------------------------------------------------------------------
+                                    DISTRIBUTION
+    --------------------------------------------------------------------------------
+    --------------------------------------------------------------------------------
+    ----------------------------------------------------------------------------- */
+
+    /// @notice notify reward amount for gauge
+    /// @dev    the function is called by the minter each epoch. Anyway anyone can top up some extra rewards.
+    /// @param  amount  amount to distribute
+    function notifyRewardAmount(uint256 amount) external {
+        require(msg.sender == minter, "!minter");
+        IERC20Upgradeable(base).safeTransferFrom(msg.sender, address(this), amount);
+
+        uint256 _totalWeight = totalWeightAt(_epochTimestamp() - 1 weeks); // minter call notify after updates active_period, loads votes - 1 week
+
+        uint256 _ratio = 0;
+
+        if (_totalWeight > 0) _ratio = (amount * 1e18) / _totalWeight; // 1e18 adjustment is removed during claim
+        if (_ratio > 0) {
+            index += _ratio;
+        }
+
+        emit NotifyReward(msg.sender, base, amount);
+    }
+
+    /// @notice distribute the LP Fees to the internal bribes
+    /// @param  _gauges  gauge address where to claim the fees
+    /// @dev    the gauge is the owner of the LPs so it has to claim
+    function distributeFees(address[] memory _gauges) external {
+        for (uint256 i = 0; i < _gauges.length; i++) {
+            if (isGauge[_gauges[i]] && isAlive[_gauges[i]]) {
+                IGauge(_gauges[i]).claimFees();
+            }
+        }
+    }
+
+    /// @notice Distribute the emission for ALL gauges
+    function distributeAll() external nonReentrant {
+        IMinter(minter).update_period();
+
+        uint256 x = 0;
+        uint256 stop = pools.length;
+        for (x; x < stop; x++) {
+            _distribute(gauges[pools[x]]);
+        }
+    }
+
+    /// @notice distribute the emission for N gauges
+    /// @param  start   start index point of the pools array
+    /// @param  finish  finish index point of the pools array
+    /// @dev    this function is used in case we have too many pools and gasLimit is reached
+    function distribute(uint256 start, uint256 finish) public nonReentrant {
+        IMinter(minter).update_period();
+        for (uint256 x = start; x < finish; x++) {
+            _distribute(gauges[pools[x]]);
+        }
+    }
+
+    /// @notice distribute reward onyl for given gauges
+    /// @dev    this function is used in case some distribution fails
+    function distribute(address[] memory _gauges) external nonReentrant {
+        IMinter(minter).update_period();
+        for (uint256 x = 0; x < _gauges.length; x++) {
+            _distribute(_gauges[x]);
+        }
+    }
+
+    /// @notice distribute the emission
+    function _distribute(address _gauge) internal {
+        uint256 lastTimestamp = gaugesDistributionTimestmap[_gauge];
+        uint256 currentTimestamp = _epochTimestamp();
+        if (lastTimestamp < currentTimestamp) {
+            _updateForAfterDistribution(_gauge); // should set claimable to 0 if killed
+
+            uint256 _claimable = claimable[_gauge];
+
+            // distribute only if claimable is > 0, currentEpoch != lastepoch and gauge is alive
+            if (_claimable > 0 && isAlive[_gauge]) {
+                claimable[_gauge] = 0;
+                gaugesDistributionTimestmap[_gauge] = currentTimestamp;
+                IGauge(_gauge).notifyRewardAmount(base, _claimable);
+                emit DistributeReward(msg.sender, _gauge, _claimable);
+            }
+        }
+    }
+
+    /* -----------------------------------------------------------------------------
+    --------------------------------------------------------------------------------
+    --------------------------------------------------------------------------------
+                                    HELPERS
+    --------------------------------------------------------------------------------
+    --------------------------------------------------------------------------------
+    ----------------------------------------------------------------------------- */
+
+    /// @notice update info for gauges
+    /// @dev    this function track the gauge index to emit the correct $fnx amount after the distribution
+    function _updateForAfterDistribution(address _gauge) private {
+        address _pool = poolForGauge[_gauge];
+        uint256 _time = _epochTimestamp() - 604800;
+        uint256 _supplied = weightsPerEpoch[_time][_pool];
+
+        if (_supplied > 0) {
+            uint256 _supplyIndex = supplyIndex[_gauge];
+            uint256 _index = index; // get global index0 for accumulated distro
+            supplyIndex[_gauge] = _index; // update _gauge current position to global position
+            uint256 _delta = _index - _supplyIndex; // see if there is any difference that need to be accrued
+            if (_delta > 0) {
+                uint256 _share = (_supplied * _delta) / 1e18; // add accrued difference for each supplied token
+                if (isAlive[_gauge]) {
+                    claimable[_gauge] += _share;
+                }
+            }
+        } else {
+            supplyIndex[_gauge] = index; // new users are set to the default global state
+        }
+    }
+
+    /*///////////////////////////////////////////////////////////////
+                    Managed NFT & Distribution Window Logic 
+    //////////////////////////////////////////////////////////////*/
+
+    /// @notice Emitted when the distribution window duration is set or updated.
+    /// @param duration New duration of the distribution window in seconds.
+    event SetDistributionWindowDuration(uint256 indexed duration);
+
+    /// @notice Emitted when the managed NFT manager is set or updated.
+    /// @param managedNFTManager Address of the new managed NFT manager.
+    event SetManagedNFTManager(address indexed managedNFTManager);
+
+    /// @notice Emitted when a token is attached to a managed NFT.
+    /// @param tokenId ID of the user's token that is being attached.
+    /// @param managedTokenId ID of the managed token to which the user's token is attached.
+    event AttachToManagedNFT(uint256 indexed tokenId, uint256 indexed managedTokenId);
+
+    /// @notice Emitted when a token is detached from a managed NFT.
+    /// @param tokenId ID of the user's token that is being detached.
+    event DettachFromManagedNFT(uint256 indexed tokenId);
+
+    /// @dev Constant for a week's duration in seconds, used for time-based calculations.
+    uint256 internal constant _WEEK = 86400 * 7;
+
+    /// @notice Address of the managed NFT manager contract.
+    address public managedNFTManager;
+
+    /// @notice Current duration of the distribution window, in seconds.
+    uint256 public distributionWindowDuration;
+
+    /**
+     * @notice Attaches a tokenId to a managed tokenId.
+     * @dev Requires the sender to be the owner or approved on the voting escrow contract.
+     * @param tokenId_ The user's tokenId to be attached.
+     * @param managedTokenId_ The managed tokenId to attach to.
+     */
+    function attachToManagedNFT(uint256 tokenId_, uint256 managedTokenId_) external nonReentrant {
+        require(IVotingEscrow(_ve).isApprovedOrOwner(msg.sender, tokenId_), "!approved/Owner");
+        _voteDelay(tokenId_);
+        _checkEndVoteWindow();
+
+        IManagedNFTManager(managedNFTManager).onAttachToManagedNFT(tokenId_, managedTokenId_);
+
+        _poke(managedTokenId_);
+
+        emit AttachToManagedNFT(tokenId_, managedTokenId_);
+    }
+
+    /**
+     * @notice Detaches a tokenId from its managed tokenId.
+     * @dev Requires the sender to be the owner or approved. Also adjusts the voting weight post-detachment.
+     * @param tokenId_ The user's tokenId to be detached.
+     */
+    function dettachFromManagedNFT(uint256 tokenId_) external nonReentrant {
+        require(IVotingEscrow(_ve).isApprovedOrOwner(msg.sender, tokenId_), "!approved/Owner");
+        _voteDelay(tokenId_);
+        _checkEndVoteWindow();
+
+        IManagedNFTManager managedNFTManagerCache = IManagedNFTManager(managedNFTManager);
+
+        uint256 managedTokenId = managedNFTManagerCache.getAttachedManagedTokenId(tokenId_);
+
+        managedNFTManagerCache.onDettachFromManagedNFT(tokenId_);
+
+        uint256 weight = IVotingEscrowV1_2(_ve).balanceOfNftIgnoreOwnershipChange(managedTokenId);
+        if (weight == 0) {
+            _reset(managedTokenId);
+            delete lastVoted[managedTokenId];
+        } else {
+            _poke(managedTokenId);
+        }
+
+        emit DettachFromManagedNFT(tokenId_);
+    }
+
+    /**
+     * @notice Sets the Managed NFT Manager address.
+     * @param managedNFTManager_ The address of the Managed NFT Manager.
+     */
+    function setManagedNFTManager(address managedNFTManager_) external VoterAdmin {
+        managedNFTManager = managedNFTManager_;
+        emit SetManagedNFTManager(managedNFTManager_);
+    }
+
+    /**
+     * @notice Sets the duration of the distribution window for voting.
+     * @param distributionWindowDuration_ The duration in seconds.
+     */
+    function setDistributionWindowDuration(uint256 distributionWindowDuration_) external VoterAdmin {
+        distributionWindowDuration = distributionWindowDuration_;
+        emit SetDistributionWindowDuration(distributionWindowDuration_);
+    }
+
+    /**
+     * @dev Updates the voting preferences for a given tokenId after changes in the system.
+     * @param tokenId_ The tokenId for which to update voting preferences.
+     */
+    function _poke(uint256 tokenId_) internal {
+        address[] memory _poolVote = poolVote[tokenId_];
+        uint256[] memory _weights = new uint256[](_poolVote.length);
+
+        for (uint256 i; i < _poolVote.length; ) {
+            _weights[i] = votes[tokenId_][_poolVote[i]];
+            unchecked {
+                i++;
+            }
+        }
+
+        _vote(tokenId_, _poolVote, _weights);
+
+        lastVoted[tokenId_] = _epochTimestamp() + 1;
+    }
+
+    /**
+     * @dev Checks if the current time is within the start of the vote window.
+     */
+    function _checkStartVoteWindow() internal view {
+        require(block.timestamp > (block.timestamp - (block.timestamp % _WEEK) + distributionWindowDuration), "distribute window");
+    }
+
+    /**
+     * @dev Checks if the current time is within the end of the vote window.
+     */
+    function _checkEndVoteWindow() internal view {
+        require(block.timestamp < (block.timestamp - (block.timestamp % _WEEK) + _WEEK - distributionWindowDuration), "distribute window");
+    }
+
+    /**
+     * @dev This empty reserved space is put in place to allow future versions to add new
+     * variables without shifting down storage in the inheritance chain.
+     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
+     */
+    uint256[50] private __gap;
+}
diff --git a/contracts/core/VotingEscrowUpgradeableV1_2.sol b/contracts/core/VotingEscrowUpgradeableV1_2.sol
new file mode 100644
index 0000000..05abf91
--- /dev/null
+++ b/contracts/core/VotingEscrowUpgradeableV1_2.sol
@@ -0,0 +1,1274 @@
+// SPDX-License-Identifier: MIT
+pragma solidity =0.8.19;
+
+import {IERC721MetadataUpgradeable, IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721MetadataUpgradeable.sol";
+import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
+import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
+import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
+import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
+
+import {IVeArtProxyUpgradeable} from "./interfaces/IVeArtProxyUpgradeable.sol";
+import {IVeBoost} from "./interfaces/IVeBoost.sol";
+import {BlastGovernorSetup} from "../integration/BlastGovernorSetup.sol";
+import {IVotingEscrowV1_2} from "./interfaces/IVotingEscrowV1_2.sol";
+import {IManagedNFTManager} from "../nest/interfaces/IManagedNFTManager.sol";
+
+/// @title Voting Escrow
+/// @notice veNFT implementation that escrows ERC-20 tokens in the form of an ERC-721 NFT
+/// @notice Votes have a weight depending on time, so that users are committed to the future of (whatever they are voting for)
+/// @author Modified from Solidly (https://github.com/solidlyexchange/solidly/blob/master/contracts/ve.sol)
+/// @author Modified from Curve (https://github.com/curvefi/curve-dao-contracts/blob/master/contracts/VotingEscrow.vy)
+/// @author Modified from Nouns DAO (https://github.com/withtally/my-nft-dao-project/blob/main/contracts/ERC721Checkpointable.sol)
+/// @dev Vote weight decays linearly over time. Lock time cannot be more than `MAXTIME` (182 days).
+contract VotingEscrowUpgradeableV1_2 is
+    IVotingEscrowV1_2,
+    IERC721Upgradeable,
+    IERC721MetadataUpgradeable,
+    Initializable,
+    ReentrancyGuardUpgradeable,
+    BlastGovernorSetup
+{
+    enum DepositType {
+        DEPOSIT_FOR_TYPE,
+        CREATE_LOCK_TYPE,
+        INCREASE_LOCK_AMOUNT,
+        INCREASE_UNLOCK_TIME,
+        MERGE_TYPE,
+        SPLIT_TYPE
+    }
+
+    struct LockedBalance {
+        int128 amount;
+        uint end;
+        bool isPermanentLocked;
+    }
+
+    struct Point {
+        int128 bias;
+        int128 slope; // # -dweight / dt
+        uint ts;
+        uint blk; // block
+    }
+    /* We cannot really do block numbers per se b/c slope is per time, not per block
+     * and per block could be fairly bad b/c Ethereum changes blocktimes.
+     * What we can do is to extrapolate ***At functions */
+
+    /// @notice A checkpoint for marking delegated tokenIds from a given timestamp
+    struct Checkpoint {
+        uint timestamp;
+        uint[] tokenIds;
+    }
+
+    /*//////////////////////////////////////////////////////////////
+                                 EVENTS
+    //////////////////////////////////////////////////////////////*/
+
+    event Deposit(address indexed provider, uint tokenId, uint value, uint indexed locktime, DepositType deposit_type, uint ts);
+    event Withdraw(address indexed provider, uint tokenId, uint value, uint ts);
+    event Supply(uint prevSupply, uint supply);
+
+    /*//////////////////////////////////////////////////////////////
+                               CONSTRUCTOR
+    //////////////////////////////////////////////////////////////*/
+
+    address public token;
+    address public voter;
+    address public team;
+    address public artProxy;
+    address public veBoost;
+
+    mapping(uint => Point) public point_history; // epoch -> unsigned point
+
+    /// @dev Mapping of interface id to bool about whether or not it's supported
+    mapping(bytes4 => bool) public supportsInterface;
+
+    /// @dev Current count of token
+    uint256 public tokenId;
+
+    constructor() {
+        _disableInitializers();
+    }
+
+    /// @notice Contract constructor
+    /// @param token_addr `Fenix` token address
+    function initialize(address governor_, address token_addr, address art_proxy) external initializer {
+        __ReentrancyGuard_init();
+        __BlastGovernorSetup_init(governor_);
+
+        token = token_addr;
+        voter = msg.sender;
+        team = msg.sender;
+        artProxy = art_proxy;
+
+        point_history[0].blk = block.number;
+        point_history[0].ts = block.timestamp;
+
+        supportsInterface[0x01ffc9a7] = true; // ERC165_INTERFACE_ID
+        supportsInterface[0x80ac58cd] = true; // ERC721_INTERFACE_ID
+        supportsInterface[0x5b5e139f] = true; // ERC721_METADATA_INTERFACE_ID
+
+        // mint-ish
+        emit Transfer(address(0), address(this), tokenId);
+        // burn-ish
+        emit Transfer(address(this), address(0), tokenId);
+    }
+
+    /*///////////////////////////////////////////////////////////////
+                             METADATA STORAGE
+    //////////////////////////////////////////////////////////////*/
+
+    string public constant name = "veFenix";
+    string public constant symbol = "veFNX";
+    string public constant version = "1.2.0";
+    uint8 public constant decimals = 18;
+
+    function setTeam(address _team) external {
+        _checkOnlyTeamAccess();
+        team = _team;
+    }
+
+    function setArtProxy(address _proxy) external {
+        _checkOnlyTeamAccess();
+        artProxy = _proxy;
+    }
+
+    function setVeBoost(address _veBoost) external {
+        _checkOnlyTeamAccess();
+        veBoost = _veBoost;
+    }
+
+    /// @dev Returns current token URI metadata
+    /// @param _tokenId Token ID to fetch URI for.
+    function tokenURI(uint _tokenId) external view returns (string memory) {
+        require(idToOwner[_tokenId] != address(0), "Query for nonexistent token");
+        LockedBalance memory _locked = locked[_tokenId];
+        return
+            IVeArtProxyUpgradeable(artProxy).tokenURI(
+                _tokenId,
+                _balanceOfNFT(_tokenId, block.timestamp),
+                _locked.end,
+                uint(int256(_locked.amount))
+            );
+    }
+
+    /*//////////////////////////////////////////////////////////////
+                      ERC721 BALANCE/OWNER STORAGE
+    //////////////////////////////////////////////////////////////*/
+
+    /// @dev Mapping from NFT ID to the address that owns it.
+    mapping(uint => address) internal idToOwner;
+
+    /// @dev Mapping from owner address to count of his tokens.
+    mapping(address => uint) internal ownerToNFTokenCount;
+
+    /// @dev Returns the address of the owner of the NFT.
+    /// @param _tokenId The identifier for an NFT.
+    function ownerOf(uint _tokenId) public view returns (address) {
+        return idToOwner[_tokenId];
+    }
+
+    /// @dev Returns the number of NFTs owned by `_owner`.
+    ///      Throws if `_owner` is the zero address. NFTs assigned to the zero address are considered invalid.
+    /// @param _owner Address for whom to query the balance.
+    function balanceOf(address _owner) external view returns (uint) {
+        return ownerToNFTokenCount[_owner];
+    }
+
+    /*//////////////////////////////////////////////////////////////
+                         ERC721 APPROVAL STORAGE
+    //////////////////////////////////////////////////////////////*/
+
+    /// @dev Mapping from NFT ID to approved address.
+    mapping(uint => address) internal idToApprovals;
+
+    /// @dev Mapping from owner address to mapping of operator addresses.
+    mapping(address => mapping(address => bool)) internal ownerToOperators;
+
+    mapping(uint => uint) public ownership_change;
+
+    /// @dev Get the approved address for a single NFT.
+    /// @param _tokenId ID of the NFT to query the approval of.
+    function getApproved(uint _tokenId) external view returns (address) {
+        return idToApprovals[_tokenId];
+    }
+
+    /// @dev Checks if `_operator` is an approved operator for `_owner`.
+    /// @param _owner The address that owns the NFTs.
+    /// @param _operator The address that acts on behalf of the owner.
+    function isApprovedForAll(address _owner, address _operator) external view returns (bool) {
+        return (ownerToOperators[_owner])[_operator];
+    }
+
+    /*//////////////////////////////////////////////////////////////
+                              ERC721 LOGIC
+    //////////////////////////////////////////////////////////////*/
+
+    /// @dev Set or reaffirm the approved address for an NFT. The zero address indicates there is no approved address.
+    ///      Throws unless `msg.sender` is the current NFT owner, or an authorized operator of the current owner.
+    ///      Throws if `_tokenId` is not a valid NFT. (NOTE: This is not written the EIP)
+    ///      Throws if `_approved` is the current owner. (NOTE: This is not written the EIP)
+    /// @param _approved Address to be approved for the given NFT ID.
+    /// @param _tokenId ID of the token to be approved.
+    function approve(address _approved, uint _tokenId) public {
+        address owner = idToOwner[_tokenId];
+        // Throws if `_tokenId` is not a valid NFT
+        require(owner != address(0));
+        // Throws if `_approved` is the current owner
+        require(_approved != owner);
+        // Check requirements
+        bool senderIsOwner = (idToOwner[_tokenId] == msg.sender);
+        bool senderIsApprovedForAll = (ownerToOperators[owner])[msg.sender];
+        require(senderIsOwner || senderIsApprovedForAll);
+        // Set the approval
+        idToApprovals[_tokenId] = _approved;
+        emit Approval(owner, _approved, _tokenId);
+    }
+
+    /// @dev Enables or disables approval for a third party ("operator") to manage all of
+    ///      `msg.sender`'s assets. It also emits the ApprovalForAll event.
+    ///      Throws if `_operator` is the `msg.sender`. (NOTE: This is not written the EIP)
+    /// @notice This works even if sender doesn't own any tokens at the time.
+    /// @param _operator Address to add to the set of authorized operators.
+    /// @param _approved True if the operators is approved, false to revoke approval.
+    function setApprovalForAll(address _operator, bool _approved) external {
+        // Throws if `_operator` is the `msg.sender`
+        assert(_operator != msg.sender);
+        ownerToOperators[msg.sender][_operator] = _approved;
+        emit ApprovalForAll(msg.sender, _operator, _approved);
+    }
+
+    /* TRANSFER FUNCTIONS */
+    /// @dev Clear an approval of a given address
+    ///      Throws if `_owner` is not the current owner.
+    function _clearApproval(address _owner, uint _tokenId) internal {
+        // Throws if `_owner` is not the current owner
+        assert(idToOwner[_tokenId] == _owner);
+        if (idToApprovals[_tokenId] != address(0)) {
+            // Reset approvals
+            idToApprovals[_tokenId] = address(0);
+        }
+    }
+
+    /// @dev Returns whether the given spender can transfer a given token ID
+    /// @param _spender address of the spender to query
+    /// @param _tokenId uint ID of the token to be transferred
+    /// @return bool whether the msg.sender is approved for the given token ID, is an operator of the owner, or is the owner of the token
+    function _isApprovedOrOwner(address _spender, uint _tokenId) internal view returns (bool) {
+        address owner = idToOwner[_tokenId];
+        bool spenderIsOwner = owner == _spender;
+        bool spenderIsApproved = _spender == idToApprovals[_tokenId];
+        bool spenderIsApprovedForAll = (ownerToOperators[owner])[_spender];
+        return spenderIsOwner || spenderIsApproved || spenderIsApprovedForAll;
+    }
+
+    function isApprovedOrOwner(address _spender, uint _tokenId) external view returns (bool) {
+        return _isApprovedOrOwner(_spender, _tokenId);
+    }
+
+    /// @dev Exeute transfer of a NFT.
+    ///      Throws unless `msg.sender` is the current owner, an authorized operator, or the approved
+    ///      address for this NFT. (NOTE: `msg.sender` not allowed in internal function so pass `_sender`.)
+    ///      Throws if `_to` is the zero address.
+    ///      Throws if `_from` is not the current owner.
+    ///      Throws if `_tokenId` is not a valid NFT.
+    function _transferFrom(address _from, address _to, uint _tokenId, address _sender) internal {
+        require(!voted[_tokenId], "attached");
+        // Check requirements
+        require(_isApprovedOrOwner(_sender, _tokenId));
+        // Clear approval. Throws if `_from` is not the current owner
+        _clearApproval(_from, _tokenId);
+        // Remove NFT. Throws if `_tokenId` is not a valid NFT
+        _removeTokenFrom(_from, _tokenId);
+        // Add NFT
+        _addTokenTo(_to, _tokenId);
+        // Set the block of ownership transfer (for Flash NFT protection)
+        ownership_change[_tokenId] = block.number;
+        // Log the transfer
+        emit Transfer(_from, _to, _tokenId);
+    }
+
+    /// @dev Throws unless `msg.sender` is the current owner, an authorized operator, or the approved address for this NFT.
+    ///      Throws if `_from` is not the current owner.
+    ///      Throws if `_to` is the zero address.
+    ///      Throws if `_tokenId` is not a valid NFT.
+    /// @notice The caller is responsible to confirm that `_to` is capable of receiving NFTs or else
+    ///        they maybe be permanently lost.
+    /// @param _from The current owner of the NFT.
+    /// @param _to The new owner.
+    /// @param _tokenId The NFT to transfer.
+    function transferFrom(address _from, address _to, uint _tokenId) external {
+        _transferFrom(_from, _to, _tokenId, msg.sender);
+    }
+
+    /// @dev Transfers the ownership of an NFT from one address to another address.
+    ///      Throws unless `msg.sender` is the current owner, an authorized operator, or the
+    ///      approved address for this NFT.
+    ///      Throws if `_from` is not the current owner.
+    ///      Throws if `_to` is the zero address.
+    ///      Throws if `_tokenId` is not a valid NFT.
+    ///      If `_to` is a smart contract, it calls `onERC721Received` on `_to` and throws if
+    ///      the return value is not `bytes4(keccak256("onERC721Received(address,address,uint,bytes)"))`.
+    /// @param _from The current owner of the NFT.
+    /// @param _to The new owner.
+    /// @param _tokenId The NFT to transfer.
+    function safeTransferFrom(address _from, address _to, uint _tokenId) external {
+        safeTransferFrom(_from, _to, _tokenId, "");
+    }
+
+    /// @dev Transfers the ownership of an NFT from one address to another address.
+    ///      Throws unless `msg.sender` is the current owner, an authorized operator, or the
+    ///      approved address for this NFT.
+    ///      Throws if `_from` is not the current owner.
+    ///      Throws if `_to` is the zero address.
+    ///      Throws if `_tokenId` is not a valid NFT.
+    ///      If `_to` is a smart contract, it calls `onERC721Received` on `_to` and throws if
+    ///      the return value is not `bytes4(keccak256("onERC721Received(address,address,uint,bytes)"))`.
+    /// @param _from The current owner of the NFT.
+    /// @param _to The new owner.
+    /// @param _tokenId The NFT to transfer.
+    /// @param _data Additional data with no specified format, sent in call to `_to`.
+    function safeTransferFrom(address _from, address _to, uint _tokenId, bytes memory _data) public {
+        _transferFrom(_from, _to, _tokenId, msg.sender);
+
+        if (_to.code.length > 0) {
+            // Throws if transfer destination is a contract which does not implement 'onERC721Received'
+            try IERC721Receiver(_to).onERC721Received(msg.sender, _from, _tokenId, _data) returns (bytes4 response) {
+                if (response != IERC721Receiver(_to).onERC721Received.selector) {
+                    revert("ERC721: ERC721Receiver rejected tokens");
+                }
+            } catch (bytes memory reason) {
+                if (reason.length == 0) {
+                    revert("ERC721: transfer to non ERC721Receiver implementer");
+                } else {
+                    assembly {
+                        revert(add(32, reason), mload(reason))
+                    }
+                }
+            }
+        }
+    }
+
+    /*//////////////////////////////////////////////////////////////
+                        INTERNAL MINT/BURN LOGIC
+    //////////////////////////////////////////////////////////////*/
+
+    /// @dev Mapping from owner address to mapping of index to tokenIds
+    mapping(address => mapping(uint => uint)) internal ownerToNFTokenIdList;
+
+    /// @dev Mapping from NFT ID to index of owner
+    mapping(uint => uint) internal tokenToOwnerIndex;
+
+    /// @dev  Get token by index
+    function tokenOfOwnerByIndex(address _owner, uint _tokenIndex) external view returns (uint) {
+        return ownerToNFTokenIdList[_owner][_tokenIndex];
+    }
+
+    /// @dev Add a NFT to an index mapping to a given address
+    /// @param _to address of the receiver
+    /// @param _tokenId uint ID Of the token to be added
+    function _addTokenToOwnerList(address _to, uint _tokenId) internal {
+        uint current_count = ownerToNFTokenCount[_to];
+
+        ownerToNFTokenIdList[_to][current_count] = _tokenId;
+        tokenToOwnerIndex[_tokenId] = current_count;
+    }
+
+    /// @dev Add a NFT to a given address
+    ///      Throws if `_tokenId` is owned by someone.
+    function _addTokenTo(address _to, uint _tokenId) internal {
+        // Throws if `_tokenId` is owned by someone
+        assert(idToOwner[_tokenId] == address(0));
+        // Change the owner
+        idToOwner[_tokenId] = _to;
+        // Update owner token index tracking
+        _addTokenToOwnerList(_to, _tokenId);
+        // Change count tracking
+        ownerToNFTokenCount[_to] += 1;
+    }
+
+    /// @dev Function to mint tokens
+    ///      Throws if `_to` is zero address.
+    ///      Throws if `_tokenId` is owned by someone.
+    /// @param _to The address that will receive the minted tokens.
+    /// @param _tokenId The token id to mint.
+    /// @return A boolean that indicates if the operation was successful.
+    function _mint(address _to, uint _tokenId) internal returns (bool) {
+        // Throws if `_to` is zero address
+        assert(_to != address(0));
+        // Add NFT. Throws if `_tokenId` is owned by someone
+        _addTokenTo(_to, _tokenId);
+        emit Transfer(address(0), _to, _tokenId);
+        return true;
+    }
+
+    /// @dev Remove a NFT from an index mapping to a given address
+    /// @param _from address of the sender
+    /// @param _tokenId uint ID Of the token to be removed
+    function _removeTokenFromOwnerList(address _from, uint _tokenId) internal {
+        // Delete
+        uint current_count = ownerToNFTokenCount[_from] - 1;
+        uint current_index = tokenToOwnerIndex[_tokenId];
+
+        if (current_count == current_index) {
+            // update ownerToNFTokenIdList
+            ownerToNFTokenIdList[_from][current_count] = 0;
+            // update tokenToOwnerIndex
+            tokenToOwnerIndex[_tokenId] = 0;
+        } else {
+            uint lastTokenId = ownerToNFTokenIdList[_from][current_count];
+
+            // Add
+            // update ownerToNFTokenIdList
+            ownerToNFTokenIdList[_from][current_index] = lastTokenId;
+            // update tokenToOwnerIndex
+            tokenToOwnerIndex[lastTokenId] = current_index;
+
+            // Delete
+            // update ownerToNFTokenIdList
+            ownerToNFTokenIdList[_from][current_count] = 0;
+            // update tokenToOwnerIndex
+            tokenToOwnerIndex[_tokenId] = 0;
+        }
+    }
+
+    /// @dev Remove a NFT from a given address
+    ///      Throws if `_from` is not the current owner.
+    function _removeTokenFrom(address _from, uint _tokenId) internal {
+        // Throws if `_from` is not the current owner
+        assert(idToOwner[_tokenId] == _from);
+        // Change the owner
+        idToOwner[_tokenId] = address(0);
+        // Update owner token index tracking
+        _removeTokenFromOwnerList(_from, _tokenId);
+        // Change count tracking
+        ownerToNFTokenCount[_from] -= 1;
+    }
+
+    function _burn(uint _tokenId) internal {
+        require(_isApprovedOrOwner(msg.sender, _tokenId), "caller is not owner nor approved");
+
+        address owner = ownerOf(_tokenId);
+
+        // Clear approval
+        approve(address(0), _tokenId);
+        // Remove token
+        //_removeTokenFrom(msg.sender, _tokenId);
+        _removeTokenFrom(owner, _tokenId);
+
+        emit Transfer(owner, address(0), _tokenId);
+    }
+
+    /*//////////////////////////////////////////////////////////////
+                             ESCROW STORAGE
+    //////////////////////////////////////////////////////////////*/
+
+    mapping(uint => uint) public user_point_epoch;
+    mapping(uint => Point[1000000000]) public user_point_history; // user -> Point[user_epoch]
+    mapping(uint => LockedBalance) public locked;
+    uint public epoch;
+    mapping(uint => int128) public slope_changes; // time -> signed slope change
+    uint public supply;
+
+    uint internal constant WEEK = 1 weeks;
+    uint internal constant MAXTIME = 182 * 86400;
+    int128 internal constant iMAXTIME = 182 * 86400;
+    uint internal constant MULTIPLIER = 1 ether;
+
+    /// @notice Record global and per-user data to checkpoint
+    /// @param _tokenId NFT token ID. No user checkpoint if 0
+    /// @param old_locked Pevious locked amount / end lock time for the user
+    /// @param new_locked New locked amount / end lock time for the user
+    function _checkpoint(uint _tokenId, LockedBalance memory old_locked, LockedBalance memory new_locked) internal {
+        Point memory u_old;
+        Point memory u_new;
+        int128 old_dslope = 0;
+        int128 new_dslope = 0;
+        uint _epoch = epoch;
+        int128 permanent;
+
+        if (_tokenId != 0) {
+            permanent = new_locked.isPermanentLocked ? new_locked.amount : int128(0);
+
+            // Calculate slopes and biases
+            // Kept at zero when they have to
+            if (old_locked.end > block.timestamp && old_locked.amount > 0) {
+                u_old.slope = old_locked.amount / iMAXTIME;
+                u_old.bias = u_old.slope * int128(int256(old_locked.end - block.timestamp));
+            }
+            if (new_locked.end > block.timestamp && new_locked.amount > 0) {
+                u_new.slope = new_locked.amount / iMAXTIME;
+                u_new.bias = u_new.slope * int128(int256(new_locked.end - block.timestamp));
+            }
+
+            // Read values of scheduled changes in the slope
+            // old_locked.end can be in the past and in the future
+            // new_locked.end can ONLY by in the FUTURE unless everything expired: than zeros
+            old_dslope = slope_changes[old_locked.end];
+            if (new_locked.end != 0) {
+                if (new_locked.end == old_locked.end) {
+                    new_dslope = old_dslope;
+                } else {
+                    new_dslope = slope_changes[new_locked.end];
+                }
+            }
+        }
+
+        Point memory last_point = Point({bias: 0, slope: 0, ts: block.timestamp, blk: block.number});
+        uint256 permanentLockSupply = 0;
+        if (_epoch > 0) {
+            last_point = point_history[_epoch];
+            permanentLockSupply = permanentTotalSupplyPoints[_epoch];
+        }
+        uint last_checkpoint = last_point.ts;
+        // initial_last_point is used for extrapolation to calculate block number
+        // (approximately, for *At methods) and save them
+        // as we cannot figure that out exactly from inside the contract
+        Point memory initial_last_point = last_point;
+        uint block_slope = 0; // dblock/dt
+        if (block.timestamp > last_point.ts) {
+            block_slope = (MULTIPLIER * (block.number - last_point.blk)) / (block.timestamp - last_point.ts);
+        }
+        // If last point is already recorded in this block, slope=0
+        // But that's ok b/c we know the block in such case
+
+        // Go over weeks to fill history and calculate what the current point is
+        {
+            uint t_i = (last_checkpoint / WEEK) * WEEK;
+            for (uint i = 0; i < 255; ++i) {
+                // Hopefully it won't happen that this won't get used in 5 years!
+                // If it does, users will be able to withdraw but vote weight will be broken
+                t_i += WEEK;
+                int128 d_slope = 0;
+                if (t_i > block.timestamp) {
+                    t_i = block.timestamp;
+                } else {
+                    d_slope = slope_changes[t_i];
+                }
+                last_point.bias -= last_point.slope * int128(int256(t_i - last_checkpoint));
+                last_point.slope += d_slope;
+                if (last_point.bias < 0) {
+                    // This can happen
+                    last_point.bias = 0;
+                }
+                if (last_point.slope < 0) {
+                    // This cannot happen - just in case
+                    last_point.slope = 0;
+                }
+                last_checkpoint = t_i;
+                last_point.ts = t_i;
+                last_point.blk = initial_last_point.blk + (block_slope * (t_i - initial_last_point.ts)) / MULTIPLIER;
+                _epoch += 1;
+                if (t_i == block.timestamp) {
+                    last_point.blk = block.number;
+                    break;
+                } else {
+                    point_history[_epoch] = last_point;
+                    permanentTotalSupplyPoints[_epoch] = permanentLockSupply;
+                }
+            }
+        }
+
+        epoch = _epoch;
+        // Now point_history is filled until t=now
+
+        if (_tokenId != 0) {
+            // If last point was in this block, the slope change has been applied already
+            // But in such case we have 0 slope(s)
+            last_point.slope += (u_new.slope - u_old.slope);
+            last_point.bias += (u_new.bias - u_old.bias);
+            if (last_point.slope < 0) {
+                last_point.slope = 0;
+            }
+            if (last_point.bias < 0) {
+                last_point.bias = 0;
+            }
+        }
+
+        // Record the changed point into history
+        point_history[_epoch] = last_point;
+        permanentTotalSupplyPoints[_epoch] = permanentTotalSupply;
+
+        if (_tokenId != 0) {
+            // Schedule the slope changes (slope is going down)
+            // We subtract new_user_slope from [new_locked.end]
+            // and add old_user_slope to [old_locked.end]
+            if (old_locked.end > block.timestamp) {
+                // old_dslope was <something> - u_old.slope, so we cancel that
+                old_dslope += u_old.slope;
+                if (new_locked.end == old_locked.end) {
+                    old_dslope -= u_new.slope; // It was a new deposit, not extension
+                }
+                slope_changes[old_locked.end] = old_dslope;
+            }
+
+            if (new_locked.end > block.timestamp) {
+                if (new_locked.end > old_locked.end) {
+                    new_dslope -= u_new.slope; // old slope disappeared at this point
+                    slope_changes[new_locked.end] = new_dslope;
+                }
+                // else: we recorded it already in old_dslope
+            }
+            // Now handle user history
+            uint user_epoch = user_point_epoch[_tokenId] + 1;
+
+            user_point_epoch[_tokenId] = user_epoch;
+            u_new.ts = block.timestamp;
+            u_new.blk = block.number;
+            user_point_history[_tokenId][user_epoch] = u_new;
+            permanentPoints[_tokenId][user_epoch] = permanent;
+        }
+    }
+
+    /// @notice Deposit and lock tokens for a user
+    /// @param _tokenId NFT that holds lock
+    /// @param _value Amount to deposit
+    /// @param unlock_time New time when to unlock the tokens, or 0 if unchanged
+    /// @param locked_balance Previous locked amount / timestamp
+    /// @param deposit_type The type of deposit
+    function _deposit_for(
+        uint _tokenId,
+        uint _value,
+        uint unlock_time,
+        LockedBalance memory locked_balance,
+        DepositType deposit_type,
+        bool isShouldBoosted
+    ) internal {
+        LockedBalance memory _locked = locked_balance;
+        uint supply_before = supply;
+
+        supply += _value;
+        LockedBalance memory old_locked;
+        (old_locked.amount, old_locked.end, old_locked.isPermanentLocked) = (_locked.amount, _locked.end, _locked.isPermanentLocked);
+
+        if (old_locked.isPermanentLocked) {
+            permanentTotalSupply += _value;
+        }
+
+        // Adding to existing lock, or if a lock is expired - creating a new one
+        _locked.amount += int128(int256(_value));
+        if (unlock_time != 0 && !old_locked.isPermanentLocked) {
+            _locked.end = unlock_time;
+        }
+        uint256 boostedValue;
+        IVeBoost veBoostCached = IVeBoost(veBoost);
+        {
+            if (address(veBoostCached) != address(0) && isShouldBoosted) {
+                if (
+                    deposit_type == DepositType.CREATE_LOCK_TYPE ||
+                    deposit_type == DepositType.DEPOSIT_FOR_TYPE ||
+                    deposit_type == DepositType.INCREASE_LOCK_AMOUNT
+                ) {
+                    uint256 minLockedEndTime = ((block.timestamp + veBoostCached.getMinLockedTimeForBoost()) / WEEK) * WEEK;
+                    if (minLockedEndTime <= _locked.end && _value >= veBoostCached.getMinFNXAmountForBoost()) {
+                        uint256 calculatedBoostValue = veBoostCached.calculateBoostFNXAmount(_value);
+                        uint256 availableFNXBoostAmount = veBoostCached.getAvailableBoostFNXAmount();
+                        boostedValue = calculatedBoostValue < availableFNXBoostAmount ? calculatedBoostValue : availableFNXBoostAmount;
+                        if (boostedValue > 0) {
+                            _locked.amount += int128(int256(boostedValue));
+                            if (old_locked.isPermanentLocked) {
+                                permanentTotalSupply += _value;
+                            }
+                        }
+                    }
+                }
+            }
+        }
+
+        supply += boostedValue;
+
+        locked[_tokenId] = _locked;
+
+        _checkpoint(_tokenId, old_locked, _locked);
+
+        address from = msg.sender;
+        if (_value != 0 && deposit_type != DepositType.MERGE_TYPE && deposit_type != DepositType.SPLIT_TYPE) {
+            assert(IERC20(token).transferFrom(from, address(this), _value));
+
+            if (boostedValue > 0) {
+                veBoostCached.beforeFNXBoostPaid(idToOwner[_tokenId], _tokenId, _value, boostedValue);
+                assert(IERC20(token).transferFrom(address(veBoostCached), address(this), boostedValue));
+            }
+        }
+
+        emit Deposit(from, _tokenId, _value, _locked.end, deposit_type, block.timestamp);
+        emit Supply(supply_before, supply);
+    }
+
+    /// @notice Record global data to checkpoint
+    function checkpoint() external {
+        _checkpoint(0, LockedBalance(0, 0, false), LockedBalance(0, 0, false));
+    }
+
+    /// @notice Deposit `_value` tokens for `_tokenId` and add to the lock
+    /// @dev Anyone (even a smart contract) can deposit for someone else, but
+    ///      cannot extend their locktime and deposit for a brand new user
+    /// @param _tokenId lock NFT
+    /// @param _value Amount to add to user's lock
+    function deposit_for(uint _tokenId, uint _value) external nonReentrant {
+        require(_value > 0); // dev: need non-zero value
+
+        IManagedNFTManager managedNFTManagerCache = IManagedNFTManager(managedNFTManager);
+        require(!managedNFTManagerCache.isAttachedNFT(_tokenId), "attached");
+        LockedBalance memory lockedBalance = locked[_tokenId];
+        require(lockedBalance.amount > 0, "no lock found");
+        require(lockedBalance.isPermanentLocked || lockedBalance.end > block.timestamp, "expired lock");
+
+        _deposit_for(_tokenId, _value, 0, lockedBalance, DepositType.DEPOSIT_FOR_TYPE, true);
+    }
+
+    /// @notice Deposit `_value` tokens for `_tokenId` and add to the lock
+    /// @dev Anyone (even a smart contract) can deposit for someone else, but
+    ///      cannot extend their locktime and deposit for a brand new user
+    /// @param _tokenId lock NFT
+    /// @param _value Amount to add to user's lock
+    function deposit_for_without_boost(uint _tokenId, uint _value) external nonReentrant {
+        require(_value > 0); // dev: need non-zero value
+        IManagedNFTManager managedNFTManagerCache = IManagedNFTManager(managedNFTManager);
+        require(!managedNFTManagerCache.isAttachedNFT(_tokenId), "attached");
+        LockedBalance memory lockedBalance = locked[_tokenId];
+        if (!managedNFTManagerCache.isManagedNFT(_tokenId)) {
+            require(lockedBalance.amount > 0, "no lock found");
+        }
+        require(lockedBalance.isPermanentLocked || lockedBalance.end > block.timestamp, "expired lock");
+
+        _deposit_for(_tokenId, _value, 0, locked[_tokenId], DepositType.DEPOSIT_FOR_TYPE, false);
+    }
+
+    /// @notice Deposit `_value` tokens for `_to` and lock for `_lock_duration`
+    /// @param _value Amount to deposit
+    /// @param _lock_duration Number of seconds to lock tokens for (rounded down to nearest week)
+    /// @param _to Address to deposit
+    function _create_lock(uint _value, uint _lock_duration, address _to, bool isShouldBoosted) internal returns (uint) {
+        uint unlock_time = ((block.timestamp + _lock_duration) / WEEK) * WEEK; // Locktime is rounded down to weeks
+
+        require(_value > 0); // dev: need non-zero value
+        require(unlock_time > block.timestamp, "Can only lock until time in the future");
+        require(unlock_time <= block.timestamp + MAXTIME, "Voting lock can be 182 days max");
+
+        uint _tokenId = ++tokenId;
+        _mint(_to, _tokenId);
+
+        _deposit_for(_tokenId, _value, unlock_time, locked[_tokenId], DepositType.CREATE_LOCK_TYPE, isShouldBoosted);
+        return _tokenId;
+    }
+
+    /// @notice Deposit `_value` tokens for `msg.sender` and lock for `_lock_duration`
+    /// @param _value Amount to deposit
+    /// @param _lock_duration Number of seconds to lock tokens for (rounded down to nearest week)
+    function create_lock(uint _value, uint _lock_duration) external nonReentrant returns (uint) {
+        return _create_lock(_value, _lock_duration, msg.sender, true);
+    }
+
+    /// @notice Deposit `_value` tokens for `_to` and lock for `_lock_duration`
+    /// @param _value Amount to deposit
+    /// @param _lock_duration Number of seconds to lock tokens for (rounded down to nearest week)
+    /// @param _to Address to deposit
+    function create_lock_for(uint _value, uint _lock_duration, address _to) external nonReentrant returns (uint) {
+        return _create_lock(_value, _lock_duration, _to, true);
+    }
+
+    /// @notice Deposit `_value` tokens for `_to` and lock for `_lock_duration` without boost
+    /// @param _value Amount to deposit
+    /// @param _lock_duration Number of seconds to lock tokens for (rounded down to nearest week)
+    /// @param _to Address to deposit
+    function create_lock_for_without_boost(uint _value, uint _lock_duration, address _to) external nonReentrant returns (uint) {
+        return _create_lock(_value, _lock_duration, _to, false);
+    }
+
+    /// @notice Extend the unlock time for `_tokenId`
+    /// @param _lock_duration New number of seconds until tokens unlock
+    function increase_unlock_time(uint _tokenId, uint _lock_duration) external nonReentrant {
+        assert(_isApprovedOrOwner(msg.sender, _tokenId));
+
+        IManagedNFTManager managedNFTManagerCache = IManagedNFTManager(managedNFTManager);
+        require(!managedNFTManagerCache.isAttachedNFT(_tokenId), "attached");
+        LockedBalance memory _locked = locked[_tokenId];
+        require(_locked.amount > 0, "no lock found");
+        require(!_locked.isPermanentLocked, "is permanent lock");
+        require(_locked.end > block.timestamp, "expired lock");
+
+        uint unlock_time = ((block.timestamp + _lock_duration) / WEEK) * WEEK; // Locktime is rounded down to weeks
+        require(unlock_time > _locked.end, "only increase lock duration");
+        require(unlock_time <= block.timestamp + MAXTIME, "182 days max");
+
+        _deposit_for(_tokenId, 0, unlock_time, _locked, DepositType.INCREASE_UNLOCK_TIME, false);
+    }
+
+    /// @notice Withdraw all tokens for `_tokenId`
+    /// @dev Only possible if the lock has expired
+    function withdraw(uint _tokenId) external nonReentrant {
+        assert(_isApprovedOrOwner(msg.sender, _tokenId));
+        require(!voted[_tokenId], "attached");
+
+        LockedBalance memory _locked = locked[_tokenId];
+        require(!_locked.isPermanentLocked, "is permanent lock");
+
+        require(block.timestamp >= _locked.end, "The lock didn't expire");
+        uint value = uint(int256(_locked.amount));
+
+        locked[_tokenId] = LockedBalance(0, 0, false);
+        uint supply_before = supply;
+        supply = supply_before - value;
+
+        _checkpoint(_tokenId, _locked, LockedBalance(0, 0, false));
+
+        assert(IERC20(token).transfer(msg.sender, value));
+
+        // Burn the NFT
+        _burn(_tokenId);
+
+        emit Withdraw(msg.sender, _tokenId, value, block.timestamp);
+        emit Supply(supply_before, supply_before - value);
+    }
+
+    /*///////////////////////////////////////////////////////////////
+                           GAUGE VOTING STORAGE
+    //////////////////////////////////////////////////////////////*/
+
+    function _find_block_epoch(uint _block, uint max_epoch) internal view returns (uint) {
+        // Binary search
+        uint _min = 0;
+        uint _max = max_epoch;
+        for (uint i = 0; i < 128; ++i) {
+            // Will be always enough for 128-bit numbers
+            if (_min >= _max) {
+                break;
+            }
+            uint _mid = (_min + _max + 1) / 2;
+            if (point_history[_mid].blk <= _block) {
+                _min = _mid;
+            } else {
+                _max = _mid - 1;
+            }
+        }
+        return _min;
+    }
+
+    /// @notice Get the current voting power for `_tokenId`
+    /// @dev Adheres to the ERC20 `balanceOf` interface for Aragon compatibility
+    /// @param _tokenId NFT for lock
+    /// @param _t Epoch time to return voting power at
+    /// @return User voting power
+    function _balanceOfNFT(uint _tokenId, uint _t) internal view returns (uint) {
+        uint _epoch = user_point_epoch[_tokenId];
+        if (_epoch == 0) {
+            return 0;
+        } else {
+            Point memory last_point = user_point_history[_tokenId][_epoch];
+
+            int128 permanent = permanentPoints[_tokenId][_epoch];
+            if (permanent > 0) {
+                return uint256(int256(permanent));
+            }
+
+            last_point.bias -= last_point.slope * int128(int256(_t) - int256(last_point.ts));
+            if (last_point.bias < 0) {
+                last_point.bias = 0;
+            }
+            return uint(int256(last_point.bias));
+        }
+    }
+
+    function balanceOfNFT(uint _tokenId) external view returns (uint) {
+        if (ownership_change[_tokenId] == block.number) return 0;
+        return _balanceOfNFT(_tokenId, block.timestamp);
+    }
+
+    function balanceOfNftIgnoreOwnershipChange(uint _tokenId) external view returns (uint) {
+        return _balanceOfNFT(_tokenId, block.timestamp);
+    }
+
+    /// @notice Measure voting power of `_tokenId` at block height `_block`
+    /// @dev Adheres to MiniMe `balanceOfAt` interface: https://github.com/Giveth/minime
+    /// @param _tokenId User's wallet NFT
+    /// @param _block Block to calculate the voting power at
+    /// @return Voting power
+    function _balanceOfAtNFT(uint _tokenId, uint _block) internal view returns (uint) {
+        // Copying and pasting totalSupply code because Vyper cannot pass by
+        // reference yet
+        assert(_block <= block.number);
+
+        // Binary search
+        uint _min = 0;
+        uint _max = user_point_epoch[_tokenId];
+        for (uint i = 0; i < 128; ++i) {
+            // Will be always enough for 128-bit numbers
+            if (_min >= _max) {
+                break;
+            }
+            uint _mid = (_min + _max + 1) / 2;
+            if (user_point_history[_tokenId][_mid].blk <= _block) {
+                _min = _mid;
+            } else {
+                _max = _mid - 1;
+            }
+        }
+
+        Point memory upoint = user_point_history[_tokenId][_min];
+
+        uint max_epoch = epoch;
+        uint _epoch = _find_block_epoch(_block, max_epoch);
+        Point memory point_0 = point_history[_epoch];
+
+        int128 permanent = permanentPoints[_tokenId][_min];
+        if (permanent > 0) {
+            return uint(uint128(permanent));
+        }
+
+        uint d_block = 0;
+        uint d_t = 0;
+        if (_epoch < max_epoch) {
+            Point memory point_1 = point_history[_epoch + 1];
+            d_block = point_1.blk - point_0.blk;
+            d_t = point_1.ts - point_0.ts;
+        } else {
+            d_block = block.number - point_0.blk;
+            d_t = block.timestamp - point_0.ts;
+        }
+        uint block_time = point_0.ts;
+        if (d_block != 0) {
+            block_time += (d_t * (_block - point_0.blk)) / d_block;
+        }
+
+        upoint.bias -= upoint.slope * int128(int256(block_time - upoint.ts));
+        if (upoint.bias >= 0) {
+            return uint(uint128(upoint.bias));
+        } else {
+            return 0;
+        }
+    }
+
+    function balanceOfAtNFT(uint _tokenId, uint _block) external view returns (uint) {
+        return _balanceOfAtNFT(_tokenId, _block);
+    }
+
+    /// @notice Calculate total voting power at some point in the past
+    /// @param _block Block to calculate the total voting power at
+    /// @return Total voting power at `_block`
+    function totalSupplyAt(uint _block) external view returns (uint) {
+        assert(_block <= block.number);
+        uint _epoch = epoch;
+        uint target_epoch = _find_block_epoch(_block, _epoch);
+
+        Point memory point = point_history[target_epoch];
+        uint dt = 0;
+        if (target_epoch < _epoch) {
+            Point memory point_next = point_history[target_epoch + 1];
+            if (point.blk != point_next.blk) {
+                dt = ((_block - point.blk) * (point_next.ts - point.ts)) / (point_next.blk - point.blk);
+            }
+        } else {
+            if (point.blk != block.number) {
+                dt = ((_block - point.blk) * (block.timestamp - point.ts)) / (block.number - point.blk);
+            }
+        }
+        // Now dt contains info on how far are we beyond point
+        return _supply_at(point, point.ts + dt) + permanentTotalSupplyPoints[target_epoch];
+    }
+
+    /// @notice Calculate total voting power at some point in the past
+    /// @param point The point (bias/slope) to start search from
+    /// @param t Time to calculate the total voting power at
+    /// @return Total voting power at that time
+    function _supply_at(Point memory point, uint t) internal view returns (uint) {
+        Point memory last_point = point;
+        uint t_i = (last_point.ts / WEEK) * WEEK;
+        for (uint i = 0; i < 255; ++i) {
+            t_i += WEEK;
+            int128 d_slope = 0;
+            if (t_i > t) {
+                t_i = t;
+            } else {
+                d_slope = slope_changes[t_i];
+            }
+            last_point.bias -= last_point.slope * int128(int256(t_i - last_point.ts));
+            if (t_i == t) {
+                break;
+            }
+            last_point.slope += d_slope;
+            last_point.ts = t_i;
+        }
+
+        if (last_point.bias < 0) {
+            last_point.bias = 0;
+        }
+        return uint(uint128(last_point.bias));
+    }
+
+    function totalSupply() external view returns (uint) {
+        return totalSupplyAtT(block.timestamp);
+    }
+
+    /// @notice Calculate total voting power
+    /// @dev Adheres to the ERC20 `totalSupply` interface for Aragon compatibility
+    /// @return Total voting power
+    function totalSupplyAtT(uint t) public view returns (uint) {
+        uint _epoch = epoch;
+        Point memory last_point = point_history[_epoch];
+        return _supply_at(last_point, t) + permanentTotalSupplyPoints[epoch];
+    }
+
+    /*///////////////////////////////////////////////////////////////
+                            GAUGE VOTING LOGIC
+    //////////////////////////////////////////////////////////////*/
+
+    mapping(uint => uint) internal attachments;
+    mapping(uint => bool) public voted;
+
+    function setVoter(address _voter) external {
+        _checkOnlyTeamAccess();
+        voter = _voter;
+    }
+
+    function voting(uint _tokenId) external {
+        require(msg.sender == voter);
+        voted[_tokenId] = true;
+    }
+
+    function abstain(uint _tokenId) external {
+        require(msg.sender == voter);
+        voted[_tokenId] = false;
+    }
+
+    function merge(uint _from, uint _to) external {
+        require(!voted[_from], "attached");
+        require(_from != _to);
+        require(_isApprovedOrOwner(msg.sender, _from));
+        require(_isApprovedOrOwner(msg.sender, _to));
+
+        _onlyNormalNFT(_from);
+        _onlyNormalNFT(_to);
+
+        LockedBalance memory _locked0 = locked[_from];
+
+        require(!_locked0.isPermanentLocked, "from is permanent lock");
+
+        LockedBalance memory _locked1 = locked[_to];
+        uint value0 = uint(int256(_locked0.amount));
+
+        supply -= value0;
+
+        uint end = _locked0.end >= _locked1.end ? _locked0.end : _locked1.end;
+
+        locked[_from] = LockedBalance(0, 0, false);
+        _checkpoint(_from, _locked0, LockedBalance(0, 0, false));
+        _burn(_from);
+        _deposit_for(_to, value0, end, _locked1, DepositType.MERGE_TYPE, false);
+    }
+
+    function tokensOfOwner(address _usr) public view returns (uint256[] memory) {
+        uint _tbal = ownerToNFTokenCount[_usr];
+        uint256[] memory _ra = new uint256[](_tbal);
+        for (uint i; i < _tbal; i++) {
+            _ra[i] = ownerToNFTokenIdList[_usr][i];
+        }
+        return _ra;
+    }
+
+    /*///////////////////////////////////////////////////////////////
+        DAO VOTING STORAGE - DEPRECATED (ONLY FOR STORAGE SLOTS)
+    //////////////////////////////////////////////////////////////*/
+    mapping(address => address) private _delegates;
+    mapping(address => mapping(uint32 => Checkpoint)) internal checkpoints;
+    mapping(address => uint32) internal numCheckpoints;
+    mapping(address => uint) internal nonces;
+
+    /*///////////////////////////////////////////////////////////////
+                             Permanent lock logic
+    //////////////////////////////////////////////////////////////*/
+    uint256 public permanentTotalSupply;
+
+    mapping(uint256 tokenId => bool isPermanent) public isPermanentLocked;
+    mapping(uint256 tokenId => mapping(uint256 epoch => int128 permanentBalance)) public permanentPoints;
+    mapping(uint256 epoch => uint256 permanentTotalSupply) public permanentTotalSupplyPoints;
+
+    /**
+     * @notice Emitted when a token is permanently locked by a user.
+     * @dev This event is fired to signal that the specified token has been moved to a permanently locked state
+     * @param sender The address of the user who initiated the lock.
+     * @param tokenId The ID of the token that has been permanently locked.
+     */
+    event LockPermanent(address indexed sender, uint256 indexed tokenId);
+
+    /**
+     * @notice Emitted when a token is unlocked from a permanent lock state by a user.
+     * @dev This event indicates that the specified token has been released from its permanent lock status
+     * @param sender The address of the user who initiated the unlock.
+     * @param tokenId The ID of the token that has been unlocked from its permanent state.
+     */
+    event UnlockPermanent(address indexed sender, uint256 indexed tokenId);
+
+    function lockPermanent(uint256 tokenId_) external {
+        require(_isApprovedOrOwner(msg.sender, tokenId_));
+        _onlyNormalNFT(tokenId_);
+
+        LockedBalance memory lockedBalance = locked[tokenId_];
+        require(!lockedBalance.isPermanentLocked, "already locked");
+
+        require(lockedBalance.amount > 0, "no lock found");
+        if (!lockedBalance.isPermanentLocked) {
+            require(lockedBalance.end > block.timestamp, "expired lock");
+        }
+
+        uint256 amount = uint256(int256(lockedBalance.amount));
+
+        permanentTotalSupply += amount;
+
+        lockedBalance.end = 0;
+        lockedBalance.isPermanentLocked = true;
+
+        _checkpoint(tokenId_, locked[tokenId_], lockedBalance);
+
+        locked[tokenId_] = lockedBalance;
+
+        emit LockPermanent(msg.sender, tokenId_);
+    }
+
+    function unlockPermanent(uint256 tokenId_) external {
+        require(_isApprovedOrOwner(msg.sender, tokenId_));
+
+        _onlyNormalNFT(tokenId_);
+
+        require(!voted[tokenId_], "voted");
+
+        LockedBalance memory lockedBalance = locked[tokenId_];
+        require(lockedBalance.isPermanentLocked, "no permanent lock");
+
+        uint256 amount = uint256(int256(lockedBalance.amount));
+        permanentTotalSupply -= amount;
+        lockedBalance.end = _maxLockTimestamp();
+        lockedBalance.isPermanentLocked = false;
+
+        _checkpoint(tokenId_, locked[tokenId_], lockedBalance);
+
+        locked[tokenId_] = lockedBalance;
+
+        emit UnlockPermanent(msg.sender, tokenId_);
+    }
+
+    /*///////////////////////////////////////////////////////////////
+                             Managed VeFNX NFT Logic
+    //////////////////////////////////////////////////////////////*/
+    /// @notice Address of the Managed NFT Manager responsible for controlling the NFT logic.
+    address public managedNFTManager;
+
+    /**
+     * @notice Sets or updates the Managed NFT Manager address.
+     * @dev This function sets the address of the managed NFT manager and emits an event.
+     * @param managedNFTManager_ The new Managed NFT Manager address.
+     */
+    function setManagedNFTManager(address managedNFTManager_) external {
+        _checkOnlyTeamAccess();
+        managedNFTManager = managedNFTManager_;
+    }
+
+    /**
+     * @notice Creates a new managed NFT for a given recipient.
+     * @param recipient_ The address of the recipient to receive the newly created managed NFT.
+     * @return managedNftId The ID of the newly created managed NFT.
+     */
+    function createManagedNFT(address recipient_) external nonReentrant returns (uint256 managedNftId) {
+        _onlyManagedNFTManager();
+        managedNftId = ++tokenId;
+        _mint(recipient_, managedNftId);
+        _deposit_for(managedNftId, 0, 0, LockedBalance(0, 0, true), DepositType.CREATE_LOCK_TYPE, false);
+    }
+
+    /**
+     * @notice Attaches a token to a managed NFT.
+     * @dev Locks the original token's balance, transfers the locked amount to the managed NFT, and returns the amount locked.
+     * @param tokenId_ The ID of the user's token being attached.
+     * @param managedTokenId_ The ID of the managed token to which the user's token is being attached.
+     * @return The amount of tokens locked during the attach operation.
+     */
+    function onAttachToManagedNFT(uint256 tokenId_, uint256 managedTokenId_) external nonReentrant returns (uint256) {
+        _onlyManagedNFTManager();
+        _onlyNormalNFT(tokenId_);
+
+        require(!voted[tokenId_], "voted");
+
+        require(IManagedNFTManager(managedNFTManager).isManagedNFT(managedTokenId_), "not managed nft");
+
+        require(_balanceOfNFT(tokenId_, block.timestamp) > 0, "zero balance");
+
+        int128 amount = locked[tokenId_].amount;
+        uint256 cAmount = uint256(int256(amount));
+
+        if (locked[tokenId_].isPermanentLocked) {
+            permanentTotalSupply -= cAmount;
+        }
+
+        _checkpoint(tokenId_, locked[tokenId_], LockedBalance(0, 0, false));
+        locked[tokenId_] = LockedBalance(0, 0, false);
+
+        permanentTotalSupply += cAmount;
+
+        LockedBalance memory newLocked = locked[managedTokenId_];
+        newLocked.amount += amount;
+
+        _checkpoint(managedTokenId_, locked[managedTokenId_], newLocked);
+
+        locked[managedTokenId_] = newLocked;
+
+        return cAmount;
+    }
+
+    /**
+     * @notice Detaches a token from a managed NFT.
+     * @dev Unlocks the user's token balance that was previously attached to a managed NFT.
+     * @param tokenId_ The ID of the user's token being detached.
+     * @param managedTokenId_ The ID of the managed token from which the user's token is being detached.
+     * @param newBalance_ The new balance to set for the user's token post detachment.
+     */
+    function onDettachFromManagedNFT(uint256 tokenId_, uint256 managedTokenId_, uint256 newBalance_) external nonReentrant {
+        _onlyManagedNFTManager();
+
+        IManagedNFTManager managedNFTManagerCache = IManagedNFTManager(managedNFTManager);
+
+        require(managedNFTManagerCache.isManagedNFT(managedTokenId_), "not managed nft");
+        require(managedNFTManagerCache.isAttachedNFT(tokenId_) && locked[tokenId_].amount == 0, "not attached nft");
+
+        int128 amount = int128(int256(newBalance_));
+        LockedBalance memory newLocked = LockedBalance(amount, _maxLockTimestamp(), false);
+
+        _checkpoint(tokenId_, locked[tokenId_], newLocked);
+
+        locked[tokenId_] = newLocked;
+
+        permanentTotalSupply -= (newBalance_ < permanentTotalSupply ? newBalance_ : permanentTotalSupply);
+
+        LockedBalance memory newManagedLocked = locked[managedTokenId_];
+        newManagedLocked.amount -= amount < newManagedLocked.amount ? amount : newManagedLocked.amount;
+
+        _checkpoint(managedTokenId_, locked[managedTokenId_], newManagedLocked);
+
+        locked[managedTokenId_] = newManagedLocked;
+    }
+
+    /**
+     * @dev Internal function to enforce that only the managed NFT manager can call certain functions.
+     */
+    function _onlyManagedNFTManager() internal view {
+        require(msg.sender == managedNFTManager, "!managedNFTManager");
+    }
+
+    function _onlyNormalNFT(uint256 tokenId_) internal view {
+        IManagedNFTManager managedNFTManagerCache = IManagedNFTManager(managedNFTManager);
+        require(!managedNFTManagerCache.isAttachedNFT(tokenId_) && !managedNFTManagerCache.isManagedNFT(tokenId_), "not normal nft");
+    }
+
+    function _maxLockTimestamp() internal view returns (uint256) {
+        return ((block.timestamp + MAXTIME) / WEEK) * WEEK;
+    }
+
+    function _checkOnlyTeamAccess() internal view {
+        require(msg.sender == team);
+    }
+
+    /**
+     * @dev This empty reserved space is put in place to allow future versions to add new
+     * variables without shifting down storage in the inheritance chain.
+     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
+     */
+    uint256[50] private __gap;
+}
diff --git a/contracts/core/interfaces/IVoterV1_2.sol b/contracts/core/interfaces/IVoterV1_2.sol
new file mode 100644
index 0000000..55b8fe6
--- /dev/null
+++ b/contracts/core/interfaces/IVoterV1_2.sol
@@ -0,0 +1,20 @@
+// SPDX-License-Identifier: MIT
+pragma solidity >=0.8.0;
+
+interface IVoterV1_2 {
+    function vote(uint256 _tokenId, address[] calldata _poolVote, uint256[] calldata _weights) external;
+
+    function claimRewards(address[] memory _gauges) external;
+
+    /// @notice claim bribes rewards given a TokenID
+    function claimBribes(address[] memory _bribes, address[][] memory _tokens, uint256 _tokenId) external;
+
+    /// @notice claim fees rewards given a TokenID
+    function claimFees(address[] memory _fees, address[][] memory _tokens, uint256 _tokenId) external;
+
+    /// @notice claim bribes rewards given an address
+    function claimBribes(address[] memory _bribes, address[][] memory _tokens) external;
+
+    /// @notice claim fees rewards given an address
+    function claimFees(address[] memory _bribes, address[][] memory _tokens) external;
+}
diff --git a/contracts/core/interfaces/IVotingEscrowV1_2.sol b/contracts/core/interfaces/IVotingEscrowV1_2.sol
new file mode 100644
index 0000000..9763bbc
--- /dev/null
+++ b/contracts/core/interfaces/IVotingEscrowV1_2.sol
@@ -0,0 +1,16 @@
+// SPDX-License-Identifier: MIT
+pragma solidity >=0.8.0;
+
+interface IVotingEscrowV1_2 {
+    function token() external view returns (address);
+
+    function deposit_for_without_boost(uint _tokenId, uint _value) external;
+
+    function balanceOfNftIgnoreOwnershipChange(uint tokenId_) external view returns (uint256);
+
+    function createManagedNFT(address recipient) external returns (uint256);
+
+    function onAttachToManagedNFT(uint256 tokenId_, uint256 managedTokenId_) external returns (uint256);
+
+    function onDettachFromManagedNFT(uint256 tokenId_, uint256 managedTokenId_, uint256 userBalance) external;
+}
diff --git a/contracts/dexV2/interfaces/IRouterV2.sol b/contracts/dexV2/interfaces/IRouterV2.sol
new file mode 100644
index 0000000..0446b81
--- /dev/null
+++ b/contracts/dexV2/interfaces/IRouterV2.sol
@@ -0,0 +1,24 @@
+// SPDX-License-Identifier: MIT
+pragma solidity =0.8.19;
+
+interface IRouterV2 {
+    struct route {
+        address from;
+        address to;
+        bool stable;
+    }
+
+    function swapExactTokensForTokens(
+        uint amountIn,
+        uint amountOutMin,
+        route[] calldata routes,
+        address to,
+        uint deadline
+    ) external returns (uint[] memory amounts);
+
+    function pairFor(address tokenA, address tokenB, bool stable) external view returns (address pair);
+
+    function getAmountsOut(uint amountIn, route[] memory routes) external view returns (uint[] memory amounts);
+
+    function getAmountOut(uint amountIn, address tokenIn, address tokenOut) external view returns (uint amount, bool stable);
+}
diff --git a/contracts/integration/BlastGovernorClaimableSetup.sol b/contracts/integration/BlastGovernorClaimableSetup.sol
new file mode 100644
index 0000000..a129528
--- /dev/null
+++ b/contracts/integration/BlastGovernorClaimableSetup.sol
@@ -0,0 +1,30 @@
+// SPDX-License-Identifier: BUSL-1.1
+pragma solidity =0.8.19;
+
+import {IBlastFull, YieldMode, GasMode} from "./interfaces/IBlastFull.sol";
+
+/**
+ * @title Blast Governor Claiamble Setup
+ * @dev Abstract contract for setting up a governor in the Blast ecosystem.
+ * This contract provides an initialization function to configure a governor address
+ * for the Blast protocol, utilizing the `IBlast` interface.
+ */
+abstract contract BlastGovernorClaimableSetup {
+    /// @dev Error thrown when an operation involves a zero address where a valid address is required.
+    error AddressZero();
+
+    /**
+     * @dev Initializes the governor and claimable configuration for the Blast protocol.
+     * This internal function is meant to be called in the initialization process
+     * of a derived contract that sets up governance.
+     *
+     * @param blastGovernor_ The address of the governor to be configured in the Blast protocol.
+     * Must be a non-zero address.
+     */
+    function __BlastGovernorClaimableSetup_init(address blastGovernor_) internal {
+        if (blastGovernor_ == address(0)) {
+            revert AddressZero();
+        }
+        IBlastFull(0x4300000000000000000000000000000000000002).configure(YieldMode.CLAIMABLE, GasMode.CLAIMABLE, blastGovernor_);
+    }
+}
diff --git a/contracts/integration/interfaces/IBlastFull.sol b/contracts/integration/interfaces/IBlastFull.sol
new file mode 100644
index 0000000..aeb0129
--- /dev/null
+++ b/contracts/integration/interfaces/IBlastFull.sol
@@ -0,0 +1,81 @@
+// SPDX-License-Identifier: MIT
+pragma solidity >=0.8.0;
+
+/**
+ * @title IBlastFull Interface
+ * @dev Interface for interacting with the Blast protocol, specifically for configuring
+ * governance settings. This interface abstracts the function to set up a governor
+ * within the Blast ecosystem.
+ */
+
+enum GasMode {
+    VOID,
+    CLAIMABLE
+}
+
+enum YieldMode {
+    AUTOMATIC,
+    VOID,
+    CLAIMABLE
+}
+
+interface IBlastFull {
+    // configure
+    function configureContract(address contractAddress, YieldMode _yield, GasMode gasMode, address governor) external;
+
+    function configure(YieldMode _yield, GasMode gasMode, address governor) external;
+
+    // base configuration options
+    function configureClaimableYield() external;
+
+    function configureClaimableYieldOnBehalf(address contractAddress) external;
+
+    function configureAutomaticYield() external;
+
+    function configureAutomaticYieldOnBehalf(address contractAddress) external;
+
+    function configureVoidYield() external;
+
+    function configureVoidYieldOnBehalf(address contractAddress) external;
+
+    function configureClaimableGas() external;
+
+    function configureClaimableGasOnBehalf(address contractAddress) external;
+
+    function configureVoidGas() external;
+
+    function configureVoidGasOnBehalf(address contractAddress) external;
+
+    function configureGovernor(address _governor) external;
+
+    function configureGovernorOnBehalf(address _newGovernor, address contractAddress) external;
+
+    // claim yield
+    function claimYield(address contractAddress, address recipientOfYield, uint256 amount) external returns (uint256);
+
+    function claimAllYield(address contractAddress, address recipientOfYield) external returns (uint256);
+
+    // claim gas
+    function claimAllGas(address contractAddress, address recipientOfGas) external returns (uint256);
+
+    // NOTE: can be off by 1 bip
+    function claimGasAtMinClaimRate(address contractAddress, address recipientOfGas, uint256 minClaimRateBips) external returns (uint256);
+
+    function claimMaxGas(address contractAddress, address recipientOfGas) external returns (uint256);
+
+    function claimGas(
+        address contractAddress,
+        address recipientOfGas,
+        uint256 gasToClaim,
+        uint256 gasSecondsToConsume
+    ) external returns (uint256);
+
+    // read functions
+    function readClaimableYield(address contractAddress) external view returns (uint256);
+
+    function readYieldConfiguration(address contractAddress) external view returns (uint8);
+
+    function readGasParams(
+        address contractAddress
+    ) external view returns (uint256 etherSeconds, uint256 etherBalance, uint256 lastUpdated, GasMode);
+}
diff --git a/contracts/mocks/BaseManagedNFTStrategyUpgradeableMock.sol b/contracts/mocks/BaseManagedNFTStrategyUpgradeableMock.sol
new file mode 100644
index 0000000..a87b8f1
--- /dev/null
+++ b/contracts/mocks/BaseManagedNFTStrategyUpgradeableMock.sol
@@ -0,0 +1,17 @@
+// SPDX-License-Identifier: MIT
+pragma solidity =0.8.19;
+import {BaseManagedNFTStrategyUpgradeable} from "../nest/BaseManagedNFTStrategyUpgradeable.sol";
+
+contract BaseManagedNFTStrategyUpgradeableMock is BaseManagedNFTStrategyUpgradeable {
+    function initialize(address blastGovernor_, address managedNFTManager_, string memory name_) external initializer {
+        __BaseManagedNFTStrategy__init(blastGovernor_, managedNFTManager_, name_);
+    }
+
+    function onAttach(uint256 tokenId, uint256 userBalance) external override {
+        revert("not implemented");
+    }
+
+    function onDettach(uint256 tokenId, uint256 userBalance) external override returns (uint256 lockedRewards) {
+        revert("not implemented");
+    }
+}
diff --git a/contracts/mocks/MinterMock.sol b/contracts/mocks/MinterMock.sol
new file mode 100644
index 0000000..403d426
--- /dev/null
+++ b/contracts/mocks/MinterMock.sol
@@ -0,0 +1,16 @@
+// SPDX-License-Identifier: MIT
+pragma solidity =0.8.19;
+
+contract MinterMock {
+    uint256 public constant WEEK = 86400 * 7;
+
+    uint256 public active_period;
+
+    function setPeriod(uint256 period_) external {
+        active_period = period_;
+    }
+
+    function period() public view returns (uint256) {
+        return (block.timestamp / WEEK) * WEEK;
+    }
+}
diff --git a/contracts/mocks/SingelTokenBuybackUpgradeableMock.sol b/contracts/mocks/SingelTokenBuybackUpgradeableMock.sol
new file mode 100644
index 0000000..ab5863e
--- /dev/null
+++ b/contracts/mocks/SingelTokenBuybackUpgradeableMock.sol
@@ -0,0 +1,21 @@
+// SPDX-License-Identifier: MIT
+pragma solidity =0.8.19;
+
+import {SingelTokenBuybackUpgradeable} from "../nest/SingelTokenBuybackUpgradeable.sol";
+import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
+
+contract SingelTokenBuybackUpgradeableMock is OwnableUpgradeable, SingelTokenBuybackUpgradeable {
+    address public token;
+
+    function initialize(address pathProivderV2_, address targetToken_) external initializer {
+        __Ownable_init();
+        __SingelTokenBuyback__init(pathProivderV2_);
+        token = targetToken_;
+    }
+
+    function _checkBuybackSwapPermissions() internal view virtual override onlyOwner {}
+
+    function _getBuybackTargetToken() internal view virtual override returns (address) {
+        return token;
+    }
+}
diff --git a/contracts/mocks/VirtualRewarderCheckpointsMock.sol b/contracts/mocks/VirtualRewarderCheckpointsMock.sol
new file mode 100644
index 0000000..583969c
--- /dev/null
+++ b/contracts/mocks/VirtualRewarderCheckpointsMock.sol
@@ -0,0 +1,19 @@
+// SPDX-License-Identifier: MIT
+pragma solidity =0.8.19;
+import {VirtualRewarderCheckpoints} from "../nest/libraries/VirtualRewarderCheckpoints.sol";
+
+contract VirtualRewarderCheckpointsMock {
+    mapping(uint256 index => VirtualRewarderCheckpoints.Checkpoint checkpoint) public checkpoints;
+
+    function writeCheckpoint(uint256 lastIndex_, uint256 timestamp_, uint256 amount_) external returns (uint256) {
+        return VirtualRewarderCheckpoints.writeCheckpoint(checkpoints, lastIndex_, timestamp_, amount_);
+    }
+
+    function getCheckpointIndex(uint256 lastIndex_, uint256 timestamp_) external view returns (uint256) {
+        return VirtualRewarderCheckpoints.getCheckpointIndex(checkpoints, lastIndex_, timestamp_);
+    }
+
+    function getAmount(uint256 lastIndex_, uint256 timestamp_) external view returns (uint256) {
+        return VirtualRewarderCheckpoints.getAmount(checkpoints, lastIndex_, timestamp_);
+    }
+}
diff --git a/contracts/nest/BaseManagedNFTStrategyUpgradeable.sol b/contracts/nest/BaseManagedNFTStrategyUpgradeable.sol
new file mode 100644
index 0000000..0155432
--- /dev/null
+++ b/contracts/nest/BaseManagedNFTStrategyUpgradeable.sol
@@ -0,0 +1,164 @@
+// SPDX-License-Identifier: BUSL-1.1
+pragma solidity =0.8.19;
+
+import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
+import {BlastGovernorClaimableSetup} from "../integration/BlastGovernorClaimableSetup.sol";
+import {IVoterV1_2} from "../core/interfaces/IVoterV1_2.sol";
+import {IVotingEscrow} from "../core/interfaces/IVotingEscrow.sol";
+import {IManagedNFTManager} from "./interfaces/IManagedNFTManager.sol";
+import {IManagedNFTStrategy} from "./interfaces/IManagedNFTStrategy.sol";
+
+/**
+ * @title Base Managed NFT Strategy Upgradeable
+ * @dev Abstract base contract for strategies managing NFTs with voting and reward capabilities.
+ * This contract serves as a foundation for specific managed NFT strategies, incorporating initializable patterns for upgradeability.
+ */
+abstract contract BaseManagedNFTStrategyUpgradeable is IManagedNFTStrategy, Initializable, BlastGovernorClaimableSetup {
+    /// @notice The name of the strategy for identification purposes.
+    string public override name;
+
+    /// @notice The address of the managed NFT manager that coordinates the overall strategy and access controls.
+    address public override managedNFTManager;
+
+    /// @notice The specific token ID of the NFT being managed under this strategy.
+    uint256 public override managedTokenId;
+
+    /// @notice The address of the voting escrow contract, which locks governance tokens to enable voting power.
+    address public override votingEscrow;
+
+    /// @notice The address of the voter contract, which handles governance actions and reward claims.
+    address public override voter;
+
+    /// @notice Error thrown when an unauthorized user attempts to perform an action reserved for specific roles.
+    error AccessDenied();
+
+    /// @notice Error thrown when attempting to attach a token ID that is either incorrect or already in use.
+    error IncorrectManagedTokenId();
+
+    /// @notice Error thrown when attempting to attach a token ID that has already been attached to another strategy.
+    error AlreadyAttached();
+
+    /// @dev Ensures that only the current managed NFT manager contract can call certain functions.
+    modifier onlyManagedNFTManager() {
+        if (managedNFTManager != msg.sender) {
+            revert AccessDenied();
+        }
+        _;
+    }
+
+    /// @dev Ensures that only administrators defined in the managed NFT manager can perform certain actions.
+    modifier onlyAdmin() {
+        if (!IManagedNFTManager(managedNFTManager).isAdmin(msg.sender)) {
+            revert AccessDenied();
+        }
+        _;
+    }
+
+    /// @dev Ensures that only authorized users, as determined by the managed NFT manager, can call certain functions.
+    modifier onlyAuthorized() {
+        if (!IManagedNFTManager(managedNFTManager).isAuthorized(managedTokenId, msg.sender)) {
+            revert AccessDenied();
+        }
+        _;
+    }
+
+    /**
+     * @dev Initializes the contract, setting up blast governor setup and necessary state variables.
+     *      This initialization setup prevents further initialization and ensures proper governance setup.
+     * @param blastGovernor_ Address of the governance contract capable of claiming the contract
+     * @param managedNFTManager_ Address of the managed NFT manager
+     * @param name_ Descriptive name of the managed NFT strategy
+     */
+    function __BaseManagedNFTStrategy__init(
+        address blastGovernor_,
+        address managedNFTManager_,
+        string memory name_
+    ) internal onlyInitializing {
+        __BlastGovernorClaimableSetup_init(blastGovernor_);
+
+        _checkAddressZero(managedNFTManager_);
+
+        managedNFTManager = managedNFTManager_;
+        votingEscrow = IManagedNFTManager(managedNFTManager_).votingEscrow();
+        voter = IManagedNFTManager(managedNFTManager_).voter();
+        name = name_;
+    }
+
+    /**
+     * @notice Attaches a specific managed NFT to this strategy, setting up necessary governance or reward mechanisms.
+     * @dev This function can only be called by administrators. It sets the `managedTokenId` and ensures that the token is
+     *      valid and owned by this contract. Emits an `AttachedManagedNFT` event upon successful attachment.
+     * @param managedTokenId_ The token ID of the NFT to be managed by this strategy.
+     * throws AlreadyAttached if the strategy is already attached to a managed NFT.
+     * throws IncorrectManagedTokenId if the provided token ID is not managed or not owned by this contract.
+     */
+    function attachManagedNFT(uint256 managedTokenId_) external onlyAdmin {
+        if (managedTokenId != 0) {
+            revert AlreadyAttached();
+        }
+        if (
+            !IManagedNFTManager(managedNFTManager).isManagedNFT(managedTokenId_) ||
+            IVotingEscrow(votingEscrow).ownerOf(managedTokenId_) != address(this)
+        ) {
+            revert IncorrectManagedTokenId();
+        }
+
+        managedTokenId = managedTokenId_;
+        emit AttachedManagedNFT(managedTokenId_);
+    }
+
+    /**
+     * @notice Allows administrative updating of the strategy's name for clarity or rebranding purposes.
+     * @dev Emits the SetName event upon successful update. This function can only be called by administrators.
+     *
+     * @param name_ The new name to set for the strategy, reflecting either its purpose or current operational focus.
+     */
+    function setName(string calldata name_) external onlyAdmin {
+        name = name_;
+        emit SetName(name_);
+    }
+
+    /**
+     * @notice Casts votes based on the strategy's parameters.
+     * @param poolVote_ Array of pool addresses to vote for.
+     * @param weights_ Array of weights corresponding to each pool address.
+     */
+    function vote(address[] calldata poolVote_, uint256[] calldata weights_) external onlyAuthorized {
+        IVoterV1_2(voter).vote(managedTokenId, poolVote_, weights_);
+    }
+
+    /**
+     * @notice Claims rewards from the specified gauges.
+     * @param gauges_ Array of gauge addresses from which to claim rewards.
+     */
+    function claimRewards(address[] calldata gauges_) external {
+        IVoterV1_2(voter).claimRewards(gauges_);
+    }
+
+    /**
+     * @notice Claims bribes for specific tokens from specified bribe addresses.
+     * @param bribes_ Array of bribe addresses.
+     * @param tokens_ Array of arrays of token addresses corresponding to each bribe address.
+     */
+    function claimBribes(address[] calldata bribes_, address[][] calldata tokens_) external {
+        IVoterV1_2(voter).claimBribes(bribes_, tokens_, managedTokenId);
+    }
+
+    /**
+     * @dev Checked provided address on zero value, throw AddressZero error in case when addr_ is zero
+     *
+     * @param addr_ The address which will checked on zero
+     */
+    function _checkAddressZero(address addr_) internal pure virtual {
+        if (addr_ == address(0)) {
+            revert AddressZero();
+        }
+    }
+
+    /**
+     * @dev This empty reserved space is put in place to allow future versions to add new
+     * variables without shifting down storage in the inheritance chain.
+     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
+     */
+    uint256[50] private __gap;
+}
diff --git a/contracts/nest/CompoundVeFNXManagedNFTStrategyFactoryUpgradeable.sol b/contracts/nest/CompoundVeFNXManagedNFTStrategyFactoryUpgradeable.sol
new file mode 100644
index 0000000..fab9f2a
--- /dev/null
+++ b/contracts/nest/CompoundVeFNXManagedNFTStrategyFactoryUpgradeable.sol
@@ -0,0 +1,178 @@
+// SPDX-License-Identifier: BUSL-1.1
+pragma solidity =0.8.19;
+
+import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
+import {BlastGovernorClaimableSetup} from "../integration/BlastGovernorClaimableSetup.sol";
+import {ICompoundVeFNXManagedNFTStrategyFactory} from "./interfaces/ICompoundVeFNXManagedNFTStrategyFactory.sol";
+import {ISingelTokenVirtualRewarder} from "./interfaces/ISingelTokenVirtualRewarder.sol";
+import {ICompoundVeFNXManagedNFTStrategy} from "./interfaces/ICompoundVeFNXManagedNFTStrategy.sol";
+import {StrategyProxy} from "./StrategyProxy.sol";
+import {VirtualRewarderProxy} from "./VirtualRewarderProxy.sol";
+
+/**
+ * @title Factory for Compound VeFNX Managed NFT Strategies and Virtual Rewarders
+ * @notice This contract serves as a factory for creating and initializing managed NFT strategies and their corresponding virtual rewarders in the Compound VeFNX ecosystem.
+ * @dev Extends BlastGovernorClaimableSetup for governance and AccessControlUpgradeable for role-based permissions.
+ * It uses proxy contracts for strategy and rewarder creation to ensure upgradability.
+ */
+contract CompoundVeFNXManagedNFTStrategyFactoryUpgradeable is
+    ICompoundVeFNXManagedNFTStrategyFactory,
+    BlastGovernorClaimableSetup,
+    AccessControlUpgradeable
+{
+    /**
+     * @notice Role identifier used for granting permissions to create new strategies.
+     */
+    bytes32 public constant STRATEGY_CREATOR_ROLE = keccak256("STRATEGY_CREATOR_ROLE");
+
+    /**
+     * @notice Address of the current strategy implementation used for creating new strategies
+     */
+    address public override strategyImplementation;
+
+    /**
+     * @notice Address of the current virtual rewarder implementation used for creating new rewarders
+     */
+    address public override virtualRewarderImplementation;
+
+    /**
+     * @notice Address of the managed NFT manager interacting with the strategies
+     */
+    address public override managedNFTManager;
+
+    /**
+     * @notice Default governance address set during the initialization of new strategies and rewarders
+     */
+    address public override defaultBlastGovernor;
+
+    /**
+     * @notice The address of the Router V2 Path Provider used to fetch and calculate optimal routes for token transactions within strategies.
+     */
+    address public override routerV2PathProvider;
+
+    /**
+     * @dev Constructor that disables initialization on implementation.
+     */
+    constructor() {
+        _disableInitializers();
+    }
+
+    /**
+     * @notice Initializes the factory with the necessary addresses and default configuration.
+     * @dev Sets up the contract with initial governance settings, roles, and implementations for strategies and rewarders. Marks the contract as initialized.
+     * @param blastGovernor_ The address with the governance capabilities over this contract.
+     * @param strategyImplementation_ The initial implementation contract for strategies.
+     * @param virtualRewarderImplementation_ The initial implementation contract for virtual rewarders.
+     * @param managedNFTManager_ The manager address for interacting with managed NFTs.
+     * @param routerV2PathProvider_ The address of the router V2 path provider used for fetching and calculating optimal token swap routes.
+     */
+    function initialize(
+        address blastGovernor_,
+        address strategyImplementation_,
+        address virtualRewarderImplementation_,
+        address managedNFTManager_,
+        address routerV2PathProvider_
+    ) external initializer {
+        _checkAddressZero(strategyImplementation_);
+        _checkAddressZero(virtualRewarderImplementation_);
+        _checkAddressZero(managedNFTManager_);
+        _checkAddressZero(routerV2PathProvider_);
+
+        __BlastGovernorClaimableSetup_init(blastGovernor_);
+        __AccessControl_init();
+
+        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
+        _grantRole(STRATEGY_CREATOR_ROLE, msg.sender);
+
+        strategyImplementation = strategyImplementation_;
+        virtualRewarderImplementation = virtualRewarderImplementation_;
+        defaultBlastGovernor = blastGovernor_;
+        managedNFTManager = managedNFTManager_;
+        routerV2PathProvider = routerV2PathProvider_;
+    }
+
+    /**
+     * @notice Creates a new strategy and corresponding virtual rewarder with a specified name
+     * @dev Requires the caller to have the STRATEGY_CREATOR_ROLE
+     * @param name_ Descriptive name for the new strategy
+     * @return The address of the newly created strategy instance
+     */
+    function createStrategy(string calldata name_) external override onlyRole(STRATEGY_CREATOR_ROLE) returns (address) {
+        ICompoundVeFNXManagedNFTStrategy strategy = ICompoundVeFNXManagedNFTStrategy(address(new StrategyProxy()));
+        ISingelTokenVirtualRewarder virtualRewarder = ISingelTokenVirtualRewarder(address(new VirtualRewarderProxy()));
+
+        strategy.initialize(defaultBlastGovernor, managedNFTManager, address(virtualRewarder), routerV2PathProvider, name_);
+        virtualRewarder.initialize(defaultBlastGovernor, address(strategy));
+
+        emit CreateStrategy(address(strategy), address(virtualRewarder), name_);
+
+        return address(strategy);
+    }
+
+    /**
+     * @notice Updates the implementation address for virtual rewarders
+     * @dev Only accessible by admins with DEFAULT_ADMIN_ROLE
+     * @param virtualRewarderImplementation_ New implementation address for virtual rewarders
+     */
+    function changeVirtualRewarderImplementation(address virtualRewarderImplementation_) external onlyRole(DEFAULT_ADMIN_ROLE) {
+        _checkAddressZero(virtualRewarderImplementation_);
+
+        emit ChangeVirtualRewarderImplementation(virtualRewarderImplementation, virtualRewarderImplementation_);
+        virtualRewarderImplementation = virtualRewarderImplementation_;
+    }
+
+    /**
+     * @notice Updates the implementation address for strategies
+     * @dev Only accessible by admins with DEFAULT_ADMIN_ROLE
+     *
+     * @param strategyImplementation_ New implementation address for strategies
+     */
+    function changeStrategyImplementation(address strategyImplementation_) external onlyRole(DEFAULT_ADMIN_ROLE) {
+        _checkAddressZero(strategyImplementation_);
+
+        emit ChangeStrategyImplementation(strategyImplementation, strategyImplementation_);
+        strategyImplementation = strategyImplementation_;
+    }
+
+    /**
+     * @notice Sets a new address for the Router V2 Path Provider.
+     * @dev Accessible only by admins, this function updates the address used for determining swap routes in token buyback strategies.
+     * @param routerV2PathProvider_ The new Router V2 Path Provider address.
+     */
+    function setRouterV2PathProvider(address routerV2PathProvider_) external virtual onlyRole(DEFAULT_ADMIN_ROLE) {
+        _checkAddressZero(routerV2PathProvider_);
+        emit SetRouterV2PathProvider(routerV2PathProvider, routerV2PathProvider_);
+
+        routerV2PathProvider = routerV2PathProvider_;
+    }
+
+    /**
+     * @dev Sets the default governor address for new fee vaults. Only callable by the contract owner.
+     *
+     * @param defaultBlastGovernor_ The new default governor address to be set.
+     */
+    function setDefaultBlastGovernor(address defaultBlastGovernor_) external virtual onlyRole(DEFAULT_ADMIN_ROLE) {
+        _checkAddressZero(defaultBlastGovernor_);
+
+        emit SetDefaultBlastGovernor(defaultBlastGovernor, defaultBlastGovernor_);
+        defaultBlastGovernor = defaultBlastGovernor_;
+    }
+
+    /**
+     * @dev Checked provided address on zero value, throw AddressZero error in case when addr_ is zero
+     *
+     * @param addr_ The address which will checked on zero
+     */
+    function _checkAddressZero(address addr_) internal pure {
+        if (addr_ == address(0)) {
+            revert AddressZero();
+        }
+    }
+
+    /**
+     * @dev This empty reserved space is put in place to allow future versions to add new
+     * variables without shifting down storage in the inheritance chain.
+     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
+     */
+    uint256[50] private __gap;
+}
diff --git a/contracts/nest/CompoundVeFNXManagedNFTStrategyUpgradeable.sol b/contracts/nest/CompoundVeFNXManagedNFTStrategyUpgradeable.sol
new file mode 100644
index 0000000..16bae6a
--- /dev/null
+++ b/contracts/nest/CompoundVeFNXManagedNFTStrategyUpgradeable.sol
@@ -0,0 +1,208 @@
+// SPDX-License-Identifier: BUSL-1.1
+pragma solidity =0.8.19;
+
+import {BaseManagedNFTStrategyUpgradeable, IManagedNFTManager} from "./BaseManagedNFTStrategyUpgradeable.sol";
+
+import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
+
+import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
+import {IVotingEscrowV1_2} from "../core/interfaces/IVotingEscrowV1_2.sol";
+
+import {ISingelTokenVirtualRewarder} from "./interfaces/ISingelTokenVirtualRewarder.sol";
+import {ICompoundVeFNXManagedNFTStrategy} from "./interfaces/ICompoundVeFNXManagedNFTStrategy.sol";
+import {IRouterV2PathProvider, SingelTokenBuybackUpgradeable} from "./SingelTokenBuybackUpgradeable.sol";
+
+/**
+ * @title Compound VeFNX Managed NFT Strategy Upgradeable
+ * @dev Strategy for managing VeFNX-related actions including compounding rewards and managing stakes.
+ *      Extends the functionality of a base managed NFT strategy to interact with FENIX tokens.
+ * @notice This strategy handles the automated compounding of VeFNX tokens by reinvesting harvested rewards back into VeFNX.
+ */
+contract CompoundVeFNXManagedNFTStrategyUpgradeable is
+    ICompoundVeFNXManagedNFTStrategy,
+    BaseManagedNFTStrategyUpgradeable,
+    SingelTokenBuybackUpgradeable
+{
+    using SafeERC20 for IERC20;
+    /**
+     * @dev Emitted when an attempt is made to recover tokens that should not be recovered.
+     * This error typically occurs when a function tries to withdraw reserved or integral tokens
+     * from the contract, such as tokens that are part of the operational balance or are restricted
+     * due to their role in the contract's mechanics.
+     */
+    error IncorrectRecoverToken();
+
+    /// @notice Address of the FENIX ERC20 token contract.
+    address public override fenix;
+
+    /// @notice Address of the virtual rewarder contract for managing reward distributions.
+    address public override virtualRewarder;
+
+    /**
+     * @dev Constructor that disables initialization on implementation.
+     */
+    constructor() {
+        _disableInitializers();
+    }
+
+    /**
+     * @dev Initializes the strategy with necessary governance, operational addresses, and initial settings.
+     * @notice Sets up the strategy with a managed NFT manager, virtual rewarder, and router path provider along with initializing governance settings.
+     *
+     * @param blastGovernor_ The governance address capable of claiming and managing the contract.
+     * @param managedNFTManager_ The address of the managed NFT manager, responsible for managing NFT-based operations.
+     * @param virtualRewarder_ The address of the virtual rewarder, which handles reward distribution.
+     * @param routerV2PathProvider_ The address of the router V2 path provider, used for determining optimal token swap routes.
+     * @param name_ The name of the strategy, used for identification.
+     */
+    function initialize(
+        address blastGovernor_,
+        address managedNFTManager_,
+        address virtualRewarder_,
+        address routerV2PathProvider_,
+        string memory name_
+    ) external override initializer {
+        _checkAddressZero(virtualRewarder_);
+        __BaseManagedNFTStrategy__init(blastGovernor_, managedNFTManager_, name_);
+        __SingelTokenBuyback__init(routerV2PathProvider_);
+        fenix = IVotingEscrowV1_2(votingEscrow).token();
+        virtualRewarder = virtualRewarder_;
+    }
+
+    /**
+     * @notice Attaches an NFT to the strategy and initializes participation in the virtual reward system.
+     * @dev This function is called when an NFT is attached to this strategy, enabling it to start accumulating rewards.
+     *
+     * @param tokenId_ The identifier of the NFT to attach.
+     * @param userBalance_ The initial balance or stake associated with the NFT at the time of attachment.
+     */
+    function onAttach(uint256 tokenId_, uint256 userBalance_) external override onlyManagedNFTManager {
+        ISingelTokenVirtualRewarder(virtualRewarder).deposit(tokenId_, userBalance_);
+        emit OnAttach(tokenId_, userBalance_);
+    }
+
+    /**
+     * @notice Detaches an NFT from the strategy, withdrawing all associated rewards and balances.
+     * @dev Handles the process of detaching an NFT, ensuring all accrued benefits are properly managed and withdrawn.
+     *
+     * @param tokenId_ The identifier of the NFT to detach.
+     * @param userBalance_ The remaining balance or stake associated with the NFT at the time of detachment.
+     * @return lockedRewards The amount of rewards locked and harvested upon detachment.
+     */
+    function onDettach(uint256 tokenId_, uint256 userBalance_) external override onlyManagedNFTManager returns (uint256 lockedRewards) {
+        ISingelTokenVirtualRewarder virtualRewarderCache = ISingelTokenVirtualRewarder(virtualRewarder);
+        virtualRewarderCache.withdraw(tokenId_, userBalance_);
+        lockedRewards = virtualRewarderCache.harvest(tokenId_);
+        emit OnDettach(tokenId_, userBalance_, lockedRewards);
+    }
+
+    /**
+     * @notice Retrieves the total amount of locked rewards available for a specific NFT based on its tokenId.
+     * @param tokenId_ The identifier of the NFT to query.
+     * @return The total amount of locked rewards for the specified NFT.
+     */
+    function getLockedRewardsBalance(uint256 tokenId_) external view returns (uint256) {
+        return ISingelTokenVirtualRewarder(virtualRewarder).calculateAvailableRewardsAmount(tokenId_);
+    }
+
+    /**
+     * @notice Retrieves the balance or stake associated with a specific NFT.
+     * @param tokenId_ The identifier of the NFT to query.
+     * @return The balance of the specified NFT.
+     */
+    function balanceOf(uint256 tokenId_) external view returns (uint256) {
+        return ISingelTokenVirtualRewarder(virtualRewarder).balanceOf(tokenId_);
+    }
+
+    /**
+     * @notice Retrieves the total supply of stakes managed by the strategy.
+     * @return The total supply of stakes.
+     */
+    function totalSupply() external view returns (uint256) {
+        return ISingelTokenVirtualRewarder(virtualRewarder).totalSupply();
+    }
+
+    /**
+     * @notice Compounds the earnings by reinvesting the harvested rewards into the underlying asset.
+     * @dev Calls the Voting Escrow contract to lock up harvested FENIX tokens, thereby compounding the rewards.
+     */
+    function compound() external {
+        IERC20 fenixCache = IERC20(fenix);
+        uint256 currentBalance = fenixCache.balanceOf(address(this));
+        if (currentBalance > 0) {
+            address votingEscrowCache = votingEscrow;
+            fenixCache.safeApprove(votingEscrowCache, currentBalance);
+            IVotingEscrowV1_2(votingEscrowCache).deposit_for_without_boost(managedTokenId, currentBalance);
+            ISingelTokenVirtualRewarder(virtualRewarder).notifyRewardAmount(currentBalance);
+            emit Compound(msg.sender, currentBalance);
+        }
+    }
+
+    /**
+     * @notice Sets a new address for the Router V2 Path Provider.
+     * @dev Accessible only by admins, this function updates the address used for determining swap routes in token buyback strategies.
+     * @param routerV2PathProvider_ The new Router V2 Path Provider address.
+     */
+    function setRouterV2PathProvider(address routerV2PathProvider_) external virtual onlyAdmin {
+        _checkAddressZero(routerV2PathProvider_);
+        emit SetRouterV2PathProvider(routerV2PathProvider, routerV2PathProvider_);
+        routerV2PathProvider = routerV2PathProvider_;
+    }
+
+    /**
+     * @notice Recovers ERC20 tokens accidentally sent to this contract, excluding the managed token (FENIX).
+     * @dev Allows the admin to recover non-strategic ERC20 tokens sent to the contract.
+     * @param token_ The address of the token to recover.
+     * @param recipient_ The address where the recovered tokens should be sent.
+     */
+    function erc20Recover(address token_, address recipient_) external {
+        _checkBuybackSwapPermissions();
+
+        if (token_ == address(fenix) || IRouterV2PathProvider(routerV2PathProvider).isAllowedTokenInInputRoutes(token_)) {
+            revert IncorrectRecoverToken();
+        }
+
+        uint256 amount = IERC20(token_).balanceOf(address(this));
+        IERC20(token_).safeTransfer(recipient_, amount);
+        emit Erc20Recover(msg.sender, recipient_, token_, amount);
+    }
+
+    /**
+     * @dev Internal function to enforce permissions or rules before allowing a buyback swap to proceed.
+     */
+    function _checkBuybackSwapPermissions() internal view virtual override {
+        if (IManagedNFTManager(managedNFTManager).isAdmin(msg.sender)) {
+            return;
+        }
+        if (IManagedNFTManager(managedNFTManager).isAuthorized(managedTokenId, msg.sender)) {
+            return;
+        }
+        revert AccessDenied();
+    }
+
+    /**
+     * @dev Internal helper to fetch the target token for buybacks.
+     * @return The address of the buyback target token.
+     */
+    function _getBuybackTargetToken() internal view virtual override returns (address) {
+        return fenix;
+    }
+
+    /**
+     * @dev Checked provided address on zero value, throw AddressZero error in case when addr_ is zero
+     *
+     * @param addr_ The address which will checked on zero
+     */
+    function _checkAddressZero(address addr_) internal pure override(BaseManagedNFTStrategyUpgradeable, SingelTokenBuybackUpgradeable) {
+        if (addr_ == address(0)) {
+            revert AddressZero();
+        }
+    }
+
+    /**
+     * @dev This empty reserved space is put in place to allow future versions to add new
+     * variables without shifting down storage in the inheritance chain.
+     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
+     */
+    uint256[50] private __gap;
+}
diff --git a/contracts/nest/ManagedNFTManagerUpgradeable.sol b/contracts/nest/ManagedNFTManagerUpgradeable.sol
new file mode 100644
index 0000000..fcaccfc
--- /dev/null
+++ b/contracts/nest/ManagedNFTManagerUpgradeable.sol
@@ -0,0 +1,311 @@
+// SPDX-License-Identifier: BUSL-1.1
+pragma solidity =0.8.19;
+
+import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
+import {BlastGovernorClaimableSetup} from "../integration/BlastGovernorClaimableSetup.sol";
+import {IVotingEscrowV1_2} from "../core/interfaces/IVotingEscrowV1_2.sol";
+import {IVotingEscrow} from "../core/interfaces/IVotingEscrow.sol";
+import {IManagedNFTStrategy} from "./interfaces/IManagedNFTStrategy.sol";
+import {IManagedNFTManager} from "./interfaces/IManagedNFTManager.sol";
+
+/**
+ * @title Managed NFT Manager Upgradeable
+ * @dev Manages the lifecycle and access control for NFTs used in a managed strategy, leveraging governance and escrow functionalities.
+ *      This contract serves as the central point for managing NFTs, their attachments to strategies, and authorized user interactions.
+ */
+contract ManagedNFTManagerUpgradeable is IManagedNFTManager, AccessControlUpgradeable, BlastGovernorClaimableSetup {
+    /**
+     * @dev Error indicating an unauthorized access attempt.
+     */
+    error AccessDenied();
+
+    /**
+     * @dev Error indicating an operation attempted on a managed NFT that is currently disabled.
+     */
+    error ManagedNFTIsDisabled();
+
+    /**
+     * @dev Error indicating that a required attachment action was not found or is missing.
+     */
+    error NotAttached();
+
+    /**
+     * @dev Error indicating that the specified token ID does not correspond to a managed NFT.
+     */
+    error NotManagedNFT();
+
+    /**
+     * @dev Error indicating an attempt to reattach an NFT that is already attached to a managed token.
+     */
+    error AlreadyAttached();
+
+    /**
+     * @dev Error indicating a mismatch or incorrect association between user NFTs and managed tokens.
+     */
+    error IncorrectUserNFT();
+    /**
+     * @dev Represents the state and association of a user's NFT within the management system.
+     * @notice Stores details about an NFT's attachment status, which managed token it's linked to, and any associated amounts.
+     */
+    struct TokenInfo {
+        bool isAttached; // Indicates if the NFT is currently attached to a managed strategy.
+        uint256 attachedManagedTokenId; // The ID of the managed token to which this NFT is attached.
+        uint256 amount; // The amount associated with this NFT in the context of the managed strategy.
+    }
+
+    /**
+     * @dev Holds management details about a token within the managed NFT system.
+     * @notice Keeps track of a managed token's operational status and authorized users.
+     */
+    struct ManagedTokenInfo {
+        bool isManaged; // True if the token is recognized as a managed token.
+        bool isDisabled; // Indicates if the token is currently disabled and not operational.
+        address authorizedUser; // Address authorized to perform restricted operations for this managed token.
+    }
+
+    /**
+     * @dev Role identifier for administrative functions within the NFT management context.
+     */
+    bytes32 public constant MANAGED_NFT_ADMIN = keccak256("MANAGED_NFT_ADMIN");
+
+    /**
+     * @notice Address of the Voting Escrow contract managing voting and staking mechanisms.
+     */
+    address public override votingEscrow;
+
+    /**
+     * @notice Address of the Voter contract responsible for handling governance actions related to managed NFTs.
+     */
+    address public override voter;
+
+    /**
+     * @notice Tracks detailed information about individual tokens.
+     */
+    mapping(uint256 => TokenInfo) public tokensInfo;
+
+    /**
+     * @notice Maintains management state for managed tokens.
+     */
+    mapping(uint256 => ManagedTokenInfo) public managedTokensInfo;
+
+    /**
+     * @notice Tracks whitelisting status of NFTs to control their eligibility within the system.
+     */
+    mapping(uint256 => bool) public override isWhitelistedNFT;
+
+    /**
+     * @dev Ensures that the function can only be called by the designated voter address.
+     */
+    modifier onlyVoter() {
+        if (_msgSender() != voter) {
+            revert AccessDenied();
+        }
+        _;
+    }
+
+    /**
+     * @dev Constructor that disables initialization on implementation.
+     */
+    constructor() {
+        _disableInitializers();
+    }
+
+    /**
+     * @notice Initializes the Managed NFT Manager contract
+     * @param blastGovernor_ The address of the blast governor
+     * @param votingEscrow_ The address of the voting escrow contract
+     * @param voter_ The address of the voter contract
+     */
+    function initialize(address blastGovernor_, address votingEscrow_, address voter_) external initializer {
+        __BlastGovernorClaimableSetup_init(blastGovernor_);
+        __AccessControl_init();
+
+        _checkAddressZero(votingEscrow_);
+        _checkAddressZero(voter_);
+
+        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
+        _grantRole(MANAGED_NFT_ADMIN, msg.sender);
+
+        votingEscrow = votingEscrow_;
+        voter = voter_;
+    }
+
+    /**
+     * @notice Creates a managed NFT and attaches it to a strategy
+     * @param strategy_ The strategy to which the managed NFT will be attached
+     */
+    function createManagedNFT(address strategy_) external onlyRole(MANAGED_NFT_ADMIN) returns (uint256 managedTokenId) {
+        managedTokenId = IVotingEscrowV1_2(votingEscrow).createManagedNFT(strategy_);
+        managedTokensInfo[managedTokenId] = ManagedTokenInfo(true, false, address(0));
+        IManagedNFTStrategy(strategy_).attachManagedNFT(managedTokenId);
+        emit CreateManagedNFT(msg.sender, strategy_, managedTokenId);
+    }
+
+    /**
+     * @notice Authorizes a user for a specific managed token ID
+     * @param managedTokenId_ The token ID to authorize
+     * @param authorizedUser_ The user being authorized
+     */
+    function setAuthorizedUser(uint256 managedTokenId_, address authorizedUser_) external onlyRole(MANAGED_NFT_ADMIN) {
+        if (!managedTokensInfo[managedTokenId_].isManaged) {
+            revert NotManagedNFT();
+        }
+        managedTokensInfo[managedTokenId_].authorizedUser = authorizedUser_;
+        emit SetAuthorizedUser(managedTokenId_, authorizedUser_);
+    }
+
+    /**
+     * @notice Toggles the disabled state of a managed NFT
+     * @param managedTokenId_ The ID of the managed token to toggle
+     * @dev Enables or disables a managed token to control its operational status, with an event emitted for state change.
+     */
+    function toggleDisableManagedNFT(uint256 managedTokenId_) external onlyRole(MANAGED_NFT_ADMIN) {
+        if (!managedTokensInfo[managedTokenId_].isManaged) {
+            revert NotManagedNFT();
+        }
+        bool isDisable = !managedTokensInfo[managedTokenId_].isDisabled;
+        managedTokensInfo[managedTokenId_].isDisabled = isDisable;
+        emit ToggleDisableManagedNFT(msg.sender, managedTokenId_, isDisable);
+    }
+
+    /**
+     * @notice Handler for attaching to a managed NFT
+     * @param tokenId_ The token ID of the user's NFT
+     * @param managedTokenId_ The managed token ID to attach to
+     */
+    function onAttachToManagedNFT(uint256 tokenId_, uint256 managedTokenId_) external onlyVoter {
+        ManagedTokenInfo memory managedTokenInfo = managedTokensInfo[managedTokenId_];
+        if (!managedTokenInfo.isManaged) {
+            revert NotManagedNFT();
+        }
+
+        if (managedTokenInfo.isDisabled) {
+            revert ManagedNFTIsDisabled();
+        }
+
+        if (managedTokensInfo[tokenId_].isManaged || tokensInfo[tokenId_].isAttached) {
+            revert IncorrectUserNFT();
+        }
+
+        uint256 userBalance = IVotingEscrowV1_2(votingEscrow).onAttachToManagedNFT(tokenId_, managedTokenId_);
+        tokensInfo[tokenId_] = TokenInfo(true, managedTokenId_, userBalance);
+
+        IManagedNFTStrategy(IVotingEscrow(votingEscrow).ownerOf(managedTokenId_)).onAttach(tokenId_, userBalance);
+    }
+
+    /**
+     * @notice Handler for detaching from a managed NFT
+     * @param tokenId_ The token ID of the user's NFT
+     */
+    function onDettachFromManagedNFT(uint256 tokenId_) external onlyVoter {
+        TokenInfo memory tokenInfo = tokensInfo[tokenId_];
+
+        if (!tokenInfo.isAttached) {
+            revert NotAttached();
+        }
+
+        assert(tokenInfo.attachedManagedTokenId != 0);
+
+        uint256 lockedRewards = IManagedNFTStrategy(IVotingEscrow(votingEscrow).ownerOf(tokenInfo.attachedManagedTokenId)).onDettach(
+            tokenId_,
+            tokenInfo.amount
+        );
+
+        IVotingEscrowV1_2(votingEscrow).onDettachFromManagedNFT(
+            tokenId_,
+            tokenInfo.attachedManagedTokenId,
+            tokenInfo.amount + lockedRewards
+        );
+
+        delete tokensInfo[tokenId_];
+    }
+
+    /**
+     * @notice Sets or unsets an NFT as whitelisted
+     * @param tokenId_ The token ID of the NFT
+     * @param isWhitelisted_ True if whitelisting, false otherwise
+     */
+    function setWhitelistedNFT(uint256 tokenId_, bool isWhitelisted_) external onlyRole(MANAGED_NFT_ADMIN) {
+        isWhitelistedNFT[tokenId_] = isWhitelisted_;
+        emit SetWhitelistedNFT(tokenId_, isWhitelisted_);
+    }
+
+    /**
+     * @notice Retrieves the managed token ID attached to a specific user NFT.
+     * @dev Returns the managed token ID to which the user's NFT is currently attached.
+     * @param tokenId_ The token ID of the user's NFT.
+     * @return The ID of the managed token to which the NFT is attached.
+     */
+    function getAttachedManagedTokenId(uint256 tokenId_) external view returns (uint256) {
+        return tokensInfo[tokenId_].attachedManagedTokenId;
+    }
+
+    /**
+     * @notice Checks if a specific user NFT is currently attached to a managed token.
+     * @dev Returns true if the user's NFT is attached to any managed token.
+     * @param tokenId_ The token ID of the user's NFT.
+     * @return True if the NFT is attached, false otherwise.
+     */
+    function isAttachedNFT(uint256 tokenId_) external view returns (bool) {
+        return tokensInfo[tokenId_].isAttached;
+    }
+
+    /**
+     * @notice Determines if a managed token is currently disabled.
+     * @dev Checks the disabled status of a managed token to prevent operations during maintenance or shutdown periods.
+     * @param managedTokenId_ The ID of the managed token.
+     * @return True if the managed token is disabled, false otherwise.
+     */
+    function isDisabledNFT(uint256 managedTokenId_) external view returns (bool) {
+        return managedTokensInfo[managedTokenId_].isDisabled;
+    }
+
+    /**
+     * @notice Checks if a given address has administrative privileges.
+     * @dev Determines whether an address holds the MANAGED_NFT_ADMIN role, granting administrative capabilities.
+     * @param account_ The address to check for administrative privileges.
+     * @return True if the address has administrative privileges, false otherwise.
+     */
+    function isAdmin(address account_) external view returns (bool) {
+        return account_ == address(this) || super.hasRole(MANAGED_NFT_ADMIN, account_);
+    }
+
+    /**
+     * @notice Checks if a user is authorized to interact with a specific managed token.
+     * @dev Determines whether an address is the designated authorized user for a managed token.
+     * @param managedTokenId_ The ID of the managed token.
+     * @param account_ The address to verify authorization.
+     * @return True if the address is authorized, false otherwise.
+     */
+    function isAuthorized(uint256 managedTokenId_, address account_) external view returns (bool) {
+        return managedTokensInfo[managedTokenId_].authorizedUser == account_;
+    }
+
+    /**
+     * @notice Determines if a token ID corresponds to a managed NFT within the system.
+     * @dev Checks the management status of a token ID to validate its inclusion in managed operations.
+     * @param managedTokenId_ The ID of the token to check.
+     * @return True if the token is a managed NFT, false otherwise.
+     */
+    function isManagedNFT(uint256 managedTokenId_) external view override returns (bool) {
+        return managedTokensInfo[managedTokenId_].isManaged;
+    }
+
+    /**
+     * @dev Checked provided address on zero value, throw AddressZero error in case when addr_ is zero
+     *
+     * @param addr_ The address which will checked on zero
+     */
+    function _checkAddressZero(address addr_) internal pure {
+        if (addr_ == address(0)) {
+            revert AddressZero();
+        }
+    }
+
+    /**
+     * @dev This empty reserved space is put in place to allow future versions to add new
+     * variables without shifting down storage in the inheritance chain.
+     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
+     */
+    uint256[50] private __gap;
+}
diff --git a/contracts/nest/RouterV2PathProviderUpgradeable.sol b/contracts/nest/RouterV2PathProviderUpgradeable.sol
new file mode 100644
index 0000000..fb86251
--- /dev/null
+++ b/contracts/nest/RouterV2PathProviderUpgradeable.sol
@@ -0,0 +1,382 @@
+// SPDX-License-Identifier: BUSL-1.1
+pragma solidity =0.8.19;
+
+import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
+import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
+
+import {BlastGovernorClaimableSetup} from "../integration/BlastGovernorClaimableSetup.sol";
+import {IRouterV2} from "../dexV2/interfaces/IRouterV2.sol";
+import {IPairFactory} from "../dexV2/interfaces/IPairFactory.sol";
+import {IRouterV2PathProvider} from "./interfaces/IRouterV2PathProvider.sol";
+import {IPairQuote} from "./interfaces/IPairQuote.sol";
+
+/**
+ * @title Router V2 Path Provider Upgradeable
+ * @notice Provides management for token routing paths within a decentralized exchange platform.
+ * @dev Utilizes upgradeable patterns from OpenZeppelin, including Ownable and Initializable functionalities.
+ */
+contract RouterV2PathProviderUpgradeable is IRouterV2PathProvider, Ownable2StepUpgradeable, BlastGovernorClaimableSetup {
+    /**
+     * @notice Constant used to specify the granularity of quotes in getAmountOutQuote
+     */
+    uint256 public constant PAIR_QUOTE_GRANULARITY = 3;
+    /**
+     * @notice Address of the router used for fetching and calculating routes
+     * @dev This should be set to the address of the router managing the routes and their calculations.
+     */
+    address public override router;
+
+    /**
+     * @notice Address of the factory used for managing pair creations
+     * @dev This should be set to the address of the factory responsible for creating and managing token pairs.
+     */
+    address public override factory;
+
+    /**
+     * @notice Mapping of tokens to their permission status for being used in input routes
+     * @dev True if the token is allowed to be used in input routes, false otherwise. This is checked during route validation.
+     */
+    mapping(address => bool) public override isAllowedTokenInInputRoutes;
+
+    /**
+     * @notice Mapping of tokens to their associated routing paths
+     * @dev Stores an array of `IRouterV2.route` structs for each token, representing the possible routes for token exchange.
+     */
+    mapping(address => IRouterV2.route[]) public tokenToRoutes;
+
+    /**
+     * @notice Custom error for signaling issues with the path in route calculations
+     * @dev This error is thrown when there is a discontinuity in the route path, indicating a misconfiguration.
+     */
+    error InvalidPath();
+
+    /**
+     * @notice Custom error for signaling invalid route configurations
+     * @dev This error is thrown when a route configuration does not meet the required criteria, such as incorrect token addresses or settings.
+     */
+    error InvalidRoute();
+
+    /**
+     * @notice Custom error for signaling when a route does not exist in the mapping
+     * @dev This error is thrown when an attempt is made to access or modify a non-existent route in the tokenToRoutes mapping.
+     */
+    error RouteNotExist();
+
+    /**
+     * @notice Custom error for signaling when a route already exists in the mapping
+     * @dev This error is thrown when there is an attempt to add a route that already exists in the tokenToRoutes mapping, to prevent duplicates.
+     */
+    error RouteAlreadyExist();
+
+    /**
+     * @notice Disables initialization on the implementation to prevent proxy issues.
+     * @dev Constructor sets up non-initializable pattern for proxy use.
+     */
+    constructor() {
+        _disableInitializers();
+    }
+
+    /**
+     * @notice Initializes the contract with necessary governance and operational addresses
+     * @dev Sets up blast governance and operational aspects of the contract. This function can only be called once.
+     *
+     * @param blastGovernor_ The governance address capable of claiming the contract
+     * @param factory_ The factory address used to manage pairings
+     * @param router_ The router address used to manage routing logic
+     */
+    function initialize(address blastGovernor_, address factory_, address router_) external initializer {
+        _checkAddressZero(factory_);
+        _checkAddressZero(router_);
+
+        __BlastGovernorClaimableSetup_init(blastGovernor_);
+
+        __Ownable2Step_init();
+
+        factory = factory_;
+        router = router_;
+    }
+
+    /**
+     * @notice Sets whether a token can be used in input routes
+     * @dev Only callable by the owner. Emits a SetAllowedTokenInInputRouters event on change.
+     *
+     * @param token_ The token address to set the allowance for
+     * @param isAllowed_ Boolean flag to allow or disallow the token
+     */
+
+    function setAllowedTokenInInputRouters(address token_, bool isAllowed_) external onlyOwner {
+        isAllowedTokenInInputRoutes[token_] = isAllowed_;
+        emit SetAllowedTokenInInputRouters(token_, isAllowed_);
+    }
+
+    /**
+     * @notice Adds a new route to a token
+     * @dev Verifies route validity and uniqueness before addition. Reverts on errors.
+     *
+     * @param token_ The token address to add the route to
+     * @param route_ The route to add
+     */
+    function addRouteToToken(address token_, IRouterV2.route memory route_) external onlyOwner {
+        _checkAddressZero(token_);
+        _checkAddressZero(route_.from);
+
+        if (token_ != route_.to || token_ == route_.from) {
+            revert InvalidRoute();
+        }
+
+        uint256 length = tokenToRoutes[token_].length;
+        for (uint256 i; i < length; ) {
+            if (tokenToRoutes[token_][i].from == route_.from && tokenToRoutes[token_][i].stable == route_.stable) {
+                revert RouteAlreadyExist();
+            }
+            unchecked {
+                i++;
+            }
+        }
+
+        tokenToRoutes[token_].push(route_);
+        emit AddRouteToToken(token_, route_);
+    }
+
+    /**
+     * @notice Removes a route from a token
+     * @dev Verifies the existence of the route before removal. Emits RemoveRouteFromToken event on success.
+     *
+     * @param token_ The token address to remove the route from
+     * @param route_ The route to remove
+     */
+    function removeRouteFromToken(address token_, IRouterV2.route memory route_) external onlyOwner {
+        _checkAddressZero(token_);
+        _checkAddressZero(route_.from);
+
+        if (token_ != route_.to || token_ == route_.from) {
+            revert InvalidRoute();
+        }
+
+        uint256 length = tokenToRoutes[token_].length;
+        for (uint256 i; i < length; ) {
+            if (tokenToRoutes[token_][i].from == route_.from && tokenToRoutes[token_][i].stable == route_.stable) {
+                tokenToRoutes[token_][i] = tokenToRoutes[token_][length - 1];
+                tokenToRoutes[token_].pop();
+                emit RemoveRouteFromToken(token_, route_);
+                return;
+            }
+            unchecked {
+                i++;
+            }
+        }
+        revert RouteNotExist();
+    }
+
+    /**
+     * @notice Retrieves all routes associated with a specific token
+     * @dev Returns an array of routes for a given token address.
+     *
+     * @param token_ The token address to retrieve routes for
+     * @return An array of IRouterV2.route structures
+     */
+    function getTokenRoutes(address token_) external view returns (IRouterV2.route[] memory) {
+        return tokenToRoutes[token_];
+    }
+
+    /**
+     * @notice Retrieves all possible routes between two tokens
+     * @dev Returns a two-dimensional array of routes for possible paths from inputToken_ to outputToken_
+     *
+     * @param inputToken_ The address of the input token
+     * @param outputToken_ The address of the output token
+     * @return A two-dimensional array of routes
+     */
+    function getRoutesTokenToToken(address inputToken_, address outputToken_) external view returns (IRouterV2.route[][] memory) {
+        return _getRoutesTokenToToken(inputToken_, outputToken_);
+    }
+
+    /**
+     * @notice Determines the optimal route and expected output amount for a token pair given an input amount
+     * @dev Searches through all possible routes to find the one that provides the highest output amount
+     *
+     * @param inputToken_ The address of the input token
+     * @param outputToken_ The address of the output token
+     * @param amountIn_ The amount of input tokens to trade
+     * @return A tuple containing the optimal route and the amount out
+     */
+    function getOptimalTokenToTokenRoute(
+        address inputToken_,
+        address outputToken_,
+        uint256 amountIn_
+    ) external view returns (IRouterV2.route[] memory, uint256 amountOut) {
+        IPairFactory factoryCache = IPairFactory(factory);
+        IRouterV2 routerCache = IRouterV2(router);
+
+        IRouterV2.route[][] memory routesTokenToToken = _getRoutesTokenToToken(inputToken_, outputToken_);
+
+        uint256 index;
+        uint256 bestMultiRouteAmountOut;
+
+        for (uint256 i; i < routesTokenToToken.length; ) {
+            if (
+                factoryCache.getPair(routesTokenToToken[i][0].from, routesTokenToToken[i][0].to, routesTokenToToken[i][0].stable) !=
+                address(0)
+            ) {
+                try routerCache.getAmountsOut(amountIn_, routesTokenToToken[i]) returns (uint256[] memory amountsOut) {
+                    if (amountsOut[2] > bestMultiRouteAmountOut) {
+                        bestMultiRouteAmountOut = amountsOut[2];
+                        index = i;
+                    }
+                } catch {}
+            }
+            unchecked {
+                i++;
+            }
+        }
+
+        IRouterV2.route[] memory singelRoute = new IRouterV2.route[](1);
+        uint256 amountOutStabel;
+        uint256 amountOutVolatility;
+
+        if (factoryCache.getPair(inputToken_, outputToken_, true) != address(0)) {
+            singelRoute[0] = IRouterV2.route({from: inputToken_, to: outputToken_, stable: true});
+            try routerCache.getAmountsOut(amountIn_, singelRoute) returns (uint256[] memory amountsOut) {
+                amountOutStabel = amountsOut[1];
+            } catch {}
+        }
+
+        if (factoryCache.getPair(inputToken_, outputToken_, false) != address(0)) {
+            singelRoute[0] = IRouterV2.route({from: inputToken_, to: outputToken_, stable: false});
+            try routerCache.getAmountsOut(amountIn_, singelRoute) returns (uint256[] memory amountsOut) {
+                amountOutVolatility = amountsOut[1];
+            } catch {}
+        }
+
+        if (amountOutVolatility >= amountOutStabel && amountOutVolatility >= bestMultiRouteAmountOut) {
+            if (amountOutVolatility == 0) {
+                return (new IRouterV2.route[](0), 0);
+            }
+            return (singelRoute, amountOutVolatility);
+        } else if (amountOutStabel >= amountOutVolatility && amountOutStabel >= bestMultiRouteAmountOut) {
+            singelRoute[0] = IRouterV2.route({from: inputToken_, to: outputToken_, stable: true});
+            return (singelRoute, amountOutStabel);
+        } else {
+            return (routesTokenToToken[index], bestMultiRouteAmountOut);
+        }
+    }
+
+    /**
+     * @notice Calculates the output amount for a specified route given an amount of input tokens, using granular quoting
+     * @dev This function extends getAmountOut by incorporating quoting functionality, which factors in additional parameters like granularity.
+     *
+     * @param amountIn_ The amount of input tokens
+     * @param routes_ The routes to be evaluated
+     * @return The output amount of tokens after trading along the specified routes
+     */
+    function getAmountOutQuote(uint256 amountIn_, IRouterV2.route[] calldata routes_) external view returns (uint256) {
+        if (routes_.length == 0) {
+            revert InvalidPath();
+        }
+        for (uint256 i; i < routes_.length - 1; ) {
+            if (routes_[i].to != routes_[i + 1].from) {
+                revert InvalidPath();
+            }
+            unchecked {
+                i++;
+            }
+        }
+
+        IPairFactory pairFactoryCache = IPairFactory(factory);
+        for (uint256 i; i < routes_.length; ) {
+            address pair = pairFactoryCache.getPair(routes_[i].from, routes_[i].to, routes_[i].stable);
+            if (pair == address(0)) {
+                return 0;
+            }
+            amountIn_ = IPairQuote(pair).quote(routes_[i].from, amountIn_, PAIR_QUOTE_GRANULARITY);
+
+            unchecked {
+                i++;
+            }
+        }
+        return amountIn_;
+    }
+
+    /**
+     * @notice Checks if all routes in a provided array are valid according to the contract's rules
+     * @dev Iterates through each route in the array to check if they are allowed in input routes.
+     *
+     * @param inputRouters_ An array of routes to be validated
+     * @return True if all routes are valid, false otherwise
+     */
+    function isValidInputRoutes(IRouterV2.route[] calldata inputRouters_) external view returns (bool) {
+        for (uint256 i; i < inputRouters_.length; ) {
+            if (!isAllowedTokenInInputRoutes[inputRouters_[i].from]) {
+                return false;
+            }
+            unchecked {
+                i++;
+            }
+        }
+        return true;
+    }
+
+    /**
+     * @notice Retrieves a list of possible routes between two tokens, considering stable and volatile routes
+     * @dev This function calculates and returns all viable routes between `inputToken_` and `outputToken_` considering both stability settings.
+     * It first determines the number of potential routes and then populates them with both stable and volatile path options.
+     *
+     * @param inputToken_ The address of the input token for which routes are being sought.
+     * @param outputToken_ The address of the output token to which routes are being mapped.
+     * @return routes A two-dimensional array of `IRouterV2.route`, where each primary array entry contains two routes: one stable and one volatile.
+     */
+    function _getRoutesTokenToToken(address inputToken_, address outputToken_) internal view returns (IRouterV2.route[][] memory routes) {
+        IRouterV2.route[] memory tokenRoutes = tokenToRoutes[outputToken_];
+
+        uint256 actualSize;
+        for (uint256 i; i < tokenRoutes.length; ) {
+            if (outputToken_ == tokenRoutes[i].to && inputToken_ != tokenRoutes[i].from) {
+                actualSize++;
+            }
+            unchecked {
+                i++;
+            }
+        }
+
+        routes = new IRouterV2.route[][](actualSize * 2);
+        uint256 count;
+        for (uint256 i; i < tokenRoutes.length; ) {
+            IRouterV2.route memory route = tokenToRoutes[outputToken_][i];
+            if (outputToken_ == route.to && inputToken_ != route.from) {
+                routes[count] = new IRouterV2.route[](2);
+                routes[count + 1] = new IRouterV2.route[](2);
+
+                routes[count][0] = IRouterV2.route({from: inputToken_, to: route.from, stable: true});
+                routes[count][1] = route;
+
+                routes[count + 1][0] = IRouterV2.route({from: inputToken_, to: route.from, stable: false});
+                routes[count + 1][1] = route;
+
+                unchecked {
+                    count += 2;
+                }
+            }
+            unchecked {
+                i++;
+            }
+        }
+    }
+
+    /**
+     * @dev Checked provided address on zero value, throw AddressZero error in case when addr_ is zero
+     *
+     * @param addr_ The address which will checked on zero
+     */
+    function _checkAddressZero(address addr_) internal pure {
+        if (addr_ == address(0)) {
+            revert AddressZero();
+        }
+    }
+
+    /**
+     * @dev This empty reserved space is put in place to allow future versions to add new
+     * variables without shifting down storage in the inheritance chain.
+     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
+     */
+    uint256[50] private __gap;
+}
diff --git a/contracts/nest/SingelTokenBuybackUpgradeable.sol b/contracts/nest/SingelTokenBuybackUpgradeable.sol
new file mode 100644
index 0000000..bb671e3
--- /dev/null
+++ b/contracts/nest/SingelTokenBuybackUpgradeable.sol
@@ -0,0 +1,220 @@
+// SPDX-License-Identifier: BUSL-1.1
+pragma solidity =0.8.19;
+
+import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
+import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
+import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
+
+import {IRouterV2} from "../dexV2/interfaces/IRouterV2.sol";
+import {IRouterV2PathProvider} from "./interfaces/IRouterV2PathProvider.sol";
+import {ISingelTokenBuyback} from "./interfaces/ISingelTokenBuyback.sol";
+
+/**
+ * @title Single Token Buyback Upgradeable Contract
+ * @notice Implements token buyback functionality using DEX V2 Router.
+ * @dev This contract uses an upgradeable pattern along with the SafeERC20 library for token interactions.
+ */
+abstract contract SingelTokenBuybackUpgradeable is ISingelTokenBuyback, Initializable {
+    using SafeERC20 for IERC20;
+
+    /**
+     *  @dev Emitted when the input token for a buyback operation is the same as the target token.
+     */
+    error IncorrectInputToken();
+
+    /**
+     * @dev Emitted when the slippage specified for a buyback exceeds the maximum allowable limit.
+     */
+    error IncorrectSlippage();
+
+    /**
+     * @dev Emitted when attempting a buyback with an empty balance.
+     */
+    error ZeroBalance();
+
+    /**
+     * @dev Emitted when the input routes provided for a buyback are invalid or do not conform to expected standards
+     */
+    error InvalidInputRoutes();
+
+    /**
+     * @dev Emitted when no viable route is found for the buyback operation.
+     */
+    error RouteNotFound();
+
+    /**
+     * @dev Emitted when a function argument is expected to be a valid address but receives a zero address.
+     */
+    error ZeroAddress();
+
+    /**
+     * @notice Maximum slippage allowed for buyback operations, represented in basis points.
+     * @dev Slippage is capped at 400 basis points (4%).
+     */
+    uint256 public constant MAX_SLIPPAGE = 400;
+
+    /**
+     * @notice Precision used for representing slippage percentages.
+     * @dev Slippage calculations are based on a granularity of 10,000 to represent 100%.
+     */
+    uint256 public constant SLIPPAGE_PRECISION = 10_000;
+
+    /**
+     *
+     * @notice Address of the Router V2 Path Provider used for fetching and calculating optimal token swap routes.
+     * @dev This address is utilized to access routing functionality for executing token buybacks.
+     */
+    address public override routerV2PathProvider;
+
+    /**
+     * @notice Ensures the slippage value is within the acceptable range.
+     * @param slippage_ The slippage value to check.
+     * @dev Reverts with IncorrectSlippage if the slippage exceeds the maximum allowed.
+     */
+    modifier onlyCorrectSlippage(uint256 slippage_) {
+        if (slippage_ > MAX_SLIPPAGE) {
+            revert IncorrectSlippage();
+        }
+        _;
+    }
+
+    /**
+     * @notice Ensures the provided token is not the target buyback token.
+     * @param token_ The token address to check.
+     * @dev Reverts with IncorrectInputToken if the token address matches the buyback target token.
+     */
+    modifier onlyCorrectInputToken(address token_) {
+        _checkAddressZero(token_);
+        if (token_ == _getBuybackTargetToken()) {
+            revert IncorrectInputToken();
+        }
+        _;
+    }
+
+    /**
+     * @notice Initializes the buyback contract with the address of the router V2 path provider.
+     * @param routerV2PathProvider_ The address of the router V2 path provider to be set.
+     * @dev This function should be called from the contract's initializer function.
+     */
+    function __SingelTokenBuyback__init(address routerV2PathProvider_) internal onlyInitializing {
+        _checkAddressZero(routerV2PathProvider_);
+
+        routerV2PathProvider = routerV2PathProvider_;
+    }
+
+    /**
+     * @notice Buys back tokens by swapping specified input tokens for a target token via a DEX
+     * @dev Executes a token swap using the optimal route found via Router V2 Path Provider. Ensures input token is not the target token and validates slippage.
+     *
+     * @param inputToken_ The ERC20 token to swap from.
+     * @param inputRouters_ Array of routes to potentially use for the swap.
+     * @param slippage_ The maximum allowed slippage for the swap, in basis points.
+     * @param deadline_ Unix timestamp after which the transaction will revert.
+     */
+    function buybackTokenByV2(
+        address inputToken_,
+        IRouterV2.route[] calldata inputRouters_,
+        uint256 slippage_,
+        uint256 deadline_
+    ) external virtual override onlyCorrectInputToken(inputToken_) onlyCorrectSlippage(slippage_) returns (uint256 outputAmount) {
+        _checkBuybackSwapPermissions();
+
+        IERC20 inputTokenCache = IERC20(inputToken_);
+
+        uint256 amountIn = inputTokenCache.balanceOf(address(this));
+        if (amountIn == 0) {
+            revert ZeroBalance();
+        }
+
+        address targetToken = _getBuybackTargetToken();
+
+        IRouterV2PathProvider routerV2PathProviderCache = IRouterV2PathProvider(routerV2PathProvider);
+
+        (IRouterV2.route[] memory optimalRoute, ) = routerV2PathProviderCache.getOptimalTokenToTokenRoute(
+            inputToken_,
+            targetToken,
+            amountIn
+        );
+
+        uint256 amountOutQuote;
+        if (optimalRoute.length > 0) {
+            amountOutQuote = routerV2PathProviderCache.getAmountOutQuote(amountIn, optimalRoute);
+        }
+
+        if (inputRouters_.length > 1) {
+            if (inputRouters_[0].from != inputToken_ || inputRouters_[inputRouters_.length - 1].to != targetToken) {
+                revert InvalidInputRoutes();
+            }
+
+            if (!routerV2PathProviderCache.isValidInputRoutes(inputRouters_)) {
+                revert InvalidInputRoutes();
+            }
+
+            uint256 amountOutQuoteInputRouters = routerV2PathProviderCache.getAmountOutQuote(amountIn, inputRouters_);
+
+            if (amountOutQuoteInputRouters > amountOutQuote) {
+                optimalRoute = inputRouters_;
+                amountOutQuote = amountOutQuoteInputRouters;
+            }
+        }
+
+        amountOutQuote = amountOutQuote - (amountOutQuote * slippage_) / SLIPPAGE_PRECISION;
+        if (amountOutQuote == 0) {
+            revert RouteNotFound();
+        }
+
+        IRouterV2 router = IRouterV2(routerV2PathProviderCache.router());
+        inputTokenCache.safeApprove(address(router), amountIn);
+
+        uint256 balanceBefore = IERC20(targetToken).balanceOf(address(this));
+
+        uint256[] memory amountsOut = router.swapExactTokensForTokens(amountIn, amountOutQuote, optimalRoute, address(this), deadline_);
+
+        uint256 amountOut = amountsOut[amountsOut.length - 1];
+
+        assert(IERC20(targetToken).balanceOf(address(this)) - balanceBefore == amountOut);
+        assert(amountOut > 0);
+
+        emit BuybackTokenByV2(msg.sender, inputToken_, targetToken, optimalRoute, amountIn, amountOut);
+
+        return amountOut;
+    }
+
+    /**
+     * @notice Retrieves the target token for buybacks.
+     * @dev Provides an abstraction layer over internal details, potentially allowing for dynamic updates in the future.
+     * @return The address of the token targeted for buyback operations.
+     */
+    function getBuybackTargetToken() external view returns (address) {
+        return _getBuybackTargetToken();
+    }
+
+    /**
+     * @dev Internal function to enforce permissions or rules before allowing a buyback swap to proceed.
+     */
+    function _checkBuybackSwapPermissions() internal view virtual;
+
+    /**
+     * @dev Internal helper to fetch the target token for buybacks.
+     * @return The address of the buyback target token.
+     */
+    function _getBuybackTargetToken() internal view virtual returns (address);
+
+    /**
+     * @dev Checked provided address on zero value, throw AddressZero error in case when addr_ is zero
+     *
+     * @param addr_ The address which will checked on zero
+     */
+    function _checkAddressZero(address addr_) internal pure virtual {
+        if (addr_ == address(0)) {
+            revert ZeroAddress();
+        }
+    }
+
+    /**
+     * @dev This empty reserved space is put in place to allow future versions to add new
+     * variables without shifting down storage in the inheritance chain.
+     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
+     */
+    uint256[50] private __gap;
+}
diff --git a/contracts/nest/SingelTokenVirtualRewarderUpgradeable.sol b/contracts/nest/SingelTokenVirtualRewarderUpgradeable.sol
new file mode 100644
index 0000000..6b3e3b1
--- /dev/null
+++ b/contracts/nest/SingelTokenVirtualRewarderUpgradeable.sol
@@ -0,0 +1,379 @@
+// SPDX-License-Identifier: BUSL-1.1
+pragma solidity =0.8.19;
+
+import {ISingelTokenVirtualRewarder} from "./interfaces/ISingelTokenVirtualRewarder.sol";
+import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
+import {BlastGovernorClaimableSetup} from "../integration/BlastGovernorClaimableSetup.sol";
+import {VirtualRewarderCheckpoints} from "./libraries/VirtualRewarderCheckpoints.sol";
+
+/**
+ * @title Single Token Virtual Rewarder Upgradeable
+ * @dev An upgradeable contract for managing token rewards based on virtual balances and epochs. It supports functionalities
+ * like deposits, withdrawals, and reward calculations based on checkpoints.
+ */
+contract SingelTokenVirtualRewarderUpgradeable is ISingelTokenVirtualRewarder, BlastGovernorClaimableSetup, Initializable {
+    /**
+     * @title Struct for managing token information within a virtual reward system
+     * @notice Holds all pertinent data related to individual tokens within the reward system.
+     * @dev The structure stores balances, checkpoint indices, and a mapping of balance checkpoints.
+     */
+    struct TokenInfo {
+        uint256 balance; // Current balance of the token
+        uint256 checkpointLastIndex; // Index of the last checkpoint for the token
+        uint256 lastEarnEpoch; // The last epoch during which rewards were calculated for the token
+        mapping(uint256 index => VirtualRewarderCheckpoints.Checkpoint) balanceCheckpoints; // Mapping of index to balance checkpoints
+    }
+
+    /**
+     * @notice Address of the strategy contract that interacts with this reward system
+     * @dev This should be set to the address of the strategy managing the tokens and their rewards.
+     */
+    address public override strategy;
+
+    /**
+     * @notice Total supply of all tokens managed by the reward system
+     * @dev This total supply is used in reward calculations across different epochs.
+     */
+    uint256 public override totalSupply;
+
+    /**
+     * @notice Index of the last checkpoint for the total supply
+     * @dev Used to track changes in total supply at each checkpoint.
+     */
+    uint256 public totalSupplyCheckpointLastIndex;
+
+    /**
+     * @notice Mapping of total supply checkpoints
+     * @dev This stores checkpoints of the total supply which are referenced in reward calculations.
+     */
+    mapping(uint256 index => VirtualRewarderCheckpoints.Checkpoint) public totalSupplyCheckpoints;
+
+    /**
+     * @notice Mapping from token ID to its associated TokenInfo
+     * @dev Keeps track of all relevant token information, including balances and checkpoints.
+     */
+    mapping(uint256 tokenId => TokenInfo tokenInfo) public tokensInfo;
+
+    /**
+     * @notice Mapping from epoch to the total rewards allocated for that epoch
+     * @dev Used to determine the amount of rewards available per epoch, which influences reward calculations.
+     */
+    mapping(uint256 epoch => uint256 rewards) public rewardsPerEpoch;
+
+    /**
+     * @notice Constant defining the length of a week in seconds
+     * @dev Used for time-related calculations, particularly in determining epoch boundaries.
+     */
+    uint256 internal constant _WEEK = 86400 * 7;
+
+    /**
+     * @dev Custom error for unauthorized access attempts
+     * @notice Thrown when an operation is attempted by an unauthorized address, typically checked against the strategy.
+     */
+    error AccessDenied();
+
+    /**
+     * @dev Custom error indicating operation involving zero amount which is not permitted
+     * @notice Used primarily in deposit, withdrawal, and reward distribution to prevent erroneous zero value transactions.
+     */
+    error ZeroAmount();
+
+    /**
+     * @dev Modifier to restrict function calls to the strategy address
+     * @notice Ensures that only the designated strategy can call certain functions.
+     */
+    modifier onlyStrategy() {
+        if (msg.sender != strategy) {
+            revert AccessDenied();
+        }
+        _;
+    }
+
+    /**
+     * @dev Constructor that disables initialization on implementation.
+     */
+    constructor() {
+        _disableInitializers();
+    }
+
+    /**
+     * @notice Initializes the contract with necessary governance and operational addresses
+     * @dev Sets up blast governance and operational aspects of the contract. This function can only be called once.
+     *
+     * @param blastGovernor_ The governance address capable of claiming the contract
+     * @param strategy_ The strategy address that will interact with this contract
+     */
+    function initialize(address blastGovernor_, address strategy_) external override initializer {
+        __BlastGovernorClaimableSetup_init(blastGovernor_);
+
+        _checkAddressZero(strategy_);
+
+        strategy = strategy_;
+    }
+
+    /**
+     * @notice Deposits a specific amount of tokens for a given tokenId
+     * @dev This function updates the token's balance and total supply and writes a new checkpoint.
+     *
+     * @param tokenId_ The ID of the token to deposit
+     * @param amount_ The amount of tokens to deposit
+     */
+    function deposit(uint256 tokenId_, uint256 amount_) external onlyStrategy {
+        if (amount_ == 0) {
+            revert ZeroAmount();
+        }
+
+        TokenInfo storage info = tokensInfo[tokenId_];
+        info.balance += amount_;
+        totalSupply += amount_;
+
+        uint256 currentEpoch = _currentEpoch();
+        _writeCheckpoints(info, currentEpoch);
+
+        emit Deposit(tokenId_, amount_, currentEpoch);
+    }
+
+    /**
+     * @notice Withdraws a specific amount of tokens for a given tokenId
+     * @dev This function updates the token's balance and total supply and writes a new checkpoint.
+     *
+     * @param tokenId_ The ID of the token from which to withdraw
+     * @param amount_ The amount of tokens to withdraw
+     */
+    function withdraw(uint256 tokenId_, uint256 amount_) external onlyStrategy {
+        TokenInfo storage info = tokensInfo[tokenId_];
+        if (info.balance == 0 || amount_ == 0) {
+            revert ZeroAmount();
+        }
+
+        info.balance -= amount_;
+        totalSupply -= amount_;
+
+        uint256 currentEpoch = _currentEpoch();
+        _writeCheckpoints(info, currentEpoch);
+
+        emit Withdraw(tokenId_, amount_, currentEpoch);
+    }
+
+    /**
+     * @notice Harvests rewards for a specific tokenId
+     * @dev Calculates the available rewards for the token and updates the last earned epoch.
+     *
+     * IMPORTANT: If the reward was issued after the harvest summon in an epoch,
+     *  you will not be able to claim it. Wait for the distribution of rewards for the past era
+     *
+     * @param tokenId_ The ID of the token for which to harvest rewards
+     * @return reward The amount of rewards harvested
+     */
+    function harvest(uint256 tokenId_) external onlyStrategy returns (uint256 reward) {
+        reward = _calculateAvailableRewardsAmount(tokenId_);
+
+        uint256 currentEpoch = _currentEpoch();
+        tokensInfo[tokenId_].lastEarnEpoch = currentEpoch;
+
+        emit Harvest(tokenId_, reward, currentEpoch);
+        return reward;
+    }
+
+    /**
+     * @notice Notifies the contract of a new reward amount to be distributed in the current epoch
+     * @dev Updates the rewards for the current epoch and emits a notification event.
+     *
+     * @param amount_ The amount of rewards to distribute
+     */
+    function notifyRewardAmount(uint256 amount_) external onlyStrategy {
+        if (amount_ == 0) {
+            revert ZeroAmount();
+        }
+
+        uint256 currentEpoch = _currentEpoch();
+        rewardsPerEpoch[currentEpoch] += amount_;
+
+        emit NotifyReward(amount_, currentEpoch);
+    }
+
+    /**
+     * @notice Calculates the available rewards amount for a given tokenId
+     *
+     * @param tokenId_ The ID of the token to calculate rewards for
+     * @return reward The calculated reward amount
+     */
+    function calculateAvailableRewardsAmount(uint256 tokenId_) external view returns (uint256 reward) {
+        return _calculateAvailableRewardsAmount(tokenId_);
+    }
+
+    /**
+     * @notice Provides the current balance of a specific tokenId
+     *
+     * @param tokenId_ The ID of the token to check
+     * @return The current balance of the token
+     */
+    function balanceOf(uint256 tokenId_) external view returns (uint256) {
+        return tokensInfo[tokenId_].balance;
+    }
+
+    /**
+     * @notice Provides the balance of a specific tokenId at a given timestamp
+     *
+     * @param tokenId_ The ID of the token to check
+     * @param timestamp_ The specific timestamp to check the balance at
+     * @return The balance of the token at the given timestamp
+     */
+    function balanceOfAt(uint256 tokenId_, uint256 timestamp_) external view returns (uint256) {
+        return
+            VirtualRewarderCheckpoints.getAmount(
+                tokensInfo[tokenId_].balanceCheckpoints,
+                tokensInfo[tokenId_].checkpointLastIndex,
+                timestamp_
+            );
+    }
+
+    /**
+     * @notice Provides the total supply of tokens at a given timestamp
+     *
+     * @param timestamp_ The timestamp to check the total supply at
+     * @return The total supply of tokens at the specified timestamp
+     */
+    function totalSupplyAt(uint256 timestamp_) external view returns (uint256) {
+        return VirtualRewarderCheckpoints.getAmount(totalSupplyCheckpoints, totalSupplyCheckpointLastIndex, timestamp_);
+    }
+
+    /**
+     * @notice Returns the checkpoint data for a specific token and index
+     *
+     * @param tokenId_ The ID of the token to check
+     * @param index The index of the checkpoint to retrieve
+     * @return A checkpoint struct containing the timestamp and amount at that index
+     */
+    function balanceCheckpoints(uint256 tokenId_, uint256 index) external view returns (VirtualRewarderCheckpoints.Checkpoint memory) {
+        return tokensInfo[tokenId_].balanceCheckpoints[index];
+    }
+
+    /**
+     * @dev Writes checkpoints for token balance and total supply at a given epoch.
+     * @notice This function updates both the token's individual balance checkpoint and the total supply checkpoint.
+     *
+     * @param info_ The storage reference to the token's information which includes balance and checkpoint index.
+     * @param epoch_ The epoch for which the checkpoint is being written.
+     */
+    function _writeCheckpoints(TokenInfo storage info_, uint256 epoch_) internal {
+        info_.checkpointLastIndex = VirtualRewarderCheckpoints.writeCheckpoint(
+            info_.balanceCheckpoints,
+            info_.checkpointLastIndex,
+            epoch_,
+            info_.balance
+        );
+
+        totalSupplyCheckpointLastIndex = VirtualRewarderCheckpoints.writeCheckpoint(
+            totalSupplyCheckpoints,
+            totalSupplyCheckpointLastIndex,
+            epoch_,
+            totalSupply
+        );
+    }
+
+    /**
+     * @notice This function accumulates rewards over each epoch since last claimed to present.
+     * @dev Calculates the total available rewards for a given tokenId since the last earned epoch.
+     *
+     * @param tokenId_ The identifier of the token for which rewards are being calculated.
+     * @return reward The total accumulated reward since the last claim.
+     */
+    function _calculateAvailableRewardsAmount(uint256 tokenId_) internal view returns (uint256 reward) {
+        uint256 checkpointLastIndex = tokensInfo[tokenId_].checkpointLastIndex;
+        if (checkpointLastIndex == 0) {
+            return 0;
+        }
+
+        uint256 startEpoch = tokensInfo[tokenId_].lastEarnEpoch;
+
+        uint256 index = startEpoch == 0
+            ? 1
+            : VirtualRewarderCheckpoints.getCheckpointIndex(
+                tokensInfo[tokenId_].balanceCheckpoints,
+                tokensInfo[tokenId_].checkpointLastIndex,
+                startEpoch
+            );
+
+        uint256 epochTimestamp = tokensInfo[tokenId_].balanceCheckpoints[index].timestamp;
+
+        if (epochTimestamp > startEpoch) {
+            startEpoch = epochTimestamp;
+        }
+
+        uint256 currentEpoch = _currentEpoch();
+        uint256 notHarvestedEpochCount = (currentEpoch - startEpoch) / _WEEK;
+
+        for (uint256 i; i < notHarvestedEpochCount; ) {
+            reward += _calculateRewardPerEpoch(tokenId_, startEpoch);
+
+            startEpoch += _WEEK;
+            unchecked {
+                i++;
+            }
+        }
+    }
+
+    /**
+     * @notice This method uses the reward per epoch and the token's proportion of the total supply to determine the reward amount.
+     * @dev Calculates the reward for a specific tokenId for a single epoch based on the token's balance and total supply.
+     *
+     * @param tokenId_ The identifier of the token.
+     * @param epoch_ The epoch for which to calculate the reward.
+     * @return The calculated reward for the epoch.
+     */
+    function _calculateRewardPerEpoch(uint256 tokenId_, uint256 epoch_) internal view returns (uint256) {
+        uint256 balance = VirtualRewarderCheckpoints.getAmount(
+            tokensInfo[tokenId_].balanceCheckpoints,
+            tokensInfo[tokenId_].checkpointLastIndex,
+            epoch_
+        );
+
+        uint256 supply = VirtualRewarderCheckpoints.getAmount(totalSupplyCheckpoints, totalSupplyCheckpointLastIndex, epoch_);
+
+        if (supply == 0) {
+            return 0;
+        }
+
+        return (balance * rewardsPerEpoch[epoch_ + _WEEK]) / supply;
+    }
+
+    /**
+     * @notice This function return current epoch
+     * @dev Retrieves the current epoch
+     *
+     * @return The current epoch
+     */
+    function _currentEpoch() internal view returns (uint256) {
+        return _roundToEpoch(block.timestamp);
+    }
+
+    /**
+     * @notice This function is used to align timestamps with epoch boundaries.
+     * @dev Rounds down the timestamp to the start of the epoch.
+     *
+     * @param timestamp_ The timestamp to round down.
+     * @return The timestamp rounded down to the nearest epoch start.
+     */
+    function _roundToEpoch(uint256 timestamp_) internal pure returns (uint256) {
+        return (timestamp_ / _WEEK) * _WEEK;
+    }
+
+    /**
+     * @dev Checked provided address on zero value, throw AddressZero error in case when addr_ is zero
+     *
+     * @param addr_ The address which will checked on zero
+     */
+    function _checkAddressZero(address addr_) internal pure {
+        if (addr_ == address(0)) {
+            revert AddressZero();
+        }
+    }
+
+    /**
+     * @dev This empty reserved space is put in place to allow future versions to add new
+     * variables without shifting down storage in the inheritance chain.
+     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
+     */
+    uint256[50] private __gap;
+}
diff --git a/contracts/nest/StrategyProxy.sol b/contracts/nest/StrategyProxy.sol
new file mode 100644
index 0000000..0f92797
--- /dev/null
+++ b/contracts/nest/StrategyProxy.sol
@@ -0,0 +1,49 @@
+// SPDX-License-Identifier: MIT
+pragma solidity =0.8.19;
+
+import {StorageSlot} from "@openzeppelin/contracts/utils/StorageSlot.sol";
+
+import {ICompoundVeFNXManagedNFTStrategyFactory} from "./interfaces/ICompoundVeFNXManagedNFTStrategyFactory.sol";
+
+contract StrategyProxy {
+    address private immutable factory;
+    bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
+
+    constructor() {
+        factory = msg.sender;
+    }
+
+    function _getImplementation() internal view returns (address) {
+        return StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value;
+    }
+
+    function _setImplementation(address newImplementation) private {
+        StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value = newImplementation;
+    }
+
+    fallback() external payable {
+        address impl = ICompoundVeFNXManagedNFTStrategyFactory(factory).strategyImplementation();
+        require(impl != address(0));
+
+        //Just for etherscan compatibility
+        if (impl != _getImplementation() && msg.sender != (address(0))) {
+            _setImplementation(impl);
+        }
+
+        assembly {
+            let ptr := mload(0x40)
+            calldatacopy(ptr, 0, calldatasize())
+            let result := delegatecall(gas(), impl, ptr, calldatasize(), 0, 0)
+            let size := returndatasize()
+            returndatacopy(ptr, 0, size)
+
+            switch result
+            case 0 {
+                revert(ptr, size)
+            }
+            default {
+                return(ptr, size)
+            }
+        }
+    }
+}
diff --git a/contracts/nest/VirtualRewarderProxy.sol b/contracts/nest/VirtualRewarderProxy.sol
new file mode 100644
index 0000000..f76b8b3
--- /dev/null
+++ b/contracts/nest/VirtualRewarderProxy.sol
@@ -0,0 +1,49 @@
+// SPDX-License-Identifier: MIT
+pragma solidity =0.8.19;
+
+import {StorageSlot} from "@openzeppelin/contracts/utils/StorageSlot.sol";
+
+import {ICompoundVeFNXManagedNFTStrategyFactory} from "./interfaces/ICompoundVeFNXManagedNFTStrategyFactory.sol";
+
+contract VirtualRewarderProxy {
+    address private immutable factory;
+    bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
+
+    constructor() {
+        factory = msg.sender;
+    }
+
+    function _getImplementation() internal view returns (address) {
+        return StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value;
+    }
+
+    function _setImplementation(address newImplementation) private {
+        StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value = newImplementation;
+    }
+
+    fallback() external payable {
+        address impl = ICompoundVeFNXManagedNFTStrategyFactory(factory).virtualRewarderImplementation();
+        require(impl != address(0));
+
+        //Just for etherscan compatibility
+        if (impl != _getImplementation() && msg.sender != (address(0))) {
+            _setImplementation(impl);
+        }
+
+        assembly {
+            let ptr := mload(0x40)
+            calldatacopy(ptr, 0, calldatasize())
+            let result := delegatecall(gas(), impl, ptr, calldatasize(), 0, 0)
+            let size := returndatasize()
+            returndatacopy(ptr, 0, size)
+
+            switch result
+            case 0 {
+                revert(ptr, size)
+            }
+            default {
+                return(ptr, size)
+            }
+        }
+    }
+}
diff --git a/contracts/nest/interfaces/ICompoundVeFNXManagedNFTStrategy.sol b/contracts/nest/interfaces/ICompoundVeFNXManagedNFTStrategy.sol
new file mode 100644
index 0000000..313ca5a
--- /dev/null
+++ b/contracts/nest/interfaces/ICompoundVeFNXManagedNFTStrategy.sol
@@ -0,0 +1,110 @@
+// SPDX-License-Identifier: MIT
+pragma solidity >=0.8.0;
+
+import {IManagedNFTStrategy} from "./IManagedNFTStrategy.sol";
+import {ISingelTokenBuyback} from "./ISingelTokenBuyback.sol";
+
+/**
+ * @title ICompoundVeFNXManagedNFTStrategy
+ * @dev Interface for a compound strategy specific to VeFNX tokens, extending the basic managed NFT strategy functionality.
+ * @notice This interface provides functionalities to handle compounding of VeFNX token rewards and interactions with a virtual rewarder contract.
+ */
+interface ICompoundVeFNXManagedNFTStrategy is IManagedNFTStrategy, ISingelTokenBuyback {
+    /**
+     * @dev Emitted when rewards are compounded by the caller.
+     *
+     * @param caller The address of the account that called the compound function.
+     * @param amount The amount of VeFNX tokens that were compounded.
+     */
+    event Compound(address indexed caller, uint256 indexed amount);
+
+    /**
+     * @dev Emitted when an NFT is attached to the strategy, initializing reward mechanisms for it.
+     *
+     * @param tokenId The ID of the NFT that is being attached.
+     * @param userBalance The balance associated with the NFT at the time of attachment.
+     */
+    event OnAttach(uint256 indexed tokenId, uint256 indexed userBalance);
+
+    /**
+     * @dev Emitted when an NFT is detached from the strategy, concluding reward mechanisms for it.
+     *
+     * @param tokenId The ID of the NFT that is being detached.
+     * @param userBalance The balance associated with the NFT at the time of detachment.
+     * @param lockedRewards The rewards that were locked and harvested upon detachment.
+     */
+    event OnDettach(uint256 indexed tokenId, uint256 indexed userBalance, uint256 indexed lockedRewards);
+
+    /**
+     * @dev Emitted when ERC20 tokens are recovered from the contract by an admin.
+     *
+     * @param caller The address of the caller who initiated the recovery.
+     * @param recipient The recipient address where the recovered tokens were sent.
+     * @param token The address of the token that was recovered.
+     * @param amount The amount of the token that was recovered.
+     */
+    event Erc20Recover(address indexed caller, address indexed recipient, address indexed token, uint256 amount);
+
+    /**
+     * @dev Emitted when the address of the Router V2 Path Provider is updated.
+     *
+     * @param oldRouterV2PathProvider The address of the previous Router V2 Path Provider.
+     * @param newRouterV2PathProvider The address of the new Router V2 Path Provider that has been set.
+     */
+    event SetRouterV2PathProvider(address indexed oldRouterV2PathProvider, address indexed newRouterV2PathProvider);
+
+    /**
+     * @notice Compounds accumulated rewards into additional stakes or holdings.
+     * @dev Function to reinvest earned rewards back into the underlying asset to increase the principal amount.
+     * This is specific to strategies dealing with compounding mechanisms in DeFi protocols.
+     */
+    function compound() external;
+
+    /**
+     * @notice Returns the address of the virtual rewarder associated with this strategy.
+     * @return address The contract address of the virtual rewarder that manages reward distributions for this strategy.
+     */
+    function virtualRewarder() external view returns (address);
+
+    /**
+     * @notice Returns the address of the FENIX token used in this strategy.
+     * @return address The contract address of the FENIX token.
+     */
+    function fenix() external view returns (address);
+
+    /**
+     * @notice Retrieves the total amount of locked rewards available for a specific NFT based on its tokenId.
+     * @param tokenId_ The identifier of the NFT to query.
+     * @return The total amount of locked rewards for the specified NFT.
+     */
+    function getLockedRewardsBalance(uint256 tokenId_) external view returns (uint256);
+
+    /**
+     * @notice Retrieves the balance or stake associated with a specific NFT.
+     * @param tokenId_ The identifier of the NFT to query.
+     * @return The balance of the specified NFT.
+     */
+    function balanceOf(uint256 tokenId_) external view returns (uint256);
+
+    /**
+     * @notice Retrieves the total supply of stakes managed by the strategy.
+     * @return The total supply of stakes.
+     */
+    function totalSupply() external view returns (uint256);
+
+    /**
+     * @notice Initializes the contract with necessary blast governance and operational addresses, and sets specific strategy parameters.
+     *
+     * @param blastGovernor_ Address of the blast governor contract.
+     * @param managedNFTManager_ Address of the managed NFT manager contract.
+     * @param virtualRewarder_ Address of the virtual rewarder contract.
+     * @param name_ Name of the strategy.
+     */
+    function initialize(
+        address blastGovernor_,
+        address managedNFTManager_,
+        address virtualRewarder_,
+        address routerV2PathProvider_,
+        string memory name_
+    ) external;
+}
diff --git a/contracts/nest/interfaces/ICompoundVeFNXManagedNFTStrategyFactory.sol b/contracts/nest/interfaces/ICompoundVeFNXManagedNFTStrategyFactory.sol
new file mode 100644
index 0000000..a900b90
--- /dev/null
+++ b/contracts/nest/interfaces/ICompoundVeFNXManagedNFTStrategyFactory.sol
@@ -0,0 +1,99 @@
+// SPDX-License-Identifier: MIT
+pragma solidity >=0.8.0;
+
+/**
+ * @title Interface for the Compound VeFNX Managed NFT Strategy Factory
+ * @notice This interface outlines the functions and events for a factory responsible for creating and managing strategies and virtual rewarders for Compound VeFNX-managed NFTs.
+ */
+interface ICompoundVeFNXManagedNFTStrategyFactory {
+    /**
+     * @dev Emitted when the address of the Router V2 Path Provider is updated.
+     *
+     * @param oldRouterV2PathProvider The address of the previous Router V2 Path Provider.
+     * @param newRouterV2PathProvider The address of the new Router V2 Path Provider that has been set.
+     */
+    event SetRouterV2PathProvider(address indexed oldRouterV2PathProvider, address indexed newRouterV2PathProvider);
+
+    /**
+     * @dev Emitted when the default Blast governor address for new strategies is updated.
+     *
+     * @param oldDefaultBlastGovernor The address of the previous default Blast governor.
+     * @param newDefaultBlastGovernor The address of the new default Blast governor that has been set.
+     */
+    event SetDefaultBlastGovernor(address indexed oldDefaultBlastGovernor, address indexed newDefaultBlastGovernor);
+
+    /**
+     * @dev Emitted when the implementation address for the virtual rewarder is changed.
+     *
+     * @param oldImplementation The previous implementation address of the virtual rewarder.
+     * @param newImplementation The new implementation address of the virtual rewarder that has been set.
+     */
+    event ChangeVirtualRewarderImplementation(address indexed oldImplementation, address indexed newImplementation);
+
+    /**
+     * @dev Emitted when the implementation address for the strategy is changed.
+     *
+     * @param oldImplementation The previous implementation address of the strategy.
+     * @param newImplementation The new implementation address of the strategy that has been set.
+     */
+    event ChangeStrategyImplementation(address indexed oldImplementation, address indexed newImplementation);
+
+    /**
+     * @dev Emitted when a new strategy and its corresponding virtual rewarder are created.
+     *
+     * @param strategy The address of the newly created strategy.
+     * @param virtualRewarder The address of the corresponding virtual rewarder created alongside the strategy.
+     * @param name The name assigned to the new strategy.
+     */
+    event CreateStrategy(address indexed strategy, address indexed virtualRewarder, string name);
+
+    /**
+     * @notice Returns the current implementation address of the virtual rewarder.
+     * @return The address of the virtual rewarder implementation.
+     */
+    function virtualRewarderImplementation() external view returns (address);
+
+    /**
+     * @notice Returns the current implementation address of the strategy.
+     * @return The address of the strategy implementation.
+     */
+    function strategyImplementation() external view returns (address);
+
+    /**
+     * @notice Returns the address of the managed NFT manager associated with the strategies.
+     * @return The address of the managed NFT manager.
+     */
+    function managedNFTManager() external view returns (address);
+
+    /**
+     * @notice Returns the current default Blast governor address.
+     * @return The address of the default Blast governor.
+     */
+    function defaultBlastGovernor() external view returns (address);
+
+    /**
+     * @notice Returns the address of the Router V2 Path Provider used to fetch and calculate
+     *  optimal routes for token transactions within strategies.
+     * @return The address of the RouterV2PathProvider.
+     */
+    function routerV2PathProvider() external view returns (address);
+
+    /**
+     * @notice Creates a new strategy with a specific name.
+     * @param name_ The name to assign to the new strategy.
+     * @return The address of the newly created strategy instance
+     */
+    function createStrategy(string calldata name_) external returns (address);
+
+    /**
+     * @notice Sets a new default Blast governor address for newly created strategies.
+     * @param defaultBlastGovernor_ The new default governor address to be set.
+     */
+    function setDefaultBlastGovernor(address defaultBlastGovernor_) external;
+
+    /**
+     * @notice Sets a new RouterV2PathProvider.
+     * @param routerV2PathProvider_ The new address to set
+     */
+    function setRouterV2PathProvider(address routerV2PathProvider_) external;
+}
diff --git a/contracts/nest/interfaces/IManagedNFTManager.sol b/contracts/nest/interfaces/IManagedNFTManager.sol
new file mode 100644
index 0000000..f1f7b24
--- /dev/null
+++ b/contracts/nest/interfaces/IManagedNFTManager.sol
@@ -0,0 +1,131 @@
+// SPDX-License-Identifier: MIT
+pragma solidity >=0.8.0;
+
+/**
+ * @title Interface for Managed NFT Manager
+ * @dev Defines the functions and events for managing NFTs, including attaching/detaching to strategies, authorization, and administrative checks.
+ */
+interface IManagedNFTManager {
+    /**
+     * @dev Emitted when the disabled state of a managed NFT is toggled.
+     * @param sender The address that triggered the state change.
+     * @param tokenId The ID of the managed NFT affected.
+     * @param isDisable True if the NFT is now disabled, false if it is enabled.
+     */
+    event ToggleDisableManagedNFT(address indexed sender, uint256 indexed tokenId, bool indexed isDisable);
+
+    /**
+     * @dev Emitted when a new managed NFT is created and attached to a strategy.
+     * @param sender The address that performed the creation.
+     * @param strategy The address of the strategy to which the NFT is attached.
+     * @param tokenId The ID of the newly created managed NFT.
+     */
+    event CreateManagedNFT(address indexed sender, address indexed strategy, uint256 indexed tokenId);
+
+    /**
+     * @dev Emitted when an NFT is whitelisted or removed from the whitelist.
+     * @param tokenId The ID of the NFT being modified.
+     * @param isWhitelisted True if the NFT is being whitelisted, false if it is being removed from the whitelist.
+     */
+    event SetWhitelistedNFT(uint256 indexed tokenId, bool indexed isWhitelisted);
+
+    /**
+     * @dev Emitted when an authorized user is set for a managed NFT.
+     * @param managedTokenId The ID of the managed NFT.
+     * @param authorizedUser The address being authorized.
+     */
+    event SetAuthorizedUser(uint256 indexed managedTokenId, address authorizedUser);
+
+    /**
+     * @notice Checks if a managed NFT is currently disabled.
+     * @param managedTokenId_ The ID of the managed NFT.
+     * @return True if the managed NFT is disabled, false otherwise.
+     */
+    function isDisabledNFT(uint256 managedTokenId_) external view returns (bool);
+
+    /**
+     * @notice Determines if a token ID is recognized as a managed NFT within the system.
+     * @param managedTokenId_ The ID of the token to check.
+     * @return True if the token is a managed NFT, false otherwise.
+     */
+    function isManagedNFT(uint256 managedTokenId_) external view returns (bool);
+
+    /**
+     * @notice Checks if an NFT is whitelisted within the management system.
+     * @param tokenId_ The ID of the NFT to check.
+     * @return True if the NFT is whitelisted, false otherwise.
+     */
+    function isWhitelistedNFT(uint256 tokenId_) external view returns (bool);
+
+    /**
+     * @notice Verifies if a user's NFT is attached to any managed NFT.
+     * @param tokenId_ The ID of the user's NFT.
+     * @return True if the NFT is attached, false otherwise.
+     */
+    function isAttachedNFT(uint256 tokenId_) external view returns (bool);
+
+    /**
+     * @notice Checks if a given account is an administrator of the managed NFT system.
+     * @param account_ The address to check.
+     * @return True if the address is an admin, false otherwise.
+     */
+    function isAdmin(address account_) external view returns (bool);
+
+    /**
+     * @notice Retrieves the managed token ID that a user's NFT is attached to.
+     * @param tokenId_ The ID of the user's NFT.
+     * @return The ID of the managed token to which the NFT is attached.
+     */
+    function getAttachedManagedTokenId(uint256 tokenId_) external view returns (uint256);
+
+    /**
+     * @notice Address of the Voting Escrow contract managing voting and staking mechanisms.
+     */
+    function votingEscrow() external view returns (address);
+
+    /**
+     * @notice Address of the Voter contract responsible for handling governance actions related to managed NFTs.
+     */
+    function voter() external view returns (address);
+
+    /**
+     * @notice Verifies if a given address is authorized to manage a specific managed NFT.
+     * @param managedTokenId_ The ID of the managed NFT.
+     * @param account_ The address to verify.
+     * @return True if the address is authorized, false otherwise.
+     */
+    function isAuthorized(uint256 managedTokenId_, address account_) external view returns (bool);
+
+    /**
+     * @notice Assigns an authorized user for a managed NFT.
+     * @param managedTokenId_ The ID of the managed NFT.
+     * @param authorizedUser_ The address to authorize.
+     */
+    function setAuthorizedUser(uint256 managedTokenId_, address authorizedUser_) external;
+
+    /**
+     * @notice Creates a managed NFT and attaches it to a strategy
+     * @param strategy_ The strategy to which the managed NFT will be attached
+     */
+    function createManagedNFT(address strategy_) external returns (uint256 managedTokenId);
+
+    /**
+     * @notice Toggles the disabled state of a managed NFT
+     * @param managedTokenId_ The ID of the managed token to toggle
+     * @dev Enables or disables a managed token to control its operational status, with an event emitted for state change.
+     */
+    function toggleDisableManagedNFT(uint256 managedTokenId_) external;
+
+    /**
+     * @notice Attaches a user's NFT to a managed NFT, enabling it within a specific strategy.
+     * @param tokenId_ The user's NFT token ID.
+     * @param managedTokenId The managed NFT token ID.
+     */
+    function onAttachToManagedNFT(uint256 tokenId_, uint256 managedTokenId) external;
+
+    /**
+     * @notice Detaches a user's NFT from a managed NFT, disabling it within the strategy.
+     * @param tokenId_ The user's NFT token ID.
+     */
+    function onDettachFromManagedNFT(uint256 tokenId_) external;
+}
diff --git a/contracts/nest/interfaces/IManagedNFTStrategy.sol b/contracts/nest/interfaces/IManagedNFTStrategy.sol
new file mode 100644
index 0000000..7ec9f1d
--- /dev/null
+++ b/contracts/nest/interfaces/IManagedNFTStrategy.sol
@@ -0,0 +1,97 @@
+// SPDX-License-Identifier: MIT
+pragma solidity >=0.8.0;
+
+/**
+ * @title IManagedNFTStrategy
+ * @dev Interface for strategies managing NFTs ,
+ *      participate in voting, and claim rewards.
+ */
+interface IManagedNFTStrategy {
+    /**
+     * @dev Emitted when the name of the strategy is changed.
+     * @param newName The new name that has been set for the strategy.
+     */
+    event SetName(string indexed newName);
+
+    /**
+     * @dev Emitted when a new managed NFT is successfully attached to the strategy.
+     * @param managedTokenId The ID of the managed NFT that has been attached.
+     */
+    event AttachedManagedNFT(uint256 indexed managedTokenId);
+
+    /**
+     * @notice Called when an NFT is attached to a strategy.
+     * @dev Allows the strategy to perform initial setup or balance tracking when an NFT is first attached.
+     * @param tokenId The ID of the NFT being attached.
+     * @param userBalance The balance of governance tokens associated with the NFT at the time of attachment.
+     */
+    function onAttach(uint256 tokenId, uint256 userBalance) external;
+
+    /**
+     * @notice Called when an NFT is detached from a strategy.
+     * @dev Allows the strategy to clean up or update records when an NFT is removed.
+     * @param tokenId The ID of the NFT being detached.
+     * @param userBalance The remaining balance of governance tokens associated with the NFT at the time of detachment.
+     */
+    function onDettach(uint256 tokenId, uint256 userBalance) external returns (uint256 lockedRewards);
+
+    /**
+     * @notice Gets the address of the managed NFT manager contract.
+     * @return The address of the managed NFT manager.
+     */
+    function managedNFTManager() external view returns (address);
+
+    /**
+     * @notice Gets the address of the voting escrow contract used for locking governance tokens.
+     * @return The address of the voting escrow contract.
+     */
+    function votingEscrow() external view returns (address);
+
+    /**
+     * @notice Gets the address of the voter contract that coordinates governance actions.
+     * @return The address of the voter contract.
+     */
+    function voter() external view returns (address);
+
+    /**
+     * @notice Retrieves the name of the strategy.
+     * @return A string representing the name of the strategy.
+     */
+    function name() external view returns (string memory);
+
+    /**
+     * @notice Retrieves the ID of the managed token.
+     * @return The token ID used by the strategy.
+     */
+    function managedTokenId() external view returns (uint256);
+
+    /**
+     * @notice Submits a governance vote on behalf of the strategy.
+     * @param poolVote_ An array of addresses representing the pools to vote on.
+     * @param weights_ An array of weights corresponding to each pool vote.
+     */
+    function vote(address[] calldata poolVote_, uint256[] calldata weights_) external;
+
+    /**
+     * @notice Claims rewards allocated to the managed NFTs from specified gauges.
+     * @param gauges_ An array of addresses representing the gauges from which rewards are to be claimed.
+     */
+    function claimRewards(address[] calldata gauges_) external;
+
+    /**
+     * @notice Claims bribes allocated to the managed NFTs for specific tokens and pools.
+     * @param bribes_ An array of addresses representing the bribe pools.
+     * @param tokens_ An array of token addresses for each bribe pool where rewards can be claimed.
+     */
+    function claimBribes(address[] calldata bribes_, address[][] calldata tokens_) external;
+
+    /**
+     * @notice Attaches a specific managed NFT to this strategy, setting up necessary governance or reward mechanisms.
+     * @dev This function can only be called by administrators. It sets the `managedTokenId` and ensures that the token is
+     *      valid and owned by this contract. Emits an `AttachedManagedNFT` event upon successful attachment.
+     * @param managedTokenId_ The token ID of the NFT to be managed by this strategy.
+     * throws AlreadyAttached if the strategy is already attached to a managed NFT.
+     * throws IncorrectManagedTokenId if the provided token ID is not managed or not owned by this contract.
+     */
+    function attachManagedNFT(uint256 managedTokenId_) external;
+}
diff --git a/contracts/nest/interfaces/IPairQuote.sol b/contracts/nest/interfaces/IPairQuote.sol
new file mode 100644
index 0000000..b6db212
--- /dev/null
+++ b/contracts/nest/interfaces/IPairQuote.sol
@@ -0,0 +1,6 @@
+// SPDX-License-Identifier: MIT
+pragma solidity >=0.8.0;
+
+interface IPairQuote {
+    function quote(address tokenIn, uint amountIn, uint granularity) external view returns (uint amountOut);
+}
diff --git a/contracts/nest/interfaces/IRouterV2PathProvider.sol b/contracts/nest/interfaces/IRouterV2PathProvider.sol
new file mode 100644
index 0000000..98d7908
--- /dev/null
+++ b/contracts/nest/interfaces/IRouterV2PathProvider.sol
@@ -0,0 +1,100 @@
+// SPDX-License-Identifier: MIT
+pragma solidity >=0.8.0;
+
+import {IRouterV2} from "../../dexV2/interfaces/IRouterV2.sol";
+
+/**
+ * @title Interface for Router V2 Path Provider
+ * @notice Defines the required functionalities for managing routing paths within a decentralized exchange.
+ */
+interface IRouterV2PathProvider {
+    /**
+     * @notice Emitted when a new route is registered for a token
+     * @param token Address of the token for which the route is registered
+     * @param route Details of the registered route
+     */
+    event RegisterRouteForToken(address indexed token, IRouterV2.route route);
+
+    /**
+     * @notice Emitted when the allowance of a token to be used in input routes is updated
+     * @param token Address of the token
+     * @param isAllowed New allowance status (true if allowed, false otherwise)
+     */
+    event SetAllowedTokenInInputRouters(address indexed token, bool indexed isAllowed);
+
+    /**
+     * @notice Emitted when a new route is added to a token
+     * @param token Address of the token to which the route is added
+     * @param route Details of the route added
+     */
+    event AddRouteToToken(address indexed token, IRouterV2.route route);
+
+    /**
+     * @notice Emitted when a route is removed from a token
+     * @param token Address of the token from which the route is removed
+     * @param route Details of the route removed
+     */
+    event RemoveRouteFromToken(address indexed token, IRouterV2.route route);
+
+    /**
+     * @notice Sets whether a token can be used in input routes
+     * @param token_ Address of the token to set the permission
+     * @param isAllowed_ Boolean flag to allow or disallow the token
+     */
+    function setAllowedTokenInInputRouters(address token_, bool isAllowed_) external;
+
+    /**
+     * @notice Fetches the address of the router
+     * @return The address of the router contract
+     */
+    function router() external view returns (address);
+
+    /**
+     * @notice Fetches the address of the factory
+     * @return The address of the factory contract
+     */
+    function factory() external view returns (address);
+
+    /**
+     * @notice Checks if a token is allowed in input routes
+     * @param token_ Address of the token to check
+     * @return True if the token is allowed, false otherwise
+     */
+    function isAllowedTokenInInputRoutes(address token_) external view returns (bool);
+
+    /**
+     * @notice Retrieves all possible routes between two tokens
+     * @param inputToken_ Address of the input token
+     * @param outputToken_ Address of the output token
+     * @return routes A two-dimensional array of routes
+     */
+    function getRoutesTokenToToken(address inputToken_, address outputToken_) external view returns (IRouterV2.route[][] memory routes);
+
+    /**
+     * @notice Determines the optimal route and output amount for a given input amount between two tokens
+     * @param inputToken_ Address of the input token
+     * @param outputToken_ Address of the output token
+     * @param amountIn_ Amount of the input token
+     * @return A tuple containing the optimal route and the output amount
+     */
+    function getOptimalTokenToTokenRoute(
+        address inputToken_,
+        address outputToken_,
+        uint256 amountIn_
+    ) external view returns (IRouterV2.route[] memory, uint256 amountOut);
+
+    /**
+     * @notice Calculates the output amount for a specified route given an input amount
+     * @param amountIn_ Amount of input tokens
+     * @param routes_ Routes to calculate the output amount
+     * @return The amount of output tokens
+     */
+    function getAmountOutQuote(uint256 amountIn_, IRouterV2.route[] calldata routes_) external view returns (uint256);
+
+    /**
+     * @notice Validates if all routes provided are valid according to the system's rules
+     * @param inputRouters_ Array of routes to validate
+     * @return True if all routes are valid, false otherwise
+     */
+    function isValidInputRoutes(IRouterV2.route[] calldata inputRouters_) external view returns (bool);
+}
diff --git a/contracts/nest/interfaces/ISingelTokenBuyback.sol b/contracts/nest/interfaces/ISingelTokenBuyback.sol
new file mode 100644
index 0000000..832df52
--- /dev/null
+++ b/contracts/nest/interfaces/ISingelTokenBuyback.sol
@@ -0,0 +1,44 @@
+// SPDX-License-Identifier: MIT
+pragma solidity >=0.8.0;
+
+import {IRouterV2} from "../../dexV2/interfaces/IRouterV2.sol";
+
+interface ISingelTokenBuyback {
+    event BuybackTokenByV2(
+        address indexed caller,
+        address indexed inputToken,
+        address indexed outputToken,
+        IRouterV2.route[] routes,
+        uint256 inputAmount,
+        uint256 outputAmount
+    );
+
+    /**
+     * @notice Address of the Router V2 Path Provider used for fetching and calculating optimal token swap routes.
+     * @dev This address is utilized to access routing functionality for executing token buybacks.
+     */
+    function routerV2PathProvider() external view returns (address);
+
+    /**
+     * @notice Buys back tokens by swapping specified input tokens for a target token via a DEX
+     * @dev Executes a token swap using the optimal route found via Router V2 Path Provider. Ensures input token is not the target token and validates slippage.
+     *
+     * @param inputToken_ The ERC20 token to swap from.
+     * @param inputRouters_ Array of routes to potentially use for the swap.
+     * @param slippage_ The maximum allowed slippage for the swap, in basis points.
+     * @param deadline_ Unix timestamp after which the transaction will revert.
+     */
+    function buybackTokenByV2(
+        address inputToken_,
+        IRouterV2.route[] calldata inputRouters_,
+        uint256 slippage_,
+        uint256 deadline_
+    ) external returns (uint256 outputAmount);
+
+    /**
+     * @notice Retrieves the target token for buybacks.
+     * @dev Provides an abstraction layer over internal details, potentially allowing for dynamic updates in the future.
+     * @return The address of the token targeted for buyback operations.
+     */
+    function getBuybackTargetToken() external view returns (address);
+}
diff --git a/contracts/nest/interfaces/ISingelTokenVirtualRewarder.sol b/contracts/nest/interfaces/ISingelTokenVirtualRewarder.sol
new file mode 100644
index 0000000..66c2491
--- /dev/null
+++ b/contracts/nest/interfaces/ISingelTokenVirtualRewarder.sol
@@ -0,0 +1,108 @@
+// SPDX-License-Identifier: MIT
+pragma solidity >=0.8.0;
+
+/**
+ * @title Interface for Single Token Virtual Rewarder
+ * @dev Defines the basic interface for a reward system that handles deposits, withdrawals, and rewards based on token staking over different epochs.
+ */
+interface ISingelTokenVirtualRewarder {
+    /**
+     * @dev Emitted when a deposit is made.
+     * @param tokenId The identifier of the token being deposited.
+     * @param amount The amount of tokens deposited.
+     * @param epoch The epoch during which the deposit occurs.
+     */
+    event Deposit(uint256 indexed tokenId, uint256 indexed amount, uint256 indexed epoch);
+
+    /**
+     * @dev Emitted when a withdrawal is made.
+     * @param tokenId The identifier of the token being withdrawn.
+     * @param amount The amount of tokens withdrawn.
+     * @param epoch The epoch during which the withdrawal occurs.
+     */
+    event Withdraw(uint256 indexed tokenId, uint256 indexed amount, uint256 indexed epoch);
+
+    /**
+     * @dev Emitted when rewards are harvested.
+     * @param tokenId The identifier of the token for which rewards are harvested.
+     * @param rewardAmount The amount of rewards harvested.
+     * @param epochCount The epoch during which the harvest occurs.
+     */
+    event Harvest(uint256 indexed tokenId, uint256 indexed rewardAmount, uint256 indexed epochCount);
+
+    /**
+     * @dev Emitted when a new reward amount is notified to be added to the pool.
+     * @param rewardAmount The amount of rewards added.
+     * @param epoch The epoch during which the reward is added.
+     */
+    event NotifyReward(uint256 indexed rewardAmount, uint256 indexed epoch);
+
+    /**
+     * @notice Handles the deposit of tokens into the reward system.
+     * @param tokenId The identifier of the token being deposited.
+     * @param amount The amount of tokens to deposit.
+     */
+    function deposit(uint256 tokenId, uint256 amount) external;
+
+    /**
+     * @notice Handles the withdrawal of tokens from the reward system.
+     * @param tokenId The identifier of the token being withdrawn.
+     * @param amount The amount of tokens to withdraw.
+     */
+    function withdraw(uint256 tokenId, uint256 amount) external;
+
+    /**
+     * @notice Notifies the system of a new reward amount to be distributed.
+     * @param amount The amount of the new reward to add.
+     */
+    function notifyRewardAmount(uint256 amount) external;
+
+    /**
+     * @notice Harvests rewards for a specific token.
+     * @param tokenId The identifier of the token for which to harvest rewards.
+     * @return reward The amount of harvested rewards.
+     */
+    function harvest(uint256 tokenId) external returns (uint256 reward);
+
+    /**
+     * @notice Calculates the available amount of rewards for a specific token.
+     * @param tokenId The identifier of the token.
+     * @return reward The calculated reward amount.
+     */
+    function calculateAvailableRewardsAmount(uint256 tokenId) external view returns (uint256 reward);
+
+    /**
+     * @notice Returns the strategy address associated with this contract.
+     * @return The address of the strategy.
+     */
+    function strategy() external view returns (address);
+
+    /**
+     * @notice Returns the total supply of tokens under management.
+     * @return The total supply of tokens.
+     */
+    function totalSupply() external view returns (uint256);
+
+    /**
+     * @notice Returns the balance of a specific token.
+     * @param tokenId The identifier of the token.
+     * @return The balance of the specified token.
+     */
+    function balanceOf(uint256 tokenId) external view returns (uint256);
+
+    /**
+     * @notice Returns the reward per epoch for a specific epoch.
+     * @param epoch The epoch for which to retrieve the reward amount.
+     * @return The reward amount for the specified epoch.
+     */
+    function rewardsPerEpoch(uint256 epoch) external view returns (uint256);
+
+    /**
+     * @notice Initializes the contract with necessary governance and operational addresses
+     * @dev Sets up blast governance and operational aspects of the contract. This function can only be called once.
+     *
+     * @param blastGovernor_ The governance address capable of claiming the contract
+     * @param strategy_ The strategy address that will interact with this contract
+     */
+    function initialize(address blastGovernor_, address strategy_) external;
+}
diff --git a/contracts/nest/libraries/VirtualRewarderCheckpoints.sol b/contracts/nest/libraries/VirtualRewarderCheckpoints.sol
new file mode 100644
index 0000000..478ee4f
--- /dev/null
+++ b/contracts/nest/libraries/VirtualRewarderCheckpoints.sol
@@ -0,0 +1,107 @@
+// SPDX-License-Identifier: BUSL-1.1
+pragma solidity =0.8.19;
+
+/**
+ * @title VirtualRewarderCheckpoints
+ * @dev Library to manage checkpoints in a virtual reward system. This library facilitates the storage of state
+ * at specific timestamps for historical data tracking and reward calculation.
+ */
+library VirtualRewarderCheckpoints {
+    struct Checkpoint {
+        uint256 timestamp; // Timestamp at which the checkpoint is logged
+        uint256 amount; // Amount or value associated with the checkpoint
+    }
+
+    /**
+     * @notice Writes a new checkpoint or updates an existing one in the mapping.
+     * @dev If a checkpoint at the given timestamp already exists, it updates the amount; otherwise, it creates a new checkpoint.
+     *
+     * @param self_ Mapping from index to Checkpoint.
+     * @param lastIndex_ Index of the last recorded checkpoint.
+     * @param timestamp_ Timestamp for the new checkpoint.
+     * @param amount_ Amount to be associated with the new checkpoint.
+     * @return newIndex The index of the newly written checkpoint.
+     *
+     * Example:
+     * mapping(uint256 => Checkpoint) checkpoints;
+     * uint256 lastIndex = 0;
+     * lastIndex = VirtualRewarderCheckpoints.writeCheckpoint(checkpoints, lastIndex, block.timestamp, 100);
+     */
+    function writeCheckpoint(
+        mapping(uint256 index => Checkpoint checkpoint) storage self_,
+        uint256 lastIndex_,
+        uint256 timestamp_,
+        uint256 amount_
+    ) internal returns (uint256 newIndex) {
+        Checkpoint memory last = self_[lastIndex_];
+
+        newIndex = last.timestamp == timestamp_ ? lastIndex_ : lastIndex_ + 1;
+
+        self_[newIndex] = Checkpoint({timestamp: timestamp_, amount: amount_});
+    }
+
+    /**
+     * @notice Retrieves the amount at the checkpoint closest to and not after the given timestamp.
+     *
+     * @param self_ Mapping from index to Checkpoint.
+     * @param lastIndex_ Index of the last checkpoint.
+     * @param timestamp_ Timestamp for querying the amount.
+     * @return amount The amount at the closest checkpoint.
+     *
+     * Example:
+     * uint256 amount = VirtualRewarderCheckpoints.getAmount(checkpoints, lastIndex, block.timestamp);
+     */
+    function getAmount(
+        mapping(uint256 index => Checkpoint checkpoint) storage self_,
+        uint256 lastIndex_,
+        uint256 timestamp_
+    ) internal view returns (uint256) {
+        return self_[getCheckpointIndex(self_, lastIndex_, timestamp_)].amount;
+    }
+
+    /**
+     * @notice Retrieves the index of the checkpoint that is nearest to and less than or equal to the given timestamp.
+     * @dev Performs a binary search to find the closest timestamp, which is efficient on sorted data.
+     *
+     * @param self_ Mapping from index to Checkpoint.
+     * @param lastIndex_ Index of the last checkpoint.
+     * @param timestamp_ Timestamp to query the nearest checkpoint for.
+     * @return index The index of the closest checkpoint by timestamp.
+     *
+     * Example:
+     * uint256 index = VirtualRewarderCheckpoints.getCheckpointIndex(checkpoints, lastIndex, block.timestamp - 10);
+     */
+    function getCheckpointIndex(
+        mapping(uint256 index => Checkpoint checkpoint) storage self_,
+        uint256 lastIndex_,
+        uint256 timestamp_
+    ) internal view returns (uint256) {
+        if (lastIndex_ == 0) {
+            return 0;
+        }
+
+        if (self_[lastIndex_].timestamp <= timestamp_) {
+            return lastIndex_;
+        }
+
+        if (self_[0].timestamp > timestamp_) {
+            return 0;
+        }
+
+        uint256 start;
+        uint256 end = lastIndex_;
+        while (end > start) {
+            uint256 middle = end - (end - start) / 2;
+            Checkpoint memory checkpoint = self_[middle];
+            if (checkpoint.timestamp == timestamp_) {
+                return middle;
+            } else if (checkpoint.timestamp < timestamp_) {
+                start = middle;
+            } else {
+                end = middle - 1;
+            }
+        }
+
+        return start;
+    }
+}
```