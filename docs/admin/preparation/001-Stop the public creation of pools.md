### Stop the Public Creation of Pools

To avoid missing certain configurations during the contract setup process, a good solution is to temporarily stop the public creation of pools.

For this, from the address `0x0907fb24626a06e383BD289A0e9C8560b8cCC4b5`, two calls should be made:

### AlgebraFactory

#### Step 1: Check if `isPublicPoolCreationMode` is enabled
To do this, call the `isPublicPoolCreationMode()` method on the [AlgebraFactory](https://blastscan.io/address/0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df#readProxyContract#F20) contract (`0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df`). If it returns `false`, it means the pool creation is already set to private, and no further action is required. If it returns `true`, proceed to Step 2.

#### Step 2: Enable private pool creation
On the [AlgebraFactory](https://blastscan.io/address/0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df#writeProxyContract) contract (`0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df`), call `setIsPublicPoolCreationMode(bool mode_)` with the parameter set to `false`.

**Example**:
```solidity
AlgebraFactory(0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df).setIsPublicPoolCreationMode(false);
```

### PairFactory

#### Step 1: Check if `isPublicPoolCreationMode` is enabled
To do this, call the `isPublicPoolCreationMode()` method on the [PairFactoryUpgradeable](https://blastscan.io/address/0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f#readProxyContract#F23) contract (`0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f`). If it returns `false`, it means the pool creation is already private, and no further action is required. If it returns `true`, proceed to Step 2.

#### Step 2: Enable private pool creation
On the [PairFactoryUpgradeable](https://blastscan.io/address/0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f#writeProxyContract) contract (`0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f`), call `setIsPublicPoolCreationMode(bool mode_)` with the parameter set to `false`.

**Example**:
```solidity
PairFactoryUpgradeable(0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f).setIsPublicPoolCreationMode(false);
```

