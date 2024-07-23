
# Enabling Aggregate Claims with Voter Contract

To use the `aggregateClaim` function effectively, users must first enable the Voter contract to act on their behalf by using the `toggleOperator` function on the `Distributor` contract. This is essential for the Voter contract to manage claims, especially when interacting with the `MerklDistributor` contract.

## Granting Permission to Voter Contract

### Step-by-Step Guide

1. **Identify the Voter Contract Address**: Ensure you have the address of the Voter contract.
2. **Call `toggleOperator` on Distributor Contract**: Users need to call the `toggleOperator` function from their address on the `Distributor` contract, specifying the Voter contract address as the operator.

### Example Code

Here’s how you can call `toggleOperator`:

```solidity
Distributor.toggleOperator(userAddress, voterContractAddress);
```

### Detailed Steps

1. **User Address**: Your Ethereum address.
2. **Voter Contract Address**: The address of the Voter contract.
3. **Distributor Contract**: The address of the Distributor contract.

### Example

```solidity
// Assuming you have the following variables defined
address userAddress = 0x...; // Your Ethereum address
address voterContractAddress = 0x...; // The address of the VoterUpgradeableV1_2 contract
Distributor distributor = Distributor(0x...); // The address of the Distributor contract

// Call toggleOperator on the Distributor contract to allow Voter contract to act on your behalf
distributor.toggleOperator(userAddress, voterContractAddress);
```

## Checking Permission Status

To verify if you have successfully granted the Voter contract permission, you can check the `operators` mapping in the `Distributor` contract.

### Example Code

Here’s how to check if the Voter contract has the necessary permission:

```solidity
bool isApproved = (await Distributor.operators(userAddress, voterContractAddress)) == 1;
```

### Detailed Steps

1. **User Address**: Your Ethereum address.
2. **Voter Contract Address**: The address of the Voter contract.
3. **Distributor Contract**: The address of the Distributor contract.
4. **Check Approval**: Query the `operators` mapping to see if the Voter contract is approved.

### Example

```solidity
// Assuming you have the following variables defined
address userAddress = 0x...; // Your Ethereum address
address voterContractAddress = 0x...; // The address of the VoterUpgradeableV1_2 contract
Distributor distributor = Distributor(0x...); // Address of the Distributor contract

// Check if Voter contract is approved to act on your behalf
bool isApproved = distributor.operators(userAddress, voterContractAddress) == 1;
```

If `isApproved` returns `true`, the Voter contract is authorized to manage claims on your behalf.

## Summary

By following these steps, you can enable the Voter contract to perform aggregate claims on your behalf, ensuring efficient management of multiple claims within a single transaction. This not only reduces gas costs but also simplifies the process of claiming rewards.

1. **Call `toggleOperator` on Distributor Contract**: Grant permission to the Voter contract.
2. **Verify Approval**: Check the `operators` mapping in the `Distributor` contract to ensure the Voter contract has the necessary permissions.
