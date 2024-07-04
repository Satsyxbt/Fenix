
# PerpetualsTradersRewarderUpgradeable Contract

## Signature Mechanism

To claim rewards, users must provide a valid signature. The signature is generated using the total amount of rewards that the user is entitled to receive. This signature is verified by the contract to authorize the claim.

## Emergency mode
To stop distribution rewards, `owner()` should call `setSigner` with different address or zero address. This will invalidate existing signatures

## Events

### SetSigner
```solidity
event SetSigner(address indexed signer);
```
**Parameters:**
- `signer`: The address of the new signer.

Emitted when the signer address is set.

### Reward
```solidity
event Reward(address indexed caller, uint256 indexed timestamp, uint256 indexed amount);
```
**Parameters:**
- `caller`: The address of the caller notifying the reward.
- `timestamp`: The timestamp when the reward was notified.
- `amount`: The amount of tokens notified.

Emitted when a reward is notified.

### Claim
```solidity
event Claim(address indexed user, uint256 indexed timestamp, uint256 indexed amount);
```
**Parameters:**
- `user`: The address of the user making the claim.
- `timestamp`: The timestamp when the claim was made.
- `amount`: The amount of tokens claimed.

Emitted when a user claims their reward.

## Methods

### initialize
```solidity
function initialize(address blastGovernor_, address gauge_, address token_, address signer_) external;
```
**Parameters:**
- `blastGovernor_`: The address of the BlastGovernor.
- `gauge_`: The address of the gauge.
- `token_`: The address of the reward token.
- `signer_`: The address of the signer.

Initializes the contract.

### setSigner
```solidity
function setSigner(address signer_) external;
```
**Parameters:**
- `signer_`: The address of the new signer.

Sets the signer address.

### notifyRewardAmount
```solidity
function notifyRewardAmount(address token_, uint256 rewardAmount_) external;
```
**Parameters:**
- `token_`: The address of the reward token.
- `rewardAmount_`: The amount of reward tokens.

Notifies a reward amount.

### claim
```solidity
function claim(uint256 amount_, bytes memory signature_) external returns (uint256 reward);
```
**Parameters:**
- `amount_`: The amount of tokens to claim.
- `signature_`: The signature of the claim.

**Returns:**
- `reward`: The amount of reward tokens claimed.

Claims the reward for the user.

### gauge
```solidity
function gauge() external view returns (address);
```
**Returns:**
- `The address of the gauge.`

Returns the address of the gauge.

### signer
```solidity
function signer() external view returns (address);
```
**Returns:**
- `The address of the signer.`

Returns the address of the signer.

### token
```solidity
function token() external view returns (address);
```
**Returns:**
- `The address of the reward token.`

Returns the address of the reward token.

### totalReward
```solidity
function totalReward() external view returns (uint256);
```
**Returns:**
- `The amount of notified tokens reward.`

Returns the amount of tokens total reward.

### claimed
```solidity
function claimed(address user_) external view returns (uint256);
```
**Parameters:**
- `user_`: The address of the user.

**Returns:**
- `The amount of tokens claimed by the user.`

Returns the amount of tokens claimed by a user.

### totalClaimed
```solidity
function totalClaimed() external view returns (uint256);
```
**Returns:**
- `The total amount of tokens claimed.`

Returns the total amount of tokens claimed.
