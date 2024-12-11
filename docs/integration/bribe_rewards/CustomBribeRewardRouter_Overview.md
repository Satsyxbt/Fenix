
# CustomBribeRewardRouter -  Overview

## Introduction

`CustomBribeRewardRouter` serves as a bridge that facilitates the distribution of FNX-based rewards to external "bribe" contracts associated with various pools. Since external bribe contracts do not natively handle veFNX tokens (veFNX are represented as NFTs derived from locked FNX), the router uses an intermediary token (`brVeFNX`) to integrate veFNX-like rewards seamlessly. Ultimately, users who claim rewards from these bribe contracts receive veFNX NFTs

## Key Concepts

1. **FNX to veFNX as Rewards via `notifyRewardFNXInVeFNX`**  
   Users can provide FNX tokens to the router, which converts them into `brVeFNX` and notifies the appropriate external bribe contract for a specified pool that new rewards are available. This allows the introduction of FNX-derived rewards without directly handling veFNX NFTs at this initial stage.

2. **veFNX as Rewards via `notifyRewardVeFNXInVeFnx`**  
   Users can also provide a veFNX NFT to the router. The router burns the NFT, reclaims the underlying FNX, converts that FNX into `brVeFNX`, and then notifies the appropriate external bribe contract. This process effectively transforms locked veFNX positions into rewards that can be distributed through bribe contracts.

**Any user** can perform these actions when the corresponding methods are enabled.

## Associated Contracts and Roles

- **Voter Contract (`voter`)**

- **BribeVeFNXRewardToken (brVeFNX)**:  
  An intermediary ERC20 token that represents converted FNX.  
  When FNX is introduced as a reward, it is converted to `brVeFNX`.  
  When `brVeFNX` is ultimately claimed by users from the bribe contracts, it triggers a conversion into veFNX NFTs via `VotingEscrow`, and the `brVeFNX` tokens are burned.
  
  **Workflow with `brVeFNX`:**
  1. FNX → brVeFNX (introduction of rewards).
  2. brVeFNX sent to bribe contracts.
  3. On user claims: brVeFNX → veFNX NFT (via `VotingEscrow`) and brVeFNX is burned.

- **VotingEscrow**

### Roles

- **DEFAULT_ADMIN_ROLE**:
  - Can call `setupFuncEnable` to enable or disable contract methods.
  - Can update `createLockParams` on `BribeVeFNXRewardToken`.
  
- **MINTER_ROLE** (on the `BribeVeFNXRewardToken` contract):
  - Entities with this role can mint `brVeFNX` tokens by depositing FNX.
  
- **WHITELIST_ROLE** (on the `BribeVeFNXRewardToken` contract):
  - Addresses with this role are exempt from automatic conversion of `brVeFNX` into veFNX NFTs when they receive `brVeFNX`.

## Contract Initialization and Configuration

- **initialize(address blastGovernor_, address voter_, address bribeVeFnxRewardToken_)**  
  Initializes the `CustomBribeRewardRouter`:
  - Sets `blastGovernor` for governor-controlled logic.
  - Sets `voter` to map pools to external bribes.
  - Sets `bribeVeFnxRewardToken` as the intermediary token contract.

- **setupFuncEnable(bytes4 funcSign_, bool isEnable_)**  
  Allows admins (`DEFAULT_ADMIN_ROLE`) to enable or disable specific functions by their 4-byte selector.  
  For example:  
  `setupFuncEnable(ICustomBribeRewardRouter.notifyRewardFNXInVeFNX.selector, true);`

## Main Methods

### `notifyRewardFNXInVeFNX(address pool_, uint256 amount_)`

**Description:**  
Converts regular FNX tokens into `brVeFNX` and allocates them as rewards to the bribe contract associated with `pool_`.

**Parameters:**
- `pool_`: Address of the pool for which rewards are allocated.
- `amount_`: Amount of FNX to be converted into `brVeFNX`.

**Workflow:**
1. The caller approves this contract to spend `amount_` FNX.
2. `notifyRewardFNXInVeFNX` transfers FNX from the caller, converts it into `brVeFNX`.
3. The router queries `voter` to find the external bribe contract linked to `pool_`.
4. It then approves and notifies that external bribe contract of the new `brVeFNX` reward.

**Requirements:**
- The function must be enabled via `setupFuncEnable`.
- Valid external bribe contract mapping must exist for `pool_`.
- The caller must have sufficient FNX approved for the transfer.

**Emitted Event:**  
`NotifyRewardFNXInVeFnx(caller, pool_, externalBribe, amount_)`

### `notifyRewardVeFNXInVeFnx(address pool_, uint256 tokenId_)`

**Description:**  
Converts a veFNX NFT into `brVeFNX` rewards for a given pool.

**Parameters:**
- `pool_`: Address of the pool for which rewards are allocated.
- `tokenId_`: The ID of the veFNX NFT to be converted into rewards.

**Workflow:**
1. The caller transfers the veFNX NFT to this contract.
2. If the NFT was permanently locked, it may be unlocked first.
3. `votingEscrow.burnToBribes(tokenId_)` is called to convert the NFT back to FNX.
4. Convert FNX into `brVeFNX`.
5. Determine the external bribe contract via `voter` and notify it.

**Requirements:**
- The function must be enabled.
- A valid external bribe contract must exist for `pool_`.
- The veFNX NFT must be in a state that allows burning.

**Emitted Event:**  
`NotifyRewardVeFNXInVeFnx(caller, pool_, externalBribe, tokenId_, amount)`

## Events

- **FuncEnabled(bytes4 funcSign, bool isEnable)**  
  Emitted when enabling or disabling a function’s availability.

- **NotifyRewardFNXInVeFnx(address indexed caller, address indexed pool, address indexed externalBribe, uint256 amount)**  
  Emitted when FNX is converted into `brVeFNX` and notified to an external bribe contract.

- **NotifyRewardVeFNXInVeFnx(address indexed caller, address indexed pool, address externalBribe, uint256 indexed tokenId, uint256 amount)**  
  Emitted when a veFNX NFT is burned, converted into `brVeFNX`, and notified to an external bribe contract.

## Errors

- **FunctionDisabled()**:  
  Thrown if a disabled function is called.

- **InvalidPool(address pool)**:  
  Thrown if the given `pool` does not map to a valid gauge or active external bribe contract.

- **InvalidBribe(address bribe)**:  
  Thrown if the external bribe address obtained is invalid (e.g., zero address).

## How to Use

1. **Initial Setup**:
   - An admin with `DEFAULT_ADMIN_ROLE` can enable/disable methods using `setupFuncEnable`.
   
2. **Distributing FNX-Based Rewards**:
   - Ensure `notifyRewardFNXInVeFNX` is enabled if not.
   - Approve the router to spend `amount` FNX.
   - Call `notifyRewardFNXInVeFNX(pool, amount)`.

3. **Distributing veFNX-Based Rewards**:
   - Ensure `notifyRewardVeFNXInVeFnx` is enabled if not.
   - Transfer your veFNX NFT to the router contract.
   - Call `notifyRewardVeFNXInVeFnx(pool, tokenId)`.

4. **Claiming Rewards from Bribe Contracts (User Perspective)**:
   - Users claim rewards from the bribe contract.
   - They receive veFNX NFTs, as `brVeFNX` is converted and burned in the process.
