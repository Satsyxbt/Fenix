// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {ERC20, ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

import {IVotingEscrow} from "./interfaces/IVotingEscrow.sol";
import {IRFenix} from "./interfaces/IRFenix.sol";

import {BlastGovernorClaimableSetup} from "../integration/BlastGovernorClaimableSetup.sol";

/**
 * @title RFenix Token Contract
 * @dev Implementation of the rFNX token, an ERC20 token with convert features.
 *      Inherits functionality from OpenZeppelin's ERC20Burnable and Ownable2Step contracts.
 *      Provides mechanisms for token conversion and owner interaction.
 */
contract RFenix is IRFenix, BlastGovernorClaimableSetup, ERC20Burnable, Ownable2Step {
    using SafeERC20 for IERC20;

    uint256 internal constant _PRECISION = 1e18; // Precision for percentage calculations
    uint256 internal constant _LOCK_DURATION = 182 days; // Lock duration for veFNX tokens
    uint256 internal constant _TO_TOKEN_PERCENTAGE = 0.4e18; // Percentage of rFNX converted to FNX

    address public override votingEscrow; // Address of the Voting Escrow contract for veFNX
    address public override token; // Address of the FNX token

    /**
     * @dev Initializes the contract by setting the governance, token, and Voting Escrow addresses.
     * @param blastGovernor_ Address of the Blast Governor.
     * @param votingEscrow_ Address of the Voting Escrow contract.
     */
    constructor(address blastGovernor_, address votingEscrow_) ERC20("rFNX", "rFNX") {
        __BlastGovernorClaimableSetup_init(blastGovernor_);

        _checkAddressZero(votingEscrow_);

        address tokenTemp = IVotingEscrow(votingEscrow_).token();

        _checkAddressZero(tokenTemp);

        token = tokenTemp;
        votingEscrow = votingEscrow_;
    }

    /**
     * @notice Converts all rFNX tokens of the caller to FNX and veFNX tokens.
     *         Burns rFNX tokens and mints FNX and veFNX tokens proportionally.
     */
    function convertAll() external override {
        _convert(balanceOf(msg.sender));
    }

    /**
     * @notice Converts a specific amount of rFNX tokens of the caller to FNX and veFNX tokens.
     * @param amount_ The amount of rFNX tokens to convert.
     *                Burns the specified amount of rFNX tokens and mints FNX and veFNX tokens proportionally.
     */
    function convert(uint256 amount_) external override {
        _convert(amount_);
    }

    /**
     * @notice Allows the owner to recover FNX tokens from the contract.
     * @param amount_ The amount of FNX tokens to be recovered.
     *                Transfers the specified amount of FNX tokens to the owner's address.
     */
    function recoverToken(uint256 amount_) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount_);
        emit Recover(msg.sender, amount_);
    }

    /**
     * @notice Mints rFNX tokens to a specified address.
     * @param to_ The address to receive the minted tokens.
     * @param amount_ The amount of tokens to mint.
     */
    function mint(address to_, uint256 amount_) external onlyOwner {
        _mint(to_, amount_);
    }

    /**
     * @dev Internal function to handle the conversion of rFNX to FNX and veFNX.
     * @param amount_ The amount of rFNX to convert.
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
