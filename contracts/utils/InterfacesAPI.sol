// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

interface IV3POOL {
    function fee() external view returns (uint24);
}

interface IMaGaugeV2 {
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event ClaimFees(address indexed from, uint256 claimed0, uint256 claimed1);
    event Deposit(address indexed user, uint256 amount);
    event DistributionSet(address distribution);
    event EmergencyModeSet(bool isEmergency);
    event Harvest(address indexed user, uint256 reward);
    event Increase(address indexed user, uint256 id, uint256 oldAmount, uint256 newAmount);
    event Initialized(uint8 version);
    event InternalBribeSet(address bribe);
    event Merge(address indexed user, uint256 fromId, uint256 toId);
    event RewardAdded(uint256 reward);
    event Split(address indexed user, uint256 id);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Withdraw(address indexed user, uint256 amount);

    function DISTRIBUTION() external view returns (address);

    function DURATION() external view returns (uint256);

    function LP_LAST_EPOCH_ID() external view returns (uint256);

    function TOKEN() external view returns (address);

    function _VE() external view returns (address);

    function _epochs(uint256) external view returns (uint256);

    function _lastTotalWeightUpdateTime() external view returns (uint256);

    function allInfo(uint _tokenId) external view returns (IMaGaugeStruct.MaNftInfo memory _maNftInfo);

    function _lpTotalSupplyPostLimit() external view returns (uint256);

    function _lpTotalSupplyPreLimit() external view returns (uint256);

    function _periodFinish() external view returns (uint256);

    function _positionEntries(uint256) external view returns (uint256);

    function _weightIncrement() external view returns (uint256);

    function activateEmergencyMode() external;

    function approve(address to, uint256 tokenId) external;

    function balanceOf(address owner) external view returns (uint256);

    function claimFees() external returns (uint256 claimed0, uint256 claimed1);

    function deposit(uint256 amount) external returns (uint256 _maNFTId);

    function depositAll() external returns (uint256 _maNFTId);

    function depositTo(uint256 amount, address _to) external returns (uint256 _maNFTId);

    function update() external returns (bool);

    function depositFromMigration(uint amount, address _to, uint entry) external returns (uint _maNFTId);

    function earned(uint256 _maNFTId) external view returns (uint256);

    function earned(address _user) external view returns (uint256);

    function emergency() external view returns (bool);

    function emergencyWithdraw(uint256 _maNFTId) external;

    function emergencyWithdrawAll() external;

    function external_bribe() external view returns (address);

    function fees0() external view returns (uint256);

    function fees1() external view returns (uint256);

    function gaugeFactory() external view returns (address);

    function getAllReward() external;

    function getApproved(uint256 tokenId) external view returns (address);

    function getReward(uint256 _maNFTId) external;

    function getRewardFromVoter(uint256 _maNFTId) external;

    function getRewardFromVoter(address _user) external;

    function idRewardPerTokenPaid(uint256) external view returns (uint256);

    function increase(uint256 _maNFTId, uint256 amount) external;

    function _maturityMultiplier(uint256 _maNFTId) external view returns (uint _multiplier);

    function initialize(
        address _rewardToken,
        address _ve,
        address _token,
        address _distribution,
        address _internal_bribe,
        address _external_bribe,
        bool _isForPair
    ) external;

    function internal_bribe() external view returns (address);

    function isApprovedForAll(address owner, address operator) external view returns (bool);

    function isApprovedOrOwner(address user, uint256 _maNFTId) external view returns (bool);

    function isForPair() external view returns (bool);

    function lastTimeRewardApplicable() external view returns (uint256);

    function lastUpdateTime() external view returns (uint256);

    function lpBalanceOfUser(address account) external view returns (uint256 amount);

    function weightOfUser(address account) external view returns (uint256 amount);

    function lpBalanceOfmaNFT(uint256 _maNFTId) external view returns (uint256);

    function lpTotalSupply() external view returns (uint256);

    function maNFTWeight(uint256 _maNFTId) external view returns (uint256);

    function merge(uint256 _maNFTIdFrom, uint256 _maNFTIdTo) external;

    function name() external view returns (string memory);

    function notifyRewardAmount(address token, uint256 reward) external;

    function ownerOf(uint256 tokenId) external view returns (address);

    function periodFinish() external view returns (uint256);

    function rewardForDuration() external view returns (uint256);

    function rewardPerToken() external view returns (uint256);

    function rewardPerTokenStored() external view returns (uint256);

    function rewardRate() external view returns (uint256);

    function rewardToken() external view returns (address);

    function rewards(uint256) external view returns (uint256);

