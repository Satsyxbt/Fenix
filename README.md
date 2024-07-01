
## Project overiew

The `Fenix` protocol is a modified version of `Chronos & Thena`, introducing innovations and changes

At its core, the protocol is based on the `ve(3,3)` concept, with a new set of integrations and a variable set of rules.

### Links
- [Fenix ve(3,3) Core](https://github.com/Satsyxbt/Fenix)
- [Docs](https://docs.fenixfinance.io/)
- [Previous Fenix hats competition](https://app.hats.finance/audit-competitions/fenix-finance-0x83dbe5aa378f3ce160ed084daf85f621289fb92f/scope)


## Automated Findings/Publicly Known Issues
The 4naly3er report can be found [here](/4naly3er-report.md).

The following issues are known:

* **Centralized risks** - Potential concentration of accesses on certain addresses.
* **Initialization front-running** - We see a low chance of this issue, which would at most lead to contract redeployment.
* **Misconfiguration** - Any possible incorrect parameter settings in authorized methods.
* **Blast address hardcoded** - According to the documentation, the Blast address will be changeable in the mainnet, so this will also be changed in the code.
* **Loss of emissions in the event of a period update on the minter** -  Loss of emissions in the absence of calls for update_period or distribution- this event is considered unlikely.
* **ICHIVault incorrect validation** - The creation of gauge is completely limited, so this problem is currently eliminated. We acknowledge that it is possible to fake a pool in case of public creation
* **ICHIVault pool incorrect validation** - The creation of gauge is completely limited, so this problem is currently eliminated. We acknowledge that it is possible to fake a pool in case of public creation.
* **Inability to use gauge for staking when created as type 2**
* **Not support for tokens that do not comply with the ERC20 standard**

## Scope
```js
|-- contracts/
    |-- nest/libraries
        |-- VirtualRewarderCheckpoints.sol [40 nSLOC]
    |-- nest/
        |-- BaseManagedNFTStrategyUpgradeable.sol [75 nSLOC]
        |-- CompoundVeFNXManagedNFTStrategyFactoryUpgradeable.sol [72 nSLOC]
        |-- CompoundVeFNXManagedNFTStrategyUpgradeable.sol [90 nSLOC]
        |-- ManagedNFTManagerUpgradeable.sol [131 nSLOC]
        |-- RouterV2PathProviderUpgradeable.so [200 nSLOC]
        |-- SingelTokenBuybackUpgradeable.sol [90 nSLOC]
        |-- SingelTokenVirtualRewarderUpgradeable.sol [158 nSLOC]
    |-- nest/core
        |-- VoterUpgradeableV1_2.sol [617 nSLOC]
        |-- VotingEscrowUpgradeableV1_2.sol [742 nSLOC]

Total: 2215 nSLOC
```

**[IMPORTANT]:** For the `VoterUpgradeableV1_2.sol` and `VotingEscrowUpgradeableV1_2.sol` contracts, in the scope includes only the changes made and their impact (includes errors caused from changes in other parts of the contract), (you can see the difference in the `/docs/diff/*` files) or Critical vulnerability leading to loss of funds, etc.(in the specified contracts)


## Out of scope
Contracts not listed in `#Scope` are not included in the audit scope. As well as previously known issues in `## Automated Findings/Publicly Known Issues` and previus audits

## Setup
### Getting the code
Clone this repository
```sh
git clone --branch 2024-07-hats-audit-nest-functionality --recursive -j8  https://github.com/Satsyxbt/Fenix
```
or
```sh
git clone https://github.com/Satsyxbt/Fenix
cd fenix
git submodule update --init --recursive
git checkout 2024-07-hats-audit-nest-functionality
```

Enter into the directory
```sh
cd fenix
```

Install dependency
```sh
npm install
```

### Running basic tests
To run the existing tests, also need to compile the artifacts of the fenix-dex-v3 library
```
sh
1.
    cd lib/fenix-dex-v3
    npm install

2. 
    cd src/core
    npm install
    npx hardhat compile
3.
    cd src/periphery
    npm install
    npx hardhat compile
```
run tests command
```sh
npm run test
```
or
```sh
npx hardhat test
```

## Overview
The functionality of the nest is designed to create "**Management veNFTs**". The task of which is to provide optimized voting paths for users who attach their veNFT to their favorite Managed veNFT. And not to vote manually, but to rely on various voting optimizers
- Each **mVeNFT** is assigned to a strategy that provides for a particular behavior
- Users have the option of attaching or unattaching their **veNFT** from **mVeNFT**
- **mVeNFT** is a large FNX thresuary, so they have various additional restrictions, such as the impossibility of splitting, merge, etc. to ensure that functionality is not compromised
- The first factory is Compound, which aims to accumulate **FNX** on the user's **veNFT** balance by selling **mVeNFT** voting rewards and redeeming **FNX** as long as he is connected to **mVeNFT**. 
  
Together with the nest functionality, the **Permanent lock** functionality is implemented, which allows the user not to lose voice power over time
- the user's veNFT is always locked as long as user wants it, which allows to keep user voting power at the maximum level
- the user has the opportunity to unlock veNFT permanent lockand and  withdraw the balance **after 6 months** (max lock time)

To ensure the functioning of mVeNFT, a window was maintained (one hour before and after the epoch change) to give time for scripts, etc. to perform the necessary actions to support mVeNFT