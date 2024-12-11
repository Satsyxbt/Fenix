// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {IERC20Upgradeable, SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ERC721HolderUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";

import {BlastGovernorClaimableSetup} from "../../integration/BlastGovernorClaimableSetup.sol";
import {IVotingEscrow} from "../../core/interfaces/IVotingEscrow.sol";
import {IVoter} from "../../core/interfaces/IVoter.sol";
import {IBribe} from "../interfaces/IBribe.sol";
import {IBribeVeFNXRewardToken} from "./interfaces/IBribeVeFNXRewardToken.sol";
import {ICustomBribeRewardRouter} from "./interfaces/ICustomBribeRewardRouter.sol";

/**
 * @title CustomBribeRewardRouter
 * @notice This contract facilitates the distribution of FNX-based rewards into external bribe contracts
 *         as veFNX-based intermediary tokens. It converts either direct FNX deposits or veFNX NFTs
 *         (burned to reclaim underlying FNX) into brVeFNX tokens, and then notifies external bribe contracts
 *         of these new rewards.
 *
 * @dev This contract:
 *      - Inherits from ICustomBribeRewardRouter and provides implementations for FNX to brVeFNX reward distribution.
 *      - Allows enabling/disabling certain functions via `funcEnabled` mapping controlled by an admin role.
 *      - Uses a voter contract to derive the correct external bribe contract for a given pool.
 *      - Requires the caller to have appropriate roles and the function to be enabled before executing certain operations.
 */
