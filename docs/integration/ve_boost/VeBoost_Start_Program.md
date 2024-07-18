# VeBoost Start Program

This document outlines the process for the administration to start the VeBoost system. 

## General Information

VeBoost is a system that allows users to receive additional rewards in the form of a boost for their locked FNX tokens. To start the VeBoost program, the administration needs to ensure the system is properly funded and configured.

## Steps to Start the VeBoost Program

### Step 1: Prepare the Ecosystem Fund Deposit

1. **Confirm FNX Supply**: Ensure that 100,000 FNX tokens are available in the Ecosystem Fund.
2. **Set Up Wallet**: Use the designated administration wallet with the necessary permissions to perform the deposit.

### Step 2: Ensure that the contract is deployed and initialized
1. Make sure the contract is deployed and initialized.
2. Setted in VotingEscrow contract

### Step 3: Configrue VeBoost program parameters
1. **Set Min USD Amount**: Set the minimum amount of FNX required to join the VeBoost program in dollar equivalent.
Call `setMinUSDAmount` on VeBoost contract

2. **Set Boost Percentage**: Set the boost percentage to 20%.
Call `setFNXBoostPercentage` on VeBoost contract

### Step 3: Deposit FNX Tokens into the VeBoost Contract
**!!!Important: From the moment of transfer FNX, tokens will be available for users who create veNFT**

**Transfer FNX Tokens**: Transfer 100,000 FNX tokens from the Ecosystem Fund to the VeBoost contract.

### Step 4: Verify the Deposit

**Check Contract Balance**: Ensure that the VeBoost contract now holds the 100,000 FNX tokens.


### Step 5: Announce the Program
