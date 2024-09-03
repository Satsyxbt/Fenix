// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {SafeERC20Upgradeable, IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {IAlgebraFactory} from "@cryptoalgebra/integral-core/contracts/interfaces/IAlgebraFactory.sol";
import {BlastGovernorClaimableSetup} from "../integration/BlastGovernorClaimableSetup.sol";
import {IPairIntegrationInfo} from "../integration/interfaces/IPairIntegrationInfo.sol";
import {IVotingEscrowV2} from "./interfaces/IVotingEscrowV2.sol";
import {IPairFactory} from "../dexV2/interfaces/IPairFactory.sol";
import {IGaugeFactory} from "../gauges/interfaces/IGaugeFactory.sol";
import {IBribeFactory} from "../bribes/interfaces/IBribeFactory.sol";
import {IMinter} from "./interfaces/IMinter.sol";
import {IVoterV2} from "./interfaces/IVoterV2.sol";
import {IVeFnxSplitMerklAidrop} from "./interfaces/IVeFnxSplitMerklAidrop.sol";
import {IMerklDistributor} from "../integration/interfaces/IMerklDistributor.sol";
import {IManagedNFTManager} from "../nest/interfaces/IManagedNFTManager.sol";
import {IBribe} from "../bribes/interfaces/IBribe.sol";
import {IGauge} from "../gauges/interfaces/IGauge.sol";
import "./libraries/LibVoterErrors.sol";

/**
 * @title VoterUpgradeableV2
 * @notice This contract manages the voting process within a decentralized protocol,
 *         integrating gauges, bribes, and NFT-based voting mechanisms.
 * @dev The contract is upgradeable and includes access control, reentrancy protection,
 *      and voting delay mechanisms.
 * @custom:security ReentrancyGuardUpgradeable to prevent reentrancy attacks.
 * @custom:security AccessControlUpgradeable for role-based access control.
 */
