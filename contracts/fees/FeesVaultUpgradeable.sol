// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IPairIntegrationInfo} from "../integration/interfaces/IPairIntegrationInfo.sol";
import {BlastERC20RebasingManage} from "../integration/BlastERC20RebasingManage.sol";

import {IVoter} from "../core/interfaces/IVoter.sol";
import {IFeesVault} from "./interfaces/IFeesVault.sol";
import {IFeesVaultFactory} from "./interfaces/IFeesVaultFactory.sol";
import {UpgradeCall} from "../integration/UpgradeCall.sol";

/**
 * @title Fees Vault Factory
 * @dev Factory contract for creating and managing fees vault instances.
 * Implements access control and integration with BLAST protocol's rebasing mechanism.
 */
contract FeesVaultUpgradeable is IFeesVault, BlastERC20RebasingManage, Initializable, UpgradeCall {
    using SafeERC20 for IERC20;
    uint256 internal constant _PRECISION = 10000; // 100%

    address public override factory;
    address public override pool;

    /**
     * @dev Constructor that disables initialization on implementation.
     */
    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract with necessary configuration.
     * @param blastGovernor_ Address of the BLAST governor.
     * @param blastPoints_ Address for BLAST points management.
     * @param blastPointsOperator_ Operator address for BLAST points.
     * @param factory_ Factory address for this vault.
     * @param pool_ Address of the liquidity pool.
     */
    function initialize(
        address blastGovernor_,
        address blastPoints_,
        address blastPointsOperator_,
        address factory_,
        address pool_
    ) external virtual override initializer {
        if (factory_ == address(0) || pool_ == address(0)) {
            revert AddressZero();
        }

        __BlastERC20RebasingManage__init(blastGovernor_, blastPoints_, blastPointsOperator_);

        factory = factory_;
        pool = pool_;
    }

    /**
     * @notice Claims fees for redistribution.
     * @return gauge0 Amount of fees distributed to the gauge for token0.
     * @return gauge1 Amount of fees distributed to the gauge for token1.
     */
    function claimFees() external virtual override returns (uint256, uint256) {
        IFeesVaultFactory factoryCache = IFeesVaultFactory(factory);
        (uint256 toGaugeRate, address[] memory recipients, uint256[] memory rates_) = factoryCache.getDistributionConfig(address(this));

        address poolCache = pool;
        if (toGaugeRate > 0) {
            address voterCache = IFeesVaultFactory(factory).voter();
            if (!IVoter(voterCache).isGauge(msg.sender)) {
                revert AccessDenied();
            }
            if (poolCache != IVoter(voterCache).poolForGauge(msg.sender)) {
                revert PoolMismatch();
            }
        } else {
            if (!factoryCache.hasRole(factoryCache.CLAIM_FEES_CALLER_ROLE(), msg.sender)) {
                revert AccessDenied();
            }
        }

        (address token0, address token1) = (IPairIntegrationInfo(poolCache).token0(), IPairIntegrationInfo(poolCache).token1());

        (uint256 gauge0, uint256 totalAmount0) = _distributeFees(token0, toGaugeRate, recipients, rates_);
        (uint256 gauge1, uint256 totalAmount1) = _distributeFees(token1, toGaugeRate, recipients, rates_);

        emit Fees(poolCache, token0, token1, totalAmount0, totalAmount1);
        return (gauge0, gauge1);
    }

    /**
     * @notice Allows for the emergency recovery of ERC20 tokens from
     *  caller with FEES_VAULT_ADMINISTRATOR_ROLE .
     * @param token_ The token to recover.
     * @param amount_ The amount to recover.
     */
    function emergencyRecoverERC20(address token_, uint256 amount_) external virtual override {
        IFeesVaultFactory factoryCache = IFeesVaultFactory(factory);
        if (!factoryCache.hasRole(factoryCache.FEES_VAULT_ADMINISTRATOR_ROLE(), msg.sender)) {
            revert AccessDenied();
        }
        IERC20(token_).safeTransfer(msg.sender, amount_);
    }

    /**
     * @dev Internal function to distribute fees to various recipients.
     * @param tokenAddress_ The address of the token to distribute.
     * @param toGaugeRate_ The rate at which fees are distributed to the gauge.
     * @param recipients_ The recipients of the fees.
     * @param rates_ The rates at which fees are distributed to the recipients.
     * @return toGaugeAmount The amount distributed to the gauge.
     * @return totalAmount The total amount distributed.
     */
    function _distributeFees(
        address tokenAddress_,
        uint256 toGaugeRate_,
        address[] memory recipients_,
        uint256[] memory rates_
    ) internal virtual returns (uint256 toGaugeAmount, uint256 totalAmount) {
        IERC20 token = IERC20(tokenAddress_);
        totalAmount = token.balanceOf(address(this));

        toGaugeAmount = (toGaugeRate_ * totalAmount) / _PRECISION;
        if (toGaugeAmount > 0) {
            token.safeTransfer(msg.sender, toGaugeAmount);
            emit FeesToGauge(tokenAddress_, msg.sender, toGaugeAmount);
        }

        for (uint256 i; i < recipients_.length; ) {
            uint256 toRecipient = ((rates_[i]) * totalAmount) / _PRECISION;
            if (toRecipient > 0) {
                token.safeTransfer(recipients_[i], toRecipient);
                emit FeesToOtherRecipient(tokenAddress_, recipients_[i], toRecipient);
            }
            unchecked {
                i++;
            }
        }
    }

    function _checkAccessForManageBlastERC20Rebasing() internal virtual override {
        IFeesVaultFactory factoryCache = IFeesVaultFactory(factory);
        if (msg.sender != address(factoryCache) && !factoryCache.hasRole(factoryCache.FEES_VAULT_ADMINISTRATOR_ROLE(), msg.sender)) {
            revert AccessDenied();
        }
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}