    function safeTransferFrom(address from, address to, uint256 tokenId) external;

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) external;

    function setApprovalForAll(address operator, bool approved) external;

    function setDistribution(address _distribution) external;

    function setInternalBribe(address _int) external;

    function split(uint256 _maNFTId, uint256[] memory weights) external;

    function stopEmergencyMode() external;

    function supportsInterface(bytes4 interfaceId) external view returns (bool);

    function symbol() external view returns (string memory);

    function sync() external;

    function tokenByIndex(uint256 index) external view returns (uint256);

    function tokenId() external view returns (uint256);

    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);

    function tokenURI(uint256 _maNFTId) external view returns (string memory);

    function tokensOfOwner(address _owner) external view returns (uint256[] memory);

    function totalSupply() external view returns (uint256);

    function totalWeight() external view returns (uint256);

    function transferFrom(address from, address to, uint256 tokenId) external;

    function version() external view returns (string memory);

    function withdraw(uint256 _maNFTId) external;

    function withdrawAll() external;
}

interface IMaGaugeStruct {
    struct MaGauge {
        bool active;
        bool stablePair;
        address pair;
        address token0;
        address token1;
        address maGaugeAddress;
        string name;
        string symbol;
        uint maGaugeId;
    }

    struct MaNftInfo {
        // pair info
        uint token_id;
        string name;
        string symbol;
        address pair_address; // pair contract address
        address vault_address; //dyson vault address if it's a cl gauge
        address gauge; // maGauge contract address
        address owner;
        uint lp_balance;
        uint weight;
        uint emissions_claimable;
        uint maturity_time;
        uint maturity_multiplier;
    }
}

interface IGauge {
    function TOKEN() external view returns (address);

    function notifyRewardAmount(address token, uint amount) external;

    function getReward(address account) external;

    function claimFees() external returns (uint claimed0, uint claimed1);

    function balanceOf(address _account) external view returns (uint);

    function totalSupply() external view returns (uint);

    function setDistribution(address _distro) external;

    function activateEmergencyMode() external;

    function stopEmergencyMode() external;

    function setInternalBribe(address intbribe) external;

    function setGaugeRewarder(address _gr) external;

    function setFeeVault(address _feeVault) external;

    function earned(address account) external view returns (uint256);

    function periodFinish() external view returns (uint256);

    function rewardRate() external view returns (uint256);

    function initialize(
        address _governor,
        address _rewardToken,
        address _ve,
        address _token,
        address _distribution,
        address _internal_bribe,
        address _external_bribe,
        bool _isToMerkleDistributor,
        address _merklGaugeMiddleman,
        address _feeVault
    ) external;
}

interface IWrappedBribeFactory {
    function voter() external view returns (address);

    function createBribe(address existing_bribe) external returns (address);

    function oldBribeToNew(address _external_bribe_addr) external view returns (address);
}

interface IVotingEscrow {
    struct Point {
        int128 bias;
        int128 slope; // # -dweight / dt
        uint256 ts;
        uint256 blk; // block
    }

    struct LockedBalance {
        int128 amount;
        uint end;
    }

    function create_lock_for(uint _value, uint _lock_duration, address _to) external returns (uint);

    function locked(uint id) external view returns (LockedBalance memory);

    function tokenOfOwnerByIndex(address _owner, uint _tokenIndex) external view returns (uint);

    function token() external view returns (address);

    function team() external returns (address);

    function epoch() external view returns (uint);

    function point_history(uint loc) external view returns (Point memory);

    function user_point_history(uint tokenId, uint loc) external view returns (Point memory);

    function user_point_epoch(uint tokenId) external view returns (uint);

    function ownerOf(uint) external view returns (address);

    function isApprovedOrOwner(address, uint) external view returns (bool);

    function transferFrom(address, address, uint) external;

    function voted(uint) external view returns (bool);

    function attachments(uint) external view returns (uint);

    function voting(uint tokenId) external;

    function abstain(uint tokenId) external;

    function attach(uint tokenId) external;

    function detach(uint tokenId) external;

    function checkpoint() external;

    function deposit_for(uint tokenId, uint value) external;

    function balanceOfNFT(uint _id) external view returns (uint);

    function balanceOf(address _owner) external view returns (uint);

    function totalSupply() external view returns (uint);

    function supply() external view returns (uint);

    function setProtocolAirdrop(uint _tokenId, bool _airdrop) external;

    function tokensOfOwner(address _usr) external view returns (uint[] memory);

    function decimals() external view returns (uint8);
}

