// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.19;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {BlastGovernorClaimableSetup} from "../integration/BlastGovernorClaimableSetup.sol";
import {IVoterV1_2} from "../core/interfaces/IVoterV1_2.sol";
import {IVotingEscrow} from "../core/interfaces/IVotingEscrow.sol";
import {IManagedNFTManager} from "./interfaces/IManagedNFTManager.sol";
import {IManagedNFTStrategy} from "./interfaces/IManagedNFTStrategy.sol";
import {UpgradeCall} from "../integration/UpgradeCall.sol";

/**
 * @title Base Managed NFT Strategy Upgradeable
 * @dev Abstract base contract for strategies managing NFTs with voting and reward capabilities.
 * This contract serves as a foundation for specific managed NFT strategies, incorporating initializable patterns for upgradeability.
 */
abstract contract BaseManagedNFTStrategyUpgradeable is IManagedNFTStrategy, Initializable, BlastGovernorClaimableSetup, UpgradeCall {
    /// @notice The name of the strategy for identification purposes.
    string public override name;

    /// @notice The address of the managed NFT manager that coordinates the overall strategy and access controls.
    address public override managedNFTManager;

    /// @notice The specific token ID of the NFT being managed under this strategy.
    uint256 public override managedTokenId;

    /// @notice The address of the voting escrow contract, which locks governance tokens to enable voting power.
    address public override votingEscrow;

    /// @notice The address of the voter contract, which handles governance actions and reward claims.
    address public override voter;

    /// @notice Error thrown when an unauthorized user attempts to perform an action reserved for specific roles.
    error AccessDenied();

    /// @notice Error thrown when attempting to attach a token ID that is either incorrect or already in use.
    error IncorrectManagedTokenId();

    /// @notice Error thrown when attempting to attach a token ID that has already been attached to another strategy.
    error AlreadyAttached();

    /// @dev Ensures that only the current managed NFT manager contract can call certain functions.
    modifier onlyManagedNFTManager() {
        if (managedNFTManager != msg.sender) {
            revert AccessDenied();
        }
        _;
    }

    /// @dev Ensures that only administrators defined in the managed NFT manager can perform certain actions.
    modifier onlyAdmin() {
        if (!IManagedNFTManager(managedNFTManager).isAdmin(msg.sender)) {
            revert AccessDenied();
        }
        _;
    }

    /// @dev Ensures that only authorized users, as determined by the managed NFT manager, can call certain functions.
    modifier onlyAuthorized() {
        if (!IManagedNFTManager(managedNFTManager).isAuthorized(managedTokenId, msg.sender)) {
            revert AccessDenied();
        }
        _;
    }

    /**
     * @dev Initializes the contract, setting up blast governor setup and necessary state variables.
     *      This initialization setup prevents further initialization and ensures proper governance setup.
     * @param blastGovernor_ Address of the governance contract capable of claiming the contract
     * @param managedNFTManager_ Address of the managed NFT manager
     * @param name_ Descriptive name of the managed NFT strategy
     */
    function __BaseManagedNFTStrategy__init(
        address blastGovernor_,
        address managedNFTManager_,
        string memory name_
    ) internal onlyInitializing {
        __BlastGovernorClaimableSetup_init(blastGovernor_);

        _checkAddressZero(managedNFTManager_);

        managedNFTManager = managedNFTManager_;
        votingEscrow = IManagedNFTManager(managedNFTManager_).votingEscrow();
        voter = IManagedNFTManager(managedNFTManager_).voter();
        name = name_;
    }

    /**
     * @notice Attaches a specific managed NFT to this strategy, setting up necessary governance or reward mechanisms.
     * @dev This function can only be called by administrators. It sets the `managedTokenId` and ensures that the token is
     *      valid and owned by this contract. Emits an `AttachedManagedNFT` event upon successful attachment.
     * @param managedTokenId_ The token ID of the NFT to be managed by this strategy.
     * throws AlreadyAttached if the strategy is already attached to a managed NFT.
     * throws IncorrectManagedTokenId if the provided token ID is not managed or not owned by this contract.
     */
    function attachManagedNFT(uint256 managedTokenId_) external onlyAdmin {
        if (managedTokenId != 0) {
            revert AlreadyAttached();
        }
        if (
            !IManagedNFTManager(managedNFTManager).isManagedNFT(managedTokenId_) ||
            IVotingEscrow(votingEscrow).ownerOf(managedTokenId_) != address(this)
        ) {
            revert IncorrectManagedTokenId();
        }

        managedTokenId = managedTokenId_;
        emit AttachedManagedNFT(managedTokenId_);
    }

    /**
     * @notice Allows administrative updating of the strategy's name for clarity or rebranding purposes.
     * @dev Emits the SetName event upon successful update. This function can only be called by administrators.
     *
     * @param name_ The new name to set for the strategy, reflecting either its purpose or current operational focus.
     */
    function setName(string calldata name_) external onlyAdmin {
        name = name_;
        emit SetName(name_);
    }

    /**
     * @notice Casts votes based on the strategy's parameters.
     * @param poolVote_ Array of pool addresses to vote for.
     * @param weights_ Array of weights corresponding to each pool address.
     */
    function vote(address[] calldata poolVote_, uint256[] calldata weights_) external onlyAuthorized {
        IVoterV1_2(voter).vote(managedTokenId, poolVote_, weights_);
    }

    /**
     * @notice Claims rewards from the specified gauges.
     * @param gauges_ Array of gauge addresses from which to claim rewards.
     */
    function claimRewards(address[] calldata gauges_) external {
        IVoterV1_2(voter).claimRewards(gauges_);
    }

    /**
     * @notice Claims bribes for specific tokens from specified bribe addresses.
     * @param bribes_ Array of bribe addresses.
     * @param tokens_ Array of arrays of token addresses corresponding to each bribe address.
     */
    function claimBribes(address[] calldata bribes_, address[][] calldata tokens_) external {
        IVoterV1_2(voter).claimBribes(bribes_, tokens_, managedTokenId);
    }

    /**
     * @dev Checked provided address on zero value, throw AddressZero error in case when addr_ is zero
     *
     * @param addr_ The address which will checked on zero
     */
    function _checkAddressZero(address addr_) internal pure virtual {
        if (addr_ == address(0)) {
            revert AddressZero();
        }
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}
