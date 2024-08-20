// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import {IFeesVaultFactory} from "./interfaces/IFeesVaultFactory.sol";
import {IFeesVault} from "./interfaces/IFeesVault.sol";
import {IPairIntegrationInfo} from "../integration/interfaces/IPairIntegrationInfo.sol";
import {IBlastERC20RebasingManage} from "../integration/interfaces/IBlastERC20RebasingManage.sol";

import {BlastERC20FactoryManager} from "../integration/BlastERC20FactoryManager.sol";
import {FeesVaultProxy} from "./FeesVaultProxy.sol";
import {IBlastRebasingTokensGovernor} from "../integration/interfaces/IBlastRebasingTokensGovernor.sol";

contract FeesVaultFactoryUpgradeable is IFeesVaultFactory, BlastERC20FactoryManager, AccessControlUpgradeable {
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
     * @dev Address of the rebasing tokens governor.
     */
    address public rebasingTokensGovernor;

    mapping(address creator => DistributionConfig) internal _creatorDistributionConfigs;
    mapping(address feesVault => address creator) internal _feesVaultCreator;

    /**
     * @dev Constructor that disables initialization on implementation.
     */
    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _disableInitializers();
    }

    /**
     * @notice Initializes the factory with necessary parameters and default configurations.
     * @param blastGovernor_ The governor address for BLAST protocol interaction.
     * @param blastPoints_ The BLAST points address.
     * @param blastPointsOperator_ The BLAST points operator address.
     * @param voter_ The default voter address for fee vaults.
     * @param feesVaultImplementation_ The default fees vault implementation address.
     * @param defaultDistributionConfig_ The default distribution configuration for fees.
     */
    function initialize(
        address blastGovernor_,
        address blastPoints_,
        address blastPointsOperator_,
        address voter_,
        address feesVaultImplementation_,
        DistributionConfig memory defaultDistributionConfig_
    ) external initializer {
        _checkAddressZero(voter_);
        _checkAddressZero(feesVaultImplementation_);
        _checkDistributionConfig(defaultDistributionConfig_);

        __AccessControl_init();
        __BlastERC20FactoryManager_init(blastGovernor_, blastPoints_, blastPointsOperator_);

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
     * @notice Sets the address of the rebasing tokens governor.
     * @dev Updates the address of the rebasing tokens governor. Can only be called by an account with the DEFAULT_ADMIN_ROLE.
     * @param rebasingTokensGovernor_ The new address of the rebasing tokens governor.
     *
     * Emits a {SetRebasingTokensGovernor} event.
     */
    function setRebasingTokensGovernor(address rebasingTokensGovernor_) external virtual onlyRole(DEFAULT_ADMIN_ROLE) {
        _checkAddressZero(rebasingTokensGovernor_);

        emit SetRebasingTokensGovernor(rebasingTokensGovernor, rebasingTokensGovernor_);
        rebasingTokensGovernor = rebasingTokensGovernor_;
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
     * @notice Changes the creator for multiple fees vaults.
     * @param creator_ The new creator address.
     * @param feesVaults_ The array of fees vault addresses.
     */
    function changeCreatorForFeesVaults(
        address creator_,
        address[] calldata feesVaults_
    ) external virtual override onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i; i < feesVaults_.length; ) {
            _feesVaultCreator[feesVaults_[i]] = creator_;
            unchecked {
                i++;
            }
        }
        emit ChangeCreatorForFeesVaults(creator_, feesVaults_);
    }

    /**
     * @notice Sets a distribution configuration for a specific creator.
     * @param creator_ The address of the creator of fees vaults.
     * @param config_ The distribution configuration to apply.
     */
    function setDistributionConfigForCreator(
        address creator_,
        DistributionConfig memory config_
    ) external virtual override onlyRole(FEES_VAULT_ADMINISTRATOR_ROLE) {
        if (config_.toGaugeRate == 0 && config_.recipients.length == 0 && config_.rates.length == 0) {
            delete _creatorDistributionConfigs[creator_];
        } else {
            _checkDistributionConfig(config_);
            _creatorDistributionConfigs[creator_] = config_;
        }

        emit CreatorDistributionConfig(creator_, config_);
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

        IFeesVault(newFeesVault).initialize(defaultBlastGovernor, defaultBlastPoints, defaultBlastPointsOperator, address(this), pool_);

        getVaultForPool[pool_] = newFeesVault;
        _feesVaultCreator[newFeesVault] = _msgSender();

        emit FeesVaultCreated(pool_, newFeesVault);
        return newFeesVault;
    }

    /**
     * @notice Performs post-initialization configurations for a pool's fee vault, setting up rebasing token configurations.
     * @param pool_ The pool whose fee vault requires post-initialization configuration.
     */
    function afterPoolInitialize(address pool_) external virtual override onlyRole(WHITELISTED_CREATOR_ROLE) {
        address token0 = IPairIntegrationInfo(pool_).token0();
        address token1 = IPairIntegrationInfo(pool_).token1();

        address vault = getVaultForPool[pool_];

        if (isRebaseToken[token0]) {
            IBlastERC20RebasingManage(vault).configure(token0, configurationForBlastRebaseTokens[token0]);
            IBlastRebasingTokensGovernor rebasingTokensGovernorCache = IBlastRebasingTokensGovernor(rebasingTokensGovernor);
            if (address(rebasingTokensGovernorCache) != address(0)) {
                rebasingTokensGovernorCache.addTokenHolder(token0, vault);
            }
        }

        if (isRebaseToken[token1]) {
            IBlastERC20RebasingManage(vault).configure(token1, configurationForBlastRebaseTokens[token1]);
            IBlastRebasingTokensGovernor rebasingTokensGovernorCache = IBlastRebasingTokensGovernor(rebasingTokensGovernor);
            if (address(rebasingTokensGovernorCache) != address(0)) {
                rebasingTokensGovernorCache.addTokenHolder(token1, vault);
            }
        }
    }

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
        DistributionConfig memory config;
        if (isCustomConfig[feesVault_]) {
            config = _customDistributionConfigs[feesVault_];
        } else {
            address creator = _feesVaultCreator[feesVault_];
            DistributionConfig memory creatorConfig = _creatorDistributionConfigs[creator];
            if (creator != address(0) && (creatorConfig.toGaugeRate > 0 || creatorConfig.recipients.length > 0)) {
                config = creatorConfig;
            } else {
                config = _defaultDistributionConfig;
            }
        }
        return (config.toGaugeRate, config.recipients, config.rates);
    }

    /**
     * @notice Retrieves the creator address for a specific fees vault.
     * @param feesVault_ The address of the fees vault.
     * @return The address of the creator associated with the specified fees vault.
     */
    function getFeesVaultCreator(address feesVault_) external view returns (address) {
        return _feesVaultCreator[feesVault_];
    }

    /**
     * @notice Retrieves the distribution configuration for a specific creator.
     * @param creator_ The address of the creator.
     * @return toGaugeRate The rate at which fees are distributed to the gauge.
     * @return recipients The addresses of the recipients.
     * @return rates The rates at which fees are distributed to the recipients.
     */
    function creatorDistributionConfig(
        address creator_
    ) external view virtual override returns (uint256 toGaugeRate, address[] memory recipients, uint256[] memory rates) {
        DistributionConfig memory config = _creatorDistributionConfigs[creator_];
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
    function customDistributionConfig(
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
    function _checkAccessForBlastFactoryManager() internal view virtual override {
        _checkRole(FEES_VAULT_ADMINISTRATOR_ROLE);
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[41] private __gap;
}
