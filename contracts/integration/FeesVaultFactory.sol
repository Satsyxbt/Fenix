// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {UpgradeableBeacon} from "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import {BeaconProxy} from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import {IFeesVaultFactory} from "./interfaces/IFeesVaultFactory.sol";
import {IFeesVault} from "./interfaces/IFeesVault.sol";
import {BlastGovernorSetup} from "./BlastGovernorSetup.sol";

/**
 * @title FeesVaultFactory
 * @dev This contract creates and manages instances of FeesVaults for pools, utilizing
 * the beacon proxy pattern for upgradeability. It extends `BlastGovernorSetup` for
 * governor configuration and `UpgradeableBeacon` for proxy management.
 *
 * The factory allows whitelisted creators to generate new fee vaults for specific pools,
 * and tracks the association between pools and their corresponding fee vaults.
 */
contract FeesVaultFactory is IFeesVaultFactory, BlastGovernorSetup, UpgradeableBeacon {
    address public voter;
    address public defaultBlastGovernor;

    mapping(address => bool) internal _whitelistedCreators;
    mapping(address => address) internal _poolToVault;

    /**
     * @dev Initializes the factory with necessary parameters and configurations.
     *
     * @param blastGovernor_ The initial governor address for the Blast protocol.
     * @param feesVaultImplementation_ The implementation address for the FeesVault to be used by the beacon.
     * @param voter_ The default voting address for new fee vaults.
     * @param defaultBlastGovernor_ The default governor address for new fee vaults.
     */
    constructor(
        address blastGovernor_,
        address feesVaultImplementation_,
        address voter_,
        address defaultBlastGovernor_
    ) UpgradeableBeacon(feesVaultImplementation_) {
        __BlastGovernorSetup_init(blastGovernor_);
        voter = voter_;
        defaultBlastGovernor = defaultBlastGovernor_;
    }

    /**
     * @dev Sets the whitelisted status of a creator, allowing or disallowing them to create fee vaults.
     * Only callable by the contract owner.
     *
     * @param creator_ Address of the creator to update.
     * @param status_ Boolean representing the new whitelisted status.
     */
    function setWhitelistedCreatorStatus(address creator_, bool status_) external virtual override onlyOwner {
        _whitelistedCreators[creator_] = status_;
        emit SetWhitelistedCreatorStatus(creator_, status_);
    }

    /**
     * @dev Sets the address used for voting in the fee vaults. Only callable by the contract owner.
     *
     * @param voter_ The new voter address to be set.
     */
    function setVoter(address voter_) external virtual onlyOwner {
        emit SetVoter(voter, voter_);
        voter = voter_;
    }

    /**
     * @dev Sets the default governor address for new fee vaults. Only callable by the contract owner.
     *
     * @param defaultBlastGovernor_ The new default governor address to be set.
     */
    function setDefaultBlastGovernor(address defaultBlastGovernor_) external virtual onlyOwner {
        emit SetDefaultBlastGovernor(defaultBlastGovernor, defaultBlastGovernor_);
        defaultBlastGovernor = defaultBlastGovernor_;
    }

    /**
     * @dev Creates a new fee vault for a given pool if it hasn't been created yet. Only callable by whitelisted creators.
     *
     * @param pool_ The address of the pool for which the fee vault is to be created.
     * @return The address of the newly created fee vault.
     */
    function createVaultForPool(address pool_) external virtual override returns (address) {
        if (!_whitelistedCreators[msg.sender]) {
            revert AccessDenied();
        }
        if (_poolToVault[pool_] != address(0)) {
            revert AlreadyCreated();
        }

        address newFeesVault = address(new BeaconProxy(implementation(), ""));
        IFeesVault(newFeesVault).initialize(defaultBlastGovernor, address(this), pool_, voter);
        _poolToVault[pool_] = newFeesVault;

        emit FeesVaultCreated(pool_, newFeesVault);
        return newFeesVault;
    }

    /**
     * @dev Returns the address of the fee vault associated with a specific pool.
     *
     * @param pool_ The address of the pool whose fee vault address is being queried.
     * @return The address of the fee vault associated with the given pool.
     */
    function getVaultForPool(address pool_) external view virtual override returns (address) {
        return _poolToVault[pool_];
    }

    /**
     * @dev Checks if a creator address is whitelisted to create fee vaults.
     *
     * @param creator_ The address of the creator to check.
     * @return True if the creator is whitelisted, false otherwise.
     */
    function isWhitelistedCreator(address creator_) external view virtual override returns (bool) {
        return _whitelistedCreators[creator_];
    }

    /**
     * @dev Returns the owner address of the FeesVault, which is synonymous with the contract's owner.
     *
     * @return The address of the FeesVault owner.
     */
    function feesVaultOwner() external view virtual override returns (address) {
        return owner();
    }
}