interface IVoterV3 {
    event Abstained(uint256 tokenId, uint256 weight);
    event AddFactories(address indexed pairfactory, address indexed gaugefactory);
    event Blacklisted(address indexed blacklister, address indexed token);
    event DistributeReward(address indexed sender, address indexed gauge, uint256 amount);
    event GaugeCreated(
        address indexed gauge,
        address creator,
        address internal_bribe,
        address indexed external_bribe,
        address indexed pool
    );
    event GaugeKilled(address indexed gauge);
    event GaugeRevived(address indexed gauge);
    event Initialized(uint8 version);
    event NotifyReward(address indexed sender, address indexed reward, uint256 amount);
    event SetBribeFactory(address indexed old, address indexed latest);
    event SetBribeFor(bool isInternal, address indexed old, address indexed latest, address indexed gauge);
    event SetGaugeFactory(address indexed old, address indexed latest);
    event SetMinter(address indexed old, address indexed latest);
    event SetPairFactory(address indexed old, address indexed latest);
    event SetVoteDelay(uint256 old, uint256 latest);
    event Voted(address indexed voter, uint256 tokenId, uint256 weight);
    event Whitelisted(address indexed whitelister, address indexed token);

    function MAX_VOTE_DELAY() external view returns (uint256);

    function VOTE_DELAY() external view returns (uint256);

    function _epochTimestamp() external view returns (uint256);

    function _init(address[] memory _tokens, address _minter) external;

    function _ve() external view returns (address);

    function addFactory(address _pairFactory, address _gaugeFactory) external;

    function admin() external view returns (address);

    function blacklist(address[] memory _token) external;

    function bribefactory() external view returns (address);

    function claimBribes(address[] memory _bribes, address[][] memory _tokens, uint256 _tokenId) external;

    function claimBribes(address[] memory _bribes, address[][] memory _tokens) external;

    function claimFees(address[] memory _fees, address[][] memory _tokens, uint256 _tokenId) external;

    function claimFees(address[] memory _bribes, address[][] memory _tokens) external;

    function claimRewards(address[] memory _gauges) external;

    function claimable(address) external view returns (uint256);

    function weightsPerEpoch(uint, address) external view returns (uint);

    function createGauge(
        address _pool,
        uint256 _gaugeType
    ) external returns (address _gauge, address _internal_bribe, address _external_bribe);

    function createGauges(
        address[] memory _pool,
        uint256[] memory _gaugeTypes
    ) external returns (address[] memory, address[] memory, address[] memory);

    function distribute(address[] memory _gauges) external;

    function distribute(uint256 start, uint256 finish) external;

    function distributeAll() external;

    function distributeFees(address[] memory _gauges) external;

    function external_bribes(address) external view returns (address);

    function factories() external view returns (address[] memory);

    function factoryLength() external view returns (uint256);

    function gaugeFactories() external view returns (address[] memory);

    function gaugeFactoriesLength() external view returns (uint256);

    function gauges(address) external view returns (address);

    function gaugesDistributionTimestmap(address) external view returns (uint256);

    function governance() external view returns (address);

    function initialize(address __ve, address _pairFactory, address _gaugeFactory, address _bribes) external;

    function internal_bribes(address) external view returns (address);

    function isAlive(address) external view returns (bool);

    function isFactory(address) external view returns (bool);

    function isGauge(address) external view returns (bool);

    function isGaugeFactory(address) external view returns (bool);

    function isWhitelisted(address) external view returns (bool);

    function killGauge(address _gauge) external;

    function lastVoted(uint256) external view returns (uint256);

    function length() external view returns (uint256);

    function clLength() external view returns (uint256);

    function minter() external view returns (address);

    function notifyRewardAmount(uint256 amount) external;

    function poke(uint256 _tokenId) external;

    function poolForGauge(address) external view returns (address);

    function poolVote(uint256, uint256) external view returns (address);

    function poolVoteLength(uint256 tokenId) external view returns (uint256);

    function pools(uint256) external view returns (address);

    function poolsList() external view returns (address[] memory);

    function clPools(uint256) external view returns (address);

    function clPoolsList() external view returns (address[] memory);

    function removeFactory(uint256 _pos) external;

    function replaceFactory(address _pairFactory, address _gaugeFactory, uint256 _pos) external;

    function reset(uint256 _tokenId) external;

    function reviveGauge(address _gauge) external;

    function setBribeFactory(address _bribeFactory) external;

    function setExternalBribeFor(address _gauge, address _external) external;

    function setInternalBribeFor(address _gauge, address _internal) external;

    function setMinter(address _minter) external;

    function setNewBribes(address _gauge, address _internal, address _external) external;

    function setVoteDelay(uint256 _delay) external;

    function totalWeight() external view returns (uint256);

    function totalWeightAt(uint256 _time) external view returns (uint256);

    function vote(uint256 _tokenId, address[] memory _poolVote, uint256[] memory _weights) external;

    function votes(uint256, address) external view returns (uint256);

    function weights(address _pool) external view returns (uint256);

    function weightsAt(address _pool, uint256 _time) external view returns (uint256);

