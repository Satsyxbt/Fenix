// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/**
 * @title IRSolex Interface
 * @dev Interface for the RSolex token contract.
 * Provides the necessary declarations for interacting with the RSolex functionalities.
 */
interface IRSolex {
    /// @notice Emitted when rSOLEX tokens are converted to SOLEX and veSOLEX tokens.
    /// @param sender The address that initiated the conversion.
    /// @param amount The amount of rSOLEX tokens converted.
    /// @param toTokenAmount The amount of SOLEX tokens received from the conversion.
    /// @param toVeNFTAmount The amount of veSOLEX tokens received from the conversion.
    /// @param tokenId The ID of the veSOLEX token received, if applicable.
    event Converted(address indexed sender, uint256 amount, uint256 toTokenAmount, uint256 toVeNFTAmount, uint256 tokenId);

    /// @notice Emitted when SOLEX tokens are recovered from the contract.
    /// @param sender The address that performed the recovery.
    /// @param amount The amount of SOLEX tokens recovered.
    event Recover(address indexed sender, uint256 amount);

    /// @dev Reverts if the attempted operation involves zero amount.
    error ZERO_AMOUNT();

    /**
     * @notice Converts all rSOLEX tokens of the caller to SOLEX and veSOLEX tokens.
     */
    function convertAll() external;

    /**
     * @notice Converts a specific amount of rSOLEX tokens to SOLEX and veSOLEX tokens.
     * @param amount_ The amount of rSOLEX tokens to be converted.
     */
    function convert(uint256 amount_) external;

    /**
     * @notice Allows the contract owner to recover SOLEX tokens from the contract.
     * @param amount_ The amount of SOLEX tokens to be recovered.
     */
    function recoverToken(uint256 amount_) external;

    /**
     * @notice Mints rSOLEX tokens to a specified address.
     * @param to_ The address that will receive the minted rSOLEX tokens.
     * @param amount_ The amount of rSOLEX tokens to mint.
     */
    function mint(address to_, uint256 amount_) external;

    /**
     * @notice Returns the address of the SOLEX token.
     * @return address The SOLEX token contract address.
     */
    function token() external view returns (address);

    /**
     * @notice Returns the address of the Voting Escrow contract.
     * @return address The Voting Escrow contract address.
     */
    function votingEscrow() external view returns (address);
}
