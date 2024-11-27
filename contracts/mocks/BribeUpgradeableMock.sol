// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import "../bribes/BribeUpgradeable.sol";

contract BribeUpgradeableMockWithFixTargetEpoch is BribeUpgradeable {
    uint256 immutable __mock_targetEpoch;

    constructor(address blastGovernor_, uint256 mock_targetEpoch) BribeUpgradeable(blastGovernor_) {
        __mock_targetEpoch = mock_targetEpoch;
    }

    function fixVotingPowerForPreviusEpoch(
        uint256 tokenId_,
        uint256 newBalance_
    ) external onlyAllowed whenRewardClaimPaused reinitializer(2) {
        uint256 targetEpoch = (block.timestamp / WEEK) * WEEK - WEEK;
        require(targetEpoch == __mock_targetEpoch, "invalid epoch to fix");
        address tokenOwner = IVotingEscrow(ve).ownerOf(tokenId_);
        uint256 balance = _balances[tokenOwner][targetEpoch];
        _totalSupply[targetEpoch] -= balance;
        _totalSupply[targetEpoch] += newBalance_;
        _balances[tokenOwner][targetEpoch] = newBalance_;
        if (balance > 0) {
            emit Withdrawn(tokenId_, balance);
        }
        emit Staked(tokenId_, newBalance_);
    }
}
