## Fee Configuration Examples

This document provides examples of different fee configurations for distributing swap fees between LP providers and the FeesVault (Community Vault) using the `PairFactoryUpgradeable` smart contract. Each example includes the necessary method calls, parameters, and descriptions to achieve the specified fee distribution.

### 1. 100% Swap Fee to LP Providers
In this configuration, all swap fees go to LP providers, with none allocated to the FeesVault.

#### Steps:
1. Set the default protocol fee to 0% using the `setProtocolFee` function.

```solidity
pairFactory.setProtocolFee(0); // 0% protocol fee
```

- **`_newFee`**: `0` - This means no fee goes to the community vault, and 100% of the swap fee remains with LP providers.

### 2. 100% Swap Fee to FeesVault (Community Vault), 0% to LP Providers
In this configuration, all swap fees go to the FeesVault, with none allocated to LP providers.

#### Steps:
1. Set the default protocol fee to 100% using the `setProtocolFee` function.

```solidity
pairFactory.setProtocolFee(10000); // 100% protocol fee
```

- **`_newFee`**: `10000` - Represents 100% of the swap fee, which is directed to the community vault.

### 3. 90% to FeesVault, 10% to LP Providers by Default
In this configuration, 90% of the swap fee goes to the FeesVault and 10% remains with LP providers for all pairs by default.

#### Steps:
1. Set the default protocol fee to 90% using the `setProtocolFee` function.

```solidity
pairFactory.setProtocolFee(9000); // 90% protocol fee
```

- **`_newFee`**: `9000` - Represents 90% of the swap fee directed to the community vault, and the remaining 10% remains with LP providers.

### 4. 100% Swap Fee to LP Providers, with Specific Pairs Allocating 90% to FeesVault and 10% to LP Providers
In this configuration, the default setting directs 100% of the swap fees to LP providers. However, for specific pairs, 90% of the swap fee is allocated to the FeesVault and 10% to LP providers.

#### Steps:
1. Set the default protocol fee to 0% using the `setProtocolFee` function, ensuring all swap fees by default go to LP providers.

```solidity
pairFactory.setProtocolFee(0); // 0% protocol fee
```

- **`_newFee`**: `0` - Represents that all swap fees remain with LP providers by default.

2. For specific pairs, set a custom protocol fee to 90% using the `setCustomProtocolFee` function.

```solidity
pairFactory.setCustomProtocolFee(pairAddress1, 9000); // 90% protocol fee for pairAddress1
pairFactory.setCustomProtocolFee(pairAddress2, 9000); // 90% protocol fee for pairAddress2
```

- **`_pair`**: `pairAddress1`/`pairAddress2` - The address of the pair for which a custom fee is being set.
- **`_newFee`**: `9000` - Represents 90% of the swap fee directed to the community vault for the specified pair, with the remaining 10% for LP providers.

### Summary
The above examples demonstrate how to configure the distribution of swap fees between LP providers and the FeesVault using both default and custom settings. These configurations provide flexibility in defining how fees are split, ensuring optimal incentives for both liquidity providers and community growth.

