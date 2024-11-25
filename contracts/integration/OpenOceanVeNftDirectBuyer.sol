// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

import "./interfaces/IOpenOceanVeNftDirectBuyer.sol";
import "../core/interfaces/IVotingEscrow.sol";

import {BlastGovernorClaimableSetup} from "./BlastGovernorClaimableSetup.sol";

/**
 * @title OpenOceanVeNftDirectBuyer
 * @notice This contract facilitates the direct purchase of veNFTs via token swaps on the OpenOcean exchange.
 * @dev Integrates with OpenOcean, VotingEscrow, and BlastGovernorClaimableSetup to manage direct purchases of veNFTs.
 */
contract OpenOceanVeNftDirectBuyer is IOpenOceanVeNftDirectBuyer, Ownable, BlastGovernorClaimableSetup {
    using SafeERC20 for IERC20;

    /**
     * @notice The address of the OpenOcean exchange contract used for token swaps.
     */
    address public openOceanExchange;

    /**
     * @notice The address of the VotingEscrow contract used to create veNFTs.
     */
    address public votingEscrow;

    /**
     * @notice The address of the ERC20 token used for veNFT creation.
     */
    address public token;

    /**
     * @notice Thrown when the output token amount received from the swap does not match expectations.
     */
    error InvalidOutputAmount();

    /**
     * @notice Thrown when the destination token in the swap is not the expected token for veNFT creation.
     */
    error InvalidDstToken();

    /**
     * @notice Thrown when a token attempts to use permit functionality, which is not supported.
     */
    error PermitNotSupported();

    /**
     * @notice Thrown when the swap's destination receiver address is invalid.
     */
    error InvalidDstReceiver();

    /**
     * @notice Initializes the contract with required addresses.
     * @param blastGovernor_ Address of the BlastGovernor contract.
     * @param votingEscrow_ Address of the VotingEscrow contract.
     * @param token_ Address of the token used for veNFT creation.
     * @param openOceanExchange_ Address of the OpenOcean exchange contract.
     */
    constructor(address blastGovernor_, address votingEscrow_, address token_, address openOceanExchange_) {
        if (votingEscrow_ == address(0) || token_ == address(0) || openOceanExchange_ == address(0)) {
            revert AddressZero();
        }
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        votingEscrow = votingEscrow_;
        token = token_;
        openOceanExchange = openOceanExchange_;
    }

    /**
     * @notice Allows the owner to rescue tokens or ETH
     * @param token_ The ERC20 token to be rescued.
     */
    function rescueFunds(IERC20 token_) external onlyOwner {
        _transfer(token_, payable(_msgSender()), _getBalance(token_, address(this)));
    }

    /**
     * @notice Facilitates a direct purchase of veNFTs by performing a token swap and veNFT creation.
     * @dev The function validates inputs, executes the swap, and creates a veNFT for the recipient.
     * @param caller_ The OpenOcean caller contract.
     * @param desc_ The swap description containing details of the source and destination tokens.
     * @param calls_ The calls to execute as part of the OpenOcean swap.
     * @param votingEscrowCreateForParams_ Parameters for creating the veNFT.
     * @return tokenAmount The amount of destination tokens obtained in the swap.
     * @return tokenId The ID of the veNFT created.
     * @custom:requirements The destination token must match the expected token, and the caller must provide sufficient balance.
     * @custom:emits Emits a `DirectVeNftPurchase` event on successful veNFT creation.
     */
    function directVeNftPurchase(
        IOpenOceanCaller caller_,
        IOpenOceanExchange.SwapDescription calldata desc_,
        IOpenOceanCaller.CallDescription[] calldata calls_,
        VotingEscrowCreateLockForParams calldata votingEscrowCreateForParams_
    ) external payable virtual override returns (uint256 tokenAmount, uint256 tokenId) {
        IERC20 tokenCache = IERC20(token);
        if (address(desc_.dstToken) != address(tokenCache)) {
            revert InvalidDstToken();
        }

        if (desc_.dstReceiver != address(this) && desc_.dstReceiver != address(0)) {
            revert InvalidDstReceiver();
        }

        IOpenOceanExchange openOceanExchangeCache = IOpenOceanExchange(openOceanExchange);
        uint256 srcTokenInitialBalance = _getBalance(desc_.srcToken, address(this));

        if (_isETH(desc_.srcToken)) {
            srcTokenInitialBalance -= msg.value;
        } else {
            if (desc_.permit.length > 0) {
                revert PermitNotSupported();
            }
            desc_.srcToken.safeTransferFrom(_msgSender(), address(this), desc_.amount);
            desc_.srcToken.safeApprove(address(openOceanExchangeCache), desc_.amount);
        }

        uint256 dstTokenInitialBalance = tokenCache.balanceOf(address(this));

        tokenAmount = IOpenOceanExchange(openOceanExchange).swap{value: msg.value}(caller_, desc_, calls_);

        if ((tokenCache.balanceOf(address(this)) - dstTokenInitialBalance) != tokenAmount) {
            revert InvalidOutputAmount();
        }

        uint256 srcTokenRestBalance = _getBalance(desc_.srcToken, address(this)) - srcTokenInitialBalance;
        if (srcTokenRestBalance > 0) {
            _transfer(desc_.srcToken, _msgSender(), srcTokenRestBalance);
        }

        IVotingEscrow votingEscrowCache = IVotingEscrow(votingEscrow);
        tokenCache.safeApprove(address(votingEscrowCache), tokenAmount);
        tokenId = votingEscrowCache.createLockFor(
            tokenAmount,
            votingEscrowCreateForParams_.lockDuration,
            votingEscrowCreateForParams_.to,
            votingEscrowCreateForParams_.shouldBoosted,
            votingEscrowCreateForParams_.withPermanentLock,
            votingEscrowCreateForParams_.managedTokenIdForAttach
        );

        emit DirectVeNftPurchase(
            _msgSender(),
            votingEscrowCreateForParams_.to,
            address(desc_.srcToken),
            desc_.amount - srcTokenRestBalance,
            tokenAmount,
            tokenId
        );
    }

    /**
     * @notice Internal function to transfer tokens or ETH.
     * @param token_ The ERC20 token or ETH to transfer.
     * @param target_ The recipient address.
     * @param amount_ The amount to transfer.
     */
    function _transfer(IERC20 token_, address target_, uint256 amount_) internal {
        if (_isETH(token_)) {
            Address.sendValue(payable(target_), amount_);
        } else {
            token_.safeTransfer(target_, amount_);
        }
    }

    /**
     * @notice Internal function to get the balance of a token or ETH.
     * @param token_ The ERC20 token or ETH to check.
     * @param target_ The address to check the balance for.
     * @return The balance of the token or ETH.
     */
    function _getBalance(IERC20 token_, address target_) internal view returns (uint256) {
        return _isETH(token_) ? target_.balance : token_.balanceOf(target_);
    }

    /**
     * @notice Checks whether the token is ETH.
     * @param token_ The token to check.
     * @return True if the token is ETH, otherwise false.
     */
    function _isETH(IERC20 token_) internal pure returns (bool) {
        return address(token_) == address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) || address(token_) == address(0);
    }
}
