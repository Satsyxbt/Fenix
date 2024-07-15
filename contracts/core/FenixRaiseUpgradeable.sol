// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {SafeERC20Upgradeable, IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {MerkleProofUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";
import {BlastGovernorClaimableSetup} from "../integration/BlastGovernorClaimableSetup.sol";
import {IFenixRaise} from "./interfaces/IFenixRaise.sol";

/**
 * @title FenixRaiseUpgradeable
 * @dev This contract manages a token raise with both whitelist and public phases.
 *  It utilizes Merkle proof verification for whitelist management and ensures various caps
 *  and limits are adhered to during the raise.
 */
contract FenixRaiseUpgradeable is IFenixRaise, BlastGovernorClaimableSetup, Ownable2StepUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /**
     * @notice The address of the token being raised
     */
    address public override token;

    /**
     * @notice The address that will receive the deposits
     */
    address public override depositsReciever;

    /**
     * @notice The Merkle root for the whitelist verification
     */
    bytes32 public override whitelistMerklRoot;

    /**
     * @notice The timestamp for the start of the whitelist phase
     */
    uint256 public override startWhitelistPhaseTimestamp;

    /**
     * @notice The timestamp for the start of the public phase
     */
    uint256 public override startPublicPhaseTimestamp;

    /**
     * @notice The timestamp for the end of the public phase
     */
    uint256 public override endPublicPhaseTimestamp;

    /**
     * @notice The maximum amount a user can deposit during the whitelist phase
     */
    uint256 public override whitelistPhaseUserCap;

    /**
     * @notice The maximum amount a user can deposit during the public phase
     */
    uint256 public override publicPhaseUserCap;

    /**
     * @notice The total cap for deposits
     */
    uint256 public override totalDepositCap;

    /**
     * @notice The total amount deposited so far
     */
    uint256 public override totalDeposited;

    /**
     * @notice The amount each user has deposited
     * @dev Mapping from user address to the amount deposited
     */
    mapping(address => uint256) public override userDeposited;

    /**
     * @notice The amount each user has deposited during whitelist phase
     * @dev Mapping from user address to the amount deposited
     */
    mapping(address => uint256) public override userDepositsWhitelistPhase;

    /**
     * @dev Error thrown when timestamps are incorrect
     */
    error IncorrectTimestamps();

    /**
     * @dev Error thrown when a non-whitelisted user attempts to deposit during the whitelist phase
     */
    error OnlyForWhitelistedUser();

    /**
     * @dev Error thrown when deposits are closed
     */
    error DepositClosed();

    /**
     * @dev Error thrown when a user attempts to deposit more than the user cap
     */
    error UserDepositCap();

    /**
     * @dev Error thrown when the total deposit cap is exceeded
     */
    error TotalDepositCap();

    /**
     * @dev Error thrown when trying to withdraw deposits before the raise is finished
     */
    error RaiseNotFinished();

    /**
     * @dev Error thrown when a zero amount is involved in a transaction
     */
    error ZeroAmount();

    /**
     * @dev Initializes the contract by disabling the initializer of the inherited upgradeable contract.
     */
    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _disableInitializers();
    }

    /**
     * @notice Deposit tokens during the raise
     * @param amount_ The amount of tokens to deposit
     * @param userCap_ The cap for the user (used for whitelist verification)
     * @param proof_ The Merkle proof for verifying the user is whitelisted
     */
    function deposit(uint256 amount_, uint256 userCap_, bytes32[] memory proof_) external virtual override {
        bool isWhitelistPhaseCache = isWhitelistPhase();
        uint256 phaseCap;

        if (!isPublicPhase()) {
            if (isWhitelistPhaseCache) {
                if (!isWhitelisted(_msgSender(), userCap_, proof_)) {
                    revert OnlyForWhitelistedUser();
                }
                phaseCap = userCap_ > 0 ? userCap_ : whitelistPhaseUserCap;
            } else {
                revert DepositClosed();
            }
        } else {
            phaseCap = publicPhaseUserCap;
        }

        uint256 userDepositedCache = isWhitelistPhaseCache
            ? userDeposited[_msgSender()]
            : userDeposited[_msgSender()] - userDepositsWhitelistPhase[_msgSender()];

        if (userDepositedCache + amount_ > phaseCap) {
            revert UserDepositCap();
        }

        if (totalDeposited + amount_ > totalDepositCap) {
            revert TotalDepositCap();
        }

        IERC20Upgradeable(token).safeTransferFrom(_msgSender(), address(this), amount_);

        if (isWhitelistPhaseCache) {
            userDepositsWhitelistPhase[_msgSender()] += amount_;
        }

        userDeposited[_msgSender()] += amount_;

        totalDeposited += amount_;

        emit Deposit(_msgSender(), amount_);
    }

    /**
     * @notice Initializes the contract
     * @param blastGovernor_ The address of the BlastGovernor
     * @param token_ The address of the token being raised
     * @param depositsReciever_ The address that will receive the deposits
     */
    function initialize(address blastGovernor_, address token_, address depositsReciever_) external initializer {
        _checkAddressZero(token_);
        _checkAddressZero(depositsReciever_);

        __Ownable2Step_init();
        __BlastGovernorClaimableSetup_init(blastGovernor_);

        token = token_;
        depositsReciever = depositsReciever_;
    }

    /**
     * @notice Withdraws the deposits after the raise is finished
     */
    function whithdrawDeposits() external virtual override onlyOwner {
        if (block.timestamp <= endPublicPhaseTimestamp || endPublicPhaseTimestamp == 0) {
            revert RaiseNotFinished();
        }
        IERC20Upgradeable tokenCache = IERC20Upgradeable(token);
        uint256 balanace = tokenCache.balanceOf(address(this));
        if (balanace == 0) {
            revert ZeroAmount();
        }
        tokenCache.safeTransfer(depositsReciever, tokenCache.balanceOf(address(this)));
        emit WithdrawDeposits(_msgSender(), depositsReciever, balanace);
    }

    /**
     * @notice Sets the deposit caps
     * @param totalDepositCap_ The total deposit cap
     * @param whitelistPhaseUserCap_ The user cap for the whitelist phase
     * @param publicPhaseUserCap_ The user cap for the public phase
     */
    function setDepositCaps(
        uint256 totalDepositCap_,
        uint256 whitelistPhaseUserCap_,
        uint256 publicPhaseUserCap_
    ) external virtual override onlyOwner {
        totalDepositCap = totalDepositCap_;
        whitelistPhaseUserCap = whitelistPhaseUserCap_;
        publicPhaseUserCap = publicPhaseUserCap_;

        emit UpdateDepositCaps(totalDepositCap_, whitelistPhaseUserCap_, publicPhaseUserCap_);
    }

    /**
     * @notice Sets the whitelist root
     * @param root_ The new whitelist root
     */
    function setWhitelistRoot(bytes32 root_) external virtual override onlyOwner {
        whitelistMerklRoot = root_;
        emit UpdateWhitelistRoot(root_);
    }

    /**
     * @notice Sets the timestamps for the phases
     * @param startWhitelistPhaseTimestamp_ The timestamp for the start of the whitelist phase
     * @param startPublicPhaseTimestamp_ The timestamp for the start of the public phase
     * @param endPublicPhaseTimestamp_ The timestamp for the end of the public phase
     */
    function setTimestamps(
        uint256 startWhitelistPhaseTimestamp_,
        uint256 startPublicPhaseTimestamp_,
        uint256 endPublicPhaseTimestamp_
    ) external virtual override onlyOwner {
        if (
            startWhitelistPhaseTimestamp_ >= startPublicPhaseTimestamp_ ||
            startWhitelistPhaseTimestamp_ >= endPublicPhaseTimestamp_ ||
            startPublicPhaseTimestamp_ >= endPublicPhaseTimestamp_
        ) {
            revert IncorrectTimestamps();
        }

        startWhitelistPhaseTimestamp = startWhitelistPhaseTimestamp_;
        startPublicPhaseTimestamp = startPublicPhaseTimestamp_;
        endPublicPhaseTimestamp = endPublicPhaseTimestamp_;

        emit UpdateTimestamps(startWhitelistPhaseTimestamp_, startPublicPhaseTimestamp_, endPublicPhaseTimestamp_);
    }

    /**
     * @notice Checks if a user is whitelisted
     * @param user_ The address of the user
     * @param userCap_ The cap for the user
     * @param proof_ The Merkle proof for verifying the user
     * @return True if the user is whitelisted, false otherwise
     */
    function isWhitelisted(address user_, uint256 userCap_, bytes32[] memory proof_) public view virtual override returns (bool) {
        bytes32 root = whitelistMerklRoot;
        if (proof_.length == 0 || root == bytes32(0)) {
            return false;
        }

        return MerkleProofUpgradeable.verify(proof_, root, keccak256(bytes.concat(keccak256(abi.encode(user_, userCap_)))));
    }

    /**
     * @notice Checks if the whitelist phase is active
     * @return True if the whitelist phase is active, false otherwise
     */
    function isWhitelistPhase() public view virtual override returns (bool) {
        return (block.timestamp >= startWhitelistPhaseTimestamp && block.timestamp < startPublicPhaseTimestamp);
    }

    /**
     * @notice Checks if the public phase is active
     * @return True if the public phase is active, false otherwise
     */
    function isPublicPhase() public view virtual override returns (bool) {
        return (block.timestamp >= startPublicPhaseTimestamp && block.timestamp <= endPublicPhaseTimestamp);
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
