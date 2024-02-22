// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IVoter} from "../core/interfaces/IVoter.sol";
import {IPairIntegrationInfo} from "./interfaces/IPairIntegrationInfo.sol";
import {IFeesVault} from "./interfaces/IFeesVault.sol";
import {IFeesVaultFactory} from "./interfaces/IFeesVaultFactory.sol";
import {BlastGovernorSetup} from "./BlastGovernorSetup.sol";

/**
 * @title Upgradeable Fees Vault
 * @dev This contract is responsible for managing swap fee distribution from liquidity pool.
 * It supports upgradeability via the OpenZeppelin UpgradeableBeacon pattern. The contract
 * allows for fee claiming by authorized gauges and supports dynamic adjustment of fee
 * distribution rates among gauges, protocol, and partners.
 */
contract FeesVaultUpgradeable is IFeesVault, BlastGovernorSetup, Initializable {
    using SafeERC20 for IERC20;

    /// @dev Defines a high precision for fee distribution calculations.
    uint256 public constant PRECISION = 10000;

    /// @notice The address of the factory contract that deployed this Fees Vault.
    address public factory;

    /// @notice The address of the liquidity pool associated with this Fees Vault.
    address public pool;

    /// @notice The percentage (with PRECISION scale) of fees allocated to the gauge.
    uint256 public toGaugeRate;

    /// @notice The percentage (with PRECISION scale) of fees allocated to the protocol.
    uint256 public toProtocolRate;

    /// @notice The percentage (with PRECISION scale) of fees allocated to the partner.
    uint256 public toPartnerRate;

    /// @notice The recipient address for fees allocated to the protocol.
    address public protocolRecipient;

    /// @notice The recipient address for fees allocated to the partner.
    address public partnerRecipient;

    /**
     * @dev Ensures that the function can only be called by an fees vault owner.
     * Reverts with `AccessDenied` if the caller is not recognized as a vault owner
     */
    modifier onlyOwner() {
        if (msg.sender != IFeesVaultFactory(factory).feesVaultOwner()) {
            revert AccessDenied();
        }
        _;
    }

    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract with necessary configuration parameters.
     * Can only be called once by the contract factory during the deployment process.
     * @param blastGovernor_ Address of the governor contract for authorization checks.
     * @param factory_ Address of the contract factory for this vault.
     * @param pool_ Address of the liquidity pool associated with this vault.
     */
    function initialize(address blastGovernor_, address factory_, address pool_) external virtual override initializer {
        __BlastGovernorSetup_init(blastGovernor_);

        if (factory_ == address(0) || pool_ == address(0)) {
            revert AddressZero();
        }

        factory = factory_;
        pool = pool_;

        toGaugeRate = PRECISION; // Default 100% to the gauge
    }

    /**
     * @notice Claims accumulated fees for the calling gauge and distributes them according to configured rates.
     * @dev Can only be called by an authorized gauge. Distributes fees in both tokens of the associated pool.
     * @return gauge0 Amount of token0 distributed to the calling gauge.
     * @return gauge1 Amount of token1 distributed to the calling gauge.
     */
    function claimFees() external virtual override returns (uint256 gauge0, uint256 gauge1) {
        address voterCache = IFeesVaultFactory(factory).voter();
        if (!IVoter(voterCache).isGauge(msg.sender)) {
            revert AccessDenied();
        }

        address poolCache = pool;
        if (poolCache != IVoter(voterCache).poolForGauge(msg.sender)) {
            revert PoolMismatch();
        }

        address token0 = IPairIntegrationInfo(poolCache).token0();
        address token1 = IPairIntegrationInfo(poolCache).token1();

        uint256 totalAmount0;
        uint256 totalAmount1;
        (gauge0, totalAmount0) = _distributeFees(token0);
        (gauge1, totalAmount1) = _distributeFees(token1);

        emit Fees(poolCache, token0, token1, totalAmount0, totalAmount1);
    }

    /**
     * @notice Allows the contract owner to recover ERC20 tokens accidentally sent to this contract.
     * @param token_ The ERC20 token address to recover.
     * @param amount_ The amount of tokens to recover.
     */
    function emergencyRecoverERC20(address token_, uint256 amount_) external virtual override onlyOwner {
        IERC20(token_).safeTransfer(IFeesVaultFactory(factory).feesVaultOwner(), amount_);
    }

    /**
     * @notice Sets the distribution rates for fees between the gauge, protocol, and partner.
     * @param toGaugeRate_ The percentage of fees allocated to the gauge.
     * @param toProtocolRate_ The percentage of fees allocated to the protocol.
     * @param toPartnerRate_ The percentage of fees allocated to the partner.
     */
    function setDistributionConfig(
        uint256 toGaugeRate_,
        uint256 toProtocolRate_,
        uint256 toPartnerRate_
    ) external virtual override onlyOwner {
        uint256 sumRates = toGaugeRate_ + toProtocolRate_ + toPartnerRate_;
        if (sumRates != PRECISION) {
            revert IncorectDistributionConfig();
        }

        if (toProtocolRate_ > 0 && protocolRecipient == address(0)) {
            revert RecipientNotSetuped();
        }

        if (toPartnerRate_ > 0 && partnerRecipient == address(0)) {
            revert RecipientNotSetuped();
        }

        toGaugeRate = toGaugeRate_;
        toProtocolRate = toProtocolRate_;
        toPartnerRate = toPartnerRate_;

        emit SetDistributionConfig(toGaugeRate_, toProtocolRate_, toPartnerRate_);
    }

    /**
     * @notice Sets the recipient address for protocol fees.
     * @dev Can only be called by the contract owner. Updates the address that receives the protocol's share of fees.
     * @param newProtocolRecipient_ The address to which protocol fees should be directed.
     */
    function setProtocolRecipient(address newProtocolRecipient_) external virtual override onlyOwner {
        if (toProtocolRate > 0 && newProtocolRecipient_ == address(0)) {
            revert AddressZero();
        }
        emit SetProtocolRecipient(protocolRecipient, newProtocolRecipient_);
        protocolRecipient = newProtocolRecipient_;
    }

    /**
     * @notice Sets the recipient address for partner fees.
     * @dev Can only be called by the contract owner. Updates the address that receives the partner's share of fees.
     * @param newPartnerRecipient_ The address to which partner fees should be directed.
     */
    function setPartnerRecipient(address newPartnerRecipient_) external virtual override onlyOwner {
        if (toPartnerRate > 0 && newPartnerRecipient_ == address(0)) {
            revert AddressZero();
        }
        emit SetPartnerRecipient(partnerRecipient, newPartnerRecipient_);
        partnerRecipient = newPartnerRecipient_;
    }

    /**
     * @notice Calculates the fee distribution for a given amount.
     * @dev Breaks down the amount into parts according to the configured distribution rates.
     * @param amount_ The total amount from which the fees will be calculated.
     * @return toGaugeAmount The portion of the amount allocated to the gauge.
     * @return toProtocolAmount The portion of the amount allocated to the protocol.
     * @return toPartnerAmount The portion of the amount allocated to the partner.
     */
    function calculateFee(
        uint256 amount_
    ) external view virtual override returns (uint256 toGaugeAmount, uint256 toProtocolAmount, uint256 toPartnerAmount) {
        return _calculateFee(amount_);
    }

    /**
     * @dev Distributes the accumulated fees in a specified token according to the configured rates.
     * This function calculates the distribution amounts, transfers the respective shares to the gauge, protocol, and partner,
     * and emits a `Fees` event with the distribution details.
     * @param tokenAddress_ The address of the token in which fees are to be distributed.
     * @return toGaugeAmount The amount of fees distributed to the gauge.
     * @return totalAmount The total amount of fees available for distribution.
     */
    function _distributeFees(address tokenAddress_) internal virtual returns (uint256 toGaugeAmount, uint256 totalAmount) {
        IERC20 token = IERC20(tokenAddress_);
        totalAmount = token.balanceOf(address(this));

        uint256 toProtocolAmount;
        uint256 toPartnerAmount;
        (toGaugeAmount, toProtocolAmount, toPartnerAmount) = _calculateFee(totalAmount);

        if (toGaugeAmount > 0) {
            token.safeTransfer(msg.sender, toGaugeAmount);
        }
        if (toProtocolAmount > 0) {
            token.safeTransfer(protocolRecipient, toProtocolAmount);
        }
        if (toPartnerAmount > 0) {
            token.safeTransfer(partnerRecipient, toPartnerAmount);
        }
        emit Fees(tokenAddress_, toGaugeAmount, toProtocolAmount, toPartnerAmount);
    }

    /**
     * @dev Calculates the distribution of fees into gauge, protocol, and partner shares based on the configured rates.
     * This function ensures the sum of distributed amounts does not exceed the total due to rounding errors.
     * @param amount_ The total amount of fees to be distributed.
     * @return toGaugeAmount The calculated amount to be distributed to the gauge.
     * @return toProtocolAmount The calculated amount to be distributed to the protocol.
     * @return toPartnerAmount The calculated amount to be distributed to the partner, adjusted for rounding errors if necessary.
     */
    function _calculateFee(
        uint256 amount_
    ) internal view virtual returns (uint256 toGaugeAmount, uint256 toProtocolAmount, uint256 toPartnerAmount) {
        toGaugeAmount = (amount_ * toGaugeRate) / PRECISION;
        toProtocolAmount = (amount_ * toProtocolRate) / PRECISION;
        // to avoid case when toGaugeAmount + toProtocolAmount ~100% but 1 wei rest
        if (toPartnerRate > 0) {
            toPartnerAmount = amount_ - toGaugeAmount - toProtocolAmount;
        }
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}
