// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;
import {BlastERC20FactoryManager} from "../integration/BlastERC20FactoryManager.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract BlastERC20FactoryManagerMock is BlastERC20FactoryManager, Ownable {
    constructor(address _blastGovernor, address _blastPoints, address _blastPointsOperator) {
        __BlastERC20FactoryManager_init(_blastGovernor, _blastPoints, _blastPointsOperator);
    }

    function _checkAccessForBlastFactoryManager() internal virtual override onlyOwner {}
}
