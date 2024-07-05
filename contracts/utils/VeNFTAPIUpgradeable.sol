pragma solidity =0.8.19;
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IERC20Upgradeable, IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import "./InterfacesAPI.sol";

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

    IVoterV3 public voter;
    address public underlyingToken;

    mapping(address => bool) public notReward;

    IVotingEscrow public ve;

    address public pairAPI;

    struct AllPairRewards {
        Reward[] rewards;
    }

    constructor() {
        _disableInitializers();
    }

    function initialize(address _voter) public initializer {
        __Ownable_init();

        voter = IVoterV3(_voter);

        ve = IVotingEscrow(voter._ve());
        underlyingToken = IVotingEscrow(ve).token();

        notReward[address(0x0)] = true;
    }

    function setVoter(address _voter) external onlyOwner {
        voter = IVoterV3(_voter);
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
            _id = ve.tokenOfOwnerByIndex(_user, i);
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

        IVotingEscrow.LockedBalance memory _lockedBalance;
        _lockedBalance = ve.locked(id);

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
        venft.decimals = ve.decimals();
        venft.amount = uint128(_lockedBalance.amount);
        venft.voting_amount = ve.balanceOfNFT(id);
        venft.lockEnd = _lockedBalance.end;
        venft.vote_ts = voter.lastVoted(id);
        venft.votes = votes;
        venft.token = ve.token();
        venft.tokenSymbol = IERC20MetadataUpgradeable(ve.token()).symbol();
        venft.tokenDecimals = IERC20MetadataUpgradeable(ve.token()).decimals();
        venft.voted = ve.voted(id);
        venft.isPermanentLocked = _lockedBalance.isPermanentLocked;
    }

    function getNFTFromIds(uint256[] memory ids_) public view returns (veNFT[] memory veNFTs) {
        veNFTs = new veNFT[](ids_.length);
        for (uint256 i; i < ids_.length; i++) {
            veNFTs[i] = _getNFTFromId(ids_[i], ve.ownerOf(ids_[i]));
        }
    }
}
