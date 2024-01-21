// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IPair} from "../interfaces/external/IPair.sol";
import {IBribeUpgradeable} from "../interfaces/IBribeUpgradeable.sol";
import {IFeeVault} from "../interfaces/IFeeVault.sol";
import {IRewarder} from "../interfaces/IRewarder.sol";
import {ICLGaugeUpgradeable} from "../interfaces/gauges/ICLGaugeUpgradeable.sol";

import {BaseGaugeUpgradeable} from "./BaseGaugeUpgradeable.sol";

contract CLGaugeUpgradeable is ICLGaugeUpgradeable, BaseGaugeUpgradeable {
    address public feeVault;

    /**
     * @dev Initializes the contract by disabling initializers to prevent the implementation contract
     * from being misused.
     */
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address rewardToken_,
        address votingEscrow_,
        address depositToken_,
        address distribution_,
        address internalBribe_,
        address externalBribe_,
        address feeVault_
    ) external virtual override initializer {
        __BaseGaugeUpgradeable_init(rewardToken_, votingEscrow_, depositToken_, distribution_, internalBribe_, externalBribe_);
        feeVault = feeVault_;
    }

    function setFeeVault(address _feeVault) external virtual override onlyOwner {
        require(_feeVault != address(0), "zero addr");
        require(_feeVault != feeVault, "same addr");
        feeVault = _feeVault;
    }

    function _claimFees() internal virtual override returns (uint256 claimed0, uint256 claimed1) {
        address _token = address(depositToken);
        (claimed0, claimed1) = IFeeVault(feeVault).claimFees();

        if (claimed0 > 0 || claimed1 > 0) {
            uint256 _fees0 = claimed0;
            uint256 _fees1 = claimed1;

            address _token0 = IPair(_token).token0();
            address _token1 = IPair(_token).token1();
            if (_fees0 > 0) {
                IERC20(_token0).approve(internalBribe, 0);
                IERC20(_token0).approve(internalBribe, _fees0);
                IBribeUpgradeable(internalBribe).notifyRewardAmount(_token0, _fees0);
            }

            if (_fees1 > 0) {
                IERC20(_token1).approve(internalBribe, 0);
                IERC20(_token1).approve(internalBribe, _fees1);
                IBribeUpgradeable(internalBribe).notifyRewardAmount(_token1, _fees1);
            }
            emit ClaimFees(msg.sender, claimed0, claimed1);
        }
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}
