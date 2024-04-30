// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/**
 * @title Interface for the Compound VeFNX Managed NFT Strategy Factory
 * @notice This interface outlines the functions and events for a factory responsible for creating and managing strategies and virtual rewarders for Compound VeFNX-managed NFTs.
 */
interface ICompoundVeFNXManagedNFTStrategyFactory {
    /**
     * @dev Emitted when the address of the Router V2 Path Provider is updated.
     *
     * @param oldRouterV2PathProvider The address of the previous Router V2 Path Provider.
     * @param newRouterV2PathProvider The address of the new Router V2 Path Provider that has been set.
     */
    event SetRouterV2PathProvider(address indexed oldRouterV2PathProvider, address indexed newRouterV2PathProvider);

    /**
     * @dev Emitted when the default Blast governor address for new strategies is updated.
     *
     * @param oldDefaultBlastGovernor The address of the previous default Blast governor.
     * @param newDefaultBlastGovernor The address of the new default Blast governor that has been set.
     */
    event SetDefaultBlastGovernor(address indexed oldDefaultBlastGovernor, address indexed newDefaultBlastGovernor);

    /**
     * @dev Emitted when the implementation address for the virtual rewarder is changed.
     *
     * @param oldImplementation The previous implementation address of the virtual rewarder.
     * @param newImplementation The new implementation address of the virtual rewarder that has been set.
     */
    event ChangeVirtualRewarderImplementation(address indexed oldImplementation, address indexed newImplementation);

    /**
     * @dev Emitted when the implementation address for the strategy is changed.
     *
     * @param oldImplementation The previous implementation address of the strategy.
     * @param newImplementation The new implementation address of the strategy that has been set.
     */
    event ChangeStrategyImplementation(address indexed oldImplementation, address indexed newImplementation);

    /**
     * @dev Emitted when a new strategy and its corresponding virtual rewarder are created.
     *
     * @param strategy The address of the newly created strategy.
     * @param virtualRewarder The address of the corresponding virtual rewarder created alongside the strategy.
     * @param name The name assigned to the new strategy.
     */
    event CreateStrategy(address indexed strategy, address indexed virtualRewarder, string name);

    /**
     * @notice Returns the current implementation address of the virtual rewarder.
     * @return The address of the virtual rewarder implementation.
     */
    function virtualRewarderImplementation() external view returns (address);

    /**
     * @notice Returns the current implementation address of the strategy.
     * @return The address of the strategy implementation.
     */
    function strategyImplementation() external view returns (address);

    /**
     * @notice Returns the address of the managed NFT manager associated with the strategies.
     * @return The address of the managed NFT manager.
     */
    function managedNFTManager() external view returns (address);

    /**
     * @notice Returns the current default Blast governor address.
     * @return The address of the default Blast governor.
     */
    function defaultBlastGovernor() external view returns (address);

    /**
     * @notice Returns the address of the Router V2 Path Provider used to fetch and calculate
     *  optimal routes for token transactions within strategies.
     * @return The address of the RouterV2PathProvider.
     */
    function routerV2PathProvider() external view returns (address);

    /**
     * @notice Creates a new strategy with a specific name.
     * @param name_ The name to assign to the new strategy.
     * @return The address of the newly created strategy instance
     */
    function createStrategy(string calldata name_) external returns (address);

    /**
     * @notice Sets a new default Blast governor address for newly created strategies.
     * @param defaultBlastGovernor_ The new default governor address to be set.
     */
    function setDefaultBlastGovernor(address defaultBlastGovernor_) external;

    /**
     * @notice Sets a new RouterV2PathProvider.
     * @param routerV2PathProvider_ The new address to set
     */
    function setRouterV2PathProvider(address routerV2PathProvider_) external;
}
