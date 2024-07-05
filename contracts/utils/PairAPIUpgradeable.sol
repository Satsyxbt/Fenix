// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IERC20Upgradeable, IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import "./InterfacesAPI.sol";

contract PairAPIUpgradeable is OwnableUpgradeable {
    struct pairInfo {
        // pair info
        address pair_address; // pair contract address
        string symbol; // pair symbol
        string name; // pair name
        uint decimals; // pair decimals
        bool stable; // pair pool type (stable = false, means it's a variable type of pool)
        uint total_supply; // pair tokens supply
        address clPool;
        uint feeAmount;
        // token pair info
        address token0; // pair 1st token address
        string token0_symbol; // pair 1st token symbol
        uint token0_decimals; // pair 1st token decimals
        uint reserve0; // pair 1st token reserves (nr. of tokens in the contract)
        uint claimable0; // claimable 1st token from fees (for unstaked positions)
        address token1; // pair 2nd token address
        string token1_symbol; // pair 2nd token symbol
        uint token1_decimals; // pair 2nd token decimals
        uint reserve1; // pair 2nd token reserves (nr. of tokens in the contract)
        uint claimable1; // claimable 2nd token from fees (for unstaked positions)
        // pairs gauge
        address gauge; // pair gauge address
        uint gauge_total_supply; // pair staked tokens (less/eq than/to pair total supply)
        uint gauge_total_weight; // pair total weight of staked tokens (less/eq than/to pair total supply)
        address fee; // pair fees contract address
        address bribe; // pair bribes contract address
        uint emissions; // pair emissions (per second)
        address emissions_token; // pair emissions token address
        uint emissions_token_decimals; // pair emissions token decimals
        // User deposit
        uint account_lp_balance; // account LP tokens balance
        uint account_token0_balance; // account 1st token balance
        uint account_token1_balance; // account 2nd token balance
        uint account_gauge_balance; // account pair staked in gauge balance
        uint account_gauge_total_weight; // account pair total Weight of all NFT gauge
        uint account_gauge_earned; // account earned emissions for this pair
        uint _a0Expect;
        uint _a1Expect;
    }

    struct tokenBribe {
        address token;
        uint8 decimals;
        uint256 amount;
        string symbol;
    }

    struct pairBribeEpoch {
        uint256 epochTimestamp;
        uint256 totalVotes;
        address pair;
        tokenBribe[] bribes;
    }

    uint256 public constant MAX_PAIRS = 1000;
    uint256 public constant MAX_EPOCHS = 200;
    uint256 public constant MAX_REWARDS = 16;
    uint256 public constant WEEK = 7 * 24 * 60 * 60;

    IPairFactory public pairFactory;
    IVoterV3 public voter;

    address public underlyingToken;

    event Owner(address oldOwner, address newOwner);
    event Voter(address oldVoter, address newVoter);
    event WBF(address oldWBF, address newWBF);

    constructor() {
        _disableInitializers();
    }

    function initialize(address voter_) public initializer {
        __Ownable_init();

        voter = IVoterV3(voter_);

        pairFactory = IPairFactory(IVoterV3(voter_).factories()[0]);
        underlyingToken = IVotingEscrow(IVoterV3(voter_)._ve()).token();
    }

    function setVoter(address _voter) external onlyOwner {
        require(_voter != address(0), "zeroAddr");
        address _oldVoter = address(voter);
        voter = IVoterV3(_voter);

        pairFactory = IPairFactory(voter.factories()[0]);
        underlyingToken = IVotingEscrow(voter._ve()).token();

        emit Voter(_oldVoter, _voter);
    }

    function getAllPair(address _user, uint _amounts, uint _offset) external view returns (pairInfo[] memory Pairs) {
        require(_amounts <= MAX_PAIRS, "too many pair");

        Pairs = new pairInfo[](_amounts);

        uint i = _offset;
        uint totPairs = pairFactory.allPairsLength();
        address _pair;

        for (i; i < _offset + _amounts; i++) {
            // if totalPairs is reached, break.
            if (i == totPairs) {
                break;
            }
            _pair = pairFactory.allPairs(i);
            Pairs[i - _offset] = _pairAddressToInfo(_pair, _user);
        }
    }

    function getAllCLPair(address _user, uint _amounts, uint _offset) external view returns (pairInfo[] memory Pairs) {
        require(_amounts <= MAX_PAIRS, "too many pair");

        Pairs = new pairInfo[](_amounts);

        uint i = _offset;
        uint totPairs = voter.clLength();
        address _pair;

        for (i; i < _offset + _amounts; i++) {
            // if totalPairs is reached, break.
            if (i == totPairs) {
                break;
            }
            _pair = voter.clPools(i);
            Pairs[i - _offset] = _pairAddressToCLInfo(_pair, _user);

            /*if (_pair != address()) {
                Pairs[i - _offset] = _pairAddressToCLInfo(_pair, _user);
            }*/
        }
    }

    function getCLPair(address _vault, address _account) external view returns (pairInfo memory _pairInfo) {
        return _pairAddressToCLInfo(_vault, _account);
    }

    function getPair(address _pair, address _account) external view returns (pairInfo memory _pairInfo) {
        return _pairAddressToInfo(_pair, _account);
    }

    function _pairAddressToCLInfo(address _pair, address _account) internal view returns (pairInfo memory _pairInfo) {
        IPair ipair = IPair(_pair);

        address token_0 = ipair.token0();
        address token_1 = ipair.token1();

        IGauge _gauge;
        uint accountGaugeLPAmount = 0;
        uint earned = 0;
        uint accountGaugeLPTotalWeight = 0;
        address addressGauge = voter.gauges(_pair);

        if (voter.isAlive(addressGauge)) {
            _gauge = IGauge(addressGauge);
        }

        if (address(_gauge) != address(0)) {
            if (_account != address(0)) {
                accountGaugeLPAmount = _gauge.balanceOf(_account);
                earned = _gauge.earned(_account);
                //_pairInfo.tokens_info_of_account = getGaugeMaNFTsOfOwner(_account, address(_gauge));
            }

            _pairInfo.gauge_total_supply = _gauge.totalSupply();
            _pairInfo.gauge_total_weight = 0;

            if (block.timestamp < _gauge.periodFinish()) {
                _pairInfo.emissions = _gauge.rewardRate();
            }
        }

        // Pair General Info
        _pairInfo.pair_address = _pair;
        _pairInfo.stable = false;

        _pairInfo.clPool = _pair;
        // _pairInfo.feeAmount = IV3POOL(_pair).fee();

        // Token0 Info
        _pairInfo.token0 = token_0;
        _pairInfo.token0_decimals = IERC20MetadataUpgradeable(token_0).decimals();
        _pairInfo.token0_symbol = IERC20MetadataUpgradeable(token_0).symbol();
        _pairInfo.reserve0 = IERC20Upgradeable(token_0).balanceOf(_pair);

        // Token1 Info
        _pairInfo.token1 = token_1;
        _pairInfo.token1_decimals = IERC20MetadataUpgradeable(token_1).decimals();
        _pairInfo.token1_symbol = IERC20MetadataUpgradeable(token_1).symbol();
        _pairInfo.reserve1 = IERC20Upgradeable(token_1).balanceOf(_pair);

        // Pair's gauge Info
        _pairInfo.gauge = address(_gauge);
        _pairInfo.emissions_token = underlyingToken;
        _pairInfo.emissions_token_decimals = IERC20MetadataUpgradeable(underlyingToken).decimals();

        // external address
        _pairInfo.fee = voter.internal_bribes(address(_gauge));
        _pairInfo.bribe = voter.external_bribes(address(_gauge));

        // Account Info
        _pairInfo.account_lp_balance = 0;
        _pairInfo.account_token0_balance = IERC20Upgradeable(token_0).balanceOf(_account);
        _pairInfo.account_token1_balance = IERC20Upgradeable(token_1).balanceOf(_account);
        _pairInfo.account_gauge_balance = accountGaugeLPAmount;
        _pairInfo.account_gauge_total_weight = accountGaugeLPTotalWeight;
        _pairInfo.account_gauge_earned = earned;
    }

    function _pairAddressToInfo(address _pair, address _account) internal view returns (pairInfo memory _pairInfo) {
        IPair ipair = IPair(_pair);

        address token_0;
        address token_1;

        (token_0, token_1) = ipair.tokens();
        (_pairInfo.reserve0, _pairInfo.reserve1, ) = ipair.getReserves();

        IGauge _gauge;
        uint accountGaugeLPAmount = 0;
        uint earned = 0;
        uint accountGaugeLPTotalWeight = 0;
        address addressGauge = voter.gauges(_pair);

        if (voter.isAlive(addressGauge)) {
            _gauge = IGauge(addressGauge);
        }

        if (address(_gauge) != address(0)) {
            if (_account != address(0)) {
                accountGaugeLPAmount = _gauge.balanceOf(_account);

                earned = _gauge.earned(_account);
                //_pairInfo.tokens_info_of_account = getGaugeMaNFTsOfOwner(_account, address(_gauge));
            }

            _pairInfo.gauge_total_supply = _gauge.totalSupply();

            if (block.timestamp < _gauge.periodFinish()) {
                _pairInfo.emissions = _gauge.rewardRate();
            }
        }

        // Pair General Info
        _pairInfo.pair_address = _pair;
        _pairInfo.symbol = ipair.symbol();
        _pairInfo.name = ipair.name();
        _pairInfo.decimals = ipair.decimals();
        _pairInfo.stable = ipair.isStable();
        _pairInfo.total_supply = ipair.totalSupply();

        _pairInfo.clPool = address(0);
        _pairInfo.feeAmount = IPairFactory(ipair.factory()).getFee(_pair, ipair.isStable());

        // Token0 Info
        _pairInfo.token0 = token_0;
        _pairInfo.token0_decimals = IERC20MetadataUpgradeable(token_0).decimals();
        _pairInfo.token0_symbol = IERC20MetadataUpgradeable(token_0).symbol();
        _pairInfo.claimable0 = ipair.claimable0(_account);

        // Token1 Info
        _pairInfo.token1 = token_1;
        _pairInfo.token1_decimals = IERC20MetadataUpgradeable(token_1).decimals();
        _pairInfo.token1_symbol = IERC20MetadataUpgradeable(token_1).symbol();
        _pairInfo.claimable1 = ipair.claimable1(_account);

        // Pair's gauge Info
        _pairInfo.gauge = address(_gauge);
        _pairInfo.emissions_token = underlyingToken;
        _pairInfo.emissions_token_decimals = IERC20MetadataUpgradeable(underlyingToken).decimals();

        // external address
        _pairInfo.fee = voter.internal_bribes(address(_gauge));
        _pairInfo.bribe = voter.external_bribes(address(_gauge));

        // Account Info
        _pairInfo.account_lp_balance = IERC20Upgradeable(_pair).balanceOf(_account);
        _pairInfo.account_token0_balance = IERC20Upgradeable(token_0).balanceOf(_account);
        _pairInfo.account_token1_balance = IERC20Upgradeable(token_1).balanceOf(_account);
        _pairInfo.account_gauge_balance = accountGaugeLPAmount;
        _pairInfo.account_gauge_total_weight = accountGaugeLPTotalWeight;
        _pairInfo.account_gauge_earned = earned;
    }

    function getPairBribe(uint _amounts, uint _offset, address _pair) external view returns (pairBribeEpoch[] memory _pairEpoch) {
        require(_amounts <= MAX_EPOCHS, "too many epochs");

        _pairEpoch = new pairBribeEpoch[](_amounts);

        address _gauge = voter.gauges(_pair);

        IBribeAPI bribe = IBribeAPI(voter.external_bribes(_gauge));

        // check bribe and checkpoints exists
        if (address(0) == address(bribe)) {
            return _pairEpoch;
        }

        // scan bribes
        // get latest balance and epoch start for bribes
        uint _epochStartTimestamp = bribe.firstBribeTimestamp();

        // if 0 then no bribe created so far
        if (_epochStartTimestamp == 0) {
            return _pairEpoch;
        }

        uint _supply;
        uint i = _offset;

        for (i; i < _offset + _amounts; i++) {
            _supply = bribe.totalSupplyAt(_epochStartTimestamp);
            _pairEpoch[i - _offset].epochTimestamp = _epochStartTimestamp;
            _pairEpoch[i - _offset].pair = _pair;
            _pairEpoch[i - _offset].totalVotes = _supply;
            _pairEpoch[i - _offset].bribes = _bribe(_epochStartTimestamp, address(bribe));

            _epochStartTimestamp += WEEK;
        }
    }

    function _bribe(uint _ts, address _br) internal view returns (tokenBribe[] memory _tb) {
        IBribeAPI _wb = IBribeAPI(_br);
        uint tokenLen = _wb.rewardsListLength();

        _tb = new tokenBribe[](tokenLen);

        uint k;
        uint _rewPerEpoch;
        IERC20MetadataUpgradeable _t;
        for (k = 0; k < tokenLen; k++) {
            _t = IERC20MetadataUpgradeable(_wb.rewardTokens(k));
            if (address(_t) != address(0x0)) {
                IBribeAPI.Reward memory _reward = _wb.rewardData(address(_t), _ts);
                _rewPerEpoch = _reward.rewardsPerEpoch;
                if (_rewPerEpoch > 0) {
                    _tb[k].token = address(_t);
                    _tb[k].symbol = _t.symbol();
                    _tb[k].decimals = _t.decimals();
                    _tb[k].amount = _rewPerEpoch;
                } else {
                    _tb[k].token = address(_t);
                    _tb[k].symbol = _t.symbol();
                    _tb[k].decimals = _t.decimals();
                    _tb[k].amount = 0;
                }
            } else {
                _tb[k].token = address(_t);
                _tb[k].symbol = "0x";
                _tb[k].decimals = 0;
                _tb[k].amount = 0;
            }
        }
    }

    function left(address _pair, address _token) external view returns (uint256 _rewPerEpoch) {
        address _gauge = voter.gauges(_pair);
        IBribeAPI bribe = IBribeAPI(voter.internal_bribes(_gauge));

        uint256 _ts = bribe.getEpochStart();
        IBribeAPI.Reward memory _reward = bribe.rewardData(_token, _ts);
        _rewPerEpoch = _reward.rewardsPerEpoch;
    }
}
