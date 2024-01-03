// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {IVoter} from "./IVoter.sol";
import {IVotingEscrow} from "./IVotingEscrow.sol";
import {IRewardsDistributor} from "./IRewardsDistributor.sol";

interface IEmissionManagerUpgradeable {
    event Mint(address indexed sender, uint256 weekly, uint256 circulatingSupply, uint256 circulatingEmission);

    error RateTooHigh(string rateType, uint256 value);
    error ZeroAddress();

    function updatePeriod() external returns (uint256);

    function setVoter(address voter_) external;
    function setTeamRate(uint256 teamRate_) external;
    function setEmission(uint256 emissionRate_) external;
    function setRebase(uint256 rebaseRate_) external;

    function initialize(IVoter voter_, IVotingEscrow votingEscrow_, IRewardsDistributor rewardsDistributor_) external;
    function initialize(address[] calldata claimants_, uint256[] calldata amounts_, uint256 max) external;

    function circulatingEmission() external view returns (uint256);
    function calculateReabase(uint256 weeklyMint_) external view returns (uint256);
    function circulatingSupply() external view returns (uint256);
    function calculateEmission() external view returns (uint256);
    function weeklyEmmision() external view returns (uint256);
    function check() external view returns (bool);
    function period() external view returns (uint256);
}
