
# VotingEscrowUpgradeableV2 Overview

## Purpose
The `VotingEscrowUpgradeableV2` contract is designed to manage the locking of tokens in exchange for **veNFTs** (voting escrowed NFTs). These veNFTs represent voting power in governance systems and protocols, allowing users to participate in decentralized decision-making. The amount of voting power decays over time unless the tokens are **permanently locked**, in which case the voting power remains stable.

Key features of the contract include:
- **Permanent locking**: Provides constant voting power with no decay over time.
- **Boosted deposits**: Allows users to increase their voting power through integration with the **VeBoost** system.
- **Managed NFT attachments**: Enables attaching veNFTs to **Managed NFTs**, adding flexibility such as delegation or staking.

---

## Key Features

The table below outlines the main features of the `VotingEscrowUpgradeableV2` contract, along with availability for different veNFT state.

| **Feature**                           | **Description**                                                                                  | **Permanent Locked veNFT** | **Common/Temporarily Locked veNFT** | **Attached veNFT**            |
|---------------------------------------|--------------------------------------------------------------------------------------------------|----------------------------|------------------------------|-------------------------------|
| **Create Lock**                       | Lock tokens for a specified period in exchange for a veNFT.                                       | -                          | -                            | -                             |
| **Deposit for Lock**                  | Add more tokens to an existing lock to increase voting power.                                     | ✅                          | ✅                            | ❌                             |
| **Increase Lock Duration**            | Extend the duration of an existing temporary lock.                                                | ❌                          | ✅                            | ❌                             |
| **Permanent Lock**                    | Convert a temporary lock to a permanent one, providing constant voting power.                     | ❌                          | ✅                            | ❌                             |
| **Unlock Permanent Lock**             | Revert a permanent lock back to a temporary lock.                                                 | ✅                          | ❌                            | ❌                             |
| **Merge Locks**                       | Merge two veNFTs into one, combining their locked tokens and voting power.                        | ❌                          | ✅                            | ❌                             |
| **Withdraw Tokens**                   | Withdraw tokens after the lock expires.                                                           | ❌                          | ✅                            | ❌                             |
| **Attach to Managed NFT**             | Attach a veNFT to a managed NFT, allowing delegation or staking of voting power.                  | ✅                          | ✅                            | ❌                             |
| **Detach from Managed NFT**           | Detach a veNFT from a managed NFT, reclaiming the voting power.                                   | ❌                          | ❌                            | ✅                             |
| **Voting Power Calculation**          | Calculates the current voting power based on lock duration and boost factors.                     | ✅                          | ✅                            | ✅                             |
| **Token Metadata (URI)**              | Generates metadata for veNFTs, including locked tokens and voting power information.              | ✅                          | ✅                            | ✅                             |
---

## Voting Power Calculation

The voting power of veNFTs is determined by the number of locked tokens and the lock duration. For **temporary locks**, the voting power decays linearly as the expiration date approaches. For **permanent locks**, voting power remains constant.

Key parameters include:
- **Maximum lock duration**: 182 days (in seconds: `182 * 24 * 60 * 60 = 15724800` seconds).
- **Boosting**: Through **VeBoost**, users can increase their veNft balance during creation/deposit by meeting certain conditions, such as locking tokens for a minimum period and locking a sufficient number of tokens.

### Voting Power Formula

1. **Temporarily Locked Tokens**:  
   Voting power decays linearly as the expiration date approaches.
```math
voting\ power = \frac{locked\ tokens}{max\ lock\ duration} * remanining\ lock\ time

```


2. **Permanently Locked Tokens**:  
   Voting power is stable and does not decay over time.
```math
voting\ power = locked\ tokens
```

---

## Managed NFTs and veNFT Attachments

The contract allows veNFTs to be attached to **Managed NFTs**, enabling complex functionalities like delegation, staking, or pooling of voting power. While attached, the voting power associated with the veNFT is controlled by the Managed NFT. However, the original veNFT owner retains ownership rights.

---

## External Contract Integrations

`VotingEscrowUpgradeableV2` integrates with several external contracts for enhanced functionality:
- **VeBoost**: Allows users to boost their veNFT's balance by locking tokens under certain conditions.
- **ManagedNFTManager**: Handles the attachment and detachment of veNFTs to/from managed NFTs, allowing more dynamic use cases.

---
