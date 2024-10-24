## FeesVault Configuration Examples

This document provides examples for configuring `FeesVault` contracts for fee distribution. We will cover:

1. Setting a default configuration for all `FeesVault` contracts.
2. Setting a creator-specific configuration for `FeesVault` contracts created by a specific factory (e.g., `AlgebraFactory` or `PairFactory`).
3. Setting a custom configuration for a specific `FeesVault` contract.

### Example 1: Setting a Default Configuration for All FeesVaults
To set a default configuration that applies to all future `FeesVault` contracts, use the `setDefaultDistributionConfig` function.

```solidity
// Set default distribution: 100% of fees go to gauges
feesVaultFactory.setDefaultDistributionConfig(DistributionConfig({
    toGaugeRate: 10000, // 100% in basis points
    recipients: new address , // No additional recipients
    rates: new uint256  // No additional rates
}));
```

```solidity
// Set default distribution: 90% of fees to gauges, 10% to another recipient
address[] memory recipients = new address[](1);
recipients[0] = recipientAddress; // Address of the additional recipient
uint256[] memory rates = new uint256[](1);
rates[0] = 1000; // 10% in basis points

feesVaultFactory.setDefaultDistributionConfig(DistributionConfig({
    toGaugeRate: 9000, // 90% in basis points
    recipients: recipients,
    rates: rates
}));
```

### Example 2: Setting a Creator-Specific Configuration
You can set a configuration that applies to all `FeesVault` contracts created by a specific factory (e.g., `AlgebraFactory` or `PairFactory`). This configuration will be used for vaults created by the specified creator unless a custom configuration is set.

```solidity
// Set creator-specific distribution for AlgebraFactory: 100% of fees go to gauges
feesVaultFactory.setDistributionConfigForCreator(algebraFactoryAddress, DistributionConfig({
    toGaugeRate: 10000, // 100% in basis points
    recipients: new address[](0), // No additional recipients
    rates: new uint256  // No additional rates
}));
```

```solidity
// Set creator-specific distribution for PairFactory: 90% of fees to gauges, 10% to another recipient
address[] memory recipients = new address[](1);
recipients[0] = recipientAddress; // Address of the additional recipient
uint256[] memory rates = new uint256[](1);
rates[0] = 1000; // 10% in basis points

feesVaultFactory.setDistributionConfigForCreator(pairFactoryAddress, DistributionConfig({
    toGaugeRate: 9000, // 90% in basis points
    recipients: recipients,
    rates: rates
}));
```

### Example 3: Setting a Custom Configuration for a Specific FeesVault
To set a custom fee distribution for a specific `FeesVault` contract, use the `setCustomDistributionConfig` function.

```solidity
// Set custom distribution for a specific FeesVault: 100% of fees go to gauges
feesVaultFactory.setCustomDistributionConfig(feesVaultAddress, DistributionConfig({
    toGaugeRate: 10000, // 100% in basis points
    recipients: new address[](0), // No additional recipients
    rates: new uint256  // No additional rates
}));
```

```solidity
// Set custom distribution for a specific FeesVault: 90% of fees to gauges, 10% to another recipient
address[] memory recipients = new address[](1);
recipients[0] = recipientAddress; // Address of the additional recipient
uint256[] memory rates = new uint256[](1);
rates[0] = 1000; // 10% in basis points

feesVaultFactory.setCustomDistributionConfig(feesVaultAddress, DistributionConfig({
    toGaugeRate: 9000, // 90% in basis points
    recipients: recipients,
    rates: rates
}));
```
