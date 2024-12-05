### Step 1. Upgrade Process
On the `ProxyAdmin` contract, update the implementation for all the contracts listed below to the latest version by calling the `upgrade` function on the `ProxyAdmin` contract.

- **[ProxyAdmin](https://blastscan.io/address/0xdD75F0d1ccF1b2E115d87f0177b67c0F0F8429B5)** - `0xdD75F0d1ccF1b2E115d87f0177b67c0F0F8429B5`

#### ABI for Upgrade Method
```json
[
  {
    "inputs": [
      {
        "internalType": "contract ITransparentUpgradeableProxy",
        "name": "proxy",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "implementation",
        "type": "address"
      }
    ],
    "name": "upgrade",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]
```

#### Contracts to Upgrade to the Latest Implementation

| Name                        | Target Contract (Proxy)                    | New Implementation                      |
|-----------------------------|--------------------------------------------|-----------------------------------------|
| BlastRebasingTokensGovernorUpgradeable      | `0x71B83044626c8F6Ef38F051673562Fe025F8ec1F` | `0x63d96F5A075d6D78D53dFeBD9bb6E6Ac5cFF708d` |

### Example
To upgrade `Voter`, call:
```solidity
ProxyAdmin(`0xdD75F0d1ccF1b2E115d87f0177b67c0F0F8429B5`).upgrade(`0x71B83044626c8F6Ef38F051673562Fe025F8ec1F`, `0x63d96F5A075d6D78D53dFeBD9bb6E6Ac5cFF708d`)
```

### Step 2. Set yield distribution direction percentage
On the `BlastRebasingTokensGovernor` contract, call `setYieldDistributionDirectionsPercentage(0, 0, "1000000000000000000", 0)` to setup calculate and distribute all claims yield to Rise program (100% to RISE)

- **[BlastRebasingTokensGovernor](https://blastscan.io/address/0x71B83044626c8F6Ef38F051673562Fe025F8ec1F)** - `0x71B83044626c8F6Ef38F051673562Fe025F8ec1F`


### Step 3. Set avaiable swap RISE yields to FNX
On the `BlastRebasingTokensGovernor` contract, call `setDirectionAvailableToSwapToTargetToken(2, true)` to allow the swap of claimed yields tokens to FNX for RISE distribution 

- **[BlastRebasingTokensGovernor](https://blastscan.io/address/0x71B83044626c8F6Ef38F051673562Fe025F8ec1F)** - `0x71B83044626c8F6Ef38F051673562Fe025F8ec1F`



### Step 4. Update address to support last features
On the `BlastRebasingTokensGovernor` contract, call 
- `updateAddress('votingEscrow', '0xC900C984a3581EfA4Fb56cAF6eF19721aAFbB4f9')` - configure VotingEscrow addres
- `updateAddress('swapTargetToken', '0x52f847356b38720B55ee18Cb3e094ca11C85A192')` - configure FNX address as target token of swap yields
- `updateAddress('swapRouter', '0x2df37Cb897fdffc6B4b03d8252d85BE7C6dA9d00')` - setup Algebra Swap Router address for use to swap yield to FNX

- **[BlastRebasingTokensGovernor](https://blastscan.io/address/0x71B83044626c8F6Ef38F051673562Fe025F8ec1F)** - `0x71B83044626c8F6Ef38F051673562Fe025F8ec1F`



### Step 5. Grant access to off-chain app address
On the `BlastRebasingTokensGovernor` contract, call grantRole with nessesary role for app wallet which wiil automatizate proccess claim, swap and distribute veFnx for rise program

For authorized address 0xAPP_WALLET call

- `grantRole('0xe9a873aced8c9fec61ebcc62115d88d36a3fdbe774441c967ed41ff3fa6506fa', 0xAPP_WALLET)` - TOKEN_DISTRIBUTE_ROLE will grant the right to distribute veFNX
- `grantRole('0x3357458aacccd7aecd4a1a986cf9ac7503d8fa322d133f7021ce1995b8b31e7f ', 0xAPP_WALLET)` - TOKEN_CLAIMER_ROLE will grant the right to claim yield
- `grantRole('0x3357458aacccd7aecd4a1a986cf9ac7503d8fa322d133f7021ce1995b8b31e7f ', 0xAPP_WALLET)` - TOKEN_SWAPPER_ROLE will grant the right to swap claimed yield to FNX token

These rights are required to automate yield collection, swap to FNX, and veFNX distribution to support the RISE program

- **[BlastRebasingTokensGovernor](https://blastscan.io/address/0x71B83044626c8F6Ef38F051673562Fe025F8ec1F)** - `0x71B83044626c8F6Ef38F051673562Fe025F8ec1F`
