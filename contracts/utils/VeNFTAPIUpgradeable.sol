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
import "../nest/interfaces/ISingelTokenVirtualRewarder.sol";
import "../nest/interfaces/ICompoundVeFNXManagedNFTStrategy.sol";

import "../nest/interfaces/IManagedNFTManager.sol";

contract VeNFTAPIUpgradeable is OwnableUpgradeable {
    struct pairVotes {
        address pair;
        uint256 weight;
    }

    struct veNFT {
        uint8 decimals;
        bool voted;
        uint256 id;
        uint128 amount;
        uint256 voting_amount;
        uint256 lockEnd;
        uint256 vote_ts;
        pairVotes[] votes;
        address account;
        address token;
        string tokenSymbol;
        uint256 tokenDecimals;
        bool isPermanentLocked;
        bool isAttachedToManagedNFT;
        uint256 attachedManagedNFTTokenId;
    }

    struct Reward {
        uint256 id;
        uint256 amount;
        uint8 decimals;
        address pair;
        address token;
        address fee;
        address bribe;
        string symbol;
    }

    uint256 public constant MAX_RESULTS = 1000;
    uint256 public constant MAX_PAIRS = 30;
    uint256 internal constant _WEEK = 86400 * 7;

    IVoter public voter;
    address public underlyingToken;

    mapping(address => bool) public notReward;

    IVotingEscrow public ve;

    address public pairAPI;

    IManagedNFTManager public managedNFTManager;

    struct AllPairRewards {
        Reward[] rewards;
    }

    constructor() {
        _disableInitializers();
    }

    function initialize(address _voter) public initializer {
        __Ownable_init();

        voter = IVoter(_voter);

        ve = IVotingEscrow(voter.votingEscrow());
        underlyingToken = IVotingEscrow(ve).token();

        notReward[address(0x0)] = true;
    }

    function setManagedNFTManager(IManagedNFTManager managedNFTManager_) external onlyOwner {
        managedNFTManager = managedNFTManager_;
    }

    function setVoter(address _voter) external onlyOwner {
        voter = IVoter(_voter);
    }

    function setPairAPI(address _pairApi) external onlyOwner {
        pairAPI = _pairApi;
    }

    function getAllNFT(uint256 _amounts, uint256 _offset) external view returns (veNFT[] memory _veNFT) {
        require(_amounts <= MAX_RESULTS, "too many nfts");
        _veNFT = new veNFT[](_amounts);

        uint i = _offset;
        address _owner;

        for (i; i < _offset + _amounts; i++) {
            _owner = ve.ownerOf(i);
            // if id_i has owner read data
            if (_owner != address(0)) {
                _veNFT[i - _offset] = _getNFTFromId(i, _owner);
            }
        }
    }

    function getNFTFromId(uint256 id) external view returns (veNFT memory) {
        return _getNFTFromId(id, ve.ownerOf(id));
    }

    function getNFTFromAddress(address _user) external view returns (veNFT[] memory venft) {
        uint256 i = 0;
        uint256 _id;
        uint256 totNFTs = ve.balanceOf(_user);

        venft = new veNFT[](totNFTs);

        for (i; i < totNFTs; i++) {
            _id = IERC721EnumerableUpgradeable(address(ve)).tokenOfOwnerByIndex(_user, i);

            if (_id != 0) {
                venft[i] = _getNFTFromId(_id, _user);
            }
        }
    }

    function _getNFTFromId(uint256 id, address _owner) internal view returns (veNFT memory venft) {
        if (_owner == address(0)) {
            return venft;
        }

        uint _totalPoolVotes = voter.poolVoteLength(id);
        pairVotes[] memory votes = new pairVotes[](_totalPoolVotes);

        IVotingEscrow.TokenState memory tokenState = ve.getNftState(id);
        IVotingEscrow.LockedBalance memory _lockedBalance = tokenState.locked;

        uint k;
        uint256 _poolWeight;
        address _votedPair;

        for (k = 0; k < _totalPoolVotes; k++) {
            _votedPair = voter.poolVote(id, k);
            if (_votedPair == address(0)) {
                break;
            }
            _poolWeight = voter.votes(id, _votedPair);
            votes[k].pair = _votedPair;
            votes[k].weight = _poolWeight;
        }

        venft.id = id;
        venft.account = _owner;
        venft.decimals = 1;
        venft.amount = uint128(_lockedBalance.amount);
        venft.voting_amount = ve.balanceOfNFT(id);
        venft.lockEnd = _lockedBalance.end;
        venft.vote_ts = voter.lastVotedTimestamps(id);
        venft.votes = votes;
        venft.token = ve.token();
        venft.tokenSymbol = IERC20MetadataUpgradeable(ve.token()).symbol();
        venft.tokenDecimals = IERC20MetadataUpgradeable(ve.token()).decimals();
        venft.voted = tokenState.isVoted;
        venft.isPermanentLocked = _lockedBalance.isPermanentLocked;
        venft.isAttachedToManagedNFT = managedNFTManager.isAttachedNFT(id);
        if (venft.isAttachedToManagedNFT) {
            venft.attachedManagedNFTTokenId = managedNFTManager.getAttachedManagedTokenId(id);
        }
    }

    function getNFTFromIds(uint256[] memory ids_) public view returns (veNFT[] memory veNFTs) {
        veNFTs = new veNFT[](ids_.length);
        for (uint256 i; i < ids_.length; i++) {
            veNFTs[i] = _getNFTFromId(ids_[i], ve.ownerOf(ids_[i]));
        }
    }

    function getNestApr(address[] memory rewarderAddresses, uint256 epoch) public view returns (uint256[] memory aprs) {
        aprs = new uint256[](rewarderAddresses.length);
        for (uint256 i; i < rewarderAddresses.length; i++) {
            ISingelTokenVirtualRewarder rewarder = ISingelTokenVirtualRewarder(rewarderAddresses[i]);
            uint256 totalSupply = rewarder.totalSupply();
            if (totalSupply > 0) {
                uint256 rewardsPerEpoch = rewarder.rewardsPerEpoch(epoch);
                // APR = (rewardsPerEpoch / totalSupply) * 100 * 52
                aprs[i] = (rewardsPerEpoch * 100 * 52) / totalSupply;
            }
        }
    }

    struct AttachedVeNftInfo {
        bool success;
        uint256 tokenId;
        uint256 attachedManagedTokenId;
        address strategy;
        uint256 currentTokenBalanceInStrategy;
        uint256 currentTokenLockedRewardsBalance;
        uint256 currentTotalSupply;
    }

    function getAttachedVeNftsRewardInfo(uint256[] calldata veNftIds_) external view returns (AttachedVeNftInfo[] memory array) {
        array = new AttachedVeNftInfo[](veNftIds_.length);
        IManagedNFTManager managedNFTManagerCache = managedNFTManager;
        IVotingEscrow votingEscrowCache = ve;

        for (uint256 i; i < veNftIds_.length; ) {
            uint256 tokenId = veNftIds_[i];

            array[i].tokenId = tokenId;

            uint256 mTokenId = managedNFTManagerCache.getAttachedManagedTokenId(tokenId);
            if (mTokenId > 0) {
                array[i].attachedManagedTokenId = mTokenId;
                array[i].strategy = IERC721EnumerableUpgradeable(address(votingEscrowCache)).ownerOf(mTokenId);

                if (array[i].strategy.code.length > 0) {
                    ICompoundVeFNXManagedNFTStrategy strategy = ICompoundVeFNXManagedNFTStrategy(array[i].strategy);

                    array[i].currentTokenBalanceInStrategy = strategy.balanceOf(tokenId);
                    array[i].currentTokenLockedRewardsBalance = strategy.getLockedRewardsBalance(tokenId);
                    array[i].currentTotalSupply = strategy.totalSupply();

                    array[i].success = true;
                }
            }

            unchecked {
                i++;
            }
        }
    }

    function getPrevEpochTimestamp() public view returns (uint256) {
        return (block.timestamp / _WEEK) * _WEEK - _WEEK;
    }
}
