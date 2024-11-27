// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.19;

import {BaseManagedNFTStrategyUpgradeable, IManagedNFTManager} from "./BaseManagedNFTStrategyUpgradeable.sol";

import {SafeERC20Upgradeable, IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {IVotingEscrow} from "../core/interfaces/IVotingEscrow.sol";

import {ISingelTokenVirtualRewarder} from "./interfaces/ISingelTokenVirtualRewarder.sol";
import {ICompoundVeFNXManagedNFTStrategy} from "./interfaces/ICompoundVeFNXManagedNFTStrategy.sol";
import {IRouterV2PathProvider, SingelTokenBuybackUpgradeable} from "./SingelTokenBuybackUpgradeable.sol";

/**
 * @title Compound VeFNX Managed NFT Strategy Upgradeable
 * @dev Strategy for managing VeFNX-related actions including compounding rewards and managing stakes.
 *      Extends the functionality of a base managed NFT strategy to interact with FENIX tokens.
 * @notice This strategy handles the automated compounding of VeFNX tokens by reinvesting harvested rewards back into VeFNX.
 */
contract CompoundVeFNXManagedNFTStrategyUpgradeable is
    ICompoundVeFNXManagedNFTStrategy,
    BaseManagedNFTStrategyUpgradeable,
    SingelTokenBuybackUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    /**
     * @dev Emitted when an attempt is made to recover tokens that should not be recovered.
     * This error typically occurs when a function tries to withdraw reserved or integral tokens
     * from the contract, such as tokens that are part of the operational balance or are restricted
     * due to their role in the contract's mechanics.
     */
    error IncorrectRecoverToken();

    /// @notice Address of the FENIX ERC20 token contract.
    address public override fenix;

    /// @notice Address of the virtual rewarder contract for managing reward distributions.
    address public override virtualRewarder;

    /**
     * @dev Constructor that disables initialization on implementation.
     */
    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _disableInitializers();
    }

    /**
     * @dev Initializes the strategy with necessary governance, operational addresses, and initial settings.
     * @notice Sets up the strategy with a managed NFT manager, virtual rewarder, and router path provider along with initializing governance settings.
     *
     * @param blastGovernor_ The governance address capable of claiming and managing the contract.
     * @param managedNFTManager_ The address of the managed NFT manager, responsible for managing NFT-based operations.
     * @param virtualRewarder_ The address of the virtual rewarder, which handles reward distribution.
     * @param routerV2PathProvider_ The address of the router V2 path provider, used for determining optimal token swap routes.
     * @param name_ The name of the strategy, used for identification.
     */
    function initialize(
        address blastGovernor_,
        address managedNFTManager_,
        address virtualRewarder_,
        address routerV2PathProvider_,
        string memory name_
    ) external override initializer {
        _checkAddressZero(virtualRewarder_);
        __BaseManagedNFTStrategy__init(blastGovernor_, managedNFTManager_, name_);
        __SingelTokenBuyback__init(routerV2PathProvider_);
        fenix = IVotingEscrow(votingEscrow).token();
        virtualRewarder = virtualRewarder_;
    }

    /**
     * @notice Attaches an NFT to the strategy and initializes participation in the virtual reward system.
     * @dev This function is called when an NFT is attached to this strategy, enabling it to start accumulating rewards.
     *
     * @param tokenId_ The identifier of the NFT to attach.
     * @param userBalance_ The initial balance or stake associated with the NFT at the time of attachment.
     */
    function onAttach(uint256 tokenId_, uint256 userBalance_) external override onlyManagedNFTManager {
        ISingelTokenVirtualRewarder(virtualRewarder).deposit(tokenId_, userBalance_);
        emit OnAttach(tokenId_, userBalance_);
    }

    /**
     * @notice Detaches an NFT from the strategy, withdrawing all associated rewards and balances.
     * @dev Handles the process of detaching an NFT, ensuring all accrued benefits are properly managed and withdrawn.
     *
     * @param tokenId_ The identifier of the NFT to detach.
     * @param userBalance_ The remaining balance or stake associated with the NFT at the time of detachment.
     * @return lockedRewards The amount of rewards locked and harvested upon detachment.
     */
    function onDettach(uint256 tokenId_, uint256 userBalance_) external override onlyManagedNFTManager returns (uint256 lockedRewards) {
        ISingelTokenVirtualRewarder virtualRewarderCache = ISingelTokenVirtualRewarder(virtualRewarder);
        virtualRewarderCache.withdraw(tokenId_, userBalance_);
        lockedRewards = virtualRewarderCache.harvest(tokenId_);
        emit OnDettach(tokenId_, userBalance_, lockedRewards);
    }

    /**
     * @notice Retrieves the total amount of locked rewards available for a specific NFT based on its tokenId.
     * @param tokenId_ The identifier of the NFT to query.
     * @return The total amount of locked rewards for the specified NFT.
     */
    function getLockedRewardsBalance(uint256 tokenId_) external view returns (uint256) {
        return ISingelTokenVirtualRewarder(virtualRewarder).calculateAvailableRewardsAmount(tokenId_);
    }

    /**
     * @notice Retrieves the balance or stake associated with a specific NFT.
     * @param tokenId_ The identifier of the NFT to query.
     * @return The balance of the specified NFT.
     */
    function balanceOf(uint256 tokenId_) external view returns (uint256) {
        return ISingelTokenVirtualRewarder(virtualRewarder).balanceOf(tokenId_);
    }

    /**
     * @notice Retrieves the total supply of stakes managed by the strategy.
     * @return The total supply of stakes.
     */
    function totalSupply() external view returns (uint256) {
        return ISingelTokenVirtualRewarder(virtualRewarder).totalSupply();
    }

    /**
     * @notice Compounds the earnings by reinvesting the harvested rewards into the underlying asset.
     * @dev Calls the Voting Escrow contract to lock up harvested FENIX tokens, thereby compounding the rewards.
     */
    function compound() external {
        IERC20Upgradeable fenixCache = IERC20Upgradeable(fenix);
        uint256 currentBalance = fenixCache.balanceOf(address(this));
        if (currentBalance > 0) {
            address votingEscrowCache = votingEscrow;
            fenixCache.safeApprove(votingEscrowCache, currentBalance);
            IVotingEscrow(votingEscrowCache).depositFor(managedTokenId, currentBalance, false, false);
            ISingelTokenVirtualRewarder(virtualRewarder).notifyRewardAmount(currentBalance);
            emit Compound(msg.sender, currentBalance);
        }
    }

    /**
     * @notice Sets a new address for the Router V2 Path Provider.
     * @dev Accessible only by admins, this function updates the address used for determining swap routes in token buyback strategies.
     * @param routerV2PathProvider_ The new Router V2 Path Provider address.
     */
    function setRouterV2PathProvider(address routerV2PathProvider_) external virtual onlyAdmin {
        _checkAddressZero(routerV2PathProvider_);
        emit SetRouterV2PathProvider(routerV2PathProvider, routerV2PathProvider_);
        routerV2PathProvider = routerV2PathProvider_;
    }

    /**
     * @notice Claims bribes for the current strategy and recovers specified ERC20 tokens to a recipient.
     * @dev This function allows the strategy to claim bribes from specified contracts and transfer
     *      non-strategic ERC20 tokens back to the designated recipient in a single transaction.
     * @param bribes_ The list of addresses representing bribe contracts from which to claim rewards.
     * @param tokens_ A nested array where each entry corresponds to a list of token addresses to claim from the respective bribe contract.
     * @param recipient_ The address to which recovered tokens should be sent.
     * @param tokensToRecover_ The list of ERC20 token addresses to be recovered and transferred to the recipient.
     *
     * Emits:
     * - Emits `Erc20Recover` for each recovered token.
     */
    function claimBribesWithERC20Recover(
        address[] calldata bribes_,
        address[][] calldata tokens_,
        address recipient_,
        address[] calldata tokensToRecover_
    ) external {
        _checkBuybackSwapPermissions();
        if (bribes_.length > 0) {
            claimBribes(bribes_, tokens_);
        }
        for (uint256 i; i < tokensToRecover_.length; ) {
            _erc20Recover(tokensToRecover_[i], recipient_);
            unchecked {
                i++;
            }
        }
    }

    /**
     * @notice Recovers ERC20 tokens accidentally sent to this contract, excluding the managed token (FENIX).
     * @dev Allows the admin to recover non-strategic ERC20 tokens sent to the contract.
     * @param token_ The address of the token to recover.
     * @param recipient_ The address where the recovered tokens should be sent.
     */
    function erc20Recover(address token_, address recipient_) external {
        _checkBuybackSwapPermissions();
        _erc20Recover(token_, recipient_);
    }

    /**
     * @dev Internal function to recover the full balance of an ERC20 token held by the contract
     *      and transfer it to a specified recipient.
     * @param token_ The address of the ERC20 token to recover.
     * @param recipient_ The address where the recovered tokens will be sent.
     *
     * Emits:
     * - `Erc20Recover` event with details of the token recovery, including the caller, recipient, token address, and recovered amount.
     */
    function _erc20Recover(address token_, address recipient_) internal {
        if (token_ == address(fenix) || IRouterV2PathProvider(routerV2PathProvider).isAllowedTokenInInputRoutes(token_)) {
            revert IncorrectRecoverToken();
        }
        uint256 amount = IERC20Upgradeable(token_).balanceOf(address(this));
        if (amount > 0) {
            IERC20Upgradeable(token_).safeTransfer(recipient_, amount);
            emit Erc20Recover(msg.sender, recipient_, token_, amount);
        }
    }

    /**
     * @dev Internal function to enforce permissions or rules before allowing a buyback swap to proceed.
     */
    function _checkBuybackSwapPermissions() internal view virtual override {
        if (
            IManagedNFTManager(managedNFTManager).isAdmin(msg.sender) ||
            IManagedNFTManager(managedNFTManager).isAuthorized(managedTokenId, msg.sender)
        ) {
            return;
        }
        revert AccessDenied();
    }

    /**
     * @dev Internal helper to fetch the target token for buybacks.
     * @return The address of the buyback target token.
     */
    function _getBuybackTargetToken() internal view virtual override returns (address) {
        return fenix;
    }

    /**
     * @dev Checked provided address on zero value, throw AddressZero error in case when addr_ is zero
     *
     * @param addr_ The address which will checked on zero
     */
    function _checkAddressZero(address addr_) internal pure override(BaseManagedNFTStrategyUpgradeable, SingelTokenBuybackUpgradeable) {
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
