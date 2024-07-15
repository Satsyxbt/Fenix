// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;
import {IBlastFull, YieldMode, GasMode} from "../integration/interfaces/IBlastFull.sol";

contract BlastMock {
    bool public _mock_isGovernor;
    GasMode public _mock_gasMode;

    function mockIsGovernor(bool t_) external {
        _mock_isGovernor = t_;
    }

    function mockGasMode(GasMode mode) external {
        _mock_gasMode = mode;
    }

    fallback() external {}

    function isGovernor(address contractAddress) external view returns (bool) {
        return _mock_isGovernor;
    }

    function configure(YieldMode _yield, GasMode gasMode, address governor) external {}

    function configureClaimableGasOnBehalf(address contractAddress) external {}

    function readGasParams(address contractAddress_) external view returns (uint256, uint256, uint256, GasMode) {
        return (0, 0, 0, _mock_gasMode);
    }
}
