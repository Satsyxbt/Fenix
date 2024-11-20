
# Claim Bribes With ERC20 Recover

This document provides an overview of the `claimBribesWithERC20Recover` function in the `CompoundVeFNXManagedNFTStrategyUpgradeable` contract, explaining its parameters, functionality, and providing examples for usage.

---

## Overview

The `claimBribesWithERC20Recover` function is designed to:
1. Claim rewards (bribes) from specified contracts for the strategy.
2. Recover selected ERC20 tokens (not fnx) and transfer them to a specified recipient.

This is particularly useful for automating both the claiming of bribes and the withdraw of tokens in a single transaction.

---

## Function Signature

```solidity
    /**
     * @notice Claims bribes for the current strategy and recovers specified ERC20 tokens to a recipient.
     * @dev This function allows the strategy to claim bribes from specified contracts and transfer
     *      non-strategic ERC20 tokens back to the designated recipient in a single transaction.
     * @param bribes_ The list of addresses representing bribe contracts from which to claim rewards.
     * @param tokens_ A nested array where each entry corresponds to a list of token addresses to claim from the respective bribe contract.
     * @param recipient_ The address to which recovered tokens should be sent.
     * @param tokensToRecover_ The list of ERC20 token addresses to be recovered and transferred to the recipient.
     *
     * Emits:
     * - Emits `Erc20Recover` for each recovered token.
     */
    function claimBribesWithERC20Recover(
        address[] calldata bribes_,
        address[][] calldata tokens_,
        address recipient_,
        address[] calldata tokensToRecover_
    ) external;
```

---

## Parameters

### `bribes_`
- **Description:** A list of bribe contract addresses from which to claim rewards.
- **Example:** 
  ```json
  ["0xBribeContract1", "0xBribeContract2"]
  ```

### `tokens_`
- **Description:** A nested array, where each entry contains a list of ERC20 token addresses to claim from the corresponding bribe contract in `bribes_`.
- **Example:** 
  ```json
  [["0xTokenA", "0xTokenB"], ["0xTokenC"]]
  ```
  In this example:
  - From `0xBribeContract1`, claim rewards for `0xTokenA` and `0xTokenB`.
  - From `0xBribeContract2`, claim rewards for `0xTokenC`.

### `recipient_`
- **Description:** The address to which the recovered tokens will be sent.
- **Example:** 
  ```json
  "0xRecipientAddress"
  ```

### `tokensToRecover_`
- **Description:** A list of ERC20 token addresses to withdraw from the strategy and transfer to the `recipient_`.
- **Example:** 
  ```json
  ["0xTokenA", "0xTokenB", "0xTokenC"]
  ```

---

## Requirements

1. Caller must have appropriate permissions as determined by `_checkBuybackSwapPermissions`.
2. The tokens listed in `tokensToRecover_` must not include:
   - The managed token (`fenix`).

---

## Emits

The function emits the `Erc20Recover` event for each recovered token.

---

## Examples

### Example 1: Claim Bribes and Recover Tokens

```json
{
  "bribes_": ["0xBribeContract1", "0xBribeContract2"],
  "tokens_": [["0xTokenA", "0xTokenB"], ["0xTokenC"]],
  "recipient_": "0xRecipientAddress",
  "tokensToRecover_": ["0xTokenA", "0xTokenB", "0xTokenC"]
}
```

#### Description:
- Claims rewards from `0xBribeContract1` for `0xTokenA` and `0xTokenB`.
- Claims rewards from `0xBribeContract2` for `0xTokenC`.
- Withdraw `0xTokenA`, `0xTokenB` and `0xTokenC` from the strategy after claim bribes calls and sends them to `0xRecipientAddress`.

---

### Example 2: Only Recover Tokens

#### Input:
```json
{
  "bribes_": [],
  "tokens_": [],
  "recipient_": "0xRecipientAddress",
  "tokensToRecover_": ["0xTokenA"]
}
```

#### Usage:
```solidity
strategy.claimBribesWithERC20Recover(
    [],
    [],
    "0xRecipientAddress",
    ["0xTokenA"]
);
```

#### Description:
- No bribes are claimed (`bribes_` is empty).
- Withdraw `0xTokenA` from the strategy and sends it to `0xRecipientAddress`.
