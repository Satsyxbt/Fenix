// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;
import "../integration/interfaces/IDistributionCreator.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MDCBlastMock is Ownable {
    event CreateDistribution(DistributionParameters distribution);

    mapping(address => uint256) public rewardTokenMinAmounts;

    function setRewardTokenMinAmounts(address[] calldata tokens, uint256[] calldata amounts) external onlyOwner {
        uint256 tokensLength = tokens.length;
        for (uint256 i; i < tokensLength; ++i) {
            uint256 amount = amounts[i];
            rewardTokenMinAmounts[tokens[i]] = amount;
        }
    }

    function createDistribution(DistributionParameters memory newDistribution) external returns (uint256) {
        require(newDistribution.amount >= rewardTokenMinAmounts[newDistribution.rewardToken]);

        IERC20(newDistribution.rewardToken).transferFrom(msg.sender, address(this), newDistribution.amount);

        emit CreateDistribution(newDistribution);
        return newDistribution.amount;
    }
}
