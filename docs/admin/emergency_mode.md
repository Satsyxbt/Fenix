## Emergency functions
The protocol includes several emergency functions designed to protect the system and its users in extraordinary circumstances:

Short list:
* `PairFactory.setPause(bool _state)`
* `PairFactory.setIsPublicPoolCreationMode(bool mode_)`
* `Fenix-dex-v3` - replace plugin with pause functionality
* `Bribe.emergencyRecoverERC20(address tokenAddress, uint256 tokenAmount)`
* `Bribe.recoverERC20AndUpdateData(address tokenAddress, uint256 tokenAmount)`
* `Gauge.activateEmergencyMode()`
* `Gauge.stopEmergencyMode()`
* `FeesVault.emergencyRecoverERC20(address token_, uint256 amount_)`
* `RFenix.recoverToken(uint256 amount_)`
* `VeBoost.recoverTokens(address token_, uint256 recoverAmount_)`
  
### Dex v2 
For Dex v2, an authorized address has the capability to pause all swaps across all pairs.
1. **Pause All Swaps**: Use the `setPause(bool _state)` method on the `PairFactory` to pause all pairs. This action can only be performed by an authorized address.
2. **Disable Public Pair Creation**: Use the `setIsPublicPoolCreationMode(bool mode_)` method to disable public pair creation from unauthorized addresses.

**The target of the call must be a contract: PairFactory (dex v2 pair factory)**

### Dex v3
**!!! Important:** The process of shutting down all pools is a long process and cannot be done in the shortest possible time, and preparations need to be made in advance to improve this situation

Stopping actions in a pool in Dex v3 requires replacing the connected standard plugin with an `AlgebraStubPlugin`.

* `Replace Plugin`: Manually replace the standard plugin with `AlgebraStubPlugin`. This action requires developer intervention and cannot be executed by a simple method.
  
**The target of the call must be the contract: `AlgebraV3Factory`, `BasePluginFactory`**

### Gauges
Each gauge has an option to activate an emergency mode, stopping deposits and allowing emergency withdrawals.
* **Activate Emergency Mode**: Use the `activateEmergencyMode()` method to enable emergency mode on a gauge.
* **Stop Emergency Mode**: Use the `stopEmergencyMode()` method to disable emergency mode when the situation is resolved.
  
### Bribes
For each Gauge, 2 Bribe (internal & external) are created, which have the following methods for emergency situations:
* **Recover ERC20 and Update Bribe Data**: Use the `recoverERC20AndUpdateData(address tokenAddress, uint256 tokenAmount)` method to recover ERC20 tokens from the contract and update the associated bribe data.
* **Emergency Recover ERC20**: Use the `emergencyRecoverERC20(address tokenAddress, uint256 tokenAmount)` method to recover ERC20 tokens in an emergency. Note that this method may cause getReward() to fail if called in the last epoch due to missing rewards.

### FeesVault
The `FeesVault` for each `PairFactory` and `AlgebraV3Pool` includes an emergency function to recover ERC20 tokens.

* **Emergency Recover ERC20**: Use the `emergencyRecoverERC20(address token_, uint256 amount_)` method to recover ERC20 tokens from the FeesVault. This action is restricted to callers with the `FEES_VAULT_ADMINISTRATOR_ROLE`.


### RFenix
The RFenix contract includes a function to recover FNX tokens in emergency situations.
* **Recover FNX Tokens**: Use the `recoverToken(uint256 amount_)` method to recover FNX tokens from the contract. This action can only be performed by the owner.

### VeBoost
The VeBoostUpgradeable contract includes a function to recover tokens in emergency situations.
* **Recover Tokens**: Use the `recoverTokens(address token_, uint256 recoverAmount_)` method to recover specified tokens from the contract. This action can only be performed by the owner.


## Code Snippets
```js
PairFactory.setPause(true);
PairFactory.setIsPublicPoolCreationMode(false);

Gauge-*.activateEmergencyMode()
Gauge-*.stopEmergencyMode()

Bribe-*.recoverERC20AndUpdateData(address tokenAddress, uint256 tokenAmount)
Bribe-*.emergencyRecoverERC20(address tokenAddress, uint256 tokenAmount)

FeesVault-*.emergencyRecoverERC20(address token_, uint256 amount_)

RFenix.recoverToken(uint256 amount_)

VeBoost.recoverTokens(address token_, uint256 recoverAmount_)
```