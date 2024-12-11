# CustomBribeRewardRouter Integration Guide

## Contract Functions

### `notifyRewardFNXInVeFNX`

#### Function Signature
```solidity
/**
 * @notice Notifies an external bribe contract of FNX-based rewards by converting FNX into brVeFNX tokens.
 * @dev FNX tokens are transferred from the caller to this contract, then converted into brVeFNX tokens,
 *      and finally notified to the external bribe contract associated with the given pool.
 * @param pool_ The address of the pool for which the reward is being distributed.
 * @param amount_ The amount of FNX to convert and distribute as brVeFNX rewards.
 *
 * Emits a {NotifyRewardFNXInVeFnx} event.
 * Reverts if the function is disabled or the pool is invalid.
 */
function notifyRewardFNXInVeFNX(address pool_, uint256 amount_) external;
```

#### Description
This function allows a user to:
1. Convert FNX tokens into `brVeFNX`.
2. Notify the external bribe contract for the specified pool about the newly available rewards.

#### Requirements
- **Function Must Be Enabled:** Admin must ensure the function is enabled via `setupFuncEnable`.
- **FNX Approval:** Caller must approve the `CustomBribeRewardRouter` contract to spend the FNX tokens.
- **Valid Pool:** The specified `pool_` must map to a valid external bribe contract via the `voter` contract.

#### Parameters
- `pool_`: Address of the pool for which the rewards are distributed.
- `amount_`: Amount of FNX to be converted into `brVeFNX`.

#### Example Workflow
1. **Approve FNX Tokens:**
   ```solidity
   IERC20Upgradeable(fnxToken).approve(customBribeRewardRouter, amount);
   ```
2. **Call Function:**
   ```solidity
   customBribeRewardRouter.notifyRewardFNXInVeFNX(poolAddress, amount);
   ```
3. **Result:**
   - FNX is transferred to the router.
   - FNX is converted into `brVeFNX`.
   - The external bribe contract is notified about the new rewards.

---

### `notifyRewardVeFNXInVeFnx`

#### Function Signature
```solidity
/**
 * @notice Notifies an external bribe contract using FNX reclaimed from burning a veFNX NFT.
 * @dev A veFNX NFT is transferred from the caller to this contract, burned to reclaim FNX,
 *      then converted into brVeFNX, and finally notified to the external bribe contract.
 * @param pool_ The address of the pool for which the reward is being distributed.
 * @param tokenId_ The ID of the veFNX NFT to be burned to reclaim FNX.
 *
 * Emits a {NotifyRewardVeFNXInVeFnx} event.
 * Reverts if the function is disabled, the pool is invalid, or the NFT is not eligible to be burned.
 */
function notifyRewardVeFNXInVeFnx(address pool_, uint256 tokenId_) external;
```

#### Description
This function allows a user to:
1. Transfer a veFNX NFT to the router contract.
2. Burn the veFNX NFT to reclaim the underlying FNX.
3. Convert reclaimed FNX into `brVeFNX`.
4. Notify the external bribe contract for the specified pool about the rewards.

#### Requirements
- **Function Must Be Enabled:** Admin must ensure the function is enabled via `setupFuncEnable`.
- **veFNX Transfer Approval:** Caller must approve the router contract to transfer the specified veFNX NFT.
- **Valid Pool:** The specified `pool_` must map to a valid external bribe contract via the `voter` contract.
- **Burnable NFT:** The veFNX NFT must not be permanently locked or otherwise restricted.

#### Parameters
- `pool_`: Address of the pool for which the rewards are distributed.
- `tokenId_`: ID of the veFNX NFT to be burned.

#### Example Workflow
1. **Approve veFNX NFT Transfer:**
   ```solidity
   votingEscrow.approve(customBribeRewardRouter, tokenId);
   ```
2. **Call Function:**
   ```solidity
   customBribeRewardRouter.notifyRewardVeFNXInVeFnx(poolAddress, tokenId);
   ```
3. **Result:**
   - veFNX NFT is transferred to the router.
   - The NFT is burned to reclaim FNX.
   - FNX is converted into `brVeFNX`.
   - The external bribe contract is notified about the new rewards.

