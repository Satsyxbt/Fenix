// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IVoter} from "../core/interfaces/IVoter.sol";
import {IPairIntegrationInfo} from "./interfaces/IPairIntegrationInfo.sol";
import {IFeesVault} from "./interfaces/IFeesVault.sol";
import {IFeesVaultFactory} from "./interfaces/IFeesVaultFactory.sol";
import {BlastGovernorSetup} from "./BlastGovernorSetup.sol";

contract FeesVaultUpgradeable is IFeesVault, BlastGovernorSetup, Initializable {
    using SafeERC20 for IERC20;

    uint256 public constant PRECISION = 10000;

    address public factory;
    address public voter;
    address public pool;

    uint256 public toGaugeRate;
    uint256 public toProtocolRate;
    uint256 public toPartnerRate;

    address public protocolRecipient;
    address public partnerRecipient;

    modifier onlyGauge() {
        if (!IVoter(voter).isGauge(msg.sender)) {
            revert AccessDenied();
        }
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != IFeesVaultFactory(factory).feesVaultOwner()) {
            revert AccessDenied();
        }
        _;
    }

    constructor() {
        _disableInitializers();
    }

    function initialize(address blastGovernor_, address factory_, address pool_, address voter_) external initializer {
        __BlastGovernorSetup_init(blastGovernor_);

        factory = factory_;
        pool = pool_;
        voter = voter_;

        toGaugeRate = PRECISION;
    }

    function claimFees() external onlyGauge returns (uint256 gauge0, uint256 gauge1) {
        address poolFromGauge = IVoter(voter).poolForGauge(msg.sender);
        require(pool == poolFromGauge);

        IERC20 token0 = IERC20(IPairIntegrationInfo(pool).token0());
        uint256 amount0 = token0.balanceOf(address(this));
        if (amount0 > 0) {
            (uint256 toGaugeAmount0, uint256 toProtocolAmount0, uint256 toPartnerAmount0) = _calculateFee(amount0);
            if (toGaugeAmount0 > 0) token0.safeTransfer(msg.sender, toGaugeAmount0);
            if (toProtocolAmount0 > 0) token0.safeTransfer(protocolRecipient, toProtocolAmount0);
            if (toPartnerAmount0 > 0) token0.safeTransfer(partnerRecipient, toPartnerAmount0);
            emit Fees0(address(token0), toGaugeAmount0, toProtocolAmount0, toPartnerAmount0);
            gauge0 = toGaugeAmount0;
        }

        IERC20 token1 = IERC20(IPairIntegrationInfo(pool).token1());
        uint256 amount1 = token1.balanceOf(address(this));

        if (amount1 > 0) {
            (uint256 toGaugeAmount1, uint256 toProtocolAmount1, uint256 toPartnerAmount1) = _calculateFee(amount1);
            if (toGaugeAmount1 > 0) token1.safeTransfer(msg.sender, toGaugeAmount1);
            if (toProtocolAmount1 > 0) token1.safeTransfer(protocolRecipient, toProtocolAmount1);
            if (toPartnerAmount1 > 0) token1.safeTransfer(partnerRecipient, toPartnerAmount1);
            emit Fees1(address(token1), toGaugeAmount1, toProtocolAmount1, toPartnerAmount1);
            gauge1 = toGaugeAmount1;
        }

        emit Fees(pool, address(token0), address(token1), amount0, amount1);
    }

    /// @notice Recover ERC20 from the contract.
    function emergencyRecoverERC20(address token_, uint256 amount_) external onlyOwner {
        require(amount_ <= IERC20(token_).balanceOf(address(this)));
        IERC20(token_).safeTransfer(IFeesVaultFactory(factory).feesVaultOwner(), amount_);
    }

    function setDistributionConfig(
        uint256 toGaugeRate_,
        uint256 toProtocolRate_,
        uint256 toPartnerRate_
    ) external virtual override onlyOwner {
        uint256 sumRates = toGaugeRate_ + toProtocolRate_ + toPartnerRate_;
        if (sumRates != PRECISION) {
            revert IncorectDistributionConfig();
        }

        if (toProtocolRate_ > 0 && protocolRecipient == address(0)) {
            revert RecipientNotSetuped();
        }

        if (toPartnerRate > 0 && partnerRecipient == address(0)) {
            revert RecipientNotSetuped();
        }

        toGaugeRate = toGaugeRate_;
        toProtocolRate = toProtocolRate_;
        toPartnerRate = toPartnerRate_;

        emit SetDistributionConfig(toGaugeRate_, toProtocolRate_, toPartnerRate_);
    }

    function calculateFee(
        uint256 amount_
    ) external view virtual override returns (uint256 toGaugeAmount, uint256 toProtocolAmount, uint256 toPartnerAmount) {
        return _calculateFee(amount_);
    }

    function _calculateFee(
        uint256 amount_
    ) internal view virtual returns (uint256 toGaugeAmount, uint256 toProtocolAmount, uint256 toPartnerAmount) {
        toGaugeAmount = (amount_ * toGaugeRate) / PRECISION;
        toProtocolAmount = (amount_ * toProtocolRate) / PRECISION;
        toPartnerAmount = amount_ - toGaugeAmount - toProtocolAmount;
    }
}
