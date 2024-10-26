### Setup Rebasing Tokens Governor on AlgebraFactory Contract

After the changes, the `rebasingTokensGovernor` address is not set on the `AlgebraFactory` contract. It should be set to `0x71B83044626c8F6Ef38F051673562Fe025F8ec1F` to allow claiming rebasing tokens yield.

From the address `0x0907fb24626a06e383BD289A0e9C8560b8cCC4b5`, call the `setRebasingTokensGovernor(address rebasingTokensGovernor_)` method on the [AlgebraFactory](https://blastscan.io/address/0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df#writeProxyContract) contract (`0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df`) with the following parameter: `0x71B83044626c8F6Ef38F051673562Fe025F8ec1F` (RebasingTokensGovernor contract).

##### Example
```solidity
AlgebraFactory(0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df).setRebasingTokensGovernor(0x71B83044626c8F6Ef38F051673562Fe025F8ec1F);
```

### Setup Default Blast Governor on AlgebraFactory Contract

Currently, the `defaultBlastGovernor` address is set to `0x59D253ADF0D860279f65A6EaBc3497a18B2fB556`, which does not allow for automated gas management from contracts. It needs to be updated to `0x72e47b1eaAAaC6c07Ea4071f1d0d355f603E1cc1`.

From the address `0x0907fb24626a06e383BD289A0e9C8560b8cCC4b5`, call the `setDefaultBlastGovernor(address defaultBlastGovernor_)` method on the [AlgebraFactory](https://blastscan.io/address/0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df#writeProxyContract) contract (`0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df`) with the following parameter: `0x72e47b1eaAAaC6c07Ea4071f1d0d355f603E1cc1` (BlastGovernor contract).

##### Example
```solidity
AlgebraFactory(0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df).setDefaultBlastGovernor(0x72e47b1eaAAaC6c07Ea4071f1d0d355f603E1cc1);
```

### Setup Default Blast Governor on BasePluginV1Factory Contract

Currently, the `defaultBlastGovernor` address is set to `0x59D253ADF0D860279f65A6EaBc3497a18B2fB556`, which does not allow for automated gas management from contracts. It needs to be updated to `0x72e47b1eaAAaC6c07Ea4071f1d0d355f603E1cc1`.

From the address `0x0907fb24626a06e383BD289A0e9C8560b8cCC4b5`, call the `setDefaultBlastGovernor(address defaultBlastGovernor_)` method on the [BasePluginV1Factory](https://blastscan.io/address/0x118A7D61bd36215a01Ab8A29Eb1e5b830c32FA23#writeProxyContract) contract (`0x118A7D61bd36215a01Ab8A29Eb1e5b830c32FA23`) with the following parameter: `0x72e47b1eaAAaC6c07Ea4071f1d0d355f603E1cc1` (BlastGovernor contract).

##### Example
```solidity
BasePluginV1Factory(0x118A7D61bd36215a01Ab8A29Eb1e5b830c32FA23).setDefaultBlastGovernor(0x72e47b1eaAAaC6c07Ea4071f1d0d355f603E1cc1);
```

### Setup Default Blast Governor on AlgebraEternalFarming Contract

Currently, the `defaultBlastGovernor` address is set to `0x59D253ADF0D860279f65A6EaBc3497a18B2fB556`, which does not allow for automated gas management from contracts. It needs to be updated to `0x72e47b1eaAAaC6c07Ea4071f1d0d355f603E1cc1`.

From the address `0x0907fb24626a06e383BD289A0e9C8560b8cCC4b5`, call the `setDefaultBlastGovernor(address defaultBlastGovernor_)` method on the [AlgebraEternalFarming](https://blastscan.io/address/0xE8B7B02C5FC008f92d6f2E194A1efaF8C4D726A8#writeProxyContract) contract (`0xE8B7B02C5FC008f92d6f2E194A1efaF8C4D726A8`) with the following parameter: `0x72e47b1eaAAaC6c07Ea4071f1d0d355f603E1cc1` (BlastGovernor contract).

##### Example
```solidity
AlgebraEternalFarming(0xE8B7B02C5FC008f92d6f2E194A1efaF8C4D726A8).setDefaultBlastGovernor(0x72e47b1eaAAaC6c07Ea4071f1d0d355f603E1cc1);
```