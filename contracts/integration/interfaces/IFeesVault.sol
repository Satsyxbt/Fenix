// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/**
 * @title Fees Vault Interface
 * @dev Interface for the FeesVault contract responsible for managing fee distribution.
 * Defines the essential functions and events for fee claiming and configuration.
 */
interface IFeesVault {
    /**
     * @dev Emitted when fees are claimed from the gauge and distributed.
     * @param pool Address of the liquidity pool.
     * @param token0 Address of the first token in the pool.
     * @param token1 Address of the second token in the pool.
     * @param totalAmount0 Total amount of token0 distributed.
     * @param totalAmount1 Total amount of token1 distributed.
     */
    event Fees(address indexed pool, address indexed token0, address indexed token1, uint256 totalAmount0, uint256 totalAmount1);

    /**
     * @notice Emitted when fees for a specific token are claimed and distributed.
     * @dev Provides detailed information about the distribution of fees for a single token.
     * @param token Address of the token for which fees are distributed.
     * @param toGaugeAmount Amount of fees distributed to the gauge.
     * @param toProtocolAmount Amount of fees distributed to the protocol.
     * @param toPartnerAmount Amount of fees distributed to the partner.
     */
    event Fees(address indexed token, uint256 toGaugeAmount, uint256 toProtocolAmount, uint256 toPartnerAmount);

    /**
     * @dev Emitted when the protocol recipient address is updated.
     * @param oldProtocolRecipient Previous protocol recipient address.
     * @param newProtocolRecipient New protocol recipient address.
     */
    event SetProtocolRecipient(address indexed oldProtocolRecipient, address indexed newProtocolRecipient);

    /**
     * @dev Emitted when the partner recipient address is updated.
     * @param oldPartnerRecipient Previous partner recipient address.
     * @param newPartnerRecipient New partner recipient address.
     */

    event SetPartnerRecipient(address indexed oldPartnerRecipient, address indexed newPartnerRecipient);

    /**
     * @dev Emitted when distribution configuration is updated.
     * @param toGaugeRate New rate for gauge distribution.
     * @param toProtocolRate New rate for protocol distribution.
     * @param toPartnerRate New rate for partner distribution.
     */
    event SetDistributionConfig(uint256 toGaugeRate, uint256 toProtocolRate, uint256 toPartnerRate);

    /**
     * @dev Reverts if the caller is not authorized to perform the operation.
     */
    error AccessDenied();

    /**
     * @dev Reverts if the sum of distribution rates does not equal the predefined precision.
     */
    error IncorectDistributionConfig();

    /**
     * @dev Reverts if a recipient address for either the protocol or partner fees has not been set.
     */
    error RecipientNotSetuped();

    /**
     * @dev Reverts if the pool address provided does not match the pool address stored for a gauge.
     */
    error PoolMismatch();

    /**
     * @notice Claims accumulated fees for the calling gauge and distributes them according to configured rates.
     * @dev Can only be called by an authorized gauge. Distributes fees in both tokens of the associated pool.
     * @return gauge0 Amount of token0 distributed to the calling gauge.
     * @return gauge1 Amount of token1 distributed to the calling gauge.
     */
    function claimFees() external returns (uint256 gauge0, uint256 gauge1);

    /**
     * @notice Sets the distribution rates for fees between the gauge, protocol, and partner.
     * @param toGaugeRate_ The percentage of fees allocated to the gauge.
     * @param toProtocolRate_ The percentage of fees allocated to the protocol.
     * @param toPartnerRate_ The percentage of fees allocated to the partner.
     */
    function setDistributionConfig(uint256 toGaugeRate_, uint256 toProtocolRate_, uint256 toPartnerRate_) external;

    /**
     * @notice Updates the recipient address for protocol fees.
     * @dev Can only be called by the contract owner. The change is logged via the `SetProtocolRecipient` event.
     * @param newProtocolRecipient_ The new recipient address for protocol fees.
     */
    function setProtocolRecipient(address newProtocolRecipient_) external;

    /**
     * @notice Updates the recipient address for partner fees.
     * @dev Can only be called by the contract owner. The change is logged via the `SetPartnerRecipient` event.
     * @param newPartnerRecipient_ The new recipient address for partner fees.
     */
    function setPartnerRecipient(address newPartnerRecipient_) external;

    /**
     * @notice Allows the contract owner to recover ERC20 tokens accidentally sent to this contract.
     * @param token_ The ERC20 token address to recover.
     * @param amount_ The amount of tokens to recover.
     */
    function emergencyRecoverERC20(address token_, uint256 amount_) external;

    /**
     * @dev Initializes the contract with necessary configuration parameters.
     * Can only be called once by the contract factory during the deployment process.
     * @param blastGovernor_ Address of the governor contract for authorization checks.
     * @param factory_ Address of the contract factory for this vault.
     * @param pool_ Address of the liquidity pool associated with this vault.
     * @param voter_ Address of the voter contract to validate gauge authorization.
     */
    function initialize(address blastGovernor_, address factory_, address pool_, address voter_) external;

    /**
     * @notice Calculates the fee distribution for a given amount.
     * @dev Breaks down the amount into parts according to the configured distribution rates.
     * @param amount_ The total amount from which the fees will be calculated.
     * @return toGaugeAmount The portion of the amount allocated to the gauge.
     * @return toProtocolAmount The portion of the amount allocated to the protocol.
     * @return toPartnerAmount The portion of the amount allocated to the partner.
     */
    function calculateFee(uint256 amount_) external view returns (uint256 toGaugeAmount, uint256 toProtocolAmount, uint256 toPartnerAmount);
}
