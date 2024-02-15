// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {UpgradeableBeacon} from "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import {BeaconProxy} from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

import {IFeesVaultFactory} from "./interfaces/IFeesVaultFactory.sol";
import {IFeesVault} from "./interfaces/IFeesVault.sol";

import {BlastGovernorSetup} from "./BlastGovernorSetup.sol";

contract FeesVaultFactory is IFeesVaultFactory, BlastGovernorSetup, UpgradeableBeacon {
    address public voter;
    address public defaultBlastGovernor;

    mapping(address => bool) internal _whitelistedCreators;
    mapping(address => address) internal _poolToVault;

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

    function setWhitelistedCreatorStatus(address creator_, bool status_) external virtual override onlyOwner {
        _whitelistedCreators[creator_] = status_;
        emit SetWhitelistedCreatorStatus(creator_, status_);
    }

    /// @notice creates the community fee vault for the pool if needed
    /// @param pool_ the address of Algebra Integral pool
    /// @return communityFeeVault the address of community fee vault
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

    /// @notice returns address of the community fee vault for the pool
    /// @param pool_ the address of Algebra Integral pool
    /// @return communityFeeVault the address of community fee vault
    function getVaultForPool(address pool_) external view virtual override returns (address) {
        return _poolToVault[pool_];
    }

    function isWhitelistedCreator(address creator_) external view virtual override returns (bool) {
        return _whitelistedCreators[creator_];
    }

    function feesVaultOwner() external view virtual override returns (address) {
        return owner();
    }
}
