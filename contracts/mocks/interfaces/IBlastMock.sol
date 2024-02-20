// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

enum GasMode {
    VOID,
    CLAIMABLE
}

enum YieldMode {
    AUTOMATIC,
    VOID,
    CLAIMABLE
}

/**
 * @title IBlast Interface
 * @dev Interface for interacting with the Blast protocol, specifically for configuring
 * governance settings. This interface abstracts the function to set up a governor
 * within the Blast ecosystem.
 */
interface IBlastMock {
    function governorMap(address) external view returns (address);

    // configure
    function configureContract(address contractAddress, YieldMode _yield, GasMode gasMode, address governor) external;

    function configure(YieldMode _yield, GasMode gasMode, address governor) external;

    // base configuration options
    function configureClaimableYield() external;

    function configureClaimableYieldOnBehalf(address contractAddress) external;

    function configureAutomaticYield() external;

    function configureAutomaticYieldOnBehalf(address contractAddress) external;

    function configureVoidYield() external;

    function configureVoidYieldOnBehalf(address contractAddress) external;

    function configureClaimableGas() external;

    function configureClaimableGasOnBehalf(address contractAddress) external;

    function configureVoidGas() external;

    function configureVoidGasOnBehalf(address contractAddress) external;

    function configureGovernor(address _governor) external;

    function configureGovernorOnBehalf(address _newGovernor, address contractAddress) external;

    // claim yield
    function claimYield(address contractAddress, address recipientOfYield, uint256 amount) external returns (uint256);

    function claimAllYield(address contractAddress, address recipientOfYield) external returns (uint256);

    // claim gas
    function claimAllGas(address contractAddress, address recipientOfGas) external returns (uint256);

    function claimGasAtMinClaimRate(address contractAddress, address recipientOfGas, uint256 minClaimRateBips) external returns (uint256);

    function claimMaxGas(address contractAddress, address recipientOfGas) external returns (uint256);

    function claimGas(
        address contractAddress,
        address recipientOfGas,
        uint256 gasToClaim,
        uint256 gasSecondsToConsume
    ) external returns (uint256);

    // read functions
    function readClaimableYield(address contractAddress) external view returns (uint256);

    function readYieldConfiguration(address contractAddress) external view returns (uint8);

    function readGasParams(
        address contractAddress
    ) external view returns (uint256 etherSeconds, uint256 etherBalance, uint256 lastUpdated, GasMode);

    function isAuthorized(address contractAddress) external view returns (bool);
}
