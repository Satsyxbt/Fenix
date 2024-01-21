// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {IBribeFactoryUpgradeable} from "../interfaces/factories/IBribeFactoryUpgradeable.sol";

contract VoteMock {
    address public v;
    address public m;

    constructor(address ve_, address miner_) {
        v = ve_;
        m = miner_;
    }

    function createBribe(
        IBribeFactoryUpgradeable factory_,
        address owner_,
        address token1_,
        address token2_,
        string memory type_
    ) external {
        factory_.createBribe(owner_, token1_, token2_, type_);
    }

    function votingEscrow() external view returns (address) {
        return v;
    }

    function emissionManager() external view returns (address) {
        return m;
    }
}
