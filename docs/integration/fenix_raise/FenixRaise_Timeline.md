
## Timeline of the Contract

1. **Initialization**: 
    - The contract is initialized with the addresses of the BlastGovernor, the token being raised, and the deposits receiver.
    - The `initialize` function sets these addresses and prepares the contract for the raise.

2. **Setting Timestamps**: 
    - The owner sets the timestamps for the different phases of the raise using the `setTimestamps` function.
    - These timestamps include:
        - `startWhitelistPhaseTimestamp`: The timestamp for the start of the whitelist phase.
        - `startPublicPhaseTimestamp`: The timestamp for the start of the public phase.
        - `endPublicPhaseTimestamp`: The timestamp for the end of the public phase.
        - `startClaimPhaseTimestamp`: The timestamp for the start of the claim phase.
    - Proper ordering and logical sequencing of these timestamps are enforced to ensure smooth transition between phases.

3. **Setting Deposit Caps**: 
    - The owner sets the deposit caps using the `setDepositCaps` function.
    - These caps include:
        - `totalDepositCap`: The total amount of tokens that can be deposited during the entire raise.
        - `whitelistPhaseUserCap`: The maximum amount a single user can deposit during the whitelist phase. (When the user is set to 0 cap in the Merkle tree)
        - `publicPhaseUserCap`: The maximum amount a single user can deposit during the public phase.

4. **Setting Whitelist Root**: 
    - The owner sets the Merkle root for the whitelist verification using the `setWhitelistRoot` function.
    - This root is used to verify if users are whitelisted during the whitelist phase.

5. **Whitelist Phase**: 
    - This phase begins at `startWhitelistPhaseTimestamp`.
    - Users can deposit tokens if they provide a valid Merkle proof to verify they are whitelisted.
    - Deposits are subject to the `whitelistPhaseUserCap` and are also limited to reaching `totalDepositCap`.

6. **Public Phase**: 
    - This phase begins at `startPublicPhaseTimestamp` and ends at `endPublicPhaseTimestamp`.
    - Users can deposit tokens without needing a Merkle proof.
    - Deposits are subject to the `publicPhaseUserCap` and are also limited to reaching `totalDepositCap`.

7. **End of Public Phase**: 
    - After `endPublicPhaseTimestamp`, no more deposits are accepted.
    - The owner can now withdraw the total deposited amount and excessive reward tokens using the `withdrawDeposits` & `withdrawExcessiveRewardTokens` function, transferring the tokens to the designated `depositsReciever` address.

8. **Withdrawals**: 
    - The owner ensures that the public phase has ended and uses the `withdrawDeposits` function to transfer the total deposited tokens to the deposits receiver.
    - This marks the completion of the token raise process.

9. **Claim Phase**: 
    - This phase begins at `startClaimPhaseTimestamp`.
    - Users can claim their allocated reward tokens and veNFT based on their deposited amount.
    - The `claim` function is used for this purpose, and it verifies that the claim phase has started, the user has not already claimed, and the deposited amount is non-zero.
