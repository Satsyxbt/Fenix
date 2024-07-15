// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {BlastGovernorUpgradeable, IBlastFull} from "../integration/BlastGovernorUpgradeable.sol";

contract BlastGovernorMock is BlastGovernorUpgradeable {
    address public __mock__blast;

    /**
     * @dev Initializes the contract by disabling the initializer of the inherited upgradeable contract.
     */
    constructor(address blastGoveror_) BlastGovernorUpgradeable(blastGoveror_) {}

    function __mock_setBlast(address blast_) external {
        __mock__blast = blast_;
    }

    function _BLAST() internal view virtual override returns (IBlastFull) {
        return IBlastFull(__mock__blast);
    }
}
