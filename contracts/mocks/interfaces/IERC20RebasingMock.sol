// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

enum YieldMode {
    AUTOMATIC,
    VOID,
    CLAIMABLE
}

/**
 * @title IBlast Interface
 * @dev Interface for interacting with the Blast protocol, specifically for configuring
 * governance settings. This interface abstracts the function to set up a governor
 * within the Blast ecosystem.
 */
interface IERC20RebasingMock {
    /// @notice Emitted when an account configures their yield mode.
    /// @param account   Address of the account.
    /// @param yieldMode Yield mode that was configured.
    event Configure(address indexed account, YieldMode yieldMode);

    /// @notice Emitted when a CLAIMABLE account claims their yield.
    /// @param account   Address of the account.
    /// @param recipient Address of the recipient.
    /// @param amount    Amount of yield claimed.
    event Claim(address indexed account, address indexed recipient, uint256 amount);

    error InsufficientBalance();
    error InsufficientAllowance();
    error TransferFromZeroAddress();
    error TransferToZeroAddress();
    error ApproveFromZeroAddress();
    error ApproveToZeroAddress();
    error ClaimToZeroAddress();
    error NotClaimableAccount();

    function mint(address _to, uint256 _amount) external;

    function bridge() external view returns (address);

    function REPORTER() external view returns (address);

    function count() external view returns (uint256);

    function addValue(uint256 value) external;

    /// @notice --- ERC20 Interface ---

    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256 value);

    function allowance(address owner, address spender) external view returns (uint256);

    function transfer(address to, uint256 amount) external returns (bool);

    function approve(address spender, uint256 amount) external returns (bool);

    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    /// @notice --- Blast Interface ---

    /// @notice Query an account's configured yield mode.
    /// @param account Address to query the configuration.
    /// @return Configured yield mode.
    function getConfiguration(address account) external view returns (YieldMode);

    /// @notice Query an CLAIMABLE account's claimable yield.
    /// @param account Address to query the claimable amount.
    /// @return amount Claimable amount.
    function getClaimableAmount(address account) external view returns (uint256);

    /// @notice Claim yield from a CLAIMABLE account and send to
    ///         a recipient.
    /// @param recipient Address to receive the claimed balance.
    /// @param amount    Amount to claim.
    /// @return Amount claimed.
    function claim(address recipient, uint256 amount) external returns (uint256);

    /// @notice Change the yield mode of the caller and update the
    ///         balance to reflect the configuration.
    /// @param yieldMode Yield mode to configure
    /// @return Current user balance
    function configure(YieldMode yieldMode) external returns (uint256);
}
