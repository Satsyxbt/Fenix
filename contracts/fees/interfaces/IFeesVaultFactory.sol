// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import {IAccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";

import {IAlgebraVaultFactory} from "@cryptoalgebra/integral-core/contracts/interfaces/vault/IAlgebraVaultFactory.sol";
import {IFeesVault} from "./IFeesVault.sol";

/**
 * @title IFeesVaultFactory Interface
 * @dev Interface for the `FeesVaultFactory` contract. It defines the events, errors,
 * and functions related to the creation and management of fee vaults for pools.
 *
 * This interface extends `IAlgebraVaultFactory`, inheriting its functionalities
 * and integrating them with specific requirements for fee vault management.
 */
interface IFeesVaultFactory is IAlgebraVaultFactory, IAccessControlUpgradeable {
    /**
     * @dev Structure for holding distribution configuration details.
     * Used to set how fees are distributed to various recipients including gauges.
     */
    struct DistributionConfig {
        uint256 toGaugeRate; // The rate at which fees are distributed to the gauge.
        address[] recipients; // The addresses of the recipients who will receive the fees.
        uint256[] rates; // The rates at which fees are distributed to each recipient.
    }

    /**
     * @dev Emitted when a default distribution configuration is change.
     * @param config The distribution configuration applied to all fees vault.
     */
    event DefaultDistributionConfig(DistributionConfig config);

    /**
     * @dev Emitted when a custom distribution configuration is set for a fees vault.
     * @param feesVault The address of the fees vault for which the configuration is set.
     * @param config The custom distribution configuration applied to the fees vault.
     */
    event CustomDistributionConfig(address indexed feesVault, DistributionConfig config);

    /**
     * @dev Emitted when the implementation of the fees vault is changed.
     * This allows the system to upgrade the fees vault logic.
     * @param oldImplementation The address of the previous fees vault implementation.
     * @param newImplementation The address of the new fees vault implementation.
     */
    event FeesVaultImplementationChanged(address indexed oldImplementation, address indexed newImplementation);

    /**
     * @dev Emitted when a new FeesVault is created for a pool.
     *
     * @param pool Address of the pool for which the FeesVault was created.
     * @param feesVault Address of the newly created FeesVault.
     */
    event FeesVaultCreated(address indexed pool, address indexed feesVault);

    /**
     * @dev Emitted when the voter address is updated. This address is used for voting in fee vaults.
     *
     * @param oldVoter The address of the previous voter.
     * @param newVoter The address of the new voter that has been set.
     */
    event SetVoter(address indexed oldVoter, address indexed newVoter);

    /**
     * @dev Emitted when the rebasing tokens governor address is set.
     *
     * @param oldRebasingTokensGovernor The previous address of the rebasing tokens governor.
     * @param newRebasingTokensGovernor The new address of the rebasing tokens governor.
     */
    event SetRebasingTokensGovernor(address indexed oldRebasingTokensGovernor, address indexed newRebasingTokensGovernor);

    /**
     * @dev Emitted when a custom distribution configuration is set for a creator.
     * @param creator The address of the creator for which the configuration is set.
     * @param config The custom distribution configuration applied to the fees vault created by creator.
     */
    event CreatorDistributionConfig(address indexed creator, DistributionConfig config);

    /**
     * @dev Emitted when the creator for multiple fees vaults is changed.
     * @param creator_ The new creator address associated with the fees vaults.
     * @param feesVaults The array of fees vault addresses that had their creator changed.
     */
    event ChangeCreatorForFeesVaults(address indexed creator_, address[] feesVaults);

    /**
     * @dev Error indicating that a fee vault creation attempt was made for a pool that already has an associated vault.
     */
    error AlreadyCreated();

    /**
     * @dev Error indicating that an action (such as creating a fee vault) was attempted by an address that is not whitelisted.
     */
    error AccessDenied();

    /**
     * @dev Error indicating that the lengths of two related arrays (e.g., recipients and rates) do not match.
     */
    error ArraysLengthMismatch();

    /**
     * @dev Error indicating that the sum of rates does not meet the expected total (e.g., 10000 for 100% in basis points).
     */
    error IncorrectRates();

    /**
     * @notice Gets the unique identifier for the role allowed to call fee claiming functions.
     * @return The identifier for the claim fees caller role.
     */
    function CLAIM_FEES_CALLER_ROLE() external view returns (bytes32);

