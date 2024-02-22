
## Project overiew

The `Fenix` protocol is a modified version of `Chronos & Thena`, introducing innovations and changes. More information about the changes can be found in the `CHANGELOG`.

At its core, the protocol is based on the `ve(3,3)` concept, with a new set of integrations and a variable set of rules.

Significant changes introduced from the initial implementation by `Chronos & Thena include`:

1. Changes to the emission algorithm, with emissions increasing by **1.5%** for the first 8 epochs and then decreasing by **1%** with each epoch until reaching a minimum emission per epoch.
2. Support for custom fees for dex v2 Pairs, including the ability to adjust the distribution between the `FeeVault` and lp providers in the pool from **0-100%**.
3. A change in the fee distribution approach, now distributing fees through an additional `FeeVault` contract.
4. Support for configuring the `Blast Governor` for all main contracts.
5. Support for configuring rebase token settings with `Blast` rebase tokens in pairs.
6. Emission distribution through another protocol, `Merkl`, for gauge types 1 and 2 (`ICHIVault` & `Manual positions`)
7. Other various changes.
   
A key goal of this initiative is to review and validate the changes made, as well as new implementations to support the protocol's deployment within the [Blast L2](https://blast.io/en) network.

## Additional Context
* This code will be deployed to `Blast L2` at launch, and it is the only blockchain considered to be in scope for this audit.
* `FeesVaultFactory` is a contract that will create `FeesVault` for both v2 dex and its own `Algebra v3 implementation`.

### Links
- [Fenix ve(3,3) Core](https://github.com/Satsyxbt/Fenix)
- [Fenix Algebra V3 Fork](https://gitlab.com/Satsyxbt/fenix-dex-v3)
- [Docs](https://docs.fenixfinance.io/)

### List of projects on which Fenix is based:
- [Thena](https://github.com/ThenafiBNB/THENA-Contracts)
- [Chronos](https://github.com/ChronosEx/Chronos-ContractsV2)
- [Algebra](https://github.com/cryptoalgebra/Algebra/tree/master)
- [Merkl](https://github.com/AngleProtocol/merkl-contracts/)
- [CHANGELOG](https://github.com/Satsyxbt/Fenix/blob/main/CHANGELOG.md)
  
## Audit competition scope

All contract code marked as `[FULL]` is within the scope. The tag `[Only changes and his effect on other parts]` means that only the part that has been changed relative to the implementations from Chronos or Thena is within scope, including any impact these changes may have on other parts of the system. Any vulnerabilities critical to the system leading to loss of funds/blockages are also considered within scope.

The contracts listed below are partially or fully in the scope
```
https://github.com/Satsyxbt/Fenix

|-- contracts/
    |-- bribes/
        |-- BribeFactoryUpgradeable.sol [Full]
        |-- BribeUpgradeable.sol [Only changes and his effect on other parts]
    |-- gauges/
        |-- GaugeFactoryUpgradeable.sol
        |-- GaugeUpgradeable.sol [Only changes and his effect on other parts]
    |-- core/
        |-- Fenix.sol [Full]
        |-- MinterUpgradeable.sol [Full]
        |-- VoterUpgradeable.sol [Only changes and his effect on other parts]
        |-- VotingEscrowUpgradeable.sol [Only changes and his effect on other parts]
    |-- dexV2/
        |-- Pair.sol [Only changes and his effect on other parts]
        |-- PairFactoryUpgradeable.sol [Full]
        |-- PairFees.sol [Full]
        |-- RouterV2.sol [Only changes and his effect on other parts]
    |-- integration/
        |-- BlastERC20RebasingManage.sol [Full]
        |-- BlastGovernorSetup.sol [Full]
        |-- FeesVaultFactory.sol [Full]
        |-- FeesVaultUpgradeable.sol [Full]
        |-- MerklGaugeMiddleman.sol [Full]
```

## Out of scope
The following contracts are out of scope

```
|-- contracts/
    |-- bribes/
        |-- BribeProxy.sol
    |-- gauges/
        |-- GaugeProxy.sol
    |-- core/
        |-- VeArtProxyUpgradeable.sol
        |-- libraries
            |-- DateTime.sol
            |-- NumberFormatter.sol [Full]
    |-- mocks/**/*
```

## Publicly Known Issues
The following issues are known:

* **Centralized risks** - Potential concentration of accesses on certain addresses.
* **Initialization front-running** - We see a low chance of this issue, which would at most lead to contract redeployment.
* **Miss configuration** - Any possible incorrect parameter settings in authorized methods.
* **Blast address hardcoded** - According to the documentation, the Blast address will be changeable in the mainnet, so this will also be changed in the code.
* **Loss of emissions in the event of a period update on the miner** -  Loss of emissions in the absence of calls for update_period or distribution- this event is considered unlikely.
* **Operation of v2 Pair with rebasing tokens from Blast** - The implementation does not anticipate normal operation with these tokens in terms of configuration with automatic balance increase, so there is a possibility to configure these tokens during pair creation, by default, this will be `Claimable` mode.
* **ICHIVault incorrect validation** - The creation of gauge is completely limited, so this problem is currently eliminated. We acknowledge that it is possible to fake a pool in case of public creation
* **ICHIVault pool incorrect validation** - The creation of gauge is completely limited, so this problem is currently eliminated. We acknowledge that it is possible to fake a pool in case of public creation.
* **Inability to use gauge for staking when created as type 2**
  
## Setup
### Getting the code
Clone this repository
```sh
git clone --recursive -j8  https://github.com/Satsyxbt/Fenix
```
or
```sh
git clone https://github.com/Satsyxbt/Fenix
cd fenix
git submodule update --init --recursive
```

Enter into the directory
```sh
cd fenix
```

### Running basic tests
```sh
npm run test
```