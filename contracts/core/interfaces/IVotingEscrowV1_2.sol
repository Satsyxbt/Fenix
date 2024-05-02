// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IVotingEscrowV1_2 {
    function token() external view returns (address);

    function deposit_for_without_boost(uint _tokenId, uint _value) external;

    function balanceOfNftIgnoreOwnershipChange(uint tokenId_) external view returns (uint256);

    function createManagedNFT(address recipient) external returns (uint256);

    function onAttachToManagedNFT(uint256 tokenId_, uint256 managedTokenId_) external returns (uint256);

    function onDettachFromManagedNFT(uint256 tokenId_, uint256 managedTokenId_, uint256 userBalance) external;
}
