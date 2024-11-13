// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IVeArtProxyStatic {
    function endPart() external view returns (string memory);

    function getLockIcon(bool isLock_) external view returns (string memory);

    function getIsTransferablePart(bool isTransferable_) external view returns (string memory);

    function startPart() external view returns (string memory);
}
