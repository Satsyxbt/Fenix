# RFenix Administrator Guide

## Overview


## 1. Supplying FNX for Conversions

To ensure the RFenix contract has sufficient FNX tokens for conversion processes, follow these steps:

### Action Flow:
1. **Transfer FNX to the RFenix Contract:**
   - Use the `transfer` function of the FNX token contract to send FNX tokens to the RFenix contract address.
   - The amount of FNX should be enough to cover expected conversions

## 2. Minting rFNX

As the administrator, you can issue new rFNX tokens to specified addresses

### Action Flow:
1. **Identify Recipient and Amount:** Determine the recipient address and the amount of rFNX tokens to mint.
2. **Mint rFNX Tokens:**
   - Call the `mint(address to_, uint256 amount_)` function, specifying the recipient's address and the amount of tokens to mint.
   - Confirm the transaction in your wallet to execute the minting process.

## 3. Recovering FNX

In case there are excess FNX tokens in the RFenix contract, you can recover them to the owner's address.

### Action Flow:
1. **Determine the Amount:** Decide the amount of FNX tokens to be recovered from the RFenix contract.
2. **Recover FNX Tokens:**
   - Execute the `recoverToken(uint256 amount_)` function, specifying the amount of FNX to recover.
   - Confirm the transaction to transfer the specified amount of FNX tokens to the owner's address.