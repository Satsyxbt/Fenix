// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {EIP712Upgradeable, ECDSAUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {IERC20Upgradeable, SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {BlastGovernorClaimableSetup} from "../integration/BlastGovernorClaimableSetup.sol";
import {IPerpetualsTradersRewarder} from "./interfaces/IPerpetualsTradersRewarder.sol";

/**
 * @title PerpetualsTradersRewarderUpgradeable
 * @dev Implementation of the IPerpetualsTradersRewarder interface. Manages reward distribution to perpetual traders.
 */
contract PerpetualsTradersRewarderUpgradeable is
    IPerpetualsTradersRewarder,
    OwnableUpgradeable,
    EIP712Upgradeable,
    BlastGovernorClaimableSetup
{
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// @notice The address of the gauge
    address public override gauge;

    /// @notice The address of the reward token
    address public override token;

    /// @notice The address of the signer
    address public override signer;

    /// @notice The total amount of tokens reward
    uint256 public override totalReward;

    /// @notice The total amount of tokens claimed
    uint256 public override totalClaimed;

    /// @notice Mapping of user addresses to the amount of tokens claimed
    mapping(address => uint256) public claimed;

    bytes32 internal constant _MESSAGE_TYPEHASH = keccak256("Message(address user,uint256 amount)");

    // Errors
    /// @dev Error thrown when the provided signature is invalid
    error InvalidSignature();

    /// @dev Error thrown when claim functionality is disabled
    error ClaimDisabled();

    /// @dev Error thrown when a user tries to claim an already claimed amount
    error AlreadyClaimed();

    /// @dev Error thrown when an unauthorized address attempts to access restricted functionality
    error AccessDenied();

    /// @dev Error thrown when the provided reward token address is incorrect
    error IncorrectRewardToken();

    /**
     * @dev Initializes the contract by disabling initializers.
     */
    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract.
     * @param blastGovernor_ The address of the BlastGovernor.
     * @param gauge_ The address of the gauge.
     * @param token_ The address of the reward token.
     * @param signer_ The address of the signer.
     */
    function initialize(address blastGovernor_, address gauge_, address token_, address signer_) external initializer {
        _checkAddressZero(token_);
        _checkAddressZero(gauge_);

        __BlastGovernorClaimableSetup_init(blastGovernor_);
        __EIP712_init("PerpetualsTradersRewarderUpgradeable", "1");
        __Ownable_init();

        gauge = gauge_;
        token = token_;
        signer = signer_;
    }

    /**
     * @notice Sets the signer address.
     * @param signer_ The address of the new signer.
     */
    function setSigner(address signer_) external onlyOwner {
        signer = signer_;
        emit SetSigner(signer_);
    }

    /**
     * @notice Notifies a reward amount.
     * @param token_ The address of the reward token.
     * @param rewardAmount_ The amount of reward tokens.
     */
    function notifyRewardAmount(address token_, uint256 rewardAmount_) external {
        if (_msgSender() != gauge) {
            revert AccessDenied();
        }
        if (token_ != token) {
            revert IncorrectRewardToken();
        }
        IERC20Upgradeable(token).safeTransferFrom(_msgSender(), address(this), rewardAmount_);
        totalReward += rewardAmount_;
        emit Reward(_msgSender(), block.timestamp, rewardAmount_);
    }

    /**
     * @notice Claims the reward for the user.
     * @param amount_ The amount of tokens to claim.
     * @param signature_ The signature of the claim.
     * @return reward The amount of reward tokens claimed.
     */
    function claim(uint256 amount_, bytes memory signature_) external returns (uint256 reward) {
        if (signer == address(0)) {
            revert ClaimDisabled();
        }

        uint256 claimedAmount = claimed[_msgSender()];
        if (amount_ <= claimedAmount) {
            revert AlreadyClaimed();
        }

        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(_MESSAGE_TYPEHASH, _msgSender(), amount_)));

        if (ECDSAUpgradeable.recover(digest, signature_) != signer) {
            revert InvalidSignature();
        }

        reward = amount_ - claimedAmount;

        claimed[_msgSender()] = amount_;

        totalClaimed += reward;

        IERC20Upgradeable(token).safeTransfer(_msgSender(), reward);

        emit Claim(_msgSender(), block.timestamp, reward);
    }

    /**
     * @dev Checked provided address on zero value, throw AddressZero error in case when addr_ is zero
     *
     * @param addr_ The address which will checked on zero
     */
    function _checkAddressZero(address addr_) internal pure {
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
