// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;
import {BaseManagedNFTStrategyUpgradeable} from "../nest/BaseManagedNFTStrategyUpgradeable.sol";

contract BaseManagedNFTStrategyUpgradeableMock is BaseManagedNFTStrategyUpgradeable {
    function initialize(address blastGovernor_, address managedNFTManager_, string memory name_) external initializer {
        __BaseManagedNFTStrategy__init(blastGovernor_, managedNFTManager_, name_);
    }

    function onAttach(uint256 tokenId, uint256 userBalance) external override {
        revert("not implemented");
    }

    function onDettach(uint256 tokenId, uint256 userBalance) external override returns (uint256 lockedRewards) {
        revert("not implemented");
    }
}
