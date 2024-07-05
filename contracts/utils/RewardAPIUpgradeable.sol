// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IERC20Upgradeable, IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import "./InterfacesAPI.sol";

contract RewardAPIUpgradeable is OwnableUpgradeable {
    IPairFactory public pairFactory;
    IVoterV3 public voter;
    address public underlyingToken;

    uint256 public constant MAX_PAIRS = 1000;

    mapping(address => bool) public notReward;

    constructor() {
        _disableInitializers();
    }

    function initialize(address _voter) public initializer {
        __Ownable_init();
        voter = IVoterV3(_voter);
        pairFactory = IPairFactory(voter.factories()[0]);
        underlyingToken = IVotingEscrow(voter._ve()).token();
        address _notrew = address(0x0000000000000000000000000000000000000000);
        notReward[_notrew] = true;
    }

    function addNotReward(address _token) external onlyOwner {
        notReward[_token] = true;
    }

    function removeNotReward(address _token) external onlyOwner {
        notReward[_token] = false;
    }

    function setVoter(address _voter) external onlyOwner {
        require(_voter != address(0), "zeroAddr");
        voter = IVoterV3(_voter);
        // update variable depending on voter
        pairFactory = IPairFactory(voter.factories()[0]);
        underlyingToken = IVotingEscrow(voter._ve()).token();
    }

    struct PairRewards {
        address _pool;
        address _gauge;
        address _externalBribeAddress;
        address _internalBribeAddress;
        uint totalVotesOnGauge; // Weight of votes of a pair     Eg   12000veCHR voted
        uint totalVotesOnGaugeByUser; // Weight of votes of a pair from the user     Eg   you voted 1200veCHR on this pair
        Bribes externalBribeReward;
        Bribes internalBribeReward;
    }

    struct Bribes {
        address[] tokens;
        string[] symbols;
        uint[] decimals;
        uint[] amounts;
        address bribe;
    }

    struct Rewards {
        Bribes[] bribes;
    }

    // @Notice Get the rewards available the next epoch.
    function getExpectedClaimForNextEpoch(uint tokenId, address[] memory pairs) external view returns (Rewards[] memory) {
        uint i;
        uint len = pairs.length;
        address _gauge;
        address _bribe;

        Rewards[] memory _rewards = new Rewards[](len);

        //external

        for (i = 0; i < len; i++) {
            Bribes[] memory _tempReward = new Bribes[](2);
            _gauge = voter.gauges(pairs[i]);

            // get external
            _bribe = voter.external_bribes(_gauge);
            _tempReward[0] = _getEpochRewards(tokenId, _bribe);

            // get internal
            _bribe = voter.internal_bribes(_gauge);
            _tempReward[1] = _getEpochRewards(tokenId, _bribe);

            _rewards[i].bribes = _tempReward;
        }

        return _rewards;
    }

    struct Claimable {
        address bribe;
        address[] tokens;
        string[] symbols;
        uint[] decimals;
        uint[] amounts;
    }

    function getAvailableRewards(
        uint tokenId,
        address[] memory _bribes,
        address[][] memory _tokens
    ) public view returns (Claimable[] memory toCLaim) {
        address _bribe;
        uint len = _bribes.length;
        Claimable[] memory _toClaim = new Claimable[](len);

        uint len2;
        uint amount;
        address _token;

        for (uint i; i < len; i++) {
            _bribe = _bribes[i];

            len2 = _tokens[i].length;
            address[] memory _tokensReward = new address[](len2);
            uint[] memory _amounts = new uint[](len2);

            for (uint u; u < len2; u++) {
                _token = _tokens[i][u];
                amount = IBribeAPI(_bribe).earned(tokenId, _token);

                if (amount != 0) {
                    _tokensReward[u] = _token;
                    _amounts[u] = amount;
                }
            }

            _toClaim[i].bribe = _bribe;
            _toClaim[i].tokens = _tokensReward;
            _toClaim[i].amounts = _amounts;
        }

        return _toClaim;
    }

    function getAllPairRewards(address _user, uint _amounts, uint _offset) external view returns (PairRewards[] memory Pairs) {
        require(_amounts <= MAX_PAIRS, "too many pair");

        Pairs = new PairRewards[](_amounts);

        uint i = _offset;
        uint totPairs = pairFactory.allPairsLength();
        address _pair;
        address _gauge;
        address _bribe;
        uint j = 0;
        uint time = voter._epochTimestamp();

        for (i; i < _offset + _amounts; i++) {
            // if totalPairs is reached, break.
            if (i == totPairs) {
                break;
            }
            _pair = pairFactory.allPairs(i);
            _gauge = voter.gauges(_pair);

            Pairs[j]._pool = _pair;
            if (_gauge != address(0)) {
                Pairs[j]._gauge = _gauge;
                Pairs[j].totalVotesOnGauge = voter.weightsPerEpoch(time, _pair);
                if (_user != address(0)) {
                    uint[] memory _tokens = IVotingEscrow(voter._ve()).tokensOfOwner(_user);

                    for (uint u = 0; u < _tokens.length; u++) {
                        Pairs[j].totalVotesOnGaugeByUser += voter.votes(_tokens[u], _pair);
                    }
                }
                // get external
                _bribe = voter.external_bribes(_gauge);
                Pairs[j]._externalBribeAddress = _bribe;
                //Pairs[j].externalBribeReward = _getNextEpochRewards(_bribe);

                // get internal
                _bribe = voter.internal_bribes(_gauge);
                Pairs[j]._internalBribeAddress = _bribe;
                //Pairs[j].internalBribeReward = _getNextEpochRewards(_bribe);
            }
            j++;
        }
    }

    function getAllCLPairRewards(address _user, uint _amounts, uint _offset) external view returns (PairRewards[] memory Pairs) {
        require(_amounts <= MAX_PAIRS, "too many pair");

        Pairs = new PairRewards[](_amounts);

        uint i = _offset;
        uint totPairs = voter.clLength();
        address _pair;
        address _gauge;
        address _bribe;
        uint time = voter._epochTimestamp();

        uint j = 0;

        for (i; i < _offset + _amounts; i++) {
            // if totalPairs is reached, break.
            if (i == totPairs) {
                break;
            }
            _pair = voter.clPools(i);
            _gauge = voter.gauges(_pair);

            Pairs[j]._pool = _pair;
            if (_gauge != address(0)) {
                Pairs[j]._gauge = _gauge;
                Pairs[j].totalVotesOnGauge = voter.weightsPerEpoch(time, _pair);

                if (_user != address(0)) {
                    uint[] memory _tokens = IVotingEscrow(voter._ve()).tokensOfOwner(_user);

                    for (uint u = 0; u < _tokens.length; u++) {
                        Pairs[j].totalVotesOnGaugeByUser += voter.votes(_tokens[u], _pair);
                    }
                }
                // get external
                _bribe = voter.external_bribes(_gauge);
                Pairs[j]._externalBribeAddress = _bribe;
                //Pairs[j].externalBribeReward = _getNextEpochRewards(_bribe);

                // get internal
                _bribe = voter.internal_bribes(_gauge);
                Pairs[j]._internalBribeAddress = _bribe;
                //Pairs[j].internalBribeReward = _getNextEpochRewards(_bribe);
            }
            j++;
        }
    }

    function _getEpochRewards(uint tokenId, address _bribe) internal view returns (Bribes memory _rewards) {
        uint ts = IBribeAPI(_bribe).getEpochStart();
        uint _balance = IBribeAPI(_bribe).balanceOfAt(tokenId, ts);
        if (_balance == 0) {
            _rewards.bribe = _bribe;
            return _rewards;
        }
        uint totTokens = IBribeAPI(_bribe).rewardsListLength();
        uint[] memory _amounts = new uint[](totTokens);
        address[] memory _tokens = new address[](totTokens);
        string[] memory _symbol = new string[](totTokens);
        uint[] memory _decimals = new uint[](totTokens);
        uint i = 0;
        uint _supply = IBribeAPI(_bribe).totalSupplyAt(ts);
        address _token;
        IBribeAPI.Reward memory _reward;

        for (i; i < totTokens; i++) {
            _token = IBribeAPI(_bribe).rewardTokens(i);
            _tokens[i] = _token;
            if (_balance == 0 || notReward[_token]) {
                _amounts[i] = 0;
                _symbol[i] = "";
                _decimals[i] = 0;
            } else {
                _symbol[i] = IERC20MetadataUpgradeable(_token).symbol();
                _decimals[i] = IERC20MetadataUpgradeable(_token).decimals();
                _reward = IBribeAPI(_bribe).rewardData(_token, ts);
                _amounts[i] = (((_reward.rewardsPerEpoch * 1e18) / _supply) * _balance) / 1e18;
            }
        }

        _rewards.tokens = _tokens;
        _rewards.amounts = _amounts;
        _rewards.symbols = _symbol;
        _rewards.decimals = _decimals;
        _rewards.bribe = _bribe;
    }

    // read all the bribe available for a pair
    function getPairBribe(address pair) public view returns (Bribes[] memory) {
        address _gauge;
        address _bribe;

        Bribes[] memory _tempReward = new Bribes[](2);

        // get external
        _gauge = voter.gauges(pair);
        _bribe = voter.external_bribes(_gauge);
        _tempReward[0] = _getNextEpochRewards(_bribe);

        // get internal
        _bribe = voter.internal_bribes(_gauge);
        _tempReward[1] = _getNextEpochRewards(_bribe);
        return _tempReward;
    }

    function _getNextEpochRewards(address _bribe) internal view returns (Bribes memory _rewards) {
        uint totTokens = IBribeAPI(_bribe).rewardsListLength();
        uint[] memory _amounts = new uint[](totTokens);
        address[] memory _tokens = new address[](totTokens);
        string[] memory _symbol = new string[](totTokens);
        uint[] memory _decimals = new uint[](totTokens);
        uint ts = IBribeAPI(_bribe).getNextEpochStart();
        uint i = 0;
        address _token;
        IBribeAPI.Reward memory _reward;

        for (i; i < totTokens; i++) {
            _token = IBribeAPI(_bribe).rewardTokens(i);
            _tokens[i] = _token;
            if (notReward[_token]) {
                _amounts[i] = 0;
                _tokens[i] = address(0);
                _symbol[i] = "";
                _decimals[i] = 0;
            } else {
                _symbol[i] = IERC20MetadataUpgradeable(_token).symbol();
                _decimals[i] = IERC20MetadataUpgradeable(_token).decimals();
                _reward = IBribeAPI(_bribe).rewardData(_token, ts);
                _amounts[i] = _reward.rewardsPerEpoch;
            }
        }

        _rewards.tokens = _tokens;
        _rewards.amounts = _amounts;
        _rewards.symbols = _symbol;
        _rewards.decimals = _decimals;
    }

    struct Claims {
        ToCLaim[] toCLaim;
    }

    struct ToCLaim {
        address[] tokens;
        string[] symbols;
        uint[] decimals;
        uint[] amounts;
        address bribe;
    }

    function getAmountToClaim(
        address _user,
        address[] memory _bribes,
        address[][] memory _tokens
    ) external view returns (ToCLaim[] memory _toClaim) {
        require(_user != address(0), "user needs to be != 0");
        uint len = _bribes.length;
        _toClaim = new ToCLaim[](len);
        address _bribe;
        uint len2;
        address _token;
        uint _amount;

        for (uint i; i < len; i++) {
            _bribe = _bribes[i];

            if (_bribe == address(0)) {
                continue;
            }

            len2 = _tokens[i].length;
            if (len2 == 0) {
                continue;
            }

            address[] memory _tokensReward = new address[](len2);
            uint[] memory _amounts = new uint[](len2);

            for (uint u; u < len2; u++) {
                _token = _tokens[i][u];
                _amount = IBribeAPI(_bribe).earned(_user, _token);

                if (_amount != 0) {
                    _tokensReward[u] = _token;
                    _amounts[u] = _amount;
                }
            }

            _toClaim[i].bribe = _bribe;
            _toClaim[i].tokens = _tokensReward;
            _toClaim[i].amounts = _amounts;
        }
    }
}
