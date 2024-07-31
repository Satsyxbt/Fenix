// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {SafeERC20Upgradeable, IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {IVotingEscrow} from "./interfaces/IVotingEscrow.sol";
import {IVeFnxSplitMerklAidrop} from "./interfaces/IVeFnxSplitMerklAidrop.sol";
import {MerkleProofUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";
import {BlastGovernorClaimableSetup} from "../integration/BlastGovernorClaimableSetup.sol";

/**
 * @title VeFnxSplitMerklAidropUpgradeable
 * @dev A contract for handling FNX and veFNX token claims based on a Merkle tree proof.
 */
contract VeFnxSplitMerklAidropUpgradeable is
    IVeFnxSplitMerklAidrop,
    Ownable2StepUpgradeable,
    PausableUpgradeable,
    BlastGovernorClaimableSetup
{
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /**
     * @dev The duration for which veFNX tokens will be locked.
     */
    uint256 internal constant _LOCK_DURATION = 182 days;

    /**
     * @dev Precision used for percentage calculations to ensure accurate arithmetic operations.
     */
    uint256 internal constant _PRECISION = 1e18;

    /**
     * @dev Address of the FNX token contract.
     */
    address public override token;

    /**
     * @dev Address of the Voting Escrow contract used for veFNX tokens.
     */
    address public override votingEscrow;

    /**
     * @dev Percentage of the claimed amount to be locked as veFNX.
     * This value should be set as a fraction of 1e18 (e.g., 0.5 * 1e18 represents 50%).
     */
    uint256 public override toVeFnxPercentage;

    /**
     * @dev Merkle root used for verifying user claims.
     */
    bytes32 public override merklRoot;

    /**
     * @dev Mapping of user addresses to the amount of tokens they have claimed.
     */
    mapping(address => uint256) public override userClaimed;

    /**
     * @dev Mapping to check if an address is an allowed claim operator.
     */
    mapping(address => bool) public override isAllowedClaimOperator;

    /**
     * @dev Error thrown when the `toVeFnxPercentage` is incorrect (i.e., greater than 1e18).
     */
    error IncorrectToVeFnxPercentage();

    /**
     * @dev Error thrown when a provided Merkle proof is invalid.
     */
    error InvalidProof();

    /**
     * @dev Error thrown when the claim amount is zero.
     */
    error ZeroAmount();

    /**
     * @dev Error thrown when a caller is not an allowed claim operator.
     */
    error NotAllowedClaimOperator();

    /**
     * @dev Initializes the contract by disabling the initializer of the inherited upgradeable contract.
     */
    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract with the provided parameters.
     * @param blastGovernor_ Address of the Blast Governor contract.
     * @param token_ Address of the FNX token contract.
     * @param votingEscrow_ Address of the Voting Escrow contract.
     * @param toVeFnxPercentage_ Percentage of tokens to be locked as veFNX.
     * @notice This function can only be called once.
     */
    function initialize(
        address blastGovernor_,
        address token_,
        address votingEscrow_,
        uint256 toVeFnxPercentage_
    ) external virtual initializer {
        _checkAddressZero(token_);
        _checkAddressZero(votingEscrow_);
        _checkToVeFnxPercentage(toVeFnxPercentage_);

        __BlastGovernorClaimableSetup_init(blastGovernor_);
        __Ownable2Step_init();
        __Pausable_init();

        _pause();

        token = token_;
        votingEscrow = votingEscrow_;
        toVeFnxPercentage = toVeFnxPercentage_;
    }

    /**
     * @dev Allows a user to claim their allocated FNX and veFNX tokens.
     * @param amount_ The total amount of tokens the user can claim.
     * @param proof_ The Merkle proof verifying the user's claim.
     * @notice This function can only be called when the contract is not paused.
     * @notice Reverts with `InvalidProof` if the provided proof is not valid.
     * @notice Reverts with `ZeroAmount` if the claim amount is zero.
     * @notice Emits a {Claim} event.
     */
    function claim(uint256 amount_, bytes32[] memory proof_) external virtual override whenNotPaused {
        _claim(_msgSender(), amount_, proof_);
    }

    /**
     * @dev Allows a claim operator to claim tokens on behalf of a target address.
     * Also, the user can claim for himself without the operator permissions
     * @param target_ The address of the user on whose behalf tokens are being claimed.
     * @param amount_ The total amount of tokens to claim.
     * @param proof_ The Merkle proof verifying the user's claim.
     * @notice This function can only be called when the contract is not paused.
     * @notice Reverts with `NotAllowedClaimOperator` if the caller is not an allowed claim operator.
     * @notice Emits a {Claim} event.
     */
    function claimFor(address target_, uint256 amount_, bytes32[] memory proof_) external virtual override whenNotPaused {
        if (target_ != _msgSender() && !isAllowedClaimOperator[_msgSender()]) {
            revert NotAllowedClaimOperator();
        }
        _claim(target_, amount_, proof_);
    }

    /**
     * @dev Pauses the contract, preventing any further claims.
     * Can only be called by the owner.
     * @notice Emits a {Paused} event.
     */
    function pause() external virtual override onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses the contract, allowing claims to be made.
     * Can only be called by the owner.
     * @notice Emits an {Unpaused} event.
     */

    function unpause() external virtual override onlyOwner {
        _unpause();
    }

    /**
     * @dev Sets whether an address is allowed to operate claims on behalf of others.
     * Can only be called by the owner.
     * @param operator_ The address of the operator to set.
     * @param isAllowed_ A boolean indicating whether the operator is allowed.
     * @notice Emits a {SetIsAllowedClaimOperator} event.
     */
    function setIsAllowedClaimOperator(address operator_, bool isAllowed_) external virtual override onlyOwner {
        isAllowedClaimOperator[operator_] = isAllowed_;
        emit SetIsAllowedClaimOperator(operator_, isAllowed_);
    }

    /**
     * @dev Sets the Merkle root for verifying claims.
     * Can only be called by the owner when the contract is paused.
     * @param merklRoot_ The new Merkle root.
     * @notice Emits a {SetMerklRoot} event.
     */
    function setMerklRoot(bytes32 merklRoot_) external virtual override onlyOwner whenPaused {
        merklRoot = merklRoot_;
        emit SetMerklRoot(merklRoot_);
    }

    /**
     * @dev Sets the percentage of tokens to be locked as veFNX.
     * Can only be called by the owner.
     * @param toVeFnxPercentage_ The new percentage.
     * @notice Reverts with `IncorrectToVeFnxPercentage` if the percentage is greater than 1e18.
     * @notice Emits a {SetToVeFnxPercentage} event.
     */
    function setToVeFnxPercentage(uint256 toVeFnxPercentage_) external virtual override onlyOwner whenPaused {
        _checkToVeFnxPercentage(toVeFnxPercentage_);
        toVeFnxPercentage = toVeFnxPercentage_;
        emit SetToVeFnxPercentage(toVeFnxPercentage_);
    }

    /**
     * @notice Allows the owner to recover FNX tokens from the contract.
     * @param amount_ The amount of FNX tokens to be recovered.
     * Transfers the specified amount of FNX tokens to the owner's address.
     */
    function recoverToken(uint256 amount_) external virtual override onlyOwner whenPaused {
        IERC20Upgradeable(token).safeTransfer(_msgSender(), amount_);
        emit Recover(_msgSender(), amount_);
    }

    /**
     * @dev Verifies if a provided proof is valid for a given user and amount.
     * @param user_ The address of the user.
     * @param amount_ The amount to be verified.
     * @param proof_ The Merkle proof.
     * @return True if the proof is valid, false otherwise.
     */
    function isValidProof(address user_, uint256 amount_, bytes32[] memory proof_) public view virtual override returns (bool) {
        bytes32 root = merklRoot;
        if (proof_.length == 0 || root == bytes32(0)) {
            return false;
        }

        return MerkleProofUpgradeable.verify(proof_, root, keccak256(bytes.concat(keccak256(abi.encode(user_, amount_)))));
    }

    /**
     * @dev Internal function to handle the claiming process.
     * @param target_ The address of the user making the claim.
     * @param amount_ The total amount of tokens the user can claim.
     * @param proof_ The Merkle proof verifying the user's claim.
     * @notice Reverts with `InvalidProof` if the provided proof is not valid.
     * @notice Reverts with `ZeroAmount` if the claim amount is zero.
     * @notice Emits a {Claim} event.
     */
    function _claim(address target_, uint256 amount_, bytes32[] memory proof_) internal virtual {
        if (!isValidProof(target_, amount_, proof_)) {
            revert InvalidProof();
        }
        uint256 claimAmount = amount_ - userClaimed[target_];

        if (claimAmount == 0) {
            revert ZeroAmount();
        }

        userClaimed[target_] = amount_;

        IERC20Upgradeable tokenCache = IERC20Upgradeable(token);
        uint256 toVeNFTAmount = (claimAmount * toVeFnxPercentage) / _PRECISION;
        uint256 toTokenAmount = claimAmount - toVeNFTAmount;

        uint256 tokenId;
        if (toVeNFTAmount > 0) {
            IVotingEscrow veCache = IVotingEscrow(votingEscrow);
            tokenCache.safeApprove(address(veCache), toVeNFTAmount);
            tokenId = veCache.create_lock_for_without_boost(toVeNFTAmount, _LOCK_DURATION, target_);
        }

        if (toTokenAmount > 0) {
            tokenCache.safeTransfer(target_, toTokenAmount);
        }

        emit Claim(target_, claimAmount, toTokenAmount, toVeNFTAmount, tokenId);
    }

    /**
     * @dev Checks if an address is zero and reverts if it is.
     * @param addr_ The address to check.
     * @notice Reverts with `AddressZero` if the address is zero.
     */
    function _checkAddressZero(address addr_) internal pure virtual {
        if (addr_ == address(0)) {
            revert AddressZero();
        }
    }

    /**
     * @dev Checks if the provided percentage is valid.
     * @param toVeFnxPercentage_ The percentage to check.
     * @notice Reverts with `IncorrectToVeFnxPercentage` if the percentage is greater than 1e18.
     */
    function _checkToVeFnxPercentage(uint256 toVeFnxPercentage_) internal pure virtual {
        if (toVeFnxPercentage_ > _PRECISION) {
            revert IncorrectToVeFnxPercentage();
        }
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}
