// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity =0.8.19;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import {IMinter} from "./interfaces/IMinter.sol";
import {IFenix} from "./interfaces/IFenix.sol";
import {IVoter} from "./interfaces/IVoter.sol";
import {IVotingEscrow} from "./interfaces/IVotingEscrow.sol";
import {BlastGovernorSetup} from "../integration/BlastGovernorSetup.sol";

// codifies the minting rules as per ve(3,3), abstracted from the token to support any token that allows minting

contract MinterUpgradeable is IMinter, BlastGovernorSetup, OwnableUpgradeable {
    uint256[50] __gap;

    bool public isFirstMint;

    uint public EMISSION;
    uint public TAIL_EMISSION;
    //uint public REBASEMAX;
    uint public constant PRECISION = 1000;
    uint public teamRate;
    uint public constant MAX_TEAM_RATE = 50; // 5%

    uint public constant WEEK = 86400 * 7; // allows minting once per week (reset every Thursday 00:00 UTC)
    uint public weekly; // represents a starting weekly emission of 2.6M Fenix (Fenix has 18 decimals)
    uint public active_period;

    address internal _initializer;
    address public team;
    address public pendingTeam;

    IFenix public _fenix;
    IVoter public _voter;
    IVotingEscrow public _ve;

    event Mint(address indexed sender, uint weekly, uint circulating_supply, uint circulating_emission);

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address governor_,
        address team_,
        address __voter, // the voting & distribution system
        address __ve
    ) public initializer {
        __BlastGovernorSetup_init(governor_);
        __Ownable_init();

        _initializer = msg.sender;
        team = team_;

        teamRate = 25; // 300 bps = 3%

        EMISSION = 990;
        TAIL_EMISSION = 2;

        _fenix = IFenix(IVotingEscrow(__ve).token());
        _voter = IVoter(__voter);
        _ve = IVotingEscrow(__ve);

        active_period = ((block.timestamp + (2 * WEEK)) / WEEK) * WEEK;
        weekly = 2_600_000 * 1e18; // represents a starting weekly emission of 2.4M Fenix (Fenix has 18 decimals)
        isFirstMint = true;
    }

    function _initialize(
        uint amount // sum amounts / max = % ownership of top protocols, so if initial 20m is distributed, and target is 25% protocol ownership, then max - 4 x 20m = 80m
    ) external {
        require(_initializer == msg.sender);

        _initializer = address(0);
        active_period = ((block.timestamp) / WEEK) * WEEK; // allow minter.update_period() to mint new emissions THIS Thursday
    }

    function setTeam(address _team) external {
        require(msg.sender == team, "not team");
        pendingTeam = _team;
    }

    function acceptTeam() external {
        require(msg.sender == pendingTeam, "not pending team");
        team = pendingTeam;
    }

    function setVoter(address __voter) external {
        require(__voter != address(0));
        require(msg.sender == team, "not team");
        _voter = IVoter(__voter);
    }

    function setTeamRate(uint _teamRate) external {
        require(msg.sender == team, "not team");
        require(_teamRate <= MAX_TEAM_RATE, "rate too high");
        teamRate = _teamRate;
    }

    function setEmission(uint _emission) external {
        require(msg.sender == team, "not team");
        require(_emission <= PRECISION, "rate too high");
        EMISSION = _emission;
    }

    // calculate circulating supply as total token supply - locked supply
    function circulating_supply() public view returns (uint) {
        return _fenix.totalSupply() - _fenix.balanceOf(address(_ve));
    }

    // emission calculation is 1% of available supply to mint adjusted by circulating / total supply
    function calculate_emission() public view returns (uint) {
        return (weekly * EMISSION) / PRECISION;
    }

    // weekly emission takes the max of calculated (aka target) emission versus circulating tail end emission
    function weekly_emission() public view returns (uint) {
        return Math.max(calculate_emission(), circulating_emission());
    }

    // calculates tail end (infinity) emissions as 0.2% of total supply
    function circulating_emission() public view returns (uint) {
        return (circulating_supply() * TAIL_EMISSION) / PRECISION;
    }

    // update period can only be called once per cycle (1 week)
    function update_period() external returns (uint) {
        uint _period = active_period;
        if (block.timestamp >= _period + WEEK && _initializer == address(0)) {
            // only trigger if new week
            _period = (block.timestamp / WEEK) * WEEK;
            active_period = _period;

            if (!isFirstMint) {
                weekly = weekly_emission();
            } else {
                isFirstMint = false;
            }

            //uint _rebase = calculate_rebate(weekly);
            uint _teamEmissions = (weekly * teamRate) / PRECISION;
            uint _required = weekly;

            //uint _gauge = weekly - _rebase - _teamEmissions;
            uint _gauge = weekly - _teamEmissions;

            uint _balanceOf = _fenix.balanceOf(address(this));
            if (_balanceOf < _required) {
                _fenix.mint(address(this), _required - _balanceOf);
            }

            require(_fenix.transfer(team, _teamEmissions));

            _fenix.approve(address(_voter), _gauge);
            _voter.notifyRewardAmount(_gauge);

            emit Mint(msg.sender, weekly, circulating_supply(), circulating_emission());
        }
        return _period;
    }

    function check() external view returns (bool) {
        uint _period = active_period;
        return (block.timestamp >= _period + WEEK && _initializer == address(0));
    }

    function period() external view returns (uint) {
        return (block.timestamp / WEEK) * WEEK;
    }
}