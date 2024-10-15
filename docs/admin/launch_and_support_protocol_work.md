# Protocol Support Actions

## Overview

The `MinterUpgradeable` and `VoterUpgradeable` contracts are integral components of the protocol that manage emissions and fees distribution, ensuring the system remains functional and operational. To maintain the protocol's effectiveness, specific actions are required periodically or under certain conditions.

This document outlines the stages of starting emissions and the actions needed to maintain the protocol's operation, including fee distribution before the end of each epoch and comprehensive emissions distribution at the beginning of a new epoch.

## Actions

### One-time actions

#### **1. Start Emissions**

Function: `start()` in the `MinterUpgradeable` contract.

- This function is called by the owner to initiate the emissions process, which is a one-time action that activates the emission mechanisms in the `MinterUpgradeable` contract.
- When called, the current epoch is set as epoch 0, and the first emission period will begin on the following Thursday at 00:00:00 UTC, marking the start of epoch 1 with the first distribution of emissions.
- Otherwise, epoch 0 will occur before Thursday 00:00:00 UTC, and from that moment on, there will be the first emissions.
- **!!! IMPORTANT: If you want to start a full 0 epoch, `start()` must be called after Thursday 00:00:00 UTC**

**1.1 Update state for all Gauges**

Function: `distributeAll()` in the `VoterUpgradeable` contract.


### Actions before the end of the epoch

#### **2. Distribute LP Fees to Internal Bribes**

Function: `distributeFees(address[] memory _gauges)` in the `VoterUpgradeable` contract.

- This function distributes LP fees to the internal bribes associated with specified gauge addresses.
- Can be called an arbitrary number of times per epoch.
- Can be called by any user.
- Parameters:
  - `_gauges`: An array of gauge addresses where fees should be claimed.
- Usage:
  - This action must be called before the end of each epoch. If not called in time, the fees will be rolled over to the next epoch.

#### **3. Processing and managing the behavior of strategies an hour before the end of the epoch**.
During the last hour before the end of an epoch, authorized addresses of NEST strategies must vote through their strategies to ensure proper allocation of rewards.

### Actions after the beginning of the epoch

#### **4. Distribute Emissions**

The following actions distribute emissions across the protocol. These can be triggered by any user to ensure the timely distribution of rewards.

**IMPORTANT: Calling this function for all Gauges is mandatory for correct calculations, regardless of the state of the Gauge, killed for example**

##### **4.1. Distribute Emissions for All Gauges**

Function: `distributeAll()` in the `VoterUpgradeable` contract.

- This function distributes the emission rewards for all gauges in the protocol.
- Usage:
  - Must be called as soon as possible after the start of a new epoch.
  - Invokes `IMinter(minter).update_period()` to update the emission period.
  - Iterates through all pools and distributes emissions to their respective gauges, ensuring that all participating gauges receive their share of emission rewards.

##### **4.2. Distribute Emissions for a Range of Gauges**

Function: `distribute(uint256 start, uint256 finish)` in the `VoterUpgradeable` contract.

- Allows for the distribution of emissions to a subset of gauges specified by a range of indices within the pools array.
- Parameters:
  - `start`: The starting index of the pools array.
  - `finish`: The ending index of the pools array.
- Usage:
  - Useful in scenarios where distributing emissions to all gauges at once may exceed gas limits.
  - Ensures emission distribution can be performed in segments to accommodate gas constraints.

##### **4.3. Distribute Rewards for Specific Gauges**

Function: `distribute(address[] memory _gauges)` in the `VoterUpgradeable` contract.

- Distributes rewards only for the specified gauges.
- Parameters:
  - `_gauges`: An array of gauge addresses for which to distribute rewards.
- Usage:
  - Aimed at addressing situations where some distributions fail or need to be redone.
  - Allows for targeted distribution to ensure all intended recipients receive their rewards.

#### **5. Bribes proccessing and Nest strategy management**
Authorized addresses of `NEST` strategies must perform all necessary actions within the first hour of the new epoch. For example, they must sell all rewards, convert FNX, and call `compound`. Failure to perform these actions will result in users who staked in these strategies not receiving their rewards for the epoch if they detach their veNFT before this actions after end of distribution window

