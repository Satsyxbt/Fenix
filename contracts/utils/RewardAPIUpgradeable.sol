// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IERC20Upgradeable, IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721EnumerableUpgradeable.sol";

import "../core/interfaces/IVoter.sol";
import "../core/interfaces/IVotingEscrow.sol";
import "../dexV2/interfaces/IPairFactory.sol";
import "../dexV2/interfaces/IPair.sol";
import "../gauges/interfaces/IGauge.sol";
import "../bribes/interfaces/IBribe.sol";

interface IExtendVoter is IVoter {
    function pools(uint256 index) external view returns (address);

    function totalWeightsPerEpoch(uint256 epoch) external view returns (uint256);
}

contract RewardAPIUpgradeable is OwnableUpgradeable {
    IPairFactory public pairFactory;
    IVoter public voter;
    address public underlyingToken;
    uint256 public constant MAX_PAIRS = 1000;

    mapping(address => bool) public notReward;

    function initialize(address _voter) public initializer {
        __Ownable_init();
        voter = IVoter(_voter);
        pairFactory = IPairFactory(voter.v2PoolFactory());
        underlyingToken = IVotingEscrow(voter.votingEscrow()).token();
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
        voter = IVoter(_voter);
        // update variable depending on voter
        pairFactory = IPairFactory(voter.v2PoolFactory());
        underlyingToken = IVotingEscrow(voter.votingEscrow()).token();
    }

    struct PairRewards {
        address _pool;
        address _gauge;
        address _externalBribeAddress;
        address _internalBribeAddress;
        uint256 emissionReward;
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
            _gauge = voter.poolToGauge(pairs[i]);
            IVoter.GaugeState memory state = voter.getGaugeState(_gauge);

            // get external
            _bribe = state.externalBribe;
            _tempReward[0] = _getEpochRewards(tokenId, _bribe);

            // get internal
            _bribe = state.internalBribe;
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
                amount = IBribe(_bribe).earned(tokenId, _token);

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
        uint time = voter.epochTimestamp();
        address votingEscrow = voter.votingEscrow();

        for (i; i < _offset + _amounts; i++) {
            // if totalPairs is reached, break.
            if (i == totPairs) {
                break;
            }
            _pair = pairFactory.allPairs(i);
            _gauge = voter.poolToGauge(_pair);

            Pairs[j]._pool = _pair;
            if (_gauge != address(0)) {
                Pairs[j]._gauge = _gauge;
                Pairs[j].totalVotesOnGauge = voter.weightsPerEpoch(time, _pair);
                if (_user != address(0)) {
                    uint256 userTokensBalance = IERC721EnumerableUpgradeable(votingEscrow).balanceOf(_user);
                    for (uint256 u = 0; u < userTokensBalance; u++) {
                        uint256 tokenId = IERC721EnumerableUpgradeable(votingEscrow).tokenOfOwnerByIndex(_user, u);
                        if (voter.lastVotedTimestamps(tokenId) >= time) {
                            Pairs[j].totalVotesOnGaugeByUser += voter.votes(tokenId, _pair);
                        }
                    }
                }
                IVoter.GaugeState memory state = voter.getGaugeState(_gauge);
                Pairs[j].emissionReward = IGauge(_gauge).earned(_user);

                // get external
                _bribe = state.externalBribe;
                Pairs[j]._externalBribeAddress = _bribe;
                //Pairs[j].externalBribeReward = _getNextEpochRewards(_bribe);

                // get internal
                _bribe = state.internalBribe;
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
        (, , uint totPairs) = voter.poolsCounts();
        address _pair;
        address _gauge;
        address _bribe;
        uint time = voter.epochTimestamp();
        address votingEscrow = voter.votingEscrow();

        uint j = 0;

        for (i; i < _offset + _amounts; i++) {
            // if totalPairs is reached, break.
            if (i == totPairs) {
                break;
            }
            _pair = voter.v3Pools(i);
            _gauge = voter.poolToGauge(_pair);

            Pairs[j]._pool = _pair;
            if (_gauge != address(0)) {
                Pairs[j]._gauge = _gauge;
                Pairs[j].totalVotesOnGauge = voter.weightsPerEpoch(time, _pair);

                if (_user != address(0)) {
                    uint256 userTokensBalance = IERC721EnumerableUpgradeable(voter.votingEscrow()).balanceOf(_user);
                    for (uint u = 0; u < userTokensBalance; u++) {
                        uint256 tokenId = IERC721EnumerableUpgradeable(votingEscrow).tokenOfOwnerByIndex(_user, u);
                        if (voter.lastVotedTimestamps(tokenId) >= time) {
                            Pairs[j].totalVotesOnGaugeByUser += voter.votes(tokenId, _pair);
                        }
                    }
                }
                IVoter.GaugeState memory state = voter.getGaugeState(_gauge);
                Pairs[j].emissionReward = IGauge(_gauge).earned(_user);

                // get external
                _bribe = state.externalBribe;
                Pairs[j]._externalBribeAddress = _bribe;
                //Pairs[j].externalBribeReward = _getNextEpochRewards(_bribe);

                // get internal
                _bribe = state.internalBribe;
                Pairs[j]._internalBribeAddress = _bribe;
                //Pairs[j].internalBribeReward = _getNextEpochRewards(_bribe);
            }
            j++;
        }
    }

    function _getEpochRewards(uint tokenId, address _bribe) internal view returns (Bribes memory _rewards) {
        IBribe bribe = IBribe(_bribe);
        uint ts = bribe.getEpochStart();
        uint _balance = bribe.balanceOfAt(tokenId, ts);
        if (_balance == 0) {
            _rewards.bribe = _bribe;
            return _rewards;
        }
        address[] memory rewardTokens = bribe.getRewardTokens();
        uint[] memory _amounts = new uint[](rewardTokens.length);
        address[] memory _tokens = new address[](rewardTokens.length);
        string[] memory _symbol = new string[](rewardTokens.length);
        uint[] memory _decimals = new uint[](rewardTokens.length);
        uint i = 0;
        uint _supply = bribe.totalSupplyAt(ts);
        address _token;

        for (i; i < rewardTokens.length; i++) {
            _token = rewardTokens[i];

            _tokens[i] = _token;
            if (_balance == 0 || notReward[_token]) {
                _amounts[i] = 0;
                _symbol[i] = "";
                _decimals[i] = 0;
            } else {
                _symbol[i] = IERC20MetadataUpgradeable(_token).symbol();
                _decimals[i] = IERC20MetadataUpgradeable(_token).decimals();
                (, uint256 rewardsPerEpoch, ) = bribe.rewardData(_token, ts);
                _amounts[i] = (((rewardsPerEpoch * 1e18) / _supply) * _balance) / 1e18;
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

        _gauge = voter.poolToGauge(pair);

        IVoter.GaugeState memory state = voter.getGaugeState(_gauge);

        // get external
        _bribe = state.externalBribe;
        _tempReward[0] = _getNextEpochRewards(_bribe);

        // get internal
        _bribe = state.internalBribe;
        _tempReward[1] = _getNextEpochRewards(_bribe);
        return _tempReward;
    }

    function _getNextEpochRewards(address _bribe) internal view returns (Bribes memory _rewards) {
        address[] memory rewardTokens = IBribe(_bribe).getRewardTokens();
        uint[] memory _amounts = new uint[](rewardTokens.length);
        address[] memory _tokens = new address[](rewardTokens.length);
        string[] memory _symbol = new string[](rewardTokens.length);
        uint[] memory _decimals = new uint[](rewardTokens.length);
        uint ts = IBribe(_bribe).getNextEpochStart();
        uint i = 0;
        address _token;

        for (i; i < rewardTokens.length; i++) {
            _token = rewardTokens[i];
            _tokens[i] = _token;
            if (notReward[_token]) {
                _amounts[i] = 0;
                _tokens[i] = address(0);
                _symbol[i] = "";
                _decimals[i] = 0;
            } else {
                _symbol[i] = IERC20MetadataUpgradeable(_token).symbol();
                _decimals[i] = IERC20MetadataUpgradeable(_token).decimals();
                (, uint256 rewardsPerEpoch, ) = IBribe(_bribe).rewardData(_token, ts);

                _amounts[i] = rewardsPerEpoch;
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
                _amount = IBribe(_bribe).earned(_user, _token);

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

    struct BribeAvailableRewards {
        address[] tokens;
        uint256[] amounts;
        address bribe;
    }

    function getAvailableBribesRewards(
        address user_,
        uint256 limit_,
        uint256 offset_
    ) external view returns (BribeAvailableRewards[] memory array) {
        IExtendVoter voterCache = IExtendVoter(address(voter));
        (uint256 totalCount, , ) = voterCache.poolsCounts();
        uint256 size = totalCount;
        if (offset_ >= size) {
            array = new BribeAvailableRewards[](0);
            return array;
        }
        size -= offset_;
        if (size > limit_) {
            size = limit_;
        }

        BribeAvailableRewards[] memory fullArray = new BribeAvailableRewards[](size * 2);
        uint256 counterBribeWithRewards;
        for (uint256 i; i < size; ) {
            address pool = voterCache.pools(i + offset_);
            address gauge = voterCache.poolToGauge(pool);
            IExtendVoter.GaugeState memory state = voterCache.getGaugeState(gauge);
            address[] memory rewardTokens = IBribe(state.internalBribe).getRewardTokens();
            BribeAvailableRewards memory internalBribeResult = _getBribeRewards(user_, IBribe(state.internalBribe), rewardTokens);
            if (internalBribeResult.amounts.length > 0) {
                fullArray[counterBribeWithRewards] = internalBribeResult;
                counterBribeWithRewards++;
            }
            BribeAvailableRewards memory externalBribeResult = _getBribeRewards(user_, IBribe(state.externalBribe), rewardTokens);
            if (externalBribeResult.amounts.length > 0) {
                fullArray[counterBribeWithRewards] = externalBribeResult;
                counterBribeWithRewards++;
            }
            unchecked {
                i++;
            }
        }
        array = new BribeAvailableRewards[](counterBribeWithRewards);
        for (uint256 i; i < counterBribeWithRewards; ) {
            array[i] = fullArray[i];
            unchecked {
                i++;
            }
        }
    }

    function getBribeRewards(address user_, IBribe bribe_) public view returns (BribeAvailableRewards memory result) {
        return _getBribeRewards(user_, bribe_, bribe_.getRewardTokens());
    }

    function _getBribeRewards(
        address user_,
        IBribe bribe_,
        address[] memory tokens_
    ) internal view returns (BribeAvailableRewards memory result) {
        uint256[] memory earnedAmounts = new uint256[](tokens_.length);
        uint256 countGtZero;
        for (uint256 i; i < tokens_.length; ) {
            earnedAmounts[i] = bribe_.earned(user_, tokens_[i]);
            if (earnedAmounts[i] > 0) {
                countGtZero++;
            }
            unchecked {
                i++;
            }
        }
        result.bribe = address(bribe_);
        result.amounts = new uint256[](countGtZero);
        result.tokens = new address[](countGtZero);
        uint256 j;
        for (uint256 i; i < tokens_.length; ) {
            if (earnedAmounts[i] > 0) {
                result.amounts[j] = earnedAmounts[i];
                result.tokens[j] = tokens_[i];
                j++;
            }
            unchecked {
                i++;
            }
        }
    }
}
