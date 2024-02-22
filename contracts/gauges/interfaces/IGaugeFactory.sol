// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IGaugeFactory {
    event GaugeImplementationChanged(address _oldGaugeImplementation, address _newGaugeImplementation);
    /**
     * @dev Emitted when the default Blast governor address for new bribes is updated.
     *
     * @param oldDefaultBlastGovernor The address of the previous default Blast governor.
     * @param newDefaultBlastGovernor The address of the new default Blast governor that has been set.
     */
    event SetDefaultBlastGovernor(address indexed oldDefaultBlastGovernor, address indexed newDefaultBlastGovernor);

    function createGauge(
        address _rewardToken,
        address _ve,
        address _token,
        address _distribution,
        address _internal_bribe,
        address _external_bribe,
        bool _isDistributeEmissionToMerkle,
        address _feeVault
    ) external returns (address);

    function gaugeImplementation() external view returns (address impl);

    function merklGaugeMiddleman() external view returns (address);

    function gaugeOwner() external view returns (address);
}
