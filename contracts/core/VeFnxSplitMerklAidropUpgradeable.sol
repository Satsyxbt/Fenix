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
 * @dev A contract for handling token and veNft token claims based on a Merkle tree proof.
 */
contract VeFnxSplitMerklAidropUpgradeable is
    IVeFnxSplitMerklAidrop,
    Ownable2StepUpgradeable,
    PausableUpgradeable,
    BlastGovernorClaimableSetup
{
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /**
     * @dev The duration for which veNFT tokens will be locked.
     */
    uint256 internal constant _LOCK_DURATION = 182 days;

    /**
     * @dev Precision used for percentage calculations to ensure accurate arithmetic operations.
     */
    uint256 internal constant _PRECISION = 1e18;

    /**
     * @dev Address of the token contract.
     */
    address public override token;

    /**
     * @dev Address of the Voting Escrow contract used for veNFT tokens.
     */
    address public override votingEscrow;

    /**
     * @dev Rate for pure tokens.
     */
    uint256 public override pureTokensRate;

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
     * @dev Error thrown when the pure tokens rate is incorrect.
     */
    error IncorrectPureTokensRate();

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
     * @dev Error thrown when the pure tokens rate is zero.
     */
    error ZeroPureTokensRate();

    /**
     * @dev Initializes the contract by disabling the initializer of the inherited upgradeable contract.
     * @param blastGovernor_ Address of the Blast Governor contract.
     */
    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract with the provided parameters.
     * @param blastGovernor_ Address of the Blast Governor contract.
     * @param token_ Address of the token contract.
     * @param votingEscrow_ Address of the Voting Escrow contract.
     * @param pureTokensRate_ Rate for pure tokens.
     * @notice This function can only be called once.
     */
    function initialize(
        address blastGovernor_,
        address token_,
        address votingEscrow_,
        uint256 pureTokensRate_
    ) external virtual initializer {
        _checkAddressZero(token_);
        _checkAddressZero(votingEscrow_);
        _checkPureTokensRate(pureTokensRate_);

        __BlastGovernorClaimableSetup_init(blastGovernor_);
        __Ownable2Step_init();
        __Pausable_init();

        _pause();

        token = token_;
        votingEscrow = votingEscrow_;
        pureTokensRate = pureTokensRate_;
    }

    /**
     * @dev Allows a user to claim tokens or veNFT tokens based on a Merkle proof.
     * @param inPureTokens_ Boolean indicating if the claim is in pure tokens.
     * @param amount_ The amount to claim.
     * @param withPermanentLock_ Whether the lock should be permanent.
     * @param managedTokenIdForAttach_ The ID of the managed NFT to attach, if any. 0 for ignore
     * @param proof_ The Merkle proof for the claim.
     * @notice This function can only be called when the contract is not paused.
     */
    function claim(
        bool inPureTokens_,
        uint256 amount_,
        bool withPermanentLock_,
        uint256 managedTokenIdForAttach_,
        bytes32[] memory proof_
    ) external virtual override whenNotPaused {
        _claim(_msgSender(), inPureTokens_, amount_, withPermanentLock_, managedTokenIdForAttach_, proof_);
    }

    /**
     * @dev Allows a claim operator to claim tokens on behalf of a target address.
     * @param target_ The address of the user on whose behalf tokens are being claimed.
     * @param inPureTokens_ Boolean indicating if the claim is in pure tokens.
     * @param amount_ The amount to claim.
     * @param withPermanentLock_ Whether the lock should be permanent.
     * @param managedTokenIdForAttach_ The ID of the managed NFT to attach, if any. 0 for ignore
     * @param proof_ The Merkle proof verifying the user's claim.
     * @notice This function can only be called when the contract is not paused.
     * @notice Reverts with `NotAllowedClaimOperator` if the caller is not an allowed claim operator.
     * @notice Emits a {Claim} event.
     */
    function claimFor(
        address target_,
        bool inPureTokens_,
        uint256 amount_,
        bool withPermanentLock_,
        uint256 managedTokenIdForAttach_,
        bytes32[] memory proof_
    ) external virtual override whenNotPaused {
        if (target_ != _msgSender() && !isAllowedClaimOperator[_msgSender()]) {
            revert NotAllowedClaimOperator();
        }
        _claim(target_, inPureTokens_, amount_, withPermanentLock_, managedTokenIdForAttach_, proof_);
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
     * @dev Sets the pure tokens rate.
     * Can only be called by the owner when the contract is paused.
     * @param pureTokensRate_ The new pure tokens rate.
     * @notice Emits a {SetPureTokensRate} event.
     */
    function setPureTokensRate(uint256 pureTokensRate_) external virtual override onlyOwner whenPaused {
        _checkPureTokensRate(pureTokensRate_);
        pureTokensRate = pureTokensRate_;
        emit SetPureTokensRate(pureTokensRate_);
    }

    /**
     * @notice Allows the owner to recover token from the contract.
     * @param amount_ The amount of tokens to be recovered.
     * Transfers the specified amount of tokens to the owner's address.
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
     * @dev Calculates the equivalent amount in pure tokens based on the claim amount.
     * @param claimAmount_ The claim amount for which to calculate the equivalent pure tokens.
     * @return The calculated amount of pure tokens.
     */
    function calculatePureTokensAmount(uint256 claimAmount_) public view returns (uint256) {
        return (pureTokensRate * claimAmount_) / _PRECISION;
    }

    /**
     * @dev Internal function to handle the claiming process.
     * @param target_ The address of the user making the claim.
     * @param inPureTokens_ Boolean indicating if the claim is in pure tokens.
     * @param amount_ The total amount of tokens the user can claim.
     * @param withPermanentLock_ Whether the lock should be permanent.
     * @param managedTokenIdForAttach_ The ID of the managed NFT to attach, if any. 0 for ignore
     * @param proof_ The Merkle proof verifying the user's claim.
     * @notice Reverts with `InvalidProof` if the provided proof is not valid.
     * @notice Reverts with `ZeroAmount` if the claim amount is zero.
     * @notice Emits a {Claim} event.
     */
    function _claim(
        address target_,
        bool inPureTokens_,
        uint256 amount_,
        bool withPermanentLock_,
        uint256 managedTokenIdForAttach_,
        bytes32[] memory proof_
    ) internal virtual {
        if (!isValidProof(target_, amount_, proof_)) {
            revert InvalidProof();
        }
        uint256 claimAmount = amount_ - userClaimed[target_];

        if (claimAmount == 0) {
            revert ZeroAmount();
        }

        userClaimed[target_] = amount_;

        IERC20Upgradeable tokenCache = IERC20Upgradeable(token);
        uint256 tokenId;

        uint256 toTokenAmount;
        uint256 toVeNFTAmount;
        if (inPureTokens_) {
            uint256 pureTokensRateCache = pureTokensRate;
            if (pureTokensRateCache == 0) {
                revert ZeroPureTokensRate();
            }
            toTokenAmount = calculatePureTokensAmount(claimAmount);
            tokenCache.safeTransfer(target_, toTokenAmount);
        } else {
            toVeNFTAmount = claimAmount;
            IVotingEscrow veCache = IVotingEscrow(votingEscrow);
            tokenCache.safeApprove(address(veCache), toVeNFTAmount);
            tokenId = veCache.createLockFor(toVeNFTAmount, _LOCK_DURATION, target_, false, withPermanentLock_, managedTokenIdForAttach_);
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

    function _checkPureTokensRate(uint256 pureTokensRate_) internal pure virtual {
        if (pureTokensRate_ > _PRECISION) {
            revert IncorrectPureTokensRate();
        }
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}
