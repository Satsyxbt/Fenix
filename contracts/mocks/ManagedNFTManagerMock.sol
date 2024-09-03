// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import "../core/interfaces/IVotingEscrowV2.sol";

contract ManagedNFTManagerMock {
    mapping(uint256 => bool) public isManagedNFT;

    function setIsManagedNft(uint256 tokenId) external {
        isManagedNFT[tokenId] = true;
    }

    function onAttachToManagedNFT(address votingEscrow, uint256 tokenId_, uint256 managedTokenId_) external {
        IVotingEscrowV2(votingEscrow).onAttachToManagedNFT(tokenId_, managedTokenId_);
    }

    function onDettachFromManagedNFT(address votingEscrow, uint256 tokenId_, uint256 managedTokenId_, uint256 newBalance_) external {
        IVotingEscrowV2(votingEscrow).onDettachFromManagedNFT(tokenId_, managedTokenId_, newBalance_);
    }

    function create(address votingEscrow, address recipient) external {
        ManagedNFTManagerMock(votingEscrow).createManagedNFT(recipient);
    }

    function createManagedNFT(address recipient_) external {}
}