contract CustomBribeRewardRouter is
    ICustomBribeRewardRouter,
    AccessControlUpgradeable,
    ERC721HolderUpgradeable,
    BlastGovernorClaimableSetup
{
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// @notice The address of the intermediate bribe-veFNX reward token.
    address public bribeVeFnxRewardToken;

    /// @notice The address of the voter contract used to map pools to gauges and thus to external bribe contracts.
    address public voter;

    /// @notice A mapping of function selectors to a boolean indicating if the function is enabled.
    mapping(bytes4 => bool) public funcEnabled;

    /// @dev Thrown when attempting to call a function that has been disabled.
    error FunctionDisabled();

    /// @dev Thrown when the provided pool does not map to a valid gauge or external bribe contract.
    error InvalidPool(address pool);

    /// @dev Thrown when the retrieved external bribe contract is invalid (e.g., zero address).
    error InvalidBribe(address bribe);

    /**
     * @dev Modifier that checks whether the given function selector is enabled before proceeding.
     *      Reverts with `FunctionDisabled()` if not enabled.
     * @param funcSign_ The 4-byte function selector.
     */
    modifier whenEnabled(bytes4 funcSign_) {
        if (!funcEnabled[funcSign_]) {
            revert FunctionDisabled();
        }
        _;
    }

    /**
     * @notice Constructor for UUPS pattern. The main logic is in the `initialize` function.
     * @param blastGovernor_ The address of the BlastGovernor contract for governor-controlled logic.
     */
    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract.
     * @dev Grants DEFAULT_ADMIN_ROLE to the caller. Sets the voter and bribeVeFnxRewardToken addresses.
     * @param blastGovernor_ The address of the BlastGovernor contract.
     * @param voter_ The address of the voter contract used to map pools to gauges and external bribes.
     * @param bribeVeFnxRewardToken_ The address of the brVeFNX token contract.
     */
    function initialize(address blastGovernor_, address voter_, address bribeVeFnxRewardToken_) external initializer {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        __AccessControl_init();
        __ERC721Holder_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());

        voter = voter_;
        bribeVeFnxRewardToken = bribeVeFnxRewardToken_;
    }

    /**
     * @notice Enables or disables a specific function based on its selector.
     * @dev Only callable by addresses with DEFAULT_ADMIN_ROLE.
     * @param funcSign_ The function selector for which the state is being changed.
     * @param isEnable_ True to enable the function, false to disable.
     *
     * Emits a {FuncEnabled} event.
     */
    function setupFuncEnable(bytes4 funcSign_, bool isEnable_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        funcEnabled[funcSign_] = isEnable_;
        emit FuncEnabled(funcSign_, isEnable_);
    }

    /**
     * @notice Notifies an external bribe contract of FNX-based rewards by converting FNX into brVeFNX tokens.
     * @dev FNX tokens are transferred from the caller to this contract, then converted into brVeFNX tokens,
     *      and finally notified to the external bribe contract associated with the given pool.
     * @param pool_ The address of the pool for which the reward is being distributed.
     * @param amount_ The amount of FNX to convert and distribute as brVeFNX rewards.
     *
     * Emits a {NotifyRewardFNXInVeFnx} event.
     * Reverts if the function is disabled or the pool is invalid.
     */
    function notifyRewardFNXInVeFNX(
        address pool_,
        uint256 amount_
    ) external whenEnabled(ICustomBribeRewardRouter.notifyRewardFNXInVeFNX.selector) {
        IBribeVeFNXRewardToken bribeVeFnxRewardTokenCache = IBribeVeFNXRewardToken(bribeVeFnxRewardToken);
        IERC20Upgradeable token = IERC20Upgradeable(bribeVeFnxRewardTokenCache.underlyingToken());

        token.safeTransferFrom(_msgSender(), address(this), amount_);

        token.safeApprove(address(bribeVeFnxRewardTokenCache), amount_);
        bribeVeFnxRewardTokenCache.mint(address(this), amount_);

        address externalBribe = _getExternalBribe(pool_);

        IERC20Upgradeable(bribeVeFnxRewardTokenCache).safeApprove(externalBribe, amount_);
        IBribe(externalBribe).notifyRewardAmount(address(bribeVeFnxRewardTokenCache), amount_);
        emit NotifyRewardFNXInVeFnx(_msgSender(), pool_, externalBribe, amount_);
    }

    /**
     * @notice Notifies an external bribe contract using FNX reclaimed from burning a veFNX NFT.
     * @dev A veFNX NFT is transferred from the caller to this contract, burned to reclaim FNX,
     *      then converted into brVeFNX, and finally notified to the external bribe contract.
     * @param pool_ The address of the pool for which the reward is being distributed.
     * @param tokenId_ The ID of the veFNX NFT to be burned to reclaim FNX.
     *
     * Emits a {NotifyRewardVeFNXInVeFnx} event.
     * Reverts if the function is disabled, the pool is invalid, or the NFT is not eligible to be burned.
     */
    function notifyRewardVeFNXInVeFnx(
        address pool_,
        uint256 tokenId_
    ) external whenEnabled(ICustomBribeRewardRouter.notifyRewardVeFNXInVeFnx.selector) {
        IBribeVeFNXRewardToken bribeVeFnxRewardTokenCache = IBribeVeFNXRewardToken(bribeVeFnxRewardToken);
        IERC20Upgradeable token = IERC20Upgradeable(bribeVeFnxRewardTokenCache.underlyingToken());
        IVotingEscrow votingEscrow = IVotingEscrow(bribeVeFnxRewardTokenCache.votingEscrow());

        votingEscrow.safeTransferFrom(_msgSender(), address(this), tokenId_, "");

        uint256 balanceBefore = token.balanceOf(address(this));

        if (votingEscrow.getNftState(tokenId_).locked.isPermanentLocked) {
            votingEscrow.unlockPermanent(tokenId_);
        }

        votingEscrow.burnToBribes(tokenId_);
        uint256 amount = token.balanceOf(address(this)) - balanceBefore;

        token.safeApprove(address(bribeVeFnxRewardTokenCache), amount);
        bribeVeFnxRewardTokenCache.mint(address(this), amount);

        address externalBribe = _getExternalBribe(pool_);

        IERC20Upgradeable(bribeVeFnxRewardTokenCache).safeApprove(externalBribe, amount);
        IBribe(externalBribe).notifyRewardAmount(address(bribeVeFnxRewardTokenCache), amount);

        emit NotifyRewardVeFNXInVeFnx(_msgSender(), pool_, externalBribe, tokenId_, amount);
    }

    /**
     * @dev Retrieves the external bribe contract associated with a given pool via the voter contract.
     * @param pool_ The address of the pool to fetch the external bribe for.
     * @return externalBribe The address of the associated external bribe contract.
     *
     * Reverts if:
     * - No gauge is found for the given pool.
     * - The gauge is alive (not a finalized state required for bribing).
     * - No external bribe contract is found.
     */
    function _getExternalBribe(address pool_) internal view returns (address) {
        IVoter voterCache = IVoter(voter);
        address gauge = voterCache.poolToGauge(pool_);

        if (gauge == address(0)) {
            revert InvalidPool(pool_);
        }
        if (!voterCache.isAlive(gauge)) {
            revert InvalidPool(pool_);
        }

        address externalBribe = voterCache.getGaugeState(gauge).externalBribe;

        if (externalBribe == address(0)) {
            revert InvalidBribe(externalBribe);
        }

        return externalBribe;
    }
}
