// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/**
 * @title IRFenix Interface
 * @dev Interface for the RFenix token contract.
 * Provides the necessary declarations for interacting with the RFenix functionalities.
 */
interface IRFenix {
    /// @notice Emitted when rFNX tokens are converted to FNX and veFNX tokens.
    /// @param sender The address that initiated the conversion.
    /// @param amount The amount of rFNX tokens converted.
    /// @param toTokenAmount The amount of FNX tokens received from the conversion.
    /// @param toVeNFTAmount The amount of veFNX tokens received from the conversion.
    /// @param tokenId The ID of the veFNX token received, if applicable.
    event Converted(address indexed sender, uint256 amount, uint256 toTokenAmount, uint256 toVeNFTAmount, uint256 tokenId);

    /// @notice Emitted when FNX tokens are recovered from the contract.
    /// @param sender The address that performed the recovery.
    /// @param amount The amount of FNX tokens recovered.
    event Recover(address indexed sender, uint256 amount);

    /// @dev Reverts if the attempted operation involves zero amount.
    error ZERO_AMOUNT();

    /**
     * @notice Converts all rFNX tokens of the caller to FNX and veFNX tokens.
     */
    function convertAll() external;

    /**
     * @notice Converts a specific amount of rFNX tokens to FNX and veFNX tokens.
     * @param amount_ The amount of rFNX tokens to be converted.
     */
    function convert(uint256 amount_) external;

    /**
     * @notice Allows the contract owner to recover FNX tokens from the contract.
     * @param amount_ The amount of FNX tokens to be recovered.
     */
    function recoverToken(uint256 amount_) external;

    /**
     * @notice Mints rFNX tokens to a specified address.
     * @param to_ The address that will receive the minted rFNX tokens.
     * @param amount_ The amount of rFNX tokens to mint.
     */
    function mint(address to_, uint256 amount_) external;

    /**
     * @notice Returns the address of the FNX token.
     * @return address The FNX token contract address.
     */
    function token() external view returns (address);

    /**
     * @notice Returns the address of the Voting Escrow contract.
     * @return address The Voting Escrow contract address.
     */
    function votingEscrow() external view returns (address);
}
