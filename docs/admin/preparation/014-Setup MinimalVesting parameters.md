### Minimal Linear Vesting Parameters

#### Current Contract Parameters
The current contract parameters are:
```json
"minimalLinearVestingState": {
  "address": "0x4B9F15E357456364f715AddC6f120148767fc530",
  "owner": "0x0907fb24626a06e383BD289A0e9C8560b8cCC4b5",
  "token": "0x52f847356b38720B55ee18Cb3e094ca11C85A192",
  "startTimestamp": "1730937600",
  "startTimestampFormatted": "Thu, 07 Nov 2024 00:00:00 GMT",
  "duration": "15724800",
  "durationFormatted": "182 days",
  "totalAllocated": "0",
  "isClaimPhase": false
}
```

- **[MinimalLinearVesting](https://blastscan.io/address/0x4B9F15E357456364f715AddC6f120148767fc530)** - `0x4B9F15E357456364f715AddC6f120148767fc530`

#### Verification and Correction
Please verify the above parameters. If any corrections are needed, use the following methods. Note: modifications and allocations can only be made before the claim phase starts.

### Methods to Update Parameters

- **Update Vesting Parameters**
  
  **Method:** `setVestingParams(uint256 startTimestamp_, uint256 duration_)`
  - Updates the start timestamp and duration(in seconds) of the vesting period.
  - Can only be called by the owner before the claim phase begins.
  - Example usage:
  ```solidity
  MinimalLinearVestingUpgradeable("0x4B9F15E357456364f715AddC6f120148767fc530").setVestingParams(newStartTimestamp, newDuration);
  ```

#### [Optional] Allocate Tokens
If allocation lists are ready, assign token allocations and transfer FNX tokens using the following method:

- **Allocate Tokens to Wallets**
  
  **Method:** `setWalletsAllocation(address[] calldata wallets_, uint256[] calldata amounts_)`
  - Allocates tokens to specified wallets.
  - Can only be called by the owner before the claim phase starts.
  - Make sure FNX is approved before calling, as the contract will withdraw the necessary amount from the caller.
  - Example usage:
  ```solidity
  MinimalLinearVestingUpgradeable("0x4B9F15E357456364f715AddC6f120148767fc530").setWalletsAllocation(walletsArray, amountsArray);
  ```