    function whitelist(address[] memory _token) external;
}

interface IPairFactory {
    function allPairsLength() external view returns (uint);

    function isPair(address pair) external view returns (bool);

    function allPairs(uint index) external view returns (address);

    function pairCodeHash() external pure returns (bytes32);

    function getFee(address pair_, bool stable_) external view returns (uint256);

    function getPair(address tokenA, address token, bool stable) external view returns (address);

    function createPair(address tokenA, address tokenB, bool stable) external returns (address pair);

    function pairs() external view returns (address[] memory);
}

interface IPair {
    function metadata() external view returns (uint dec0, uint dec1, uint r0, uint r1, bool st, address t0, address t1);

    function claimFees() external returns (uint, uint);

    function tokens() external view returns (address, address);

    function transferFrom(address src, address dst, uint amount) external returns (bool);

    function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external;

    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata) external;

    function burn(address to) external returns (uint amount0, uint amount1);

    function mint(address to) external returns (uint liquidity);

    function getReserves() external view returns (uint _reserve0, uint _reserve1, uint _blockTimestampLast);

    function getAmountOut(uint, address) external view returns (uint);

    function name() external view returns (string memory);

    function token0() external view returns (address);

    function token1() external view returns (address);

    function factory() external view returns (address);

    function fees() external view returns (address);

    function symbol() external view returns (string memory);

    function totalSupply() external view returns (uint);

    function decimals() external view returns (uint8);

    function claimable0(address _user) external view returns (uint);

    function claimable1(address _user) external view returns (uint);

    function isStable() external view returns (bool);

    function sync() external;

    /*function token0() external view returns(address);
    function reserve0() external view returns(address);
    function decimals0() external view returns(address);
    function token1() external view returns(address);
    function reserve1() external view returns(address);
    function decimals1() external view returns(address);*/
}

interface IMinter {
    function update_period() external returns (uint);

    function check() external view returns (bool);

    function period() external view returns (uint);

    function active_period() external view returns (uint);
}

interface IGaugeFactory {
    function createGauge(address, address, address, address, bool, address[] memory) external returns (address);

    function createGaugeV2(
        address _rewardToken,
        address _ve,
        address _token,
        address _distribution,
        address _internal_bribe,
        address _external_bribe,
        bool _isPair
    ) external returns (address);
}

interface IGaugeAPI {
    function notifyRewardAmount(address token, uint amount) external;

    function getReward(address account, address[] memory tokens) external;

    function claimFees() external returns (uint claimed0, uint claimed1);

    function left(address token) external view returns (uint);

    function rewardRate() external view returns (uint);

    function balanceOf(address _account) external view returns (uint);

    function isForPair() external view returns (bool);

    function totalSupply() external view returns (uint);

    function earned(address account) external view returns (uint);
}

interface IERC20 {
    function totalSupply() external view returns (uint256);

    function transfer(address recipient, uint amount) external returns (bool);

    function decimals() external view returns (uint8);

    function symbol() external view returns (string memory);

    function balanceOf(address) external view returns (uint);

    function transferFrom(address sender, address recipient, uint amount) external returns (bool);

    function allowance(address owner, address spender) external view returns (uint);

    function approve(address spender, uint value) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint value);
    event Approval(address indexed owner, address indexed spender, uint value);
}

interface IBribeAPI {
    struct Reward {
        uint256 periodFinish;
        uint256 rewardsPerEpoch;
        uint256 lastUpdateTime;
    }

    function rewardData(address _token, uint256 ts) external view returns (Reward memory _Reward);

    function _deposit(uint amount, uint tokenId) external;

    function _withdraw(uint amount, uint tokenId) external;

    function getRewardForOwner(uint tokenId, address[] memory tokens) external;

    function notifyRewardAmount(address token, uint amount) external;

    function left(address token) external view returns (uint);

    function rewardsListLength() external view returns (uint);

    function supplyNumCheckpoints() external view returns (uint);

    //function getEpochStart(uint timestamp) external pure returns (uint);
    function getEpochStart() external pure returns (uint);

    function getNextEpochStart() external pure returns (uint);

    function getPriorSupplyIndex(uint timestamp) external view returns (uint);

    function rewardTokens(uint index) external view returns (address);

    function rewardsPerEpoch(address token, uint ts) external view returns (uint);

    function supplyCheckpoints(uint _index) external view returns (uint timestamp, uint supplyd);

    function earned(uint tokenId, address token) external view returns (uint);

    function earned(address _user, address token) external view returns (uint);

    function firstBribeTimestamp() external view returns (uint);

    function totalSupplyAt(uint256 _timestamp) external view returns (uint256);

    function balanceOfAt(uint256 tokenId, uint256 _timestamp) external view returns (uint256);
}
