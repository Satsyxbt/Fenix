// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import "../core/interfaces/IVoter.sol";
import "../core/interfaces/IVotingEscrow.sol";
import "../dexV2/interfaces/IPairFactory.sol";
import "../dexV2/interfaces/IPair.sol";
import "../gauges/interfaces/IGauge.sol";
import "../bribes/interfaces/IBribe.sol";
import "../nest/interfaces/ISingelTokenVirtualRewarder.sol";
import "../nest/interfaces/ICompoundVeFNXManagedNFTStrategy.sol";
import "../nest/interfaces/IManagedNFTManager.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface IExtendVoter is IVoter {
    function pools(uint256 index) external view returns (address);

    function totalWeightsPerEpoch(uint256 epoch) external view returns (uint256);
}

interface IExtendGauge is IGauge {
    function rewardRate() external view returns (uint256);

    function rewardForDuration() external view returns (uint256);
}

contract GetInformationAggregatorUpgradeable {
    enum AddressKey {
        NONE,
        VOTING_ESCROW,
        VOTER,
        PAIR_FACTORY,
        MANAGED_NFT_MANAGER
    }

    address public immutable owner;
    mapping(AddressKey => address) public registry;

    uint256 constant WEEK = 604800;

    constructor() {
        owner = msg.sender;
    }

    function updateAddress(AddressKey[] calldata keys_, address[] calldata values_) external {
        require(owner == msg.sender, "AccessDenied");
        for (uint256 i; i < keys_.length; ) {
            registry[keys_[i]] = values_[i];
            unchecked {
                i++;
            }
        }
    }

    struct TempPoolInfo {
        address pool;
        address internalBribe;
    }
    struct TokenVoteInfo {
        address pool;
        uint256 weight;
        uint256 totalWeight;
    }

    struct TokenVotesPerEpoch {
        uint256 tokenId;
        address currentOwner;
        bool isPermanentLocked;
        bool isAttached;
        uint256 end;
        uint256 lastVotedTimestamp;
        uint256 currentEpochTokenVotePower;
        uint256 sumWeightFromBribe;
        bool isManagedNFT;
        bool exists;
        TokenVoteInfo[] votes;
    }

    function getTokenIdsVotesPerEpoch(
        uint256[] calldata tokenIds_,
        uint256 epoch_,
        uint256 limit_,
        uint256 offset_
    ) external view returns (TokenVotesPerEpoch[] memory result) {
        IExtendVoter voter = IExtendVoter(registry[AddressKey.VOTER]);
        IVotingEscrow votingEscow = IVotingEscrow(registry[AddressKey.VOTING_ESCROW]);
        IManagedNFTManager managedNftManager = IManagedNFTManager(registry[AddressKey.MANAGED_NFT_MANAGER]);

        require(epoch_ % WEEK == 0, "invalid epoch");

        (uint256 totalCount, , ) = voter.poolsCounts();

        uint256 size = totalCount;
        if (offset_ >= size) {
            size = 0;
        }
        size -= offset_;
        if (size > limit_) {
            size = limit_;
        }
        TempPoolInfo[] memory pools = new TempPoolInfo[](size);
        for (uint256 j; j < size; j++) {
            pools[j].pool = IExtendVoter(address(voter)).pools(j + offset_);
            IVoter.GaugeState memory state = voter.getGaugeState(voter.poolToGauge(pools[j].pool));
            pools[j].internalBribe = state.internalBribe;
        }
        result = new TokenVotesPerEpoch[](tokenIds_.length);
        TokenVoteInfo[] memory tempArray = new TokenVoteInfo[](size);
        uint256 countVotes;
        for (uint256 i; i < tokenIds_.length; i++) {
            TokenVotesPerEpoch memory info;
            info.tokenId = tokenIds_[i];
            IVotingEscrow.LockedBalance memory locked = votingEscow.getNftState(info.tokenId).locked;
            info.isPermanentLocked = locked.isPermanentLocked;
            info.end = locked.end;
            info.isManagedNFT = managedNftManager.isManagedNFT(info.tokenId);
            info.currentEpochTokenVotePower = votingEscow.balanceOfNftIgnoreOwnershipChange(info.tokenId);
            info.lastVotedTimestamp = voter.lastVotedTimestamps(info.tokenId);
            info.isAttached = managedNftManager.isAttachedNFT(info.tokenId);
            info.sumWeightFromBribe;
            try votingEscow.ownerOf(info.tokenId) returns (address) {
                info.currentOwner = votingEscow.ownerOf(info.tokenId);
                info.exists = true;
            } catch {}
            if (info.exists) {
                for (uint256 j; j < pools.length; j++) {
                    IBribe internalBribe = IBribe(pools[j].internalBribe);
                    uint256 votePower = internalBribe.balanceOfAt(info.tokenId, epoch_);
                    if (votePower > 0) {
                        tempArray[countVotes].pool = pools[j].pool;
                        tempArray[countVotes].weight = votePower;
                        tempArray[countVotes].totalWeight = internalBribe.totalSupplyAt(epoch_);
                        info.sumWeightFromBribe += votePower;
                        countVotes++;
                    }
                }
            }
            info.votes = new TokenVoteInfo[](countVotes);
            for (uint256 j; j < countVotes; j++) {
                info.votes[j].pool = tempArray[j].pool;
                info.votes[j].weight = tempArray[j].weight;
                info.votes[j].totalWeight = tempArray[j].totalWeight;
            }
            result[i] = info;
            countVotes = 0;
        }
        return result;
    }

    struct BribeTotalVoteInfo {
        address bribe;
        uint256 totalSupply;
    }

    struct GaugeCurrentTotalVoteInfo {
        uint256 rewardRate;
        uint256 rewardForDuration;
    }

    struct PoolEpochVoteInfo {
        string name;
        address pool;
        address gauge;
        uint256 weightsPerEpoch;
        uint256 emissionToGauge;
        GaugeCurrentTotalVoteInfo gaugeState;
        BribeTotalVoteInfo internalBribe;
        BribeTotalVoteInfo externalBribe;
    }

    struct PoolsEpochVoteInfoGeneral {
        uint256 poolsCount;
        uint256 totalWeightsPerEpoch;
        uint256 epoch;
        uint256 emisisonPerEpoch;
        PoolEpochVoteInfo[] poolsEpochVoteInfo;
    }

    function getGeneralVotesPerEpoch(
        uint256 epoch_,
        uint256 emisisonPerEpoch_,
        uint256 limit_,
        uint256 offset_
    ) external view returns (PoolsEpochVoteInfoGeneral memory result) {
        IExtendVoter voter = IExtendVoter(registry[AddressKey.VOTER]);
        IPairFactory pairFactory = IPairFactory(registry[AddressKey.PAIR_FACTORY]);

        require(epoch_ % WEEK == 0, "invalid epoch");

        (uint256 totalCount, , ) = voter.poolsCounts();

        uint256 size = totalCount;
        if (offset_ >= size) {
            result.poolsEpochVoteInfo = new PoolEpochVoteInfo[](0);
            return result;
        }
        size -= offset_;
        if (size > limit_) {
            size = limit_;
        }

        result.poolsCount = totalCount;
        result.totalWeightsPerEpoch = voter.totalWeightsPerEpoch(epoch_);
        result.emisisonPerEpoch = emisisonPerEpoch_;
        result.epoch = epoch_;
        result.poolsEpochVoteInfo = new PoolEpochVoteInfo[](size);

        for (uint256 i; i < size; ) {
            PoolEpochVoteInfo memory info;
            info.pool = IExtendVoter(address(voter)).pools(i + offset_);
            info.gauge = voter.poolToGauge(info.pool);
            info.weightsPerEpoch = voter.weightsPerEpoch(epoch_, info.pool);
            info.name = _getPoolName(pairFactory, info.pool);
            info.emissionToGauge = (info.weightsPerEpoch * emisisonPerEpoch_) / result.totalWeightsPerEpoch;

            IVoter.GaugeState memory state = voter.getGaugeState(info.gauge);
            IBribe internalBribe = IBribe(state.internalBribe);
            IBribe externalBribe = IBribe(state.externalBribe);

            info.internalBribe = BribeTotalVoteInfo(state.internalBribe, internalBribe.totalSupplyAt(epoch_));
            info.externalBribe = BribeTotalVoteInfo(state.externalBribe, externalBribe.totalSupplyAt(epoch_));

            IExtendGauge gauge = IExtendGauge(info.gauge);

            info.gaugeState = GaugeCurrentTotalVoteInfo(gauge.rewardRate(), gauge.rewardForDuration());

            result.poolsEpochVoteInfo[i] = info;
            unchecked {
                i++;
            }
        }
        return result;
    }

    function _getPoolName(IPairFactory factory_, address pool_) internal view returns (string memory name) {
        if (factory_.isPair(pool_)) {
            return IPair(pool_).name();
        } else {
            return
                string.concat(
                    "V3 AlgebraPool - ",
                    IERC20Metadata(IPair(pool_).token0()).symbol(),
                    "/",
                    IERC20Metadata(IPair(pool_).token1()).symbol()
                );
        }
    }
}
