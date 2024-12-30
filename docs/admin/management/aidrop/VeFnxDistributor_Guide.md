
# VeFnxDistributor Guide


## Key Functionalities

### 1. Roles and Permissions
The contract uses **OpenZeppelin’s** Access Control to manage roles:
- `_DISTRIBUTOR_ROLE`: Authorized accounts that can trigger `distributeVeFnx`.
- `_WITHDRAWER_ROLE`: Authorized accounts that can recover tokens from the contract.
- `DEFAULT_ADMIN_ROLE`: Holds the highest authority (typically the contract deployer); can grant/revoke other roles.

---

### 2. Initialization
Before using the contract, it must be initialized. The initialization process sets the **FNX** and **Voting Escrow** addresses, along with the **Blast Governor** address for governance integration.

**Function**: `initialize`
- **Signature**: 
  ```solidity
  function initialize(address blastGovernor_, address fenix_, address votingEscrow_) external initializer
  ```
- **Parameters**:
  - `blastGovernor_ (address)`: The address of the Blast Governor contract.
  - `fenix_ (address)`: The address of the **FNX** token contract (must not be zero).
  - `votingEscrow_ (address)`: The address of the **Voting Escrow** contract (must not be zero).
- **Access Control**: Can only be called once (initializer).
- **Usage**: Sets up required addresses and grants `DEFAULT_ADMIN_ROLE` to the caller.

---

### 3. Managing Whitelisted Reasons
The contract allows whitelisting specific “reasons” for airdrops. Any airdrop must supply a whitelisted `reason`.

#### Function: `setWhitelistReasons`
- **Signature**:
  ```solidity
  function setWhitelistReasons(string[] calldata reasons_, bool[] calldata isWhitelisted_) external
  ```
- **Parameters**:
  - `reasons_`: Array of reasons (strings) to whitelist or un-whitelist.
  - `isWhitelisted_`: Corresponding boolean array (same length) indicating `true` for whitelisting and `false` for removing from the whitelist.
- **Access Control**: Only callable by `DEFAULT_ADMIN_ROLE`.
- **Important Considerations**:
  - If the array lengths do not match, the function reverts with `ArrayLengthMismatch`.
  - Emits the `SetWhitelistReasons` event.

#### Function: `isWhitelistedReason`
- **Signature**:
  ```solidity
  function isWhitelistedReason(string memory reason_) external view returns (bool)
  ```
- **Usage**: Returns `true` if the supplied reason is currently whitelisted, `false` otherwise.

---

### 4. Distributing veFnx Tokens
The contract’s primary function is to **lock FNX tokens** in the Voting Escrow contract, creating **veFnx** for specified recipients. A distribution requires both:
1. A whitelisted `reason`.
2. A batch of recipients with the amounts/durations to lock.

#### Function: `distributeVeFnx`
- **Signature**:
  ```solidity
  function distributeVeFnx(string memory reason_, AidropRow[] calldata rows_) external
  ```
- **Parameters**:
  - `reason_ (string)`: A whitelisted string describing the purpose of this airdrop.
  - `rows_ (AidropRow[])`: An array of `AidropRow` structs containing:
    - `recipient (address)`: The address receiving veFnx.
    - `withPermanentLock (bool)`: Whether the veFnx position is permanently locked.
    - `lockDuration (uint256)`: Duration (in seconds) for which FNX is locked.
    - `amount (uint256)`: Amount of FNX tokens to lock.
    - `managedTokenIdForAttach (uint256)`: ID of a managed token to attach veFnx to (if applicable).
- **Access Control**: Only callable by accounts with `_DISTRIBUTOR_ROLE`.
- **Logic Flow**:
  1. Checks if `reason_` is whitelisted. If not, reverts with `NotWhitelistedReason`.
  2. Sums up all `amount` values to ensure the contract holds enough FNX. If not, reverts with `InsufficientBalance`.
  3. Approves the total sum of FNX to the Voting Escrow contract.
  4. Locks the tokens for each recipient, creating corresponding veFnx token IDs.
  5. Emits:
     - `AirdropVeFnx` event for each recipient.
     - `AidropVeFnxTotal` event summarizing the total distribution.

- **Important Considerations**:
  - If any `recipient` is the zero address, the transaction reverts with `ZeroRecipientAddress`.
  - The caller must ensure the contract has sufficient FNX before distribution.

---

### 5. Recovering Tokens
The contract can store FNX for distribution, but it may also receive other tokens by mistake. Authorized accounts can recover these tokens.

#### Function: `recoverTokens`
- **Signature**:
  ```solidity
  function recoverTokens(address token_, uint256 recoverAmount_) external
  ```
- **Parameters**:
  - `token_ (address)`: The address of the token to recover.
  - `recoverAmount_ (uint256)`: The amount of tokens to recover.
- **Access Control**: Only accounts with `_WITHDRAWER_ROLE`.
- **Behavior**:
  - Transfers `recoverAmount_` of `token_` back to the caller.
  - Emits the `RecoverToken` event.

---

## Events
1. **SetWhitelistReasons**:
   - **Emitted When**: `setWhitelistReasons` is called.
   - **Parameters**:
     - `string[] reasons`: Reasons to add/remove.
     - `bool[] isWhitelisted`: Corresponding whitelisting statuses.

