# rFNX User Guide

## Overview

The RFenix smart contract enables rFNX token holders to convert their tokens into FNX and veFNX tokens. This document provides a detailed guide on interacting with the contract's functions.

## Prerequisites

- You should have a wallet containing rFNX tokens.
- Familiarity with Ethereum transactions and gas fees is recommended.

## Conversion Logic

When you convert rFNX tokens, the process follows a specific distribution:
- **40%** of the rFNX amount is directly converted to FNX tokens and credited to your balance instantly upon conversion.
- **60%** of the rFNX amount is converted to veFNX tokens, which are locked for a period of **182 days**.


## Contract Functions

### Convert All rFNX Tokens

**Function:** `convertAll()`

**Description:** This function converts the entire balance of the caller's rFNX tokens into FNX and veFNX tokens, adhering to the contract's conversion rate.

**How to Use:**
1. Invoke the `convertAll()` function from your wallet.
2. Confirm the transaction in your wallet to proceed with the conversion.

### Convert Specific Amount of rFNX Tokens

**Function:** `convert(uint256 amount_)`

**Description:** Allows conversion of a specified amount of rFNX tokens into FNX and veFNX tokens based on the contract's conversion rate.

**Parameters:**
- `amount_`: The exact amount of rFNX tokens you wish to convert.

**How to Use:**
1. Determine the amount of rFNX you want to convert.
2. Execute the `convert(uint256 amount_)` function, passing the desired amount as a parameter.
3. Confirm the transaction in your wallet.

## Additional Notes

- Ensure sufficient Ethereum in your wallet to cover gas fees for transactions.
- Transactions may fail due to insufficient gas or unmet contract conditions.
- Familiarize yourself with the current conversion rates and lock durations before initiating a conversion.

### Abi
```json
[
    {
      "inputs": [],
      "name": "convertAll",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "amount_",
          "type": "uint256"
        }
      ],
      "name": "convert",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
]
```
## Example

Alice, an rFNX token holder, wants to convert her rFNX tokens into FNX and veFNX tokens.

### Initial State

- Alice's wallet balance: 1,000 rFNX
- Conversion rate: 40% to FNX and 60% to veFNX
- Lock duration for veFNX: 182 days

### Action: Converting All rFNX Tokens

Alice decides to convert all her 1,000 rFNX tokens.

1. Alice calls the `convertAll()` function from her wallet interface.
2. She confirms the transaction, paying the necessary gas fees.

### Result of Conversion

- **400 FNX tokens** are credited to Alice's wallet immediately (40% of 1,000 rFNX).
- **600 FNX blocked as veFNX for 182 days** and transferred to Alice wallet (60% of 1,000 rFNX).

### Final State

- Alice’s rFNX balance is now 0.
- Alice has an additional 400 FNX tokens available to use.
- Alice has veFNX NFT with a balance of 600 FNX
