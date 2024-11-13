# Nest Compound Flow

This document provides a detailed explanation of the workflow for compounding the rewards in the Nest strategy using the `CompoundVeFNXManagedNFTStrategyUpgradeable` smart contract.

### Step-by-Step Guide

1. **Update the Epoch Using `distributeAll()`**
   
   The first step involves updating the epoch for reward distribution. Call the `distributeAll()` function on the `Voter` contract. Unless someone else called it before. This is necessary to make the rewards of the past era available.
   
   - **Function Signature**:
     ```solidity
     function distributeAll() external;
     ```

## For every nest strategy
2. **Claim Rewards Using `claimBribes()`**

   After updating the epoch, you need to claim the rewards that have accumulated for the strategy. This is done by calling the `claimBribes()` function on the strategy `CompoundVeFNXManagedNFTStrategyUpgradeable` contract.  This call is identical to the call to claimBribes on the Voter contract by a simple user to receive a bribe for voting
   
   - **Function Signature**:
     ```solidity
     function claimBribes(address[] calldata bribes_, address[][] calldata tokens_) external;
     ```
   - **Parameters**:
     - `bribes`: Array of bribe contract addresses.
     - `tokens`: Array of arrays of token addresses corresponding to each bribe contract.
     - `tokenId`: The identifier of the managed NFT.

3. **Withdraw Necessary Tokens Using `erc20Recover()`**

   To continue, the necessary tokens need to be withdrawn from the strategy for swapping. Use the `erc20Recover()` function on the `CompoundVeFNXManagedNFTStrategyUpgradeable` contract to withdraw the required tokens (excluding `FENIX`) from the strategy. This step must be repeated for each Nest strategy.
   
   - **Function Signature**:
     ```solidity
     function erc20Recover(address token, address recipient) external;
     ```
   - **Parameters**:
     - `token`: The address of the ERC20 token to recover.
     - `recipient`: The address where the recovered tokens should be sent.

4. **Swap Tokens for `FNX`**

   With the required tokens in hand, proceed to swap these tokens for `FENIX` (`FNX`). This swap can be performed through an on-chain or off-chain mechanism, depending on the liquidity and availability of suitable decentralized exchange routes. The goal is to maximize the amount of `FNX` obtained from the other tokens. This step must be repeated for each Nest strategy.

5. **Transfer `FNX` to the Strategy**

   Once the tokens are swapped for `FNX`, transfer the acquired `FNX` tokens back to the `CompoundVeFNXManagedNFTStrategyUpgradeable` contract. This ensures that the `FNX` tokens are available for the next step, where the compounding process will take place. This step must be repeated for each Nest strategy.

6. **Call `compound()` to Distribute Compound Rewards**

   Finally, call the `compound()` function on the `CompoundVeFNXManagedNFTStrategyUpgradeable` contract to reinvest the harvested `FNX` tokens back into the Nest. This function will lock up the `FNX` tokens using the voting escrow mechanism, increasing the voting power and the locked balance of the managed NFT. This step must be repeated for each Nest strategy.
   
   - **Function Signature**:
     ```solidity
     function compound() external;
     ```

### Example
```
// Step 1: Update the Epoch for
Voter.distributeAll(); // Updates the epoch

// Step 2-6: Repeat for Each Nest Strategy

// --- First Nest Strategy ---
// Claim all bribe rewards from available bribe addresses
CompoundVeFNXManagedNFTStrategyUpgradeable.claimBribes([0xBribe1, 0xBribe2], [[0xFNX], [0xUSDB, 0xWETH]], tokenId);

// Withdraw WETH and USDB bribes from strategy
CompoundVeFNXManagedNFTStrategyUpgradeable.erc20Recover(0xWETH, 0xFenixAdmin);
CompoundVeFNXManagedNFTStrategyUpgradeable.erc20Recover(0xUSDB, 0xFenixAdmin);

// Swap WETH and USDB for FNX using a DEX such as Algebra V3 SwapRouter
AlgebraV3SwapRouter.swap(0xWETH, 0xFNX, swapAmount); // Swap WETH for FNX
AlgebraV3SwapRouter.swap(0xUSDB, 0xFNX, swapAmount); // Swap USDB for FNX

// Transfer FNX back to the strategy
FNX.transfer(CompoundVeFNXManagedNFTStrategyUpgradeable, swapOutAmount);

// Reinvest FNX tokens back into the strategy to compound rewards
CompoundVeFNXManagedNFTStrategyUpgradeable.compound();

// Repeat the same process for each strategy
...

```