contract VoterUpgradeableV2 is IVoterV2, AccessControlUpgradeable, BlastGovernorClaimableSetup, ReentrancyGuardUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// @notice Role identifier for governance operations.
    bytes32 internal constant _GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    /// @notice Role identifier for voter administration.
    bytes32 internal constant _VOTER_ADMIN_ROLE = keccak256("VOTER_ADMIN_ROLE");

    /// @notice Number of seconds in one week (604800 seconds).
    uint256 internal constant _WEEK = 604800;

    /// @notice Address of the Voting Escrow contract.
    address public votingEscrow;

    /// @notice Alias for the Voting Escrow address, used within the contract.
    address public _ve;

    /// @notice Address of the main ERC20 token used in the protocol.
    address public token;

    /// @notice Address of the Minter contract.
    address public minter;

    /// @notice Address of the Bribe Factory contract.
    address public bribeFactory;

    /// @notice Address of the V2 Pool Factory contract.
    address public v2PoolFactory;

    /// @notice Address of the V3 Pool Factory contract.
    address public v3PoolFactory;

    /// @notice Address of the V2 Gauge Factory contract.
    address public v2GaugeFactory;

    /// @notice Address of the V3 Gauge Factory contract.
    address public v3GaugeFactory;

    /// @notice Address of the Merkl Distributor contract.
    address public merklDistributor;

    /// @notice Address of the veFNX Merkl Airdrop contract.
    address public veFnxMerklAidrop;

    /// @notice Address of the Managed NFT Manager contract.
    address public managedNFTManager;

    /// @notice Array of pool addresses managed by the contract.
    address[] public pools;

    /// @notice Array of V2 pool addresses.
    address[] public v2Pools;

    /// @notice Array of V3 pool addresses.
    address[] public v3Pools;

    /// @notice Current index used in reward distribution calculations.
    uint256 public index;

    /// @notice Delay period before a vote can be cast again.
    uint256 public voteDelay;

    /// @notice Duration of the distribution window, in seconds.
    uint256 public distributionWindowDuration;

    /// @notice Mapping of pool addresses to their corresponding gauge addresses.
    mapping(address pool => address) public poolToGauge;

    /// @notice Mapping of gauge addresses to their corresponding state.
    mapping(address gauge => GaugeState) public gaugesState;

    /// @notice Mapping of NFT token IDs to the pools they have voted for.
    mapping(uint256 tokenId => address[]) public poolVote;

    /// @notice Mapping of NFT token IDs to the last time they voted.
    mapping(uint256 tokenId => uint256) public lastVotedTimestamps;

    /// @notice Mapping of NFT token IDs to their votes per pool.
    mapping(uint256 tokenId => mapping(address => uint256)) public votes;

    /// @notice Mapping of epoch timestamps to the weights per pool for that epoch.
    mapping(uint256 timestamp => mapping(address pool => uint256)) public weightsPerEpoch;

    /// @notice Mapping of epoch timestamps to the total weights for that epoch.
    mapping(uint256 timestamp => uint256) public totalWeightsPerEpoch;

    /*//////////////////////////////////////////////////////////////
                             Modifiers
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice Ensures that the caller is either the owner or approved for the specified NFT.
     * @param tokenId_ The ID of the NFT to check.
     */
    modifier onlyNftApprovedOrOwner(uint256 tokenId_) {
        if (!IVotingEscrowV2(votingEscrow).isApprovedOrOwner(_msgSender(), tokenId_)) {
            revert AccessDenied();
        }
        _;
    }

    /**
     * @dev Constructor that initializes the BlastGovernorClaimableSetup with the given address and disables further initializers.
     * @param blastGovernor_ The address of the BlastGovernor contract.
     */
    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract with the given parameters.
     * @dev This function can only be called once during contract initialization.
     * @param blastGovernor_ The address of the BlastGovernor contract.
     * @param votingEscrow_ The address of the Voting Escrow contract.
     */
    function initialize(address blastGovernor_, address votingEscrow_) external initializer {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        __ReentrancyGuard_init();
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        votingEscrow = votingEscrow_;
        _ve = votingEscrow_;
        token = IVotingEscrowV2(votingEscrow_).token();
        distributionWindowDuration = 3600;
    }

    /**
     * @notice Updates the address of a specified contract.
     * @dev Only callable by an address with the VOTER_ADMIN_ROLE.
     * @param key_ The key representing the contract.
     * @param value_ The new address of the contract.
     * @custom:event UpdateAddress Emitted when a contract address is updated.
     * @custom:error InvalidAddressKey Thrown when an invalid key is provided.
     */
    function updateAddress(string memory key_, address value_) external onlyRole(_VOTER_ADMIN_ROLE) {
        bytes32 key = keccak256(abi.encodePacked(key_));
        if (key == 0x39eb9ec2059d897c44a17440c762c429de204f6fddd727156ca52b8da086a6f7) {
            minter = value_;
        } else if (key == 0xf23a19003b02ccc6ddd73a13c071e09977c34bfd7b5318a44fe456d9a77dd0af) {
            bribeFactory = value_;
        } else if (key == 0x18c95c463f9590b3f298aef56c7cfb639672452cd99ac8d92a9fc0e2ef46ab55) {
            merklDistributor = value_;
        } else if (key == 0xbbbfaae454470f56db24caaffaae3a4d3d0ed7a761421871150faa442416ea83) {
            veFnxMerklAidrop = value_;
        } else if (key == 0x8ba8cbf9a47db7b5e8ae6c0bff072ed6faefec4a0722891b09f22b7ac343fd4f) {
            managedNFTManager = value_;
        } else if (key == 0xa0238e972eab1b5ee9c4988c955a7165a662b3206031ac6ac27a3066d669a28d) {
            v2PoolFactory = value_;
        } else if (key == 0xb8e13a5900588d0607f820e1a839eb41b418c77b9db23e333bcc679d611dbc9b) {
            v3PoolFactory = value_;
        } else if (key == 0xe8ee2fdef59c2203ee9a363d82083446f25f27a1aff8fc1f0f3f79b83d30305c) {
            v2GaugeFactory = value_;
        } else if (key == 0x7ebf69e1e15f4a4db2cb161251ab5c47f9f68d65713eba9542fedffbe59b7931) {
            v3GaugeFactory = value_;
        } else {
            revert InvalidAddressKey();
        }
        emit UpdateAddress(key_, value_);
    }

    /**
     * @notice Sets the duration of the distribution window for voting.
     * @dev Only callable by an address with the VOTER_ADMIN_ROLE.
     * @param distributionWindowDuration_ The duration in seconds.
     * @custom:event SetDistributionWindowDuration Emitted when the distribution window duration is updated.
     */
    function setDistributionWindowDuration(uint256 distributionWindowDuration_) external onlyRole(_VOTER_ADMIN_ROLE) {
        distributionWindowDuration = distributionWindowDuration_;
        emit SetDistributionWindowDuration(distributionWindowDuration_);
    }

    /**
     * @notice Sets the delay period before a vote can be cast again.
     * @dev The new delay cannot exceed one week. Only callable by an address with the VOTER_ADMIN_ROLE.
     * @param newVoteDelay_ The new delay period in seconds.
     * @custom:event SetVoteDelay Emitted when the vote delay period is updated.
     * @custom:error VoteDelayTooBig Thrown when the provided vote delay exceeds the maximum allowed.
     */
    function setVoteDelay(uint256 newVoteDelay_) external onlyRole(_VOTER_ADMIN_ROLE) {
        if (newVoteDelay_ > _WEEK) {
            revert VoteDelayTooBig();
        }
        emit SetVoteDelay(voteDelay, newVoteDelay_);
        voteDelay = newVoteDelay_;
    }

    /**
     * @notice Disables a gauge, preventing further rewards distribution.
     * @dev Only callable by an address with the GOVERNANCE_ROLE.
     * @param gauge_ The address of the gauge to be disabled.
     * @custom:event GaugeKilled Emitted when a gauge is disabled.
     * @custom:error GaugeAlreadyKilled Thrown if the gauge is already disabled.
     */
    function killGauge(address gauge_) external onlyRole(_GOVERNANCE_ROLE) {
        GaugeState memory state = gaugesState[gauge_];
        if (!state.isAlive) {
            revert GaugeAlreadyKilled();
        }
        delete gaugesState[gauge_].isAlive;
        if (state.claimable > 0) {
            IERC20Upgradeable(token).safeTransfer(minter, state.claimable);
            delete gaugesState[gauge_].claimable;
        }

        uint256 epochTimestamp = _epochTimestamp();
        totalWeightsPerEpoch[epochTimestamp] -= weightsPerEpoch[epochTimestamp][state.pool];
        emit GaugeKilled(gauge_);
    }

    /**
     * @notice Revives a previously disabled gauge, allowing it to distribute rewards again.
     * @dev Only callable by an address with the GOVERNANCE_ROLE.
     * @param gauge_ The address of the gauge to be revived.
     * @custom:event GaugeRevived Emitted when a gauge is revived.
     * @custom:error GaugeNotKilled Thrown if the gauge is not currently disabled.
     */
    function reviveGauge(address gauge_) external onlyRole(_GOVERNANCE_ROLE) {
        if (gaugesState[gauge_].isAlive) {
            revert GaugeNotKilled();
        }
        gaugesState[gauge_].isAlive = true;
        emit GaugeRevived(gauge_);
    }

    /**
     * @notice Creates a new V2 gauge for a specified pool.
     * @dev Only callable by an address with the GOVERNANCE_ROLE. The pool must be created by the V2 Pool Factory.
     * @param pool_ The address of the pool for which to create a gauge.
     * @return gauge The address of the created gauge.
     * @return internalBribe The address of the created internal bribe.
     * @return externalBribe The address of the created external bribe.
     * @custom:error GaugeForPoolAlreadyExists Thrown if a gauge already exists for the specified pool.
     * @custom:error PoolNotCreatedByFactory Thrown if the specified pool was not created by the V2 Pool Factory.
     */
    function createV2Gauge(
        address pool_
    ) external nonReentrant onlyRole(_GOVERNANCE_ROLE) returns (address gauge, address internalBribe, address externalBribe) {
        if (poolToGauge[pool_] != address(0x0)) {
            revert GaugeForPoolAlreadyExists();
        }
        if (!IPairFactory(v2PoolFactory).isPair(pool_)) {
            revert PoolNotCreatedByFactory();
        }
        address token0 = IPairIntegrationInfo(pool_).token0();
        address token1 = IPairIntegrationInfo(pool_).token1();
        address feeVault = IPairIntegrationInfo(pool_).communityVault();
        string memory symbol = IERC20MetadataUpgradeable(pool_).symbol();
        IBribeFactory bribeFactoryCache = IBribeFactory(bribeFactory);
        internalBribe = IBribeFactory(bribeFactoryCache).createBribe(token0, token1, string.concat("Fenix LP Fees: ", symbol));
        externalBribe = IBribeFactory(bribeFactoryCache).createBribe(token0, token1, string.concat("Fenix Bribes: ", symbol));
        gauge = IGaugeFactory(v2GaugeFactory).createGauge(
            token,
            votingEscrow,
            pool_,
            address(this),
            internalBribe,
            externalBribe,
            false,
            feeVault
        );
        _registerCreatedGauge(gauge, pool_, internalBribe, externalBribe);
        v2Pools.push(pool_);
    }

    /**
     * @notice Creates a new V3 gauge for a specified pool.
     * @dev Only callable by an address with the GOVERNANCE_ROLE. The pool must be created by the V3 Pool Factory.
     * @param pool_ The address of the pool for which to create a gauge.
     * @return gauge The address of the created gauge.
     * @return internalBribe The address of the created internal bribe.
     * @return externalBribe The address of the created external bribe.
     * @custom:error GaugeForPoolAlreadyExists Thrown if a gauge already exists for the specified pool.
     * @custom:error PoolNotCreatedByFactory Thrown if the specified pool was not created by the V3 Pool Factory.
     */
    function createV3Gauge(
        address pool_
    ) external nonReentrant onlyRole(_GOVERNANCE_ROLE) returns (address gauge, address internalBribe, address externalBribe) {
        if (poolToGauge[pool_] != address(0x0)) {
            revert GaugeForPoolAlreadyExists();
        }
        address token0 = IPairIntegrationInfo(pool_).token0();
        address token1 = IPairIntegrationInfo(pool_).token1();
        if (IAlgebraFactory(v3PoolFactory).poolByPair(token0, token1) != pool_) {
            revert PoolNotCreatedByFactory();
        }
        address feeVault = IPairIntegrationInfo(pool_).communityVault();
        string memory symbol = string.concat(IERC20MetadataUpgradeable(token0).symbol(), "/", IERC20MetadataUpgradeable(token1).symbol());
        IBribeFactory bribeFactoryCache = IBribeFactory(bribeFactory);
        internalBribe = IBribeFactory(bribeFactoryCache).createBribe(token0, token1, string.concat("Fenix LP Fees: ", symbol));
        externalBribe = IBribeFactory(bribeFactoryCache).createBribe(token0, token1, string.concat("Fenix Bribes: ", symbol));
        gauge = IGaugeFactory(v2GaugeFactory).createGauge(
            token,
            votingEscrow,
            pool_,
            address(this),
            internalBribe,
            externalBribe,
            true,
            feeVault
        );
        _registerCreatedGauge(gauge, pool_, internalBribe, externalBribe);
        v3Pools.push(pool_);
    }

    /**
     * @notice Creates a custom gauge with specified parameters.
     * @dev Only callable by an address with the GOVERNANCE_ROLE.
     * @param gauge_ The address of the custom gauge.
     * @param pool_ The address of the pool for which to create a gauge.
     * @param tokenA_ The address of token A in the pool.
     * @param tokenB_ The address of token B in the pool.
     * @param externalBribesName_ The name of the external bribe.
     * @param internalBribesName_ The name of the internal bribe.
     * @return gauge The address of the created gauge.
     * @return internalBribe The address of the created internal bribe.
     * @return externalBribe The address of the created external bribe.
     * @custom:error GaugeForPoolAlreadyExists Thrown if a gauge already exists for the specified pool.
     */
    function createCustomGauge(
        address gauge_,
        address pool_,
        address tokenA_,
        address tokenB_,
        string memory externalBribesName_,
        string memory internalBribesName_
    ) external nonReentrant onlyRole(_GOVERNANCE_ROLE) returns (address gauge, address internalBribe, address externalBribe) {
        if (poolToGauge[pool_] != address(0x0)) {
            revert GaugeForPoolAlreadyExists();
        }

        gauge = gauge_;
        IBribeFactory bribeFactoryCache = IBribeFactory(bribeFactory);
        externalBribe = bribeFactoryCache.createBribe(tokenA_, tokenB_, externalBribesName_);
        internalBribe = bribeFactoryCache.createBribe(tokenA_, tokenB_, internalBribesName_);
        _registerCreatedGauge(gauge_, pool_, internalBribe, externalBribe);
    }

    /**
     * @notice Notifies the contract of a reward amount to be distributed.
     * @dev Only callable by the Minter contract.
     * @param amount_ The amount of rewards to distribute.
     * @custom:event NotifyReward Emitted when rewards are notified for distribution.
     * @custom:error AccessDenied Thrown if the caller is not the Minter contract.
     */

    function notifyRewardAmount(uint256 amount_) external {
        if (_msgSender() != minter) {
            revert AccessDenied();
        }
        IERC20Upgradeable(token).safeTransferFrom(_msgSender(), address(this), amount_);
        uint256 weightAt = totalWeightsPerEpoch[_epochTimestamp() - _WEEK]; // minter call notify after updates active_period, loads votes - 1 week
        if (weightAt > 0) {
            index += (amount_ * 1e18) / weightAt;
        }
        emit NotifyReward(_msgSender(), token, amount_);
    }

    /**
     * @notice Distributes fees to a list of gauges.
     * @dev Only gauges that are active and alive will receive fees.
     * @param gauges_ An array of gauge addresses to distribute fees to.
     */
    function distributeFees(address[] calldata gauges_) external {
        for (uint256 i; i < gauges_.length; i++) {
            GaugeState memory state = gaugesState[gauges_[i]];
            if (state.isGauge && state.isAlive) {
                IGauge(gauges_[i]).claimFees();
            }
        }
    }

    /**
     * @notice Distributes rewards to all pools managed by the contract.
     * @dev The Minter contract's update_period function is called before distributing rewards.
     */
    function distributeAll() external nonReentrant {
        IMinter(minter).update_period();
        uint256 length = pools.length;
        for (uint256 i; i < length; i++) {
            _distribute(poolToGauge[pools[i]]);
        }
    }

    /**
     * @notice Distributes rewards to a specified range of pools.
     * @dev The Minter contract's update_period function is called before distributing rewards.
     * @param start_ The starting index of the pool array.
     * @param finish_ The ending index of the pool array.
     */
    function distribute(uint256 start_, uint256 finish_) external nonReentrant {
        IMinter(minter).update_period();
        for (uint256 i = start_; i < finish_; i++) {
            _distribute(poolToGauge[pools[i]]);
        }
    }

    /**
     * @notice Distributes rewards to a specified list of gauges.
     * @dev The Minter contract's update_period function is called before distributing rewards.
     * @param gauges_ An array of gauge addresses to distribute rewards to.
     */
    function distribute(address[] calldata gauges_) external nonReentrant {
        IMinter(minter).update_period();
        for (uint256 i; i < gauges_.length; i++) {
            _distribute(gauges_[i]);
        }
    }

    /**
     * @notice Resets the votes for a given NFT token ID.
     * @dev This function is non-reentrant and can only be called by the owner or an approved address for the token ID.
     * @param tokenId_ The token ID for which to reset votes.
     */
    function reset(uint256 tokenId_) external nonReentrant onlyNftApprovedOrOwner(tokenId_) {
        _checkVoteDelay(tokenId_);
        _checkVoteWindow();
        _reset(tokenId_);
        IVotingEscrowV2(votingEscrow).votingHook(tokenId_, false);
        _updateLastVotedTimestamp(tokenId_);
    }

    /**
     * @notice Updates the voting preferences for a given token ID.
     * @dev This function is non-reentrant and can only be called by the owner or an approved address for the token ID.
     * @param tokenId_ The token ID for which to update voting preferences.
     */
    function poke(uint256 tokenId_) external nonReentrant onlyNftApprovedOrOwner(tokenId_) {
        _checkVoteWindow();
        _poke(tokenId_);
    }

    /**
     * @notice Casts votes for a given NFT token ID.
     * @dev The function ensures that the vote delay has passed and checks the vote window before allowing the vote.
     * @param tokenId_ The token ID for which to cast votes.
     * @param poolsVotes_ An array of pool addresses to vote for.
     * @param weights_ An array of weights corresponding to the pools.
     * @custom:error ArrayLengthMismatch Thrown if the length of poolsVotes_ and weights_ arrays do not match.
     * @custom:error DisabledManagedNft Thrown if the NFT is disabled.
     * @custom:error ZeroPowerForPool Thrown if the calculated vote power for a pool is zero.
     * @custom:error GaugeAlreadyKilled Thrown if attempting to vote for a killed gauge.
     * @custom:error NoResetBefore Thrown if there was no prior reset before voting.
     */
    function vote(
        uint256 tokenId_,
        address[] calldata poolsVotes_,
        uint256[] calldata weights_
    ) external nonReentrant onlyNftApprovedOrOwner(tokenId_) {
        if (poolsVotes_.length != weights_.length) {
            revert ArrayLengthMismatch();
        }
        _checkVoteDelay(tokenId_);
        _checkStartVoteWindow();
        IManagedNFTManager managedNFTManagerCache = IManagedNFTManager(managedNFTManager);
        if (managedNFTManagerCache.isDisabledNFT(tokenId_)) {
            revert DisabledManagedNft();
        }
        if (!managedNFTManagerCache.isWhitelistedNFT(tokenId_)) {
            _checkEndVoteWindow();
        }
        _vote(tokenId_, poolsVotes_, weights_);
        _updateLastVotedTimestamp(tokenId_);
    }

    /**
     * @notice Claims rewards from multiple gauges.
     * @param _gauges An array of gauge addresses to claim rewards from.
     */
    function claimRewards(address[] memory _gauges) public {
        for (uint256 i; i < _gauges.length; i++) {
            IGauge(_gauges[i]).getReward(_msgSender());
        }
    }

    /**
     * @notice Claims bribes for a given NFT token ID from multiple bribe contracts.
     * @dev This function can only be called by the owner or an approved address for the token ID.
     * @param _bribes An array of bribe contract addresses to claim bribes from.
     * @param _tokens An array of token arrays, specifying the tokens to claim.
     * @param tokenId_ The token ID for which to claim bribes.
     */
    function claimBribes(address[] memory _bribes, address[][] memory _tokens, uint256 tokenId_) public onlyNftApprovedOrOwner(tokenId_) {
        for (uint256 i; i < _bribes.length; i++) {
            IBribe(_bribes[i]).getRewardForOwner(tokenId_, _tokens[i]);
        }
    }

    /**
     * @notice Claims bribes from multiple bribe contracts.
     * @param _bribes An array of bribe contract addresses to claim bribes from.
     * @param _tokens An array of token arrays, specifying the tokens to claim.
     */
    function claimBribes(address[] memory _bribes, address[][] memory _tokens) public {
        for (uint256 i; i < _bribes.length; i++) {
            IBribe(_bribes[i]).getRewardForAddress(_msgSender(), _tokens[i]);
        }
    }

    /**
     * @notice Attaches a tokenId to a managed tokenId.
     * @dev Requires the sender to be the owner or approved on the voting escrow contract.
     * @param tokenId_ The user's tokenId to be attached.
     * @param managedTokenId_ The managed tokenId to attach to.
     * @custom:event AttachToManagedNFT Emitted when a tokenId is attached to a managed tokenId.
     */
    function attachToManagedNFT(uint256 tokenId_, uint256 managedTokenId_) external nonReentrant onlyNftApprovedOrOwner(tokenId_) {
        _checkVoteDelay(tokenId_);
        _checkVoteWindow();
        IManagedNFTManager(managedNFTManager).onAttachToManagedNFT(tokenId_, managedTokenId_);
        _poke(managedTokenId_);
        emit AttachToManagedNFT(tokenId_, managedTokenId_);
    }

    /**
     * @notice Detaches a tokenId from its managed tokenId.
     * @dev Requires the sender to be the owner or approved. Also adjusts the voting weight post-detachment.
     * @param tokenId_ The user's tokenId to be detached.
     * @custom:event DettachFromManagedNFT Emitted when a tokenId is detached from a managed tokenId.
     */
    function dettachFromManagedNFT(uint256 tokenId_) external nonReentrant onlyNftApprovedOrOwner(tokenId_) {
        _checkVoteDelay(tokenId_);
        _checkVoteWindow();
        IManagedNFTManager managedNFTManagerCache = IManagedNFTManager(managedNFTManager);
        uint256 managedTokenId = managedNFTManagerCache.getAttachedManagedTokenId(tokenId_);
        managedNFTManagerCache.onDettachFromManagedNFT(tokenId_);
        uint256 weight = IVotingEscrowV2(votingEscrow).balanceOfNftIgnoreOwnershipChange(managedTokenId);
        if (weight == 0) {
            _reset(managedTokenId);
            delete lastVotedTimestamps[managedTokenId];
        } else {
            _poke(managedTokenId);
        }
        emit DettachFromManagedNFT(tokenId_);
    }

    /**
     * @notice Aggregates multiple claim calls into a single transaction.
     * @param gauges_ The array of gauge addresses to claim rewards from.
     * @param bribes_ The parameters for claiming bribes without token ID.
     * @param bribesByTokenId_ The parameters for claiming bribes with a token ID.
     * @param merkl_ The parameters for claiming Merkl data.
     * @param splitMerklAidrop_ The parameters for claiming VeFnx Merkl airdrop data.
     */
    function aggregateClaim(
        address[] calldata gauges_,
        AggregateClaimBribesParams calldata bribes_,
        AggregateClaimBribesByTokenIdParams calldata bribesByTokenId_,
        AggregateClaimMerklDataParams calldata merkl_,
        AggregateClaimVeFnxMerklAirdrop calldata splitMerklAidrop_
    ) external {
        if (gauges_.length > 0) {
            claimRewards(gauges_);
        }
        if (bribes_.bribes.length > 0) {
            claimBribes(bribes_.bribes, bribes_.tokens);
        }
        if (bribesByTokenId_.bribes.length > 0) {
            claimBribes(bribesByTokenId_.bribes, bribesByTokenId_.tokens, bribesByTokenId_.tokenId);
        }
        if (merkl_.users.length > 0) {
            for (uint256 i; i < merkl_.users.length; ) {
                require(merkl_.users[i] == _msgSender(), "users containes no only caller");
                unchecked {
                    i++;
                }
            }
            IMerklDistributor(merklDistributor).claim(merkl_.users, merkl_.tokens, merkl_.amounts, merkl_.proofs);
        }
        if (splitMerklAidrop_.amount > 0) {
            IVeFnxSplitMerklAidrop(veFnxMerklAidrop).claimFor(_msgSender(), splitMerklAidrop_.amount, splitMerklAidrop_.proofs);
        }
    }

    /**
     * @dev Updates the voting preferences for a given tokenId after changes in the system.
     * @param tokenId_ The tokenId for which to update voting preferences.
     */
    function _poke(uint256 tokenId_) internal {
        address[] memory _poolVote = poolVote[tokenId_];
        uint256[] memory _weights = new uint256[](_poolVote.length);

        for (uint256 i; i < _poolVote.length; ) {
            _weights[i] = votes[tokenId_][_poolVote[i]];
            unchecked {
                i++;
            }
        }
        _vote(tokenId_, _poolVote, _weights);
        _updateLastVotedTimestamp(tokenId_);
    }

    /// @notice distribute the emission
    function _distribute(address gauge_) internal {
        GaugeState memory state = gaugesState[gauge_];
        uint256 currentTimestamp = _epochTimestamp();
        if (state.lastDistributionTimestamp < currentTimestamp) {
            uint256 totalVotesWeight = weightsPerEpoch[currentTimestamp - _WEEK][state.pool];
            if (totalVotesWeight > 0) {
                uint256 delta = index - state.index;
                if (delta > 0) {
                    uint256 amount = (totalVotesWeight * delta) / 1e18;
                    if (state.isAlive) {
                        gaugesState[gauge_].claimable += amount;
                    } else {
                        IERC20Upgradeable(token).safeTransfer(minter, amount);
                    }
                }
            }
            gaugesState[gauge_].index = index;
            uint256 claimable = gaugesState[gauge_].claimable;
            if (claimable > 0 && state.isAlive) {
                gaugesState[gauge_].claimable = 0;
                gaugesState[gauge_].lastDistributionTimestamp = currentTimestamp;
                IGauge(gauge_).notifyRewardAmount(token, claimable);
                emit DistributeReward(_msgSender(), gauge_, claimable);
            }
        }
    }

    /**
     * @dev Registers a newly created gauge and associates it with a pool and bribes.
     * @param gauge_ The address of the created gauge.
     * @param pool_ The address of the pool associated with the gauge.
     * @param internalBribe_ The address of the associated internal bribe.
     * @param externalBribe_ The address of the associated external bribe.
     */
    function _registerCreatedGauge(address gauge_, address pool_, address internalBribe_, address externalBribe_) internal {
        IERC20Upgradeable(token).approve(gauge_, type(uint256).max);
        gaugesState[gauge_] = GaugeState({
            isGauge: true,
            isAlive: true,
            internalBribe: internalBribe_,
            externalBribe: externalBribe_,
            pool: pool_,
            claimable: 0,
            index: index,
            lastDistributionTimestamp: 0
        });
        poolToGauge[pool_] = gauge_;
        pools.push(pool_);
        emit GaugeCreated(gauge_, _msgSender(), internalBribe_, externalBribe_, pool_);
    }

    /**
     * @notice Returns the current epoch timestamp used for reward calculations.
     * @return The current epoch timestamp.
     */
    function _epochTimestamp() public view returns (uint256) {
        return IMinter(minter).active_period();
    }

    /**
     * @dev Resets the votes for a given token ID.
     * @param tokenId_ The token ID for which to reset votes.
     */
    function _reset(uint256 tokenId_) internal {
        address[] memory votesPools = poolVote[tokenId_];
        uint256 totalVotePowerForPools;
        uint256 time = _epochTimestamp();
        uint256 lastVotedTime = lastVotedTimestamps[tokenId_];
        for (uint256 i; i < votesPools.length; i++) {
            address pool = votesPools[i];
            uint256 votePowerForPool = votes[tokenId_][pool];
            if (votePowerForPool > 0) {
                delete votes[tokenId_][pool];
                if (lastVotedTime >= time) {
                    weightsPerEpoch[time][pool] -= votePowerForPool;
                    address gauge = poolToGauge[pool];
                    IBribe(gaugesState[gauge].internalBribe).withdraw(votePowerForPool, tokenId_);
                    IBribe(gaugesState[gauge].externalBribe).withdraw(votePowerForPool, tokenId_);
                    if (gaugesState[gauge].isAlive) {
                        totalVotePowerForPools += votePowerForPool;
                    }
                }
                emit Abstained(tokenId_, votePowerForPool);
            }
        }
        if (lastVotedTime >= time) {
            totalWeightsPerEpoch[time] -= totalVotePowerForPools;
        }
        delete poolVote[tokenId_];
    }

    /**
     * @dev Casts votes for a given NFT token ID.
     * @param tokenId_ The token ID for which to cast votes.
     * @param pools_ An array of pool addresses to vote for.
     * @param weights_ An array of weights corresponding to the pools.
     */
    function _vote(uint256 tokenId_, address[] memory pools_, uint256[] memory weights_) internal {
        _reset(tokenId_);
        uint256 nftVotePower = IVotingEscrowV2(votingEscrow).balanceOfNFT(tokenId_);
        uint256 totalVotesWeight;
        uint256 totalVoterPower;
        for (uint256 i; i < pools_.length; i++) {
            GaugeState memory state = gaugesState[poolToGauge[pools_[i]]];
            if (!state.isAlive) {
                revert GaugeAlreadyKilled();
            }
            totalVotesWeight += weights_[i];
        }

        uint256 time = _epochTimestamp();
        for (uint256 i; i < pools_.length; i++) {
            address pool = pools_[i];
            address gauge = poolToGauge[pools_[i]];
            uint256 votePowerForPool = (weights_[i] * nftVotePower) / totalVotesWeight;
            if (votePowerForPool == 0) {
                revert ZeroPowerForPool();
            }
            if (votes[tokenId_][pool] > 0) {
                revert NoResetBefore();
            }

            poolVote[tokenId_].push(pool);
            votes[tokenId_][pool] = votePowerForPool;
            weightsPerEpoch[time][pool] += votePowerForPool;
            totalVoterPower += votePowerForPool;
            IBribe(gaugesState[gauge].internalBribe).deposit(votePowerForPool, tokenId_);
            IBribe(gaugesState[gauge].externalBribe).deposit(votePowerForPool, tokenId_);
            emit Voted(_msgSender(), tokenId_, votePowerForPool);
        }
        if (totalVoterPower > 0) IVotingEscrowV2(votingEscrow).votingHook(tokenId_, true);
        totalWeightsPerEpoch[time] += totalVoterPower;
    }

    /**
     * @dev Updates the last voted timestamp for a given token ID.
     * @param tokenId_ The token ID for which to update the last voted timestamp.
     */
    function _updateLastVotedTimestamp(uint256 tokenId_) internal {
        lastVotedTimestamps[tokenId_] = _epochTimestamp() + 1;
    }

    /**
     * @dev Ensures that the current time is within the allowed voting window.
     */
    function _checkVoteWindow() internal view {
        _checkStartVoteWindow();
        _checkEndVoteWindow();
    }

    /**
     * @dev Ensures that the current time is after the start of the voting window.
     * @custom:error DistributionWindow Thrown if the current time is before the start of the voting window.
     */
    function _checkStartVoteWindow() internal view {
        if (block.timestamp <= (block.timestamp - (block.timestamp % _WEEK) + distributionWindowDuration)) {
            revert DistributionWindow();
        }
    }

    /**
     * @dev Ensures that the current time is before the end of the voting window.
     * @custom:error DistributionWindow Thrown if the current time is after the end of the voting window.
     */
    function _checkEndVoteWindow() internal view {
        if (block.timestamp >= (block.timestamp - (block.timestamp % _WEEK) + _WEEK - distributionWindowDuration)) {
            revert DistributionWindow();
        }
    }

    /**
     * @dev Ensures that the required delay period has passed since the last vote.
     * @param tokenId_ The token ID to check.
     * @custom:error VoteDelay Thrown if the required delay period has not passed.
     */
    function _checkVoteDelay(uint256 tokenId_) internal view {
        if (block.timestamp < lastVotedTimestamps[tokenId_] + voteDelay) {
            revert VoteDelay();
        }
    }
}
