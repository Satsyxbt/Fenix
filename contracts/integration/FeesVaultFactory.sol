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
    address public override voter;
    address public override defaultBlastGovernor;
    mapping(address => bool) public override isWhitelistedCreator;
    mapping(address => address) public override getVaultForPool;

    /**
     * @dev Initializes the factory with necessary parameters and configurations.
     *
     * @param feesVaultImplementation_ The implementation address for the FeesVault to be used by the beacon.
     * @param voter_ The default voting address for new fee vaults.
     * @param blastGovernor_ The default governor address for new fee vaults and current contract.
     */
    constructor(address blastGovernor_, address feesVaultImplementation_, address voter_) UpgradeableBeacon(feesVaultImplementation_) {
        __BlastGovernorSetup_init(blastGovernor_);

        _checkAddressZero(voter_);

        voter = voter_;
        defaultBlastGovernor = blastGovernor_;
    }

    /**
     * @dev Sets the whitelisted status of a creator, allowing or disallowing them to create fee vaults.
     * Only callable by the contract owner.
     *
     * @param creator_ Address of the creator to update.
     * @param status_ Boolean representing the new whitelisted status.
     */
    function setWhitelistedCreatorStatus(address creator_, bool status_) external virtual override onlyOwner {
        isWhitelistedCreator[creator_] = status_;
        emit SetWhitelistedCreatorStatus(creator_, status_);
    }

    /**
     * @dev Sets the address used for voting in the fee vaults. Only callable by the contract owner.
     *
     * @param voter_ The new voter address to be set.
     */
    function setVoter(address voter_) external virtual onlyOwner {
        _checkAddressZero(voter_);
        emit SetVoter(voter, voter_);
        voter = voter_;
    }

    /**
     * @dev Sets the default governor address for new fee vaults. Only callable by the contract owner.
     *
     * @param defaultBlastGovernor_ The new default governor address to be set.
     */
    function setDefaultBlastGovernor(address defaultBlastGovernor_) external virtual onlyOwner {
        _checkAddressZero(defaultBlastGovernor_);
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
        if (!isWhitelistedCreator[msg.sender]) {
            revert AccessDenied();
        }

        if (getVaultForPool[pool_] != address(0)) {
            revert AlreadyCreated();
        }

        address newFeesVault = address(new BeaconProxy(address(this), ""));

        IFeesVault(newFeesVault).initialize(defaultBlastGovernor, address(this), pool_);
        getVaultForPool[pool_] = newFeesVault;

        emit FeesVaultCreated(pool_, newFeesVault);
        return newFeesVault;
    }

    /**
     * @dev Returns the owner address of the FeesVault, which is synonymous with the contract's owner.
     *
     * @return The address of the FeesVault owner.
     */
    function feesVaultOwner() external view virtual override returns (address) {
        return owner();
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
}
