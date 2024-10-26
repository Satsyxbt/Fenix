## Setup Creator Address for Already Created V2 FeesVaults
With the update, we have added a configuration differentiation for FeesVault by their creator (PairFactory, AlgebraPoolFactory), but for already created FeesVault, you need to set them manually (for future ones, it will be set automatically)

To assign a creator address for an existing fees vault, use the `changeCreatorForFeesVaults` function. This function allows the administrator to change the creator address for one or multiple fees vaults.

- **Function**: `changeCreatorForFeesVaults(address creator_, address[] calldata feesVaults_)`
  - **Parameters**:
    - `creator_`: The address of the new creator.
    - `feesVaults_`: The list of fees vault addresses for which to set the new creator.
  - **Access Control**: Only callable by accounts with the `DEFAULT_ADMIN_ROLE`.

**Caller Address**: `0xED8276141873621c18258D1c963C9F5d4014b5E5`

On the [`FeesVaultFactoryUpgradeable`](https://blastscan.io/address/0x25D84140b5a611Fc8b13B0a73b7ac86d30C81edB) contract, call the `changeCreatorForFeesVaults()` function with list of pool address and the relevant address of the factory

* **ABI:**
```json
[
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "creator_",
          "type": "address"
        },
        {
          "internalType": "address[]",
          "name": "feesVaults_",
          "type": "address[]"
        }
      ],
      "name": "changeCreatorForFeesVaults",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
]
```

##### Need setup creator `0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f`(PairFactory) for next list of FeesVaults
```
[
  "0xc48452A293cbdd741d5359747868645F88afbaB8",
  "0x1514f6eD2a44e7947e484d6Cb7fE4Dee2FF86318",
  "0xe4E4f83095c9Bf01c8879204043ad2bcF3045be3",
  "0xd28bF68F9E6Ab02BD896784a3CB9F7FB1bCD94E4",
  "0x9703d2fcC03fdF993d809fD6a57E45E5ee1f1a93",
  "0xead8E7765e307BB1dd094af687304c60c63fBa2b",
  "0x31faC7a3BA2788666386Dbd9028B5471F4Caa6D1",
  "0x5b77EB475C5d6204587BAB2d3D92E538da40FC07",
  "0x443788c6a00477655601e7aFdc0A4803AB1b633d"
]
```

**Example**:
```solidity
FeesVaultFactoryUpgradeable_Proxy(`0x25D84140b5a611Fc8b13B0a73b7ac86d30C81edB`).changeCreatorForFeesVaults(
  `0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f`,
  [
  "0xc48452A293cbdd741d5359747868645F88afbaB8",
  "0x1514f6eD2a44e7947e484d6Cb7fE4Dee2FF86318",
  "0xe4E4f83095c9Bf01c8879204043ad2bcF3045be3",
  "0xd28bF68F9E6Ab02BD896784a3CB9F7FB1bCD94E4",
  "0x9703d2fcC03fdF993d809fD6a57E45E5ee1f1a93",
  "0xead8E7765e307BB1dd094af687304c60c63fBa2b",
  "0x31faC7a3BA2788666386Dbd9028B5471F4Caa6D1",
  "0x5b77EB475C5d6204587BAB2d3D92E538da40FC07",
  "0x443788c6a00477655601e7aFdc0A4803AB1b633d"
  ]
);
```