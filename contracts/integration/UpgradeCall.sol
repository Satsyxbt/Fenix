// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.19;

import {IUpgradeCall} from "./interfaces/IUgradeCall.sol";

abstract contract UpgradeCall is IUpgradeCall {
    function upgradeCall() external virtual override {}
}
