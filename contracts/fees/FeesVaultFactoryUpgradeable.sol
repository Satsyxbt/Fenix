// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import {IFeesVaultFactory} from "./interfaces/IFeesVaultFactory.sol";
import {IFeesVault} from "./interfaces/IFeesVault.sol";
import {IPairIntegrationInfo} from "../integration/interfaces/IPairIntegrationInfo.sol";

import {ModeSfsSetupFactoryManager} from "../integration/ModeSfsSetupFactoryManager.sol";
import {FeesVaultProxy} from "./FeesVaultProxy.sol";

contract FeesVaultFactoryUpgradeable is IFeesVaultFactory, ModeSfsSetupFactoryManager, AccessControlUpgradeable {
    bytes32 public constant CLAIM_FEES_CALLER_ROLE = keccak256("CLAIM_FEES_CALLER_ROLE");
    bytes32 public constant WHITELISTED_CREATOR_ROLE = keccak256("WHITELISTED_CREATOR_ROLE");
    bytes32 public constant FEES_VAULT_ADMINISTRATOR_ROLE = keccak256("FEES_VAULT_ADMINISTRATOR_ROLE");

    address public override feesVaultImplementation;
    address public override voter;

    mapping(address => address) public override getVaultForPool;
    mapping(address => bool) public override isCustomConfig;

    DistributionConfig internal _defaultDistributionConfig;
    mapping(address => DistributionConfig) internal _customDistributionConfigs;

    /**
     * @dev Constructor that disables initialization on implementation.
     */
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the factory with necessary parameters and default configurations.
     * @param modeSfs_ The governor address for BLAST protocol interaction.
     * @param sfsAssignTokenId_ The BLAST points address.
     * @param voter_ The default voter address for fee vaults.
     * @param feesVaultImplementation_ The default fees vault implementation address.
     * @param defaultDistributionConfig_ The default distribution configuration for fees.
     */
    function initialize(
        address modeSfs_,
        uint256 sfsAssignTokenId_,
        address voter_,
        address feesVaultImplementation_,
        DistributionConfig memory defaultDistributionConfig_
    ) external initializer {
        _checkAddressZero(voter_);
        _checkAddressZero(feesVaultImplementation_);
        _checkDistributionConfig(defaultDistributionConfig_);

        __AccessControl_init();
        __ModeSfsSetupFactoryManager_init(modeSfs_, sfsAssignTokenId_);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        voter = voter_;
        feesVaultImplementation = feesVaultImplementation_;

        _defaultDistributionConfig = defaultDistributionConfig_;
    }

    /**
     * @notice Changes the implementation of the fees vault used by all vaults.
     * @param implementation_ The new fees vault implementation address.
     */
    function changeImplementation(address implementation_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _checkAddressZero(implementation_);

        emit FeesVaultImplementationChanged(feesVaultImplementation, implementation_);
        feesVaultImplementation = implementation_;
    }

    /**
     * @dev Sets the address used for voting in the fee vaults. Only callable by the contract owner.
     *
     * @param voter_ The new voter address to be set.
     */
    function setVoter(address voter_) external virtual onlyRole(DEFAULT_ADMIN_ROLE) {
        _checkAddressZero(voter_);

        emit SetVoter(voter, voter_);
        voter = voter_;
    }

    /**
     * @notice Sets a default distribution configuration for a fees vaults.
     * @param config_ The distribution configuration to apply.
     */
    function setDefaultDistributionConfig(
        DistributionConfig memory config_
    ) external virtual override onlyRole(FEES_VAULT_ADMINISTRATOR_ROLE) {
        _checkDistributionConfig(config_);
        _defaultDistributionConfig = config_;

        emit DefaultDistributionConfig(config_);
    }

    /**
     * @notice Sets a custom distribution configuration for a specific fees vault.
     * @param feesVault_ The address of the fees vault to configure.
     * @param config_ The custom distribution configuration to apply.
     */
    function setCustomDistributionConfig(
        address feesVault_,
        DistributionConfig memory config_
    ) external virtual override onlyRole(FEES_VAULT_ADMINISTRATOR_ROLE) {
        if (config_.toGaugeRate == 0 && config_.recipients.length == 0 && config_.rates.length == 0) {
            delete _customDistributionConfigs[feesVault_];
            delete isCustomConfig[feesVault_];
        } else {
            _checkDistributionConfig(config_);

            isCustomConfig[feesVault_] = true;
            _customDistributionConfigs[feesVault_] = config_;
        }

        emit CustomDistributionConfig(feesVault_, config_);
    }

    /**
     * @dev Creates a new fee vault for a given pool if it hasn't been created yet. Only callable by whitelisted creators.
     *
     * @param pool_ The address of the pool for which the fee vault is to be created.
     * @return The address of the newly created fee vault.
     */
    function createVaultForPool(address pool_) external virtual override onlyRole(WHITELISTED_CREATOR_ROLE) returns (address) {
        if (getVaultForPool[pool_] != address(0)) {
            revert AlreadyCreated();
        }

        address newFeesVault = address(new FeesVaultProxy());

        IFeesVault(newFeesVault).initialize(defaultModeSfs, defaultSfsAssignTokenId, address(this), pool_);

        getVaultForPool[pool_] = newFeesVault;

        emit FeesVaultCreated(pool_, newFeesVault);
        return newFeesVault;
    }

    /**
     * @notice Performs post-initialization configurations for a pool's fee vault, setting up rebasing token configurations.
     * @param pool_ The pool whose fee vault requires post-initialization configuration.
     */
    function afterPoolInitialize(address pool_) external virtual override onlyRole(WHITELISTED_CREATOR_ROLE) {}

    /**
     * @notice Retrieves the distribution configuration for a specific fees vault.
     * @param feesVault_ The address of the fees vault.
     * @return toGaugeRate The rate at which fees are distributed to the gauge.
     * @return recipients The addresses of the recipients.
     * @return rates The rates at which fees are distributed to the recipients.
     */
    function getDistributionConfig(
        address feesVault_
    ) external view virtual override returns (uint256 toGaugeRate, address[] memory recipients, uint256[] memory rates) {
        DistributionConfig memory config = isCustomConfig[feesVault_] ? _customDistributionConfigs[feesVault_] : _defaultDistributionConfig;
        return (config.toGaugeRate, config.recipients, config.rates);
    }

    /**
     * @notice Returns the default distribution configuration used by the factory.
     * @return toGaugeRate The default rate at which fees are distributed to the gauge.
     * @return recipients The default addresses of the recipients.
     * @return rates The default rates at which fees are distributed to the recipients.
     */
    function defaultDistributionConfig()
        external
        view
        virtual
        override
        returns (uint256 toGaugeRate, address[] memory recipients, uint256[] memory rates)
    {
        DistributionConfig memory config = _defaultDistributionConfig;
        return (config.toGaugeRate, config.recipients, config.rates);
    }

    /**
     * @notice Returns the custom distribution configuration for a specified fees vault.
     * @param feesVault_ The address of the fees vault.
     * @return toGaugeRate The rate at which fees are distributed to the gauge.
     * @return recipients The addresses of the recipients.
     * @return rates The rates at which fees are distributed to the recipients.
     */
    function customDistributionConfigs(
        address feesVault_
    ) external view virtual override returns (uint256 toGaugeRate, address[] memory recipients, uint256[] memory rates) {
        DistributionConfig memory config = _customDistributionConfigs[feesVault_];
        return (config.toGaugeRate, config.recipients, config.rates);
    }

    /**
     * @dev Internal function to check distribution configurations for validity.
     * @param config_ The distribution configuration to check.
     */
    function _checkDistributionConfig(DistributionConfig memory config_) internal pure virtual {
        uint256 totalSums = config_.toGaugeRate;
        if (config_.rates.length != config_.recipients.length) {
            revert ArraysLengthMismatch();
        }

        for (uint256 i; i < config_.recipients.length; ) {
            _checkAddressZero(config_.recipients[i]);

            if (config_.rates[i] == 0) {
                revert IncorrectRates();
            }
            totalSums += config_.rates[i];
            unchecked {
                i++;
            }
        }

        if (totalSums != 10000) {
            revert IncorrectRates();
        }
    }

    /**
     * @dev Overrides `BlastERC20FactoryManager#_checkAccessForBlastFactoryManager` to add custom access control logic.
     */
    function _checkAccessForModeSfsSetupFactoryManager() internal view virtual override onlyRole(FEES_VAULT_ADMINISTRATOR_ROLE) {}
}
