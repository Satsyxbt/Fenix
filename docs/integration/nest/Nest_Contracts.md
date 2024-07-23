# Contracts Overview
## ManagedNFTManagerUpgradeable
The Managed NFT Manager Upgradeable is designed to manage the lifecycle and access of NFTs within a strategy-oriented ecosystem. This contract integrates with a governance framework and voting escrow mechanisms to provide a controlled environment for managing NFTs that are linked to specific strategies or utilities. Here are the primary roles and functionalities of this contract:
* **Managed NFT Lifecycle Management**: It handles the creation, activation, deactivation, and removal of managed NFTs, ensuring that each NFT's lifecycle is tightly controlled and monitored.
* **Access Control Management**: Utilizing role-based access control, it governs who can perform administrative actions, manage NFT settings, and interact with specific NFTs. This includes assigning roles for NFT management and restricting certain actions to authorized users only.
* **NFT and Strategy Linking**: The contract facilitates the attachment of regular user-owned NFTs to managed NFTs, effectively linking user NFTs to specific strategies governed by the managed NFTs. This system allows for the dynamic application of strategies to user assets based on the managed NFT they are linked to.
* **Operational Flexibility**: It allows for the disabling or enabling of managed NFTs, providing administrative control over their operational status, which can be crucial during upgrades, maintenance, or security-related pauses.

## CompoundVeFNXManagedNFTStrategyUpgradeable
It is one of the strategies to optimize the voting process and manage managed veNFTs

## CompoundVeFNXManagedNFTStrategy-SingelTokenVirtualRewarderUpgradeable
The Single Token Virtual Rewarder Upgradeable contract is designed to manage token rewards in a virtualized system where balances and rewards are tracked over epochs using checkpoints.

## CompoundVeFNXManagedNFTStrategy-SingelTokenBuybackUpgradeable
The Single Token Buyback Upgradeable contract is designed to handle the buyback of a specific token using funds from another token. This process involves trading tokens on a decentralized exchange (DEX) using pre-defined routes to maximize efficiency and value retention during the transaction.

## RouterV2PathProviderUpgradeable
Responsible for setting up and maintaining the logic for routing token swaps, ensuring efficient pathfinding for token exchanges based on predefined routes. This contract allows for the addition, removal, and modification of token routes, and handles validations to ensure that only permitted tokens are used in the routes, enhancing the flexibility and security of the DEX routing system. Additionally, this functionality is designed to be upgradeable, allowing for future improvements and adjustments without disrupting the existing infrastructure.

## CompoundVeFNXManagedNFTStrategyFactoryUpgradeable
The Compound VeFNX Managed NFT Strategy Factory Upgradeable contract serves as a comprehensive factory for creating and managing both Compound VeFNX Managed NFT Strategies and their associated Virtual Rewarders within a specific ecosystem.