// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IFenix} from "./interfaces/IFenix.sol";
import {IVoter} from "./interfaces/IVoter.sol";
import {IVotingEscrow} from "./interfaces/IVotingEscrow.sol";
import {IRewardsDistributor} from "./interfaces/IRewardsDistributor.sol";
import {IEmissionManagerUpgradeable} from "./interfaces/IEmissionManagerUpgradeable.sol";

/**
 * @title Emission Manager for Fenix Protocol
 * @author The Fenix Protocol team
 * @dev This contract manages the emission of the Fenix token, including the minting process and rate adjustments.
 * It implements an upgradable pattern using OwnableUpgradeable from OpenZeppelin and interfaces with various components
 * of the Fenix protocol, such as Voter, VotingEscrow, and RewardsDistributor.
 */
contract EmissionManagerUpgradeable is
    IEmissionManagerUpgradeable,
    Ownable2StepUpgradeable // @risk centralized risks
{
    using SafeERC20 for IFenix;

    uint256 public constant MAX_TEAM_RATE = 50;
    uint256 public constant RATE_PRECISION = 1000; // @risk high losses during calculations due to low accuracy
    uint256 public constant PERIOD_DURATION = 86400 * 7;
    uint256 public constant MAX_VOTING_ESCROW_LOCK = 86400 * 7 * 52 * 2;

    bool public isFirstMint; // @todo can be changed by check initializedVersion, or set initial week

    uint256 public rebaseMax;
    uint256 public emissionRate;
    uint256 public tailEmission;
    uint256 public teamRate;

    uint256 public weekly;
    uint256 public activePeriod;

    IFenix public fenix;
    IVoter public voter;
    IVotingEscrow public votingEscrow;
    IRewardsDistributor public rewardsDistributor;

    /**
     * @dev Initializes the contract by disabling initializers to prevent the implementation contract
     * from being misused.
     */
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract with necessary components and initial configuration.
     *
     * Sets the initial values for the contract's state, including addresses of other contracts in the Fenix ecosystem
     * and initial emission parameters. Designed to be called once during the contract's setup in an upgradable context.
     *
     * @param voter_ Address of the Voter contract.
     * @param votingEscrow_ Address of the VotingEscrow contract.
     * @param rewardsDistributor_ Address of the RewardsDistributor contract.
     */
    function initialize(
        // @risk front running
        IVoter voter_,
        IVotingEscrow votingEscrow_,
        IRewardsDistributor rewardsDistributor_
    ) external virtual override initializer {
        __Ownable2Step_init();

        fenix = IFenix(votingEscrow_.token());
        voter = voter_;
        votingEscrow = votingEscrow_;
        rewardsDistributor = rewardsDistributor_;

        teamRate = 40; // 300 bps = 3%

        emissionRate = 990;
        tailEmission = 2; // 0.2%
        rebaseMax = 300;
        weekly = 2_600_000 * 1e18; // represents a starting weekly emission of 2.6M Fenix (Fenix has 18 decimals)

        activePeriod = ((block.timestamp + (2 * PERIOD_DURATION)) / PERIOD_DURATION) * PERIOD_DURATION;
        isFirstMint = true;
    }

    function initialize(
        address[] memory claimants_,
        uint256[] memory amounts_,
        uint256 max
    ) external virtual override reinitializer(2) onlyOwner {
        if (max > 0) {
            fenix.mint(address(this), max);
            fenix.approve(address(votingEscrow), type(uint256).max);
            for (uint256 i; i < claimants_.length; ) {
                votingEscrow.create_lock_for(amounts_[i], MAX_VOTING_ESCROW_LOCK, claimants_[i]);
                unchecked {
                    i++;
                }
            }
        }

        // allow minter.update_period() to mint new emissions THIS Thursday
        activePeriod = _period();
    }

    function setVoter(address voter_) external virtual override onlyOwner {
        if (voter_ == address(0)) {
            revert ZeroAddress();
        }
        voter = IVoter(voter_);
    }

    // Issue: can be front running

    function setTeamRate(uint256 teamRate_) external virtual override onlyOwner {
        if (teamRate_ > MAX_TEAM_RATE) {
            revert RateTooHigh("team", teamRate_);
        }
        teamRate = teamRate_;
    }

    function setEmission(uint256 emissionRate_) external virtual override onlyOwner {
        if (emissionRate_ > RATE_PRECISION) {
            revert RateTooHigh("emission", emissionRate_);
        }
        emissionRate = emissionRate_;
    }

    function setRebase(uint256 rebase_) external virtual override onlyOwner {
        if (rebase_ > RATE_PRECISION) {
            revert RateTooHigh("rebase", rebase_);
        }
        rebaseMax = rebase_;
    }

    // update period can only be called once per cycle (1 week)
    // @risk Failure to call the method weekly will result in a missed issue by the number of weeks that was missed
    function updatePeriod() external virtual override returns (uint256) {
        uint256 activePeriodTemp = activePeriod;
        if (block.timestamp < activePeriodTemp + PERIOD_DURATION || _getInitializedVersion() <= 1) {
            return activePeriodTemp;
        }

        activePeriodTemp = _period();
        activePeriod = activePeriodTemp;

        if (!isFirstMint) {
            weekly = _weeklyEmmision();
        } else {
            isFirstMint = false;
        }

        uint256 rebase = _calculateReabase(weekly);
        uint256 teamEmissions = (weekly * teamRate) / RATE_PRECISION;

        uint256 toGaugesAmount = weekly - rebase - teamEmissions; // @risk teamRate + teamEmissions can be > 100%

        uint256 balance = fenix.balanceOf(address(this));

        if (balance < weekly) {
            fenix.mint(address(this), weekly - balance);
        }

        fenix.safeTransfer(owner(), teamEmissions);

        fenix.safeTransfer(address(rewardsDistributor), rebase);
        rewardsDistributor.checkpoint_token();
        rewardsDistributor.checkpoint_total_supply();

        fenix.approve(address(voter), toGaugesAmount);
        voter.notifyRewardAmount(toGaugesAmount);

        emit Mint(_msgSender(), weekly, _circulatingSupply(), _circulatingEmission());

        return activePeriodTemp;
    }

    // calculates tail end (infinity) emissions as 0.2% of total supply
    function circulatingEmission() external view virtual override returns (uint256) {
        return _circulatingSupply();
    }

    // calculate inflation and adjust ve balances accordingly
    function calculateReabase(uint256 weeklyMint_) external view virtual override returns (uint256) {
        return _calculateReabase(weeklyMint_);
    }

    // calculate circulating supply as total token supply - locked supply
    function circulatingSupply() external view virtual override returns (uint256) {
        return _circulatingSupply();
    }

    // emission calculation is 1% of available supply to mint adjusted by circulating / total supply
    function calculateEmission() external view virtual override returns (uint256) {
        return _calculateEmission();
    }

    // weekly emission takes the max of calculated (aka target) emission versus circulating tail end emission
    function weeklyEmmision() external view virtual override returns (uint256) {
        return _weeklyEmmision();
    }

    function check() external view virtual override returns (bool) {
        return (activePeriod >= activePeriod + PERIOD_DURATION && _getInitializedVersion() > 1);
    }

    function period() external view virtual override returns (uint256) {
        return _period();
    }

    // calculate inflation and adjust ve balances accordingly
    function _calculateReabase(uint256 weeklyMint_) internal view virtual returns (uint256) {
        uint256 votingEscrowBalance = fenix.balanceOf(address(votingEscrow));
        uint256 fenixTotalSupply = fenix.totalSupply();

        uint256 lockedShare = ((votingEscrowBalance) * RATE_PRECISION) / fenixTotalSupply;
        if (lockedShare >= rebaseMax) {
            return (weeklyMint_ * rebaseMax) / RATE_PRECISION;
        } else {
            return (weeklyMint_ * weeklyMint_) / RATE_PRECISION;
        }
    }

    /**
     * @dev Calculates the circulating emission of the token.
     *
     * This function computes the circulating emission based on the current circulating supply and the tail emission rate.
     * It is an internal utility function used in the emission calculation process.
     *
     * @return uint256 The calculated circulating emission.
     */
    function _circulatingEmission() internal view virtual returns (uint256) {
        return (_circulatingSupply() * tailEmission) / RATE_PRECISION;
    }

    /**
     * @dev Calculates the circulating supply of the token.
     *
     * This function computes the circulating supply by subtracting the balance held by the voting escrow contract
     * from the total supply of the token. It is used in various calculations involving the token's supply dynamics.
     *
     * @return uint256 The calculated circulating supply.
     */
    function _circulatingSupply() internal view virtual returns (uint256) {
        return fenix.totalSupply() - fenix.balanceOf(address(votingEscrow));
    }

    /**
     * @dev Calculates the emission of the token.
     *
     * This function computes the emission rate based on the weekly emission parameter and the emission scaling factor.
     * It is used internally to determine the amount of tokens to be emitted.
     *
     * @return uint256 The calculated emission.
     */
    function _calculateEmission() internal view virtual returns (uint256) {
        return (weekly * emissionRate) / RATE_PRECISION;
    }

    function _emmison() internal view virtual returns (uint256) {
        return (weekly * emissionRate) / RATE_PRECISION;
    }

    // weekly emission takes the max of calculated (aka target) emission versus circulating tail end emission
    function _weeklyEmmision() internal view virtual returns (uint256) {
        uint256 calculateEmissionTemp = _calculateEmission();
        uint256 circulatingEmissionTemp = _circulatingSupply();
        return calculateEmissionTemp > circulatingEmissionTemp ? calculateEmissionTemp : circulatingEmissionTemp;
    }

    function _period() internal view virtual returns (uint256) {
        return (block.timestamp / PERIOD_DURATION) * PERIOD_DURATION;
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}
