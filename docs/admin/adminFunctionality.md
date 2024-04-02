# Overview

This document outlines the available functions for settings and interactions by authorized addresses with contracts.


## Configuration Instructions for DEX v2/v3 Pairs/Pools

### V3
The fee setting for v3 fully aligns with the approach used by Algebra https://docs.algebra.finance/algebra-integral-documentation/overview-faq/what-is-algebra

## Emergency functions
The protocol includes several emergency functions designed to protect the system and its users in extraordinary circumstances:

### Dex v2 
For Dex v2, an authorized address has the capability to pause all swaps across all pairs
* `setPause(bool _state)` - this method on the PairFactory is used to set a pause on all pairs of this factory. It can only be called by an authorized address.

### Dex v3
In Dex v3, stopping actions in a pool is achieved by replacing the connected standard plugin with an AlgebraStubPlugin. Enabling the stop action mode in pairs is complex and cannot be executed by a simple method.

### Gauges
For each gauge, there is an option to activate an emergency mode, which stops deposits into the gauge and allows users to withdraw their funds through an emergency withdrawal process:
* `activateEmergencyMode()` - Enables emergency mode on a gauge.
* `stopEmergencyMode()` - Disables emergency mode on a gauge.