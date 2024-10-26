### Upgrade AlgebraFactory to Latest Version

The new version of the `AlgebraFactory` contract introduces support for registering created pools in `BlastGovernor`/`BlastRebasingTokensGovernor`. This enhancement allows for automated gas collection in Claimable Mode and centralized collection of `ERC20Rebasing` tokens.

To perform the upgrade, follow these steps:

#### Step 1: Upgrade AlgebraFactory Contract

From the address `0xED8276141873621c18258D1c963C9F5d4014b5E5`, call the `upgrade(address proxy, address implementation)` method on the [ProxyAdmin](https://blastscan.io/address/0xA1DA767b77FdfF57A7D8191861d73ac02Bbd5696) contract (`0xA1DA767b77FdfF57A7D8191861d73ac02Bbd5696`) with the following parameters:

- **proxy**: `0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df` (Current AlgebraFactory Proxy address)
- **implementation**: `0x34dEf159fEACe10E88595Ebd5C50edba0631b4B3` (New AlgebraFactory implementation)

As a result, the contract will be updated from the previous implementation (`0xab8edDD8193eE4A5459f4245eAc980279774a278`) to the new implementation (`0x34dEf159fEACe10E88595Ebd5C50edba0631b4B3`).

##### Example
```solidity
ProxyAdmin(0xA1DA767b77FdfF57A7D8191861d73ac02Bbd5696).upgrade(
    0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df,
    0x34dEf159fEACe10E88595Ebd5C50edba0631b4B3
);
```
