// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import {IGaugeFactory} from "./interfaces/IGaugeFactory.sol";
import {IGauge} from "./interfaces/IGauge.sol";
import {GaugeProxy} from "./GaugeProxy.sol";
import {BlastGovernorSetup} from "../integration/BlastGovernorSetup.sol";

contract GaugeFactoryUpgradeable is IGaugeFactory, BlastGovernorSetup, OwnableUpgradeable {
    address public last_gauge;
    address public voter;
    address public override gaugeImplementation;
    address public override merklGaugeMiddleman;
    address public defaultBlastGovernor;

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address governor_,
        address _voter,
        address _gaugeImplementation,
        address _merklGaugeMiddleman
    ) external initializer {
        __BlastGovernorSetup_init(governor_);
        __Ownable_init();
        defaultBlastGovernor = governor_;
        voter = _voter;
        gaugeImplementation = _gaugeImplementation;
        merklGaugeMiddleman = _merklGaugeMiddleman;
    }

    function createGauge(
        address _rewardToken,
        address _ve,
        address _token,
        address _distribution,
        address _internal_bribe,
        address _external_bribe,
        bool _isDistributeEmissionToMerkle,
        address _feeVault
    ) external virtual override returns (address) {
        require(msg.sender == voter || msg.sender == owner(), "only voter");

        address newLastGauge = address(new GaugeProxy());
        IGauge(newLastGauge).initialize(
            defaultBlastGovernor,
            _rewardToken,
            _ve,
            _token,
            _distribution,
            _internal_bribe,
            _external_bribe,
            _isDistributeEmissionToMerkle,
            merklGaugeMiddleman,
            _feeVault
        );

        last_gauge = newLastGauge;

        return newLastGauge;
    }

    function gaugeOwner() external view returns (address) {
        return owner();
    }

    function changeImplementation(address _implementation) external onlyOwner {
        require(_implementation != address(0));
        emit GaugeImplementationChanged(gaugeImplementation, _implementation);
        gaugeImplementation = _implementation;
    }

    function setMerklGaugeMiddleman(address _newMerklGaugeMiddleman) external onlyOwner {
        merklGaugeMiddleman = _newMerklGaugeMiddleman;
    }

    function setDistribution(address _gauge, address _newDistribution) external onlyOwner {
        IGauge(_gauge).setDistribution(_newDistribution);
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}
