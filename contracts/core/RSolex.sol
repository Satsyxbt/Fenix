// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {ERC20, ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

import {IVotingEscrow} from "./interfaces/IVotingEscrow.sol";
import {IRSolex} from "./interfaces/IRSolex.sol";

import {ModeSfsSetup} from "../integration/ModeSfsSetup.sol";

/**
 * @title RSolex Token Contract
 * @dev Implementation of the rSOLEX token, an ERC20 token with convert features.
 *      Inherits functionality from OpenZeppelin's ERC20Burnable and Ownable2Step contracts.
 *      Provides mechanisms for token conversion and owner interaction.
 */
contract RSolex is IRSolex, ModeSfsSetup, ERC20Burnable, Ownable2Step {
    using SafeERC20 for IERC20;

    uint256 internal constant _PRECISION = 1e18; // Precision for percentage calculations
    uint256 internal constant _LOCK_DURATION = 182 days; // Lock duration for veSOLEX tokens
    uint256 internal constant _TO_TOKEN_PERCENTAGE = 0.4e18; // Percentage of rSOLEX converted to SOLEX

    address public override votingEscrow; // Address of the Voting Escrow contract for veSOLEX
    address public override token; // Address of the protocol token

    /**
     * @dev Initializes the contract by setting the governance, token, and Voting Escrow addresses.
     * @param modeSfs_ Address of the Mode SFS contract.
     * @param sfsAssignTokenId_ The token ID for SFS assignment.
     * @param votingEscrow_ Address of the Voting Escrow contract.
     */
    constructor(address modeSfs_, uint256 sfsAssignTokenId_, address votingEscrow_) ERC20("rSOLEX", "rSOLEX") {
        __ModeSfsSetup__init(modeSfs_, sfsAssignTokenId_);

        _checkAddressZero(votingEscrow_);

        address tokenTemp = IVotingEscrow(votingEscrow_).token();

        _checkAddressZero(tokenTemp);

        token = tokenTemp;
        votingEscrow = votingEscrow_;
    }

    /**
     * @notice Converts all rSOLEX tokens of the caller to SOLEX and veSOLEX tokens.
     *         Burns rSOLEX tokens and mints SOLEX and veSOLEX tokens proportionally.
     */
    function convertAll() external override {
        _convert(balanceOf(msg.sender));
    }

    /**
     * @notice Converts a specific amount of rSOLEX tokens of the caller to SOLEX and veSOLEX tokens.
     * @param amount_ The amount of rSOLEX tokens to convert.
     *                Burns the specified amount of rSOLEX tokens and mints SOLEX and veSOLEX tokens proportionally.
     */
    function convert(uint256 amount_) external override {
        _convert(amount_);
    }

    /**
     * @notice Allows the owner to recover SOLEX tokens from the contract.
     * @param amount_ The amount of SOLEX tokens to be recovered.
     *                Transfers the specified amount of SOLEX tokens to the owner's address.
     */
    function recoverToken(uint256 amount_) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount_);
        emit Recover(msg.sender, amount_);
    }

    /**
     * @notice Mints rSOLEX tokens to a specified address.
     * @param to_ The address to receive the minted tokens.
     * @param amount_ The amount of tokens to mint.
     */
    function mint(address to_, uint256 amount_) external onlyOwner {
        _mint(to_, amount_);
    }

    /**
     * @dev Internal function to handle the conversion of rSOLEX to SOLEX and veSOLEX.
     * @param amount_ The amount of rSOLEX to convert.
     */
    function _convert(uint256 amount_) internal {
        if (amount_ == 0) {
            revert ZERO_AMOUNT();
        }

        _burn(msg.sender, amount_);

        IERC20 tokenCache = IERC20(token);

        uint256 toTokenAmount = (amount_ * _TO_TOKEN_PERCENTAGE) / _PRECISION;
        uint256 toVeNFTAmount = amount_ - toTokenAmount;

        uint256 tokenId;

        if (toVeNFTAmount > 0) {
            IVotingEscrow veCache = IVotingEscrow(votingEscrow);
            tokenCache.safeApprove(address(veCache), toVeNFTAmount);

            tokenId = veCache.create_lock_for_without_boost(toVeNFTAmount, _LOCK_DURATION, msg.sender);

            tokenCache.safeApprove(address(veCache), 0);
        }

        if (toTokenAmount > 0) {
            tokenCache.safeTransfer(msg.sender, toTokenAmount);
        }

        emit Converted(msg.sender, amount_, toTokenAmount, toVeNFTAmount, tokenId);
    }

    /**
     * @dev Checks if an address is zero and reverts if true.
     * @param addr_ The address to check.
     */
    function _checkAddressZero(address addr_) internal pure {
        if (addr_ == address(0)) {
            revert AddressZero();
        }
    }
}
