// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import {IAlgebraVaultFactory} from "@cryptoalgebra/integral-core/contracts/interfaces/vault/IAlgebraVaultFactory.sol";

/**
 * @title IFeesVaultFactory Interface
 * @dev Interface for the `FeesVaultFactory` contract. It defines the events, errors,
 * and functions related to the creation and management of fee vaults for pools.
 *
 * This interface extends `IAlgebraVaultFactory`, inheriting its functionalities
 * and integrating them with specific requirements for fee vault management.
 */
interface IFeesVaultFactory is IAlgebraVaultFactory {
    /**
     * @dev Emitted when a new FeesVault is created for a pool.
     *
     * @param pool Address of the pool for which the FeesVault was created.
     * @param feesVault Address of the newly created FeesVault.
     */
    event FeesVaultCreated(address indexed pool, address indexed feesVault);

    /**
     * @dev Emitted when the whitelisted status of a creator is changed.
     *
     * @param creator Address of the creator whose status was updated.
     * @param newStatus New whitelisted status of the creator.
     */
    event SetWhitelistedCreatorStatus(address indexed creator, bool indexed newStatus);

    /**
     * @dev Emitted when the voter address is updated. This address is used for voting in fee vaults.
     *
     * @param oldVoter The address of the previous voter.
     * @param newVoter The address of the new voter that has been set.
     */
    event SetVoter(address indexed oldVoter, address indexed newVoter);

    /**
     * @dev Emitted when the default Blast governor address for new fee vaults is updated.
     *
     * @param oldDefaultBlastGovernor The address of the previous default Blast governor.
     * @param newDefaultBlastGovernor The address of the new default Blast governor that has been set.
     */
    event SetDefaultBlastGovernor(address indexed oldDefaultBlastGovernor, address indexed newDefaultBlastGovernor);

    /**
     * @dev Error indicating that a fee vault creation attempt was made for a pool that already has an associated vault.
     */
    error AlreadyCreated();

    /**
     * @dev Error indicating that an action (such as creating a fee vault) was attempted by an address that is not whitelisted.
     */
    error AccessDenied();

    /**
     * @dev Sets the whitelisted status for a creator, controlling their ability to create fee vaults.
     *
     * @param creator_ Address of the creator to update.
     * @param status_ Boolean indicating the new whitelisted status.
     */
    function setWhitelistedCreatorStatus(address creator_, bool status_) external;

    /**
     * @dev Checks if a creator address is whitelisted to create fee vaults.
     *
     * @param creator_ The address of the creator to check.
     * @return True if the creator is whitelisted, false otherwise.
     */
    function isWhitelistedCreator(address creator_) external view returns (bool);

    /**
     * @dev Returns the owner address of the FeesVault, which is synonymous with the contract's owner.
     *
     * @return The address of the FeesVault owner.
     */
    function feesVaultOwner() external view returns (address);

    /**
     * @dev Returns the current setuped voter .
     *
     * @return The address of the Voter contract.
     */
    function voter() external view returns (address);

    /**
     * @dev Returns the default blast governor address for future FeesVaults
     *
     * @return The address of the blast governor.
     */
    function defaultBlastGovernor() external view returns (address);
}
