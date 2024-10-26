### Grant Rights for RebasingTokensGovernor to Claim Rebasing Tokens Yield

To allow calls to `claim` and `configure` methods for rebasing tokens on pools and pairs, the `RebasingTokensGovernor` contract must have the `POOLS_ADMINISTRATOR_ROLE` and `PAIRS_ADMINISTRATOR_ROLE`, respectively. This will enable it to call the `configure` and `claim` methods on the pools and pairs.

#### Grant `PAIRS_ADMINISTRATOR_ROLE` on PairFactory

From the address `0xED8276141873621c18258D1c963C9F5d4014b5E5`, call the `grantRole(bytes32 role, address account)` method on the [PairFactory](https://blastscan.io/address/0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f#writeProxyContract) contract (`0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f`) with the following parameters:
- **role**: `0x8bb7efba716b8bd9b59b6661dd03848105f980fb29035ebc6d805a30527f6e3d` (`ethers.id('PAIRS_ADMINISTRATOR')`)
- **account**: `0x71B83044626c8F6Ef38F051673562Fe025F8ec1F` (BlastRebasingTokensGovernor)

#### Grant `POOLS_ADMINISTRATOR_ROLE` on AlgebraPoolFactory

From the address `0x0907fb24626a06e383BD289A0e9C8560b8cCC4b5`, call the `grantRole(bytes32 role, address account)` method on the [AlgebraPoolFactory](https://blastscan.io/address/0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df#writeProxyContract) contract (`0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df`) with the following parameters:
- **role**: `0xb73ce166ead2f8e9add217713a7989e4edfba9625f71dfd2516204bb67ad3442` (`ethers.id('POOLS_ADMINISTRATOR')`)
- **account**: `0x71B83044626c8F6Ef38F051673562Fe025F8ec1F` (BlastRebasingTokensGovernor)

These roles are necessary for the `RebasingTokensGovernor` to manage rebasing token yield by interacting with pools and pairs effectively.

