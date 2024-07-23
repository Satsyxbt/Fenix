
### VeFnxSplitMerklAidrop Events

#### Events

##### Claim
```solidity
event Claim(address indexed user, uint256 claimAmount, uint256 toTokenAmount, uint256 toVeNFTAmount, uint256 tokenId);
```
- **Parameters:**
  - `user`: The address of the user who made the claim.
  - `claimAmount`: The total amount of tokens claimed by the user.
  - `toTokenAmount`: The amount of tokens transferred directly to the user.
  - `toVeNFTAmount`: The amount of tokens locked as veFNX.
  - `tokenId`: The ID of the veFNX lock created.
- **Emitted when:** A user successfully claims their allocated FNX and veFNX tokens.
- **Features**: if tokenId == 0, it means that it has not been minted by veNFT

##### SetMerklRoot
```solidity
event SetMerklRoot(bytes32 merklRoot);
```
- **Parameters:**
  - `merklRoot`: The new Merkle root.
- **Emitted when:** The Merkle root is set by the owner.

##### SetToVeFnxPercentage
```solidity
event SetToVeFnxPercentage(uint256 toVeFnxPercentage);
```
- **Parameters:**
  - `toVeFnxPercentage`: The new percentage of tokens to be locked as veFNX.
- **Emitted when:** The split percentage is set by the owner.

##### Paused
```solidity
event Paused(address account);
```
- **Parameters:**
  - `account`: The address that triggered the pause.
- **Emitted when:** The contract is paused.

##### Unpaused
```solidity
event Unpaused(address account);
```
- **Parameters:**
  - `account`: The address that triggered the unpause.
- **Emitted when:** The contract is unpaused.

##### Recover
```solidity
event Recover(address indexed account, uint256 amount);
```
- **Parameters:**
  - `account`: The address to which the recovered tokens are transferred.
  - `amount`: The amount of tokens recovered.
- **Emitted when:** The owner recovers FNX tokens from the contract.
