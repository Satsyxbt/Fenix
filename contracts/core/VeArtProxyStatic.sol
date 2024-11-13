// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import "./interfaces/IVeArtProxyStatic.sol";

/**
 * @title VeArtProxyStatic
 * @notice A contract that manages art representation of locked and unlocked veNFT states.
 */
contract VeArtProxyStatic is IVeArtProxyStatic {
    /// @notice Icon representing the locked state.
    string public lockedIcon;
    /// @notice Icon representing the unlocked state.
    string public unlockedIcon;
    /// @notice Representation of a transferable part.
    string public transferablePart;
    /// @notice Representation of a non-transferable part.
    string public notTransferablePart;
    /// @inheritdoc IVeArtProxyStatic
    string public override endPart;
    /// @inheritdoc IVeArtProxyStatic
    string public override startPart;
    /// @notice Boolean indicating whether the start part has been set up.
    bool public setupStart;
    /// @notice Boolean indicating whether the end part has been set up.
    bool public setupEnd;

    /**
     * @notice Constructor to initialize the VeArtProxyStatic contract.
     * @param lockedIcon_ Icon for locked state.
     * @param unlockedIcon_ Icon for unlocked state.
     * @param transferablePart_ Part that is transferable.
     * @param notTransferablePart_ Part that is not transferable.
     */
    constructor(
        string memory lockedIcon_,
        string memory unlockedIcon_,
        string memory transferablePart_,
        string memory notTransferablePart_
    ) {
        lockedIcon = lockedIcon_;
        unlockedIcon = unlockedIcon_;
        transferablePart = transferablePart_;
        notTransferablePart = notTransferablePart_;
    }

    /**
     * @notice Sets the starting part of the veNFT art.
     * @dev This function can only be called once.
     * @param startPart_ The starting part to be set.
     */
    function setStartPart(string calldata startPart_) external {
        require(!setupStart, "Already setup");
        startPart = startPart_;
        setupStart = true;
    }

    /**
     * @notice Sets the ending part of the veNFT art.
     * @dev This function can only be called once.
     * @param endPart_ The ending part to be set.
     */
    function setEndPart(string calldata endPart_) external {
        require(!setupEnd, "Already setup");
        endPart = endPart_;
        setupEnd = true;
    }

    /**
     * @notice Returns the appropriate part depending on the transferability status.
     * @param isTransferable_ Boolean indicating if the part is transferable.
     * @return The corresponding transferable or non-transferable part.
     */
    function getIsTransferablePart(bool isTransferable_) external view returns (string memory) {
        return isTransferable_ ? transferablePart : notTransferablePart;
    }

    /**
     * @notice Returns the appropriate icon depending on the lock status.
     * @param isLock_ Boolean indicating if the state is locked.
     * @return The corresponding locked or unlocked icon.
     */
    function getLockIcon(bool isLock_) external view returns (string memory) {
        return isLock_ ? lockedIcon : unlockedIcon;
    }
}
