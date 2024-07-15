// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity =0.8.19;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";

import {IMinter} from "./interfaces/IMinter.sol";
import {IFenix} from "./interfaces/IFenix.sol";
import {IVoter} from "./interfaces/IVoter.sol";
import {IVotingEscrow} from "./interfaces/IVotingEscrow.sol";
import {BlastGovernorClaimableSetup} from "../integration/BlastGovernorClaimableSetup.sol";

// codifies the minting rules as per ve(3,3), abstracted from the token to support any token that allows minting

contract MinterUpgradeable is IMinter, BlastGovernorClaimableSetup, Ownable2StepUpgradeable {
    uint256 public constant PRECISION = 10_000; // 10,000 = 100%
    uint256 public constant MAX_TEAM_RATE = 500; // 500 bips =  5%
    uint256 public constant WEEK = 86400 * 7; // allows minting once per week (reset every Thursday 00:00 UTC)
    uint256 public constant TAIL_EMISSION = 20; // 0.2%

    bool public isFirstMint;
    bool public isStarted;

    uint256 public decayRate;
    uint256 public inflationRate;
    uint256 public inflationPeriodCount;

    uint256 public teamRate;
    uint256 public weekly;
    uint256 public active_period;
    uint256 public lastInflationPeriod;

    IFenix public fenix;
    IVoter public voter;
    IVotingEscrow public ve;

    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _disableInitializers();
    }

    function initialize(
        address blastGovernor_,
        address voter_, // the voting & distribution system
        address ve_
    ) external initializer {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        __Ownable2Step_init();

        isFirstMint = true;

        teamRate = MAX_TEAM_RATE;
        decayRate = 100; // 1%
        inflationRate = 150; // 1.5%
        inflationPeriodCount = 8;

        active_period = ((block.timestamp + (2 * WEEK)) / WEEK) * WEEK;
        weekly = 225_000 * 1e18; // represents a starting weekly emission of 225,000 Fenix (Fenix has 18 decimals)

        fenix = IFenix(IVotingEscrow(ve_).token());
        voter = IVoter(voter_);
        ve = IVotingEscrow(ve_);
    }

    function patchInitialSupply() external onlyOwner reinitializer(2) {
        assert(weekly == 225_000e18);
        assert(fenix.totalSupply() == 7_500_000e18);
        fenix.mint(msg.sender, 67_500_000e18);
        weekly = 2_250_000e18;
    }

    function start() external onlyOwner {
        require(!isStarted, "Already started");
        isStarted = true;
        active_period = ((block.timestamp) / WEEK) * WEEK; // allow minter.update_period() to mint new emissions THIS Thursday
        lastInflationPeriod = active_period + inflationPeriodCount * WEEK;
    }

    function setVoter(address __voter) external onlyOwner {
        require(__voter != address(0));
        voter = IVoter(__voter);
    }

    function setTeamRate(uint256 _teamRate) external onlyOwner {
        require(_teamRate <= MAX_TEAM_RATE, "rate too high");
        teamRate = _teamRate;
    }

    function setDecayRate(uint256 _decayRate) external onlyOwner {
        require(_decayRate <= PRECISION, "rate too high");
        decayRate = _decayRate;
    }

    function setInflationRate(uint256 _inflationRate) external onlyOwner {
        require(_inflationRate <= PRECISION, "rate too high");
        inflationRate = _inflationRate;
    }

    // calculate circulating supply as total token supply - locked supply
    function circulating_supply() public view returns (uint256) {
        return fenix.totalSupply() - fenix.balanceOf(address(ve));
    }

    function circulating_emission() public view returns (uint) {
        return (circulating_supply() * TAIL_EMISSION) / PRECISION;
    }

    function calculate_emission_decay() public view returns (uint256) {
        return (weekly * decayRate) / PRECISION;
    }

    function calculate_emission_inflation() public view returns (uint256) {
        return (weekly * inflationRate) / PRECISION;
    }

    // weekly emission takes the max of calculated (aka target) emission versus circulating tail end emission
    function weekly_emission() public view returns (uint256) {
        uint256 weeklyCache = weekly;
        if (active_period <= lastInflationPeriod) {
            return calculate_emission_inflation() + weeklyCache;
        } else {
            uint256 decay = calculate_emission_decay();
            return Math.max(weeklyCache < decay ? 0 : weeklyCache - decay, circulating_emission());
        }
    }

    // update period can only be called once per cycle (1 week)
    function update_period() external returns (uint256) {
        uint256 _period = active_period;
        if (block.timestamp >= _period + WEEK && isStarted) {
            // only trigger if new week
            _period = (block.timestamp / WEEK) * WEEK;
            active_period = _period;

            if (!isFirstMint) {
                weekly = weekly_emission();
            } else {
                isFirstMint = false;
            }

            uint256 weeklyCache = weekly;
            uint256 teamEmissions = (weeklyCache * teamRate) / PRECISION;

            uint256 gauge = weeklyCache - teamEmissions;

            uint256 currentBalance = fenix.balanceOf(address(this));
            if (currentBalance < weeklyCache) {
                fenix.mint(address(this), weeklyCache - currentBalance);
            }

            require(fenix.transfer(owner(), teamEmissions));

            fenix.approve(address(voter), gauge);
            voter.notifyRewardAmount(gauge);

            emit Mint(msg.sender, weeklyCache, circulating_supply());
        }
        return _period;
    }

    function check() external view returns (bool) {
        uint256 _period = active_period;
        return (block.timestamp >= _period + WEEK && isStarted);
    }

    function period() external view returns (uint256) {
        return (block.timestamp / WEEK) * WEEK;
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}
