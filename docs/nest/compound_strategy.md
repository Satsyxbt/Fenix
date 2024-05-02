# Compound VeFNX Managed NFT Strategy Upgradeable

## Overview
The `Compound VeFNX Managed NFT Strategy Upgradeable` is a smart contract designed to enhance the management of FENIX tokens through compounding rewards and stake management within a decentralized finance (DeFi) environment. This contract is an integral part of a broader system that utilizes non-fungible tokens (NFTs) to represent  financial strategies. It automates the process of reinvesting harvested rewards back into VeFNX, aiming to maximize returns and increase the underlying voting power of the tokens.


## Reward Lifecycle
Rewards are accumulated over time and become accessible when participants choose to detach from the strategy. The amount of reward a user receives is proportional to their share of the total amount staked in the strategy.
The reward is given to the user in the new era, during the distribution in the distribution window. **But in any case, you should make sure that the reward has been given out before leaving the strategy**

## Functions
### Reward and Stake Information
#### The current value of the user's earned reward
```js
function getLockedRewardsBalance(uint256 tokenId_) external view returns (uint256)
```
Retrieves the total amount of locked rewards for a specific NFT identified by `tokenId`.

#### Get User Balance in the Strategy
```js
function balanceOf(uint256 tokenId_) external view returns (uint256)
```
Shows the current balance or stake of a specific NFT in the strategy.


#### Get Total Supply of Locked FNX
```js
function totalSupply() external view returns (uint256)
```
Return the total supply of FNX stakes managed by the strategy.

#### Get Strategy Name
```js
function name() external view returns (string)
```
Returns the name of the current strategy for identification purposes.

#### Get Managed veFNX NFT ID
```js
function managedTokenId() external view returns (uint256)
```
Provides the ID of the veFNX managed under this strategy, linking specific actions and rewards to it.

### Public functions
#### Compound FNX in veFNX managed nft
```js
function compound() external
```
Compounds all available FNX on the strategy's balance into the managed NFT’s VeFNX stake, thereby enhancing the voting power and future rewards potential.

#### Claim Bribes
```js
function claimBribes(address[] calldata bribes_, address[][] calldata tokens_) external
```
Allows anyone to claim the reward assigned to a given strategy for voting on it


#### Claim Rewards
```js
function claimRewards(address[] calldata bribes_, address[][] calldata tokens_) external
```
No direct application and intended for specific cases


### Public functions
#### Compound FNX in veFNX managed nft
```js
function compound() external
```
Compounds all available FNX on the strategy's balance into the managed NFT’s VeFNX stake, enhancing the voting power and potential future rewards.

#### Claim Bribes
```js
function claimBribes(address[] calldata bribes_, address[][] calldata tokens_) external
```
Allows anyone to claim the reward assigned to a given strategy for voting on it


### Authorized methods
#### Distribute managed nft vote power
```js
function vote(address[] calldata poolVote_, uint256[] calldata weights_) external onlyAuthorized
```
The authorized person has the right to distribute the voting power according to his/her own voting optimization algorithm


#### Tokens recover

```js
function erc20Recover(address token_, address recipient_) external
```
Allows an authorized person to withdraw reward tokens for the sale and redemption of Fenix with subsequent return to the strategy


#### Tokens Buyback by V2
```js
function buybackTokenByV2(
    address inputToken_,
    IRouterV2.route[] calldata inputRouters_,
    uint256 slippage_,
    uint256 deadline_
) external
```
**Description**: Facilitates the buyback of tokens by swapping a specified input token for a target token using a DEX V2 Router. The function ensures that the transaction adheres to specified slippage limits and is executed before a set deadline.

**Parameters**:
* `inputToken_`: The ERC20 token to be swapped.
* `inputRouters_`: An array of route structures defining the swap path and intermediaries for the token conversion.
* `slippage_`: The maximum allowed slippage for the swap, expressed in basis points.
* `deadline_`: The Unix timestamp after which the swap transaction must revert if not executed.
