// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {EIP712Upgradeable, ECDSAUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {IERC20Upgradeable, SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {BlastGovernorSetup} from "../integration/BlastGovernorSetup.sol";

contract PerpetualsTradersRewarderUpgradeable is OwnableUpgradeable, EIP712Upgradeable, BlastGovernorSetup {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    address public token;
    address public signer;
    address public gauge;

    mapping(address => uint256) public claimed;

    bytes32 private constant _MESSAGE_TYPEHASH = keccak256("Message(address user,uint256 amount)");

    event SetSigner(address indexed signer);

    event Claim(address indexed user, uint256 indexed timestamp, uint256 indexed amount);

    event Reward(address indexed caller, uint256 indexed timestamp, uint256 amount);

    // Errors
    error InvalidSignature();
    error ClaimDisabled();
    error AlreadyClaimed();
    error AccessDenied();

    modifier onlyGauge() {
        if (_msgSender() != gauge) {
            revert AccessDenied();
        }
        _;
    }

    constructor() {
        _disableInitializers();
    }

    function initialize(address blastGovernor_, address gauge_, address token_, address signer_) external initializer {
        _checkAddressZero(token_);
        _checkAddressZero(gauge_);

        __BlastGovernorSetup_init(blastGovernor_);
        __EIP712_init("PerpetualsTradersRewarderUpgradeable", "1");
        __Ownable_init();

        token = token_;
        signer = signer_;
        gauge = gauge_;
    }

    function setSigner(address signer_) external onlyOwner {
        signer = signer_;
        emit SetSigner(signer_);
    }

    function notifyRewardAmount(uint256 amount_) external onlyGauge {
        IERC20Upgradeable(token).safeTransferFrom(msg.sender, address(this), amount_);
        emit Reward(_msgSender(), block.timestamp, amount_);
    }

    function claim(uint256 amount_, bytes memory signature_) external {
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

        uint256 reward = amount_ - claimedAmount;

        claimed[_msgSender()] = amount_;

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
