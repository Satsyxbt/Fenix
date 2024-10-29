### VeFnxSplitMerklAidropUpgradeable Events

#### Events

##### Claim
```solidity
event Claim(address indexed user, uint256 claimAmount, uint256 toTokenAmount, uint256 toVeNFTAmount, uint256 tokenId);
```
- **Parameters:**
  - `user`: The address of the user who made the claim.
  - `claimAmount`: The total amount of tokens claimed by the user.
  - `toTokenAmount`: The amount of tokens transferred directly to the user.
  - `toVeNFTAmount`: The amount of tokens locked as veNFT.
  - `tokenId`: The ID of the veNFT lock created.
- **Emitted when:** A user successfully claims their allocated tokens, either as pure tokens or as veNFT tokens.
- **Features**: If `tokenId == 0`, it means that no veNFT was minted.

##### SetMerklRoot
```solidity
event SetMerklRoot(bytes32 merklRoot);
```
- **Parameters:**
  - `merklRoot`: The new Merkle root.
- **Emitted when:** The Merkle root is set by the owner to verify user claims.

##### SetPureTokensRate
```solidity
event SetPureTokensRate(uint256 pureTokensRate);
```
- **Parameters:**
  - `pureTokensRate`: The new rate for pure tokens.
- **Emitted when:** The pure tokens rate is set by the owner.

##### SetIsAllowedClaimOperator
```solidity
event SetIsAllowedClaimOperator(address operator, bool isAllowed);
```
- **Parameters:**
  - `operator`: The address of the claim operator.
  - `isAllowed`: A boolean indicating whether the operator is allowed to make claims on behalf of others.
- **Emitted when:** The owner sets the allowed status for a claim operator.

##### Paused
```solidity
event Paused(address account);
```
- **Parameters:**
  - `account`: The address that triggered the pause.
- **Emitted when:** The contract is paused by the owner.

##### Unpaused
```solidity
event Unpaused(address account);
```
- **Parameters:**
  - `account`: The address that triggered the unpause.
- **Emitted when:** The contract is unpaused by the owner.

##### Recover
```solidity
event Recover(address indexed account, uint256 amount);
```
- **Parameters:**
  - `account`: The address to which the recovered tokens are transferred.
  - `amount`: The amount of tokens recovered.
- **Emitted when:** The owner recovers tokens from the contract.

