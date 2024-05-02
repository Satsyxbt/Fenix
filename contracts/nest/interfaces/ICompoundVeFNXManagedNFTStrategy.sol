// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import {IManagedNFTStrategy} from "./IManagedNFTStrategy.sol";
import {ISingelTokenBuyback} from "./ISingelTokenBuyback.sol";

/**
 * @title ICompoundVeFNXManagedNFTStrategy
 * @dev Interface for a compound strategy specific to VeFNX tokens, extending the basic managed NFT strategy functionality.
 * @notice This interface provides functionalities to handle compounding of VeFNX token rewards and interactions with a virtual rewarder contract.
 */
interface ICompoundVeFNXManagedNFTStrategy is IManagedNFTStrategy, ISingelTokenBuyback {
    /**
     * @dev Emitted when rewards are compounded by the caller.
     *
     * @param caller The address of the account that called the compound function.
     * @param amount The amount of VeFNX tokens that were compounded.
     */
    event Compound(address indexed caller, uint256 indexed amount);

    /**
     * @dev Emitted when an NFT is attached to the strategy, initializing reward mechanisms for it.
     *
     * @param tokenId The ID of the NFT that is being attached.
     * @param userBalance The balance associated with the NFT at the time of attachment.
     */
    event OnAttach(uint256 indexed tokenId, uint256 indexed userBalance);

    /**
     * @dev Emitted when an NFT is detached from the strategy, concluding reward mechanisms for it.
     *
     * @param tokenId The ID of the NFT that is being detached.
     * @param userBalance The balance associated with the NFT at the time of detachment.
     * @param lockedRewards The rewards that were locked and harvested upon detachment.
     */
    event OnDettach(uint256 indexed tokenId, uint256 indexed userBalance, uint256 indexed lockedRewards);

    /**
     * @dev Emitted when ERC20 tokens are recovered from the contract by an admin.
     *
     * @param caller The address of the caller who initiated the recovery.
     * @param recipient The recipient address where the recovered tokens were sent.
     * @param token The address of the token that was recovered.
     * @param amount The amount of the token that was recovered.
     */
    event Erc20Recover(address indexed caller, address indexed recipient, address indexed token, uint256 amount);

    /**
     * @dev Emitted when the address of the Router V2 Path Provider is updated.
     *
     * @param oldRouterV2PathProvider The address of the previous Router V2 Path Provider.
     * @param newRouterV2PathProvider The address of the new Router V2 Path Provider that has been set.
     */
    event SetRouterV2PathProvider(address indexed oldRouterV2PathProvider, address indexed newRouterV2PathProvider);

    /**
     * @notice Compounds accumulated rewards into additional stakes or holdings.
     * @dev Function to reinvest earned rewards back into the underlying asset to increase the principal amount.
     * This is specific to strategies dealing with compounding mechanisms in DeFi protocols.
     */
    function compound() external;

    /**
     * @notice Returns the address of the virtual rewarder associated with this strategy.
     * @return address The contract address of the virtual rewarder that manages reward distributions for this strategy.
     */
    function virtualRewarder() external view returns (address);

    /**
     * @notice Returns the address of the FENIX token used in this strategy.
     * @return address The contract address of the FENIX token.
     */
    function fenix() external view returns (address);

    /**
     * @notice Retrieves the total amount of locked rewards available for a specific NFT based on its tokenId.
     * @param tokenId_ The identifier of the NFT to query.
     * @return The total amount of locked rewards for the specified NFT.
     */
    function getLockedRewardsBalance(uint256 tokenId_) external view returns (uint256);

    /**
     * @notice Retrieves the balance or stake associated with a specific NFT.
     * @param tokenId_ The identifier of the NFT to query.
     * @return The balance of the specified NFT.
     */
    function balanceOf(uint256 tokenId_) external view returns (uint256);

    /**
     * @notice Retrieves the total supply of stakes managed by the strategy.
     * @return The total supply of stakes.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @notice Initializes the contract with necessary blast governance and operational addresses, and sets specific strategy parameters.
     *
     * @param blastGovernor_ Address of the blast governor contract.
     * @param managedNFTManager_ Address of the managed NFT manager contract.
     * @param virtualRewarder_ Address of the virtual rewarder contract.
     * @param name_ Name of the strategy.
     */
    function initialize(
        address blastGovernor_,
        address managedNFTManager_,
        address virtualRewarder_,
        address routerV2PathProvider_,
        string memory name_
    ) external;
}
