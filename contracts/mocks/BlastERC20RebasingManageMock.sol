// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;
import {BlastERC20RebasingManage} from "../integration/BlastERC20RebasingManage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract BlastERC20RebasingManageMock is BlastERC20RebasingManage, Ownable {
    constructor(address blastGovernor_) {
        __BlastERC20RebasingManage__init(blastGovernor_);
    }

    function _checkAccessForManageBlastERC20Rebasing() internal override onlyOwner {}
}
