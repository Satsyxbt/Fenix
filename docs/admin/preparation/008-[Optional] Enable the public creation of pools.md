### [Optional] Enable the Public Creation of Pools

The main actions with pools, etc. are over, which allows you to resume public pool creation

For this, from the address `0x0907fb24626a06e383BD289A0e9C8560b8cCC4b5`, two calls should be made:

#### V3 AlgebraFactory, Enable public pool creation if nessesary
On the [AlgebraFactory](https://blastscan.io/address/0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df#writeProxyContract) contract (`0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df`), call `setIsPublicPoolCreationMode(bool mode_)` with the parameter set to `true`.

**Example**:
```solidity
AlgebraFactory(0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df).setIsPublicPoolCreationMode(true);
```

#### V2 PairFactory, Enable public pool creation

On the [PairFactoryUpgradeable](https://blastscan.io/address/0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f#writeProxyContract) contract (`0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f`), call `setIsPublicPoolCreationMode(bool mode_)` with the parameter set to `true`.

**Example**:
```solidity
PairFactoryUpgradeable(0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f).setIsPublicPoolCreationMode(true);
```

