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
     * @notice Emitted when fees are distributed to the gauge.
     * @param token Address of the token distributed.
     * @param recipient Address of the gauge receiving the fees.
     * @param amount Amount of fees distributed.
     */
    event FeesToGauge(address indexed token, address indexed recipient, uint256 amount);

    /**
     * @notice Emitted when fees are distributed to a recipient other than the gauge.
     * @param token Address of the token distributed.
     * @param recipient Address of the entity receiving the fees.
     * @param amount Amount of fees distributed.
     */
    event FeesToOtherRecipient(address indexed token, address indexed recipient, uint256 amount);

    /**
     * @dev Reverts if the caller is not authorized to perform the operation.
     */
    error AccessDenied();

    /**
     * @dev Reverts if the pool address provided does not match the pool address stored for a gauge.
     */
    error PoolMismatch();

    /**
     * @notice Gets the factory address associated with this fees vault.
     * @return The address of the factory contract.
     */
    function factory() external view returns (address);

    /**
     * @notice Gets the pool address associated with this fees vault.
     * @return The address of the liquidity pool.
     */
    function pool() external view returns (address);

    /**
     * @notice Claims accumulated fees for the calling gauge and distributes them according to configured rates.
     * @dev Can only be called by an authorized gauge. Distributes fees in both tokens of the associated pool.
     * @return gauge0 Amount of token0 distributed to the calling gauge.
     * @return gauge1 Amount of token1 distributed to the calling gauge.
     */
    function claimFees() external returns (uint256 gauge0, uint256 gauge1);

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
     */
    function initialize(address blastGovernor_, address blastPoints, address blastPointsOperator, address factory_, address pool_) external;
}