    /**
     * @notice Gets the unique identifier for the role that can create new fee vaults.
     * @return The identifier for the whitelisted creator role.
     */
    function WHITELISTED_CREATOR_ROLE() external view returns (bytes32);

    /**
     * @notice Gets the unique identifier for the role responsible for fee vault administration.
     * @return The identifier for the fees vault administrator role.
     */
    function FEES_VAULT_ADMINISTRATOR_ROLE() external view returns (bytes32);

    /**
     * @notice Retrieves the distribution configuration for a specific fees vault.
     * @param feesVault_ The address of the fees vault.
     * @return toGaugeRate The rate at which fees are distributed to the gauge.
     * @return recipients The addresses of the recipients.
     * @return rates The rates at which fees are distributed to the recipients.
     */
    function getDistributionConfig(
        address feesVault_
    ) external view returns (uint256 toGaugeRate, address[] memory recipients, uint256[] memory rates);

    /**
     * @notice Retrieves the distribution configuration for a specific creator.
     * @param creator_ The address of the creator.
     * @return toGaugeRate The rate at which fees are distributed to the gauge.
     * @return recipients The addresses of the recipients.
     * @return rates The rates at which fees are distributed to the recipients.
     */
    function creatorDistributionConfig(
        address creator_
    ) external view returns (uint256 toGaugeRate, address[] memory recipients, uint256[] memory rates);

    /**
     * @notice Returns the default distribution configuration used by the factory.
     * @return toGaugeRate The default rate at which fees are distributed to the gauge.
     * @return recipients The default addresses of the recipients.
     * @return rates The default rates at which fees are distributed to the recipients.
     */
    function defaultDistributionConfig() external view returns (uint256 toGaugeRate, address[] memory recipients, uint256[] memory rates);

    /**
     * @notice Returns the custom distribution configuration for a specified fees vault.
     * @param feesVault_ The address of the fees vault.
     * @return toGaugeRate The rate at which fees are distributed to the gauge.
     * @return recipients The addresses of the recipients.
     * @return rates The rates at which fees are distributed to the recipients.
     */
    function customDistributionConfig(
        address feesVault_
    ) external view returns (uint256 toGaugeRate, address[] memory recipients, uint256[] memory rates);

    /**
     * @notice Checks if a fees vault has a custom configuration.
     * @param feesVault_ The address of the fees vault to check.
     * @return True if the fees vault has a custom configuration, false otherwise.
     */
    function isCustomConfig(address feesVault_) external view returns (bool);

    /**
     * @notice Returns the current voter address used in fee vaults.
     * @return The address of the current voter.
     */
    function voter() external view returns (address);

    /**
     * @notice Returns the current fees vault implementation address.
     * @return The address of the current fees vault implementation.
     */
    function feesVaultImplementation() external view returns (address);

    /**
     * @notice Changes the implementation of the fees vault used by all vaults.
     * @param implementation_ The new fees vault implementation address.
     */
    function changeImplementation(address implementation_) external;

    /**
     * @notice Retrieves the creator address for a specific fees vault.
     * @param feesVault_ The address of the fees vault.
     * @return The address of the creator associated with the specified fees vault.
     */
    function getFeesVaultCreator(address feesVault_) external view returns (address);

    /**
     * @dev Sets the address used for voting in the fee vaults. Only callable by the contract owner.
     *
     * @param voter_ The new voter address to be set.
     */
    function setVoter(address voter_) external;

    /**
     * @notice Sets a custom distribution configuration for a specific fees vault.
     * @param feesVault_ The address of the fees vault to configure.
     * @param config_ The custom distribution configuration to apply.
     */
    function setCustomDistributionConfig(address feesVault_, DistributionConfig memory config_) external;

    /**
     * @notice Sets a default distribution configuration for a fees vaults.
     * @param config_ The distribution configuration to apply.
     */
    function setDefaultDistributionConfig(DistributionConfig memory config_) external;

    /**
     * @notice Sets a custom distribution configuration for a specific creator.
     * @param creator_ The address of the creator of fees vaults.
     * @param config_ The custom distribution configuration to apply.
     */
    function setDistributionConfigForCreator(address creator_, DistributionConfig memory config_) external;

    /**
     * @notice Changes the creator for multiple fees vaults.
     * @param creator_ The new creator address.
     * @param feesVaults_ The array of fees vault addresses.
     */
    function changeCreatorForFeesVaults(address creator_, address[] calldata feesVaults_) external;
}
