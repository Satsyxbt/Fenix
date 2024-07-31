
# FenixRaise Phases

## Phases Overview

The FenixRaise contract has several distinct phases that manage the lifecycle of the token raise. Each phase has specific actions that are allowed and conditions that need to be met. The phases include:

1. **Whitelist Phase**
2. **Public Phase**
3. **Claim Phase**

## Whitelist Phase

### Description
The Whitelist Phase allows pre-approved users to deposit tokens. This phase uses Merkle proof verification to ensure that only whitelisted users can participate.

### Allowed Actions
- **Deposit Tokens:** Users on the whitelist can deposit tokens up to their individual cap.

### Preconditions
- **Whitelist Verification:** Users must provide a valid Merkle proof to verify their inclusion in the whitelist.

## Public Phase

### Description
The Public Phase is open to all users, allowing anyone to deposit tokens. This phase starts after the Whitelist Phase ends and runs until the Public Phase end timestamp.

### Allowed Actions
- **Deposit Tokens:** Any user can deposit tokens up to the public phase user cap.

### Preconditions
- **Open Access:** No whitelist verification is required.

## Claim Phase

### Description
The Claim Phase allows users to claim their reward tokens and veNFTs based on the amount they deposited during the previous phases.

### Allowed Actions
- **Claim Tokens:** Users can claim their allocated reward tokens and veNFTs.

### Preconditions
- **Deposited Amount:** Users must have a non-zero deposited amount.
- **Phase Started:** The claim phase must have started.

## Checking Current Phase

To determine the current phase, the following functions can be called:

### isWhitelistPhase
```solidity
function isWhitelistPhase() external view returns (bool);
```
- **Returns:** `True` if the current time is within the Whitelist Phase, `false` otherwise.

### isPublicPhase
```solidity
function isPublicPhase() external view returns (bool);
```
- **Returns:** `True` if the current time is within the Public Phase, `false` otherwise.

### isClaimPhase
```solidity
function isClaimPhase() external view returns (bool);
```
- **Returns:** `True` if the current time is within the Claim Phase, `false` otherwise.

## Important:
- **There may be a time gap between the end of the public phase and the start of the claim phase**

## Roadmap Diagram

Below is a visual representation of the phases along with their timestamps:

```plaintext
|------------------|------------------|------------------|------------------|
0                  T1                 T2                 T3                 T4
Start              Whitelist Phase    Public Phase       End Public Phase   Claim Phase
                   Start              Start              End                Start
```

- **T1 (startWhitelistPhaseTimestamp):** The timestamp when the Whitelist Phase starts.
- **T2 (startPublicPhaseTimestamp):** The timestamp when the Public Phase starts.
- **T3 (endPublicPhaseTimestamp):** The timestamp when the Public Phase ends.
- **T4 (startClaimPhaseTimestamp):** The timestamp when the Claim Phase starts.



### Example Timestamps
Assume the following timestamps for a raise event:
- `startWhitelistPhaseTimestamp` = 1620000000
- `startPublicPhaseTimestamp` = 1620600000
- `endPublicPhaseTimestamp` = 1621200000
- `startClaimPhaseTimestamp` = 1621800000

```plaintext
|------------------|------------------|------------------|------------------|
1620000000         1620600000         1621200000         1621800000         1621800000
                   Whitelist Phase    Public Phase       End Public Phase   Claim Phase
                   Start              Start              End                Start
```
