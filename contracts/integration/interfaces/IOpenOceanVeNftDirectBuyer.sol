// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import "./IOpenOceanExchange.sol";
import "./IOpenOceanCaller.sol";

/**
 * @title IOpenOceanVeNftDirectBuyer
 * @notice Interface for a contract facilitating direct veNFT purchases via OpenOcean swaps.
 */
interface IOpenOceanVeNftDirectBuyer {
    /**
     * @notice Parameters for creating a veNFT through VotingEscrow.
     * @param lockDuration The duration for which the tokens will be locked.
     * @param to The address that will receive the veNFT.
     * @param shouldBoosted Indicates whether the veNFT should have boosted properties.
     * @param withPermanentLock Indicates if the lock should be permanent.
     * @param managedTokenIdForAttach The ID of the managed veNFT token to which this will be attached.
     */
    struct VotingEscrowCreateLockForParams {
        uint256 lockDuration;
        address to;
        bool shouldBoosted;
        bool withPermanentLock;
        uint256 managedTokenIdForAttach;
    }

    /**
     * @notice Emitted after a successful direct veNFT purchase.
     * @param caller The address of the function caller.
     * @param recipient The address of the veNFT recipient.
     * @param srcToken The address of the source token used for the swap.
     * @param spentAmount The amount of source tokens spent in the swap.
     * @param tokenAmount The amount of destination tokens obtained in the swap.
     * @param veNftTokenId The ID of the veNFT created for the recipient.
     */
    event DirectVeNftPurchase(
        address indexed caller,
        address indexed recipient,
        address indexed srcToken,
        uint256 spentAmount,
        uint256 tokenAmount,
        uint256 veNftTokenId
    );

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
    ) external payable returns (uint256 tokenAmount, uint256 tokenId);
}
