# Protocol Support Actions
## Overview
The VoterUpgradeable contract plays a crucial role in managing the distribution of LP fees and emissions across various gauges within a DeFi protocol. To ensure the correct functioning and efficiency of the protocol, several key actions must be performed periodically or under specific conditions.

By analogy with Chronos, where distribution and pickup from Dyson were called, the following actions can also be called/need to be called after the start of a new era

## Actions

The following actions can also be triggered by ordinary users

### **Distribute LP Fees to Internal Bribes**
Function: `distributeFees(address[] memory _gauges)`
This function distributes the LP fees to the internal bribes associated with specified gauge addresses.

* Parameters:

  * `_gauges`: An array of gauge addresses where to claim the fees.
* Usage:

* The gauge is the owner of the LPs and thus must claim the fees.
* This action is necessary to ensure that the internal bribe mechanisms are funded and operational.


### Any option, combined options from the following actions 
#### **1. Distribute Emissions for All Gauges**
Function: `distributeAll()`
Distributes the emission rewards for all gauges within the protocol.

* Usage:
  * Invokes `IMinter(minter).update_period()` to update the emission period.
  * Iterates through all pools and distributes emissions to their respective gauges.
  * This comprehensive distribution ensures that all participating gauges receive their share of emission rewards.

#### **2. Distribute Emissions for a Range of Gauges**
Function: `distribute(uint256 start, uint256 finish)`
Allows for the distribution of emissions to a subset of gauges, specified by a range within the pools array.

* Parameters:
  * `start`: The start index point of the pools array.
  * `finish`: The finish index point of the pools array.
* Usage:
  * Useful in scenarios where distributing emissions to all gauges at once would exceed the gas limit.
  * Ensures that emission distribution can be performed in segments to accommodate gas constraints.
  
#### **4. Distribute Rewards for Specific Gauges**
Function: `distribute(address[] memory _gauges)`
Distributes rewards only for the specified gauges.

* Parameters:
  * `_gauges`: An array of gauge addresses for which to distribute rewards.
* Usage:
  * Aimed at addressing situations where some distributions fail or need to be redone.
  * Allows for targeted distribution to ensure all intended recipients receive their rewards.