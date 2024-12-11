# BribeVeFNXRewardToken Overview

## Purpose

The `BribeVeFNXRewardToken` contract serves as an intermediary mechanism for converting FNX-based rewards into governance-weighted veFNX positions through the `VotingEscrow` contract. This intermediary token, called `brVeFNX`, simplifies the integration of bribe mechanisms by managing the complex conversion of FNX into veFNX NFTs.

### Key Features:
1. **FNX Conversion:** Users can deposit FNX and receive `brVeFNX` tokens.
2. **Automatic veFNX Lock Creation:** Transfers of `brVeFNX` to non-whitelisted addresses automatically trigger a conversion into veFNX NFTs.
3. **Role-Based Control:** Administrators manage configurations, while minters and whitelisted addresses have specific privileges.

## Core Functionalities

### Minting `brVeFNX`
The `mint` function allows entities with the `MINTER_ROLE` to mint `brVeFNX` tokens in exchange for FNX deposits.

- **Use Case:** Entities or contracts can introduce FNX rewards into the system by minting `brVeFNX`.
- **Access Control:** Only addresses with `MINTER_ROLE` can call this function.

### Automatic Conversion to veFNX
When `brVeFNX` tokens are transferred to a non-whitelisted address, they are:
1. Burned by the `BribeVeFNXRewardToken` contract.
2. Converted into veFNX NFTs via the `VotingEscrow` contract.

This ensures that the end-users receive governance-weighted veFNX positions.

### Configuration Management
Admins with the `DEFAULT_ADMIN_ROLE` can update the parameters for veFNX lock creation, including:
- Lock duration.
- Boosting options.
- Permanent lock settings.
- Managed token attachments.

## Methods and Events

### Methods

#### `mint(address to_, uint256 amount_)`
**Description:** Mints `brVeFNX` tokens for a specified address in exchange for FNX deposits.

**Parameters:**
- `to_`: Address receiving the minted `brVeFNX` tokens.
- `amount_`: Amount of FNX deposited and `brVeFNX` tokens minted.

**Requirements:**
- Caller must have the `MINTER_ROLE`.
- FNX tokens must be approved for transfer to the contract.

---

#### `updateCreateLockParams(CreateLockParams memory createLockParams_)`
**Description:** Updates the parameters used for creating veFNX locks upon automatic conversion.

**Parameters:**
- `createLockParams_`: Struct containing:
  - `lockDuration`: Duration for FNX locks (in seconds).
  - `shouldBoosted`: Whether the veFNX position should be boosted.
  - `withPermanentLock`: If true, the lock is permanent.
  - `managedTokenIdForAttach`: Attach created veFNX to a managed token ID if non-zero.

**Requirements:**
- Caller must have the `DEFAULT_ADMIN_ROLE`.

**Emitted Events:**
- `UpdateCreateLockParams` with the new parameters.

---

#### `createLockParams()`
**Description:** Retrieves the current parameters for veFNX lock creation.

**Returns:**
- `lockDuration`: Lock duration in seconds.
- `shouldBoosted`: Whether the lock is boosted.
- `withPermanentLock`: Permanent lock status.
- `managedTokenIdForAttach`: Managed token ID for attachment.

---

### Events

#### `UpdateCreateLockParams(CreateLockParams createLockParams)`
**Emitted When:**
- The lock parameters are updated by an admin.

**Parameters:**
- `createLockParams`: Struct with updated lock configuration.

---

## Roles and Access Control

### `MINTER_ROLE`
- **Purpose:** Allows entities to mint `brVeFNX` tokens.
- **Assigned To:** Trusted entities or contracts managing reward flows.

### `WHITELIST_ROLE`
- **Purpose:** Prevents automatic veFNX conversion for certain recipients.
- **Assigned To:** Addresses exempt from the burn-and-lock mechanism.

### `DEFAULT_ADMIN_ROLE`
- **Purpose:** Allows full control over contract configurations, including:
  - Updating lock parameters.
  - Managing roles.
- **Assigned To:** Governance or administrative entities.

## How It Works

### Workflow
1. **Minting Rewards:**
   - A `MINTER_ROLE` entity deposits FNX and mints `brVeFNX` tokens for distribution.
2. **Reward Distribution:**
   - `brVeFNX` tokens are sent to users or bribe contracts.
3. **Automatic Conversion:**
   - When a non-whitelisted address receives `brVeFNX`:
     - Tokens are burned.
     - FNX is locked in the `VotingEscrow` contract.
     - The recipient receives a veFNX NFT.

### Example
1. Admin configures lock parameters:
   ```solidity
   createLockParams({
       lockDuration: 15724800, // 6 months
       shouldBoosted: true,
       withPermanentLock: false,
       managedTokenIdForAttach: 0
   });
   ```
2. A minter mints 1,000 `brVeFNX` tokens for a bribe contract.
3. A user claims rewards and receives a veFNX NFT corresponding to the burned `brVeFNX`.