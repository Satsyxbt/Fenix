# Voter Votes Tracking Events

This document describes the events emitted by the `VoterUpgradeableV2` contract when votes are tracked, including the scenarios in which events are triggered and the meaning of their parameters.

## Events Overview

### 1. `VoteCast` Event

The `VoteCast` event is emitted when a user successfully casts votes for multiple pools using a specific token. This event includes details such as the voter, the token used for voting, the pools that received votes, and the weight of the votes allocated to each pool.

**Event Signature**:
```solidity
    /**
     * @dev Emitted when a user casts votes for multiple pools using a specific token.
     *
     * @param voter The address of the user who cast the votes.
     * @param tokenId The ID of the token used for voting.
     * @param epoch The epoch during which the votes were cast.
     * @param pools An array of pool addresses that received votes.
     * @param voteWeights An array representing the weight of votes allocated to each pool.
     *
     * Requirements:
     * - `pools` and `voteWeights` arrays must have the same length.
     *
     * Note: The voting power represented in `voteWeights` is allocated across the specified `votedPools` for the given `epoch`.
     *       The `totalVotingPower` represents the cumulative voting power used in this vote.
     */
    event VoteCast(
        address indexed voter,
        uint256 indexed tokenId,
        uint256 indexed epoch,
        address[] pools,
        uint256[] voteWeights,
        uint256 totalVotingPower
    );
```

**Parameters**:
- `voter`: The address of the user who cast the votes.
- `tokenId`: The ID of the token used for voting.
- `epoch`: The epoch during which the votes were cast.
- `pools`: An array of pool addresses that received votes.
- `voteWeights`: An array representing the weight of votes allocated to each pool.
- `totalVotingPower`: The total voting power that was used for this voting action.

**Requirements**:
- The `pools` and `voteWeights` arrays must have the same length.
- The event will **only** be emitted if there are votes allocated to one or more pools. If no votes are allocated to any pools, the event will **not** be emitted.

**Notes**:
- The voting power represented in `voteWeights` is allocated across the specified `pools` for the given `epoch`.
- The `totalVotingPower` represents the cumulative voting power used in this vote, calculated based on the weights and the user's available voting power.

**When is it emitted?**
- The `VoteCast` event is emitted when a user votes for one or more pools during an active voting epoch.
- If the voting action does not allocate any voting power (i.e., `voteWeights` for all pools is zero), the `VoteCast` event will not be emitted.

### 2. `VoteReset` Event

The `VoteReset` event is emitted when a user resets all previously cast votes for the current epoch. This event includes the voter, the token used for voting, the epoch, and the total amount of voting power that was reset.

**Event Signature**:
```solidity
    /**
     * @dev Emitted when a user resets all votes for the current epoch.
     *
     * @param voter The address of the user who resets their votes.
     * @param tokenId The ID of the token used for voting that is being reset.
     * @param epoch The epoch during which the votes were reset.
     * @param totalResetVotingPower The total voting power that was reset.
     *
     * Note: This event indicates that all previously cast votes for the specified `epoch` have been reset for the given `votingTokenId`.
     *       The `totalResetVotingPower` represents the cumulative voting power that was removed during the reset.
     */
    event VoteReset(address indexed voter, uint256 indexed tokenId, uint256 indexed epoch, uint256 totalResetVotingPower);

```

**Parameters**:
- `voter`: The address of the user who resets their votes.
- `tokenId`: The ID of the token used for voting that is being reset.
- `epoch`: The epoch during which the votes were reset.
- `totalResetVotingPower`: The total voting power that was reset.

**Notes**:
- This event indicates that all previously cast votes for the specified `epoch` have been reset for the given `tokenId`.
- The `totalResetVotingPower` represents the cumulative voting power that was removed during the reset.

**When is it emitted?**
- The `VoteReset` event is emitted when a user performs a reset of their votes for a given epoch.
- This event is only emitted if the user has previously cast votes for one or more pools in that epoch.
