// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {IUpgradeCall} from "../integration/interfaces/IUgradeCall.sol";
import {BlastGovernorClaimableSetup} from "../integration/BlastGovernorClaimableSetup.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract UtilsUpgradeable is BlastGovernorClaimableSetup, Initializable {
    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
    }

    /**
     * @dev Initializes the contract by setting up roles and inherited contracts.
     * @param blastGovernor_ The address of the Blast Governor contract.
     */
    function initialize(address blastGovernor_) external virtual initializer {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
    }

    function multiUpgradeCall(address[] calldata targets_) external virtual {
        for (uint256 i; i < targets_.length; ) {
            IUpgradeCall(targets_[i]).upgradeCall();
            unchecked {
                i++;
            }
        }
    }
}