2. **AirdropVeFnx**:
   - **Emitted When**: `distributeVeFnx` successfully locks FNX for an individual recipient.
   - **Parameters**:
     - `recipient (address)`: The recipient receiving veFnx.
     - `reason (string)`: Whitelisted reason for this airdrop.
     - `tokenId (uint256)`: ID of the new veFnx in Voting Escrow.
     - `amount (uint256)`: Amount of FNX locked.

3. **AidropVeFnxTotal**:
   - **Emitted When**: `distributeVeFnx` finishes distributing to all recipients in a batch.
   - **Parameters**:
     - `caller (address)`: The account that initiated the distribution.
     - `reason (string)`: Whitelisted reason for this airdrop batch.
     - `totalDistributionSum (uint256)`: Total FNX locked in this distribution.

4. **RecoverToken**:
   - **Emitted When**: `recoverTokens` is called to recover tokens.
   - **Parameters**:
     - `token (address)`: Token address recovered.
     - `recoverAmount (uint256)`: Amount of token recovered.

---

## Quick Reference

1. **Roles**:
   - `_DISTRIBUTOR_ROLE`: Distribute veFnx.
   - `_WITHDRAWER_ROLE`: Recover tokens.
   - `DEFAULT_ADMIN_ROLE`: Can grant/revoke other roles.

2. **Key Errors**:
   - `InsufficientBalance()`: Not enough FNX in the contract for distribution.
   - `ZeroRecipientAddress()`: Attempting distribution to a zero address.
   - `NotWhitelistedReason()`: Trying to distribute veFnx with a non-whitelisted `reason`.
   - `ArrayLengthMismatch()`: `reasons_` and `isWhitelisted_` arrays have different lengths in `setWhitelistReasons`.

3. **General Workflow**:
   1. Call `setWhitelistReasons` to whitelist a distribution reason.
   2. Fund the `VeFnxDistributorUpgradeable` contract with enough FNX.
   3. Call `distributeVeFnx(reason_, rows_)` using a whitelisted `reason_`.
   4. (Optional) If needed, call `recoverTokens(token_, amount)` to withdraw any stray tokens.

---

## Example Usage

**1. Initialize the Contract**
```solidity
// Only called once, typically right after contract deployment.
veFnxDistributor.initialize(
    blastGovernorAddress,
    fenixTokenAddress,
    votingEscrowAddress
);
```

**2. Whitelist a New Reason**
```solidity
string[] memory reasons = new string[](1);
reasons[0] = "Rise: Bribes";

bool[] memory statuses = new bool[](1);
statuses[0] = true;

veFnxDistributor.setWhitelistReasons(reasons, statuses);
// "Rise: Bribes" is now whitelisted
```

**3. Distribute veFnx**
```solidity
IVeFnxDistributor.AirdropRow[] memory rows = new IVeFnxDistributor.AirdropRow[](2);

rows[0] = IVeFnxDistributor.AirdropRow({
    recipient: 0xRecipient1,
    withPermanentLock: false,
    lockDuration: 182 days,
    amount: 1000e18,
    managedTokenIdForAttach: 0
});

rows[1] = IVeFnxDistributor.AirdropRow({
    recipient: 0xRecipient2,
    withPermanentLock: true,
    lockDuration: 90 days,
    amount: 2000e18,
    managedTokenIdForAttach: 1
});

// reason_ must be one of the whitelisted reasons
veFnxDistributor.distributeVeFnx("Rise: Bribes", rows);
```

**4. Recover Tokens (If Needed)**
```solidity
// Only callable by an account with _WITHDRAWER_ROLE
veFnxDistributor.recoverTokens(someOtherToken, 500e18);
```

**JavaScript Example**:
```js
await veFnxDistributor.setWhitelistReasons(
  ["Rise: Bribes"],
  [true]
);

await veFnxDistributor.distributeVeFnx(
  "Rise: Bribes",
  [
    {
      recipient: "0xRecipient1",
      withPermanentLock: false,
      lockDuration: 60 * 60 * 24 * 30, // 30 days
      amount: ethers.utils.parseEther("1000"),
      managedTokenIdForAttach: 0
    },
    {
      recipient: "0xRecipient2",
      withPermanentLock: true,
      lockDuration: 60 * 60 * 24 * 60, // 60 days
      amount: ethers.utils.parseEther("2000"),
      managedTokenIdForAttach: 1
    }
  ]
);
```

---

# Changelog
- **Added Whitelisting for Reasons**:
  - Introduced `setWhitelistReasons` and `isWhitelistedReason`.
  - A new parameter `reason_` in `distributeVeFnx` requiring whitelisting.
  - New error `NotWhitelistedReason`.
- **Role-Based Access**:
  - Replaced `onlyOwner` with `_DISTRIBUTOR_ROLE` for distributions and `_WITHDRAWER_ROLE` for recoveries.
  - Expanded events and error messages for clarity.
  - Introduced the `ArrayLengthMismatch` error for handling `setWhitelistReasons` inputs.
- **Minor Updates**:
  - Updated NatSpec to reflect new parameter names (`AirdropRow` structure).
  - Enhanced error-handling and event logging (`AidropVeFnxTotal` event → `AirdropVeFnxTotal`).
  - General code refactoring and documentation improvements.
