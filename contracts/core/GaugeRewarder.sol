// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.19;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import {BlastGovernorClaimableSetup} from "../integration/BlastGovernorClaimableSetup.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {SafeERC20Upgradeable, IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "./interfaces/IVoter.sol";
import "./interfaces/IMinter.sol";
import "./interfaces/IGaugeRewarder.sol";

/**
 * @title GaugeRewarder
 * @dev This contract is responsible for managing reward distributions to gauges and handling claims.
 * It allows setting rewards, transferring rewards, and claiming rewards based on a signature.
 */
contract GaugeRewarder is IGaugeRewarder, AccessControlEnumerableUpgradeable, EIP712Upgradeable, BlastGovernorClaimableSetup {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /**
     * @dev Role for claiming rewards on behalf of users.
     */
    bytes32 internal constant _CLAMER_FOR_ROLE = keccak256("CLAMER_FOR_ROLE");

    /**
     * @dev Role for managing reward notifications.
     */
    bytes32 internal constant _REWARDER_ROLE = keccak256("REWARDER_ROLE");

    /**
     * @dev Type hash for EIP-712 claim signature.
     */
    bytes32 internal constant _CLAIM_TYPEHASH = keccak256("Claim(address user,uint256 totalAmount,uint256 deadline)");

    /**
     * @notice The address of the reward token.
     */
    address public token;

    /**
     * @notice The address of the minter contract.
     */
    address public minter;

    /**
     * @notice The address of the voter contract.
     */
    address public voter;

    /**
     * @notice The address of the authorized signer for reward claims.
     */
    address public signer;

    /**
     * @notice The total amount of rewards distributed so far.
     */
    uint256 public totalRewardDistributed;

    /**
     * @notice The total amount of rewards claimed so far.
     */
    uint256 public totalRewardClaimed;

    /**
     * @notice A mapping to track the claimed reward amounts for each address.
     */
    mapping(address => uint256) public claimed;

    /**
     * @notice A mapping to track rewards per gauge per epoch.
     * @dev Maps the epoch to gauge addresses and their corresponding rewards.
     */
    mapping(uint256 epoch => mapping(address gauge => uint256)) public rewardPerGaugePerEpoch;

    /**
     * @notice A mapping to track rewards per epoch.
     * @dev Maps the epoch to the total reward for that epoch.
     */
    mapping(uint256 epoch => uint256) public rewardPerEpoch;

    /**
     * @dev Error thrown when attempting to distribute zero reward amount.
     */
    error ZeroRewardAmount();

    /**
     * @dev Error thrown when access is denied for the requested action.
     */
    error AccessDenied();

    /**
     * @dev Error thrown when a signature has expired.
     */
    error SignatureExpired();

    /**
     * @dev Error thrown when claiming is disabled.
     */
    error ClaimDisabled();

    /**
     * @dev Error thrown when an address has already claimed the reward.
     */
    error AlreadyClaimed();

    /**
     * @dev Error thrown when an invalid signature is provided for a claim.
     */
    error InvalidSignature();

    /**
     * @dev Error thrown when there is insufficient available balance for the reward.
     */
    error InsufficientAvailableBalance();

    /**
     * @dev Modifier to restrict access to either a gauge or an authorized rewarder.
     */
    modifier onlyGaugeOrRewarder() {
        if (!IVoter(voter).isGauge(_msgSender()) && !hasRole(_REWARDER_ROLE, _msgSender())) {
            revert AccessDenied();
        }
        _;
    }

    /**
     * @dev Initializes the contract by disabling initializers.
     * @param blastGovernor_ The address of the Blast Governor contract.
     */
    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract with the specified parameters.
     * @param blastGovernor_ The address of the Blast Governor contract.
     * @param token_ The address of the reward token.
     * @param voter_ The address of the voter contract.
     * @param minter_ The address of the minter contract.
     */
    function initialize(address blastGovernor_, address token_, address voter_, address minter_) external initializer {
        _checkAddressZero(token_);
        _checkAddressZero(minter_);
        _checkAddressZero(voter_);

        __EIP712_init("GaugeRewarder", "1");
        __AccessControlEnumerable_init();
        __BlastGovernorClaimableSetup_init(blastGovernor_);

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());

        token = token_;
        minter = minter_;
        voter = voter_;
    }

    /**
     * @notice Sets the signer address for reward claims.
     * @param signer_ The address of the new signer.
     */
    function setSigner(address signer_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        signer = signer_;
        emit SetSigner(signer_);
    }

    /**
     * @notice Notifies a reward for a specified gauge.
     * @param gauge_ The address of the gauge to receive the reward.
     * @param amount_ The amount of reward tokens.
     */
    function notifyReward(address gauge_, uint256 amount_) external virtual onlyGaugeOrRewarder {
        _notifyReward(gauge_, amount_);
    }

    /**
     * @notice Transfers tokens and notifies a reward for a specified gauge.
     * @param gauge_ The address of the gauge to receive the reward.
     * @param amount_ The amount of reward tokens.
     */
    function notifyRewardWithTransfer(address gauge_, uint256 amount_) external virtual onlyGaugeOrRewarder {
        IERC20Upgradeable(token).safeTransferFrom(_msgSender(), address(this), amount_);
        _notifyReward(gauge_, amount_);
    }

    /**
     * @notice Claims rewards on behalf for specified target address.
     * @param target_ The address of the recipient of the claimed reward.
     * @param totalAmount_ The total amount of reward being claimed.
     * @param deadline_ The expiration time of the claim.
     * @param signature_ The signature authorizing the claim.
     * @return The amount of reward claimed.
     */
    function claimFor(
        address target_,
        uint256 totalAmount_,
        uint256 deadline_,
        bytes memory signature_
    ) external onlyRole(_CLAMER_FOR_ROLE) returns (uint256) {
        return _claim(target_, totalAmount_, deadline_, signature_);
    }

    /**
     * @notice Claims rewards for the caller.
     * @param totalAmount_ The total amount of reward being claimed.
     * @param deadline_ The expiration time of the claim.
     * @param signature_ The signature authorizing the claim.
     * @return The amount of reward claimed.
     */
    function claim(uint256 totalAmount_, uint256 deadline_, bytes memory signature_) external returns (uint256) {
        return _claim(_msgSender(), totalAmount_, deadline_, signature_);
    }

    /**
     * @dev Internal function to notify rewards for a gauge.
     * @param gauge_ The address of the gauge to receive the reward.
     * @param amount_ The amount of reward tokens.
     */
    function _notifyReward(address gauge_, uint256 amount_) internal {
        uint256 availableBalance = IERC20Upgradeable(token).balanceOf(address(this)) - (totalRewardDistributed - totalRewardClaimed);
        if (amount_ == 0) {
            amount_ = availableBalance;
        } else if (amount_ > availableBalance) {
            revert InsufficientAvailableBalance();
        }

        if (amount_ == 0) {
            revert ZeroRewardAmount();
        }

        uint256 epoch = IMinter(minter).active_period();

        totalRewardDistributed += amount_;
        rewardPerEpoch[epoch] += amount_;
        rewardPerGaugePerEpoch[epoch][gauge_] += amount_;

        emit NotifyReward(_msgSender(), gauge_, IMinter(minter).active_period(), amount_);
    }

    /**
     * @dev Internal function to handle reward claims.
     * @param target_ The address of the recipient of the claimed reward.
     * @param totalAmount_ The total amount of reward being claimed.
     * @param deadline_ The expiration time of the claim.
     * @param signature_ The signature authorizing the claim.
     * @return reward The amount of reward claimed.
     */
    function _claim(
        address target_,
        uint256 totalAmount_,
        uint256 deadline_,
        bytes memory signature_
    ) internal virtual returns (uint256 reward) {
        if (signer == address(0)) {
            revert ClaimDisabled();
        }

        if (deadline_ <= block.timestamp) {
            revert SignatureExpired();
        }

        uint256 claimedAmount = claimed[target_];
        if (totalAmount_ <= claimedAmount) {
            revert AlreadyClaimed();
        }
        if (
            ECDSAUpgradeable.recover(
                _hashTypedDataV4(keccak256(abi.encode(_CLAIM_TYPEHASH, target_, totalAmount_, deadline_))),
                signature_
            ) != signer
        ) {
            revert InvalidSignature();
        }
        reward = totalAmount_ - claimedAmount;

        claimed[target_] = totalAmount_;

        totalRewardClaimed += reward;

        IERC20Upgradeable(token).safeTransfer(target_, reward);

        emit Claim(target_, reward, totalAmount_);
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
}
