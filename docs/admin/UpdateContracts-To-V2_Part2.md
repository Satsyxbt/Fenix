## 1. Configure Contract Parameters

### FeesVaultFactoryUpgradeable

**Caller Address**: `0xED8276141873621c18258D1c963C9F5d4014b5E5`

On the [`FeesVaultFactoryUpgradeable`](https://blastscan.io/address/0x25D84140b5a611Fc8b13B0a73b7ac86d30C81edB) contract, call the `setVoter()` function with the updated Voter address: `0x56129f1c0aED4aDBeE862986FAcE5Ba8c9aC3d9B`.


* **ABI:**
```json
[
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "voter_",
          "type": "address"
        }
      ],
      "name": "setVoter",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
]
```

##### Example
```solidity
FeesVaultFactoryUpgradeable_Proxy(`0x25D84140b5a611Fc8b13B0a73b7ac86d30C81edB`).setVoter(`0x56129f1c0aED4aDBeE862986FAcE5Ba8c9aC3d9B`);
```


## 2. Setup Creator Address for Already Created FeesVaults
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

##### Example 

**For v2 pairs:**
```solidity
FeesVaultFactoryUpgradeable_Proxy(`0x25D84140b5a611Fc8b13B0a73b7ac86d30C81edB`).changeCreatorForFeesVaults(
  `0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f`,
  [
    "0xF4F76fc7ae409862ECA9ffdb1767638E7DCD6E8B",
    "0xB5909f3C47557d0eef11503199Fc12c1252aB15a",
    "0xD49AD1DD6C5eaE53ABDaFEAED1866330C42CcAE4",
    "0x3C7fD63caB763a10B2754b1464e09d37a9FC79E7",
    "0x8C22d23eC102C9e098C8e0B9eD4eA01aA0B4Be35",
    "0x41861DC6924c0e9faE75340b64799e21f15F2831",
    "0xaaFF182d62Cd62140c9F453F9eB35ba98a90Eae8",
    "0x94D3a9Fe1265e3eb1D89849c325D931924CEC88f",
    "0xb485fDABB73274EE573700AAF37e92b6273a82c2"
  ]
);
```
**For v3 pools:**
```solidity
FeesVaultFactoryUpgradeable_Proxy(`0x25D84140b5a611Fc8b13B0a73b7ac86d30C81edB`).changeCreatorForFeesVaults(
  `0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df`,
  [
  "0x942015E51564427B120588F5EDe00c5112b8Fd54",
  "0x6f02B0BbBfDe5c63bc857c3A0db75b59Fe390035",
  "0x247132bdd44CFa4b5833AbC321D19bAcb9E1352E",
  "0x601f9FD805890d4a2c4b46a257652EdD5C466fc5",
  "0x7297F6AaeEd6c968A06acA8a00352016d2A4f217",
  "0xE615e8cc1E7523AE8e8ECe917a1F8328668C7D55",
  "0x0eC216BABc00ee8E3C75A0F2B3A88EDA76f2F65E",
  "0x7420b911b130AD29a0564379c6125fA6479bdfbb",
  "0x08CD5eE6429f5E6017E8431514D10A5aDf12f70B",
  "0x9246b8b74a9e95Edd7fB0Da51142816D1Ccf79F9",
  "0x75b69C79C2aAE452b125537CFF134AC2cBf28510",
  "0x5Af2f048F7051406Cb436439F8B8Ff5B7b81CD26",
  "0xD11440169Eacc0EF00e3d9317cD325AD9e7E5ec3",
  "0xCf5C408a148A62123045ECF9e4b10A7aa0bF13F2",
  "0x1D49733E397b26198D00720450C9403f66710b39",
  "0x82fa130440F06BB00cCFC19F55E94ba0F4Acb0d0",
  "0xD77021662795fEEbd382E960FfB9752Ab7f4E4d1",
  "0x01eb792050afE34e088C038f1723954F7129CB1e",
  "0xFa798118b9930F700b76C1AE2D4B382e53fECaEb",
  "0x505d5A7c7546828F758718c8452992ca18DfCf19",
  "0x7151826988c6C7516Ca751E219ea2b073b404Db6",
  "0x4f7b543b913215A3c2E9255f3091B6866E07F1eD",
  "0x482AAb22C5A076C6777F3fA2164370b64106Fed7",
  "0x22Cb8F41F38FA15C3587607Bf25b788dd45b336a",
  "0xC1CD8385Fe4594Da58dF065bC969fC91A73404d4",
  "0x8d429949e0457f69A8cA466F3c4c0180BBAeEa30",
  "0x1D4Ea1D9cd429EF4e0bb5b8ab8b86C7e6B2371bA",
  "0x989d611C2C1cf6ECABca3EE764D348665e7669A9",
  "0x91E755566F9D6D14335207a94E9e009D3EA99549",
  "0x2329e369943b5ff97C49893339607F5B7F68B19f",
  "0x0cd5e22bb0D1e20911e21A43D6B21E8a7867fd78",
  "0x42406A62eb213276656EDE70A745D73942F5E4e0",
  "0xcAd1C88c906c591E2dff228728755381fa3f2032",
  "0xa26E5308a7cAF5D85786058530a7Bcfbaaa198de",
  "0xf687d94E86bb2253d054a19aa6f86E1afcdC2987",
  "0x84E493e925a5298101D69D879F06Ec668CdA01Be",
  "0x0a1eCbF7aAF4E62C643E863b69C26C0F42A07269",
  "0x1A591185dEDC7F233b31e57Bd8832167AeF39D71",
  "0xd0a0fB02c1F96b985887618E79F7eC6dc8fA7ba6",
  "0x77b266F6277eBDC2BDc7Aaa8A001815059c82bf2",
  "0x7a5D2b331fE816D3920B3ad419B80f392c54E393",
  "0xeA24569BB092ddC5A908fA77E01f9F7577375DAD",
  "0x6B612981E5a39aD030e747a6a46fc8A71425a811",
  "0x609Ea9CB4D630d9E591b4dE02A2D2c903F0E741e",
  "0xFF4afA0aBc9B12a198946565Ff13541ae571AB7c",
  "0xCe96cB1D5bAeFB49dFd77f7355487736E2760324",
  "0x169CBD13287ACCd322B4B14082BF71f8D46c67d1",
  "0xa7404206E78774DF407822339D93cA8bC92691f8",
  "0x2a7397FecD1aa3569CB48e0C95b2453f24511836",
  "0xD103A5e3dB4DF83473665e936528f546269F7906",
  "0x975b9E2e3524bb9b041C5Ac245fd82a5AA7EB3A1",
  "0xaf9b93e54fAf86EC334c45a87DF7700aa7DB0b85",
  "0xeaF6881B6854259485E1E2Bdef8839E593047B2B",
  "0xa9548dd732BC0dE1389d6e20fAe7b66a39CF8b73",
  "0x8Cb1510AbD37e8c5aA65A8361470A377E6329d18",
  "0xca4e91c949857100B49A28A1f4eB07A9f067fd54",
  "0x9052412456527af39BB9a45990d866ddE8CA5CF5"
  ]
);
```

## 3. Claim All Swap Fees

At the moment, the configuration provides for the following distribution of the received swap fee for each FeesVault:
```solidity
toGaugeRate: 0
recipients: [`0xAC12571907b0aEE0eFd2BC13505B88284d5854db`] // Fenix tresuary
rates: 10000 // 100%
```
If this Fee is not taken away and distributed later, any user can call distribution for the created Gauge before the start of the main epochs and cause them to lose money (if changed to the correct configuration for distribution toGaugeRate())

To claim all swap fees from the fees vaults, the `claimFees` function of the `FeesVaultUpgradeable` contract should be used. The function redistributes the collected fees to various recipients as per the configured distribution.

- **Function**: `claimFees() external returns (uint256 gauge0, uint256 gauge1)`
  - **Returns**:
    - `gauge0`: Amount of fees distributed to the gauge for token0.
    - `gauge1`: Amount of fees distributed to the gauge for token1.
  - **Distribution Configuration**:
    - The function first retrieves the distribution configuration for the fees vault, which includes the rate at which fees are distributed to the gauge and recipients.
    - Fees are then distributed based on this configuration.

**It is necessary to call the distribution from the authorized `CLAIM_FEES_CALLER_ROLE` for example: `0xED8276141873621c18258D1c963C9F5d4014b5E5`, for each existing FeesVault**
* **ABI:**
```json
[
    {
      "inputs": [],
      "name": "claimFees",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    }
]
```

Target FeesVaults:
```json
  "0xF4F76fc7ae409862ECA9ffdb1767638E7DCD6E8B",
  "0xB5909f3C47557d0eef11503199Fc12c1252aB15a",
  "0xD49AD1DD6C5eaE53ABDaFEAED1866330C42CcAE4",
  "0x3C7fD63caB763a10B2754b1464e09d37a9FC79E7",
  "0x8C22d23eC102C9e098C8e0B9eD4eA01aA0B4Be35",
  "0x41861DC6924c0e9faE75340b64799e21f15F2831",
  "0xaaFF182d62Cd62140c9F453F9eB35ba98a90Eae8",
  "0x94D3a9Fe1265e3eb1D89849c325D931924CEC88f",
  "0xb485fDABB73274EE573700AAF37e92b6273a82c2"
  "0x942015E51564427B120588F5EDe00c5112b8Fd54",
  "0x6f02B0BbBfDe5c63bc857c3A0db75b59Fe390035",
  "0x247132bdd44CFa4b5833AbC321D19bAcb9E1352E",
  "0x601f9FD805890d4a2c4b46a257652EdD5C466fc5",
  "0x7297F6AaeEd6c968A06acA8a00352016d2A4f217",
  "0xE615e8cc1E7523AE8e8ECe917a1F8328668C7D55",
  "0x0eC216BABc00ee8E3C75A0F2B3A88EDA76f2F65E",
  "0x7420b911b130AD29a0564379c6125fA6479bdfbb",
  "0x08CD5eE6429f5E6017E8431514D10A5aDf12f70B",
  "0x9246b8b74a9e95Edd7fB0Da51142816D1Ccf79F9",
  "0x75b69C79C2aAE452b125537CFF134AC2cBf28510",
  "0x5Af2f048F7051406Cb436439F8B8Ff5B7b81CD26",
  "0xD11440169Eacc0EF00e3d9317cD325AD9e7E5ec3",
  "0xCf5C408a148A62123045ECF9e4b10A7aa0bF13F2",
  "0x1D49733E397b26198D00720450C9403f66710b39",
  "0x82fa130440F06BB00cCFC19F55E94ba0F4Acb0d0",
  "0xD77021662795fEEbd382E960FfB9752Ab7f4E4d1",
  "0x01eb792050afE34e088C038f1723954F7129CB1e",
  "0xFa798118b9930F700b76C1AE2D4B382e53fECaEb",
  "0x505d5A7c7546828F758718c8452992ca18DfCf19",
  "0x7151826988c6C7516Ca751E219ea2b073b404Db6",
  "0x4f7b543b913215A3c2E9255f3091B6866E07F1eD",
  "0x482AAb22C5A076C6777F3fA2164370b64106Fed7",
  "0x22Cb8F41F38FA15C3587607Bf25b788dd45b336a",
  "0xC1CD8385Fe4594Da58dF065bC969fC91A73404d4",
  "0x8d429949e0457f69A8cA466F3c4c0180BBAeEa30",
  "0x1D4Ea1D9cd429EF4e0bb5b8ab8b86C7e6B2371bA",
  "0x989d611C2C1cf6ECABca3EE764D348665e7669A9",
  "0x91E755566F9D6D14335207a94E9e009D3EA99549",
  "0x2329e369943b5ff97C49893339607F5B7F68B19f",
  "0x0cd5e22bb0D1e20911e21A43D6B21E8a7867fd78",
  "0x42406A62eb213276656EDE70A745D73942F5E4e0",
  "0xcAd1C88c906c591E2dff228728755381fa3f2032",
  "0xa26E5308a7cAF5D85786058530a7Bcfbaaa198de",
  "0xf687d94E86bb2253d054a19aa6f86E1afcdC2987",
  "0x84E493e925a5298101D69D879F06Ec668CdA01Be",
  "0x0a1eCbF7aAF4E62C643E863b69C26C0F42A07269",
  "0x1A591185dEDC7F233b31e57Bd8832167AeF39D71",
  "0xd0a0fB02c1F96b985887618E79F7eC6dc8fA7ba6",
  "0x77b266F6277eBDC2BDc7Aaa8A001815059c82bf2",
  "0x7a5D2b331fE816D3920B3ad419B80f392c54E393",
  "0xeA24569BB092ddC5A908fA77E01f9F7577375DAD",
  "0x6B612981E5a39aD030e747a6a46fc8A71425a811",
  "0x609Ea9CB4D630d9E591b4dE02A2D2c903F0E741e",
  "0xFF4afA0aBc9B12a198946565Ff13541ae571AB7c",
  "0xCe96cB1D5bAeFB49dFd77f7355487736E2760324",
  "0x169CBD13287ACCd322B4B14082BF71f8D46c67d1",
  "0xa7404206E78774DF407822339D93cA8bC92691f8",
  "0x2a7397FecD1aa3569CB48e0C95b2453f24511836",
  "0xD103A5e3dB4DF83473665e936528f546269F7906",
  "0x975b9E2e3524bb9b041C5Ac245fd82a5AA7EB3A1",
  "0xaf9b93e54fAf86EC334c45a87DF7700aa7DB0b85",
  "0xeaF6881B6854259485E1E2Bdef8839E593047B2B",
  "0xa9548dd732BC0dE1389d6e20fAe7b66a39CF8b73",
  "0x8Cb1510AbD37e8c5aA65A8361470A377E6329d18",
  "0xca4e91c949857100B49A28A1f4eB07A9f067fd54",
  "0x9052412456527af39BB9a45990d866ddE8CA5CF5"
```

**As a result, all tokens accumulated for all the past time will be transferred to 0xAC12571907b0aEE0eFd2BC13505B88284d5854db**

##### Example 

```solidity
FeesVaultUpgradeable(`0xF4F76fc7ae409862ECA9ffdb1767638E7DCD6E8B`).claimFees()
 // ... // 
FeesVaultUpgradeable(`0x9052412456527af39BB9a45990d866ddE8CA5CF5`).claimFees()
```

## 4. Configure Swap Fee Distribution for V2 and V3 Pools by Default or without Gauge

### Functions description
- **Function for Default Configuration**: `setDefaultDistributionConfig(DistributionConfig memory config_)`
  - **Parameters**:
    - `config_`: The distribution configuration that should be applied to fees vaults without custom settings.
  - **Access Control**: Only callable by accounts with the `FEES_VAULT_ADMINISTRATOR_ROLE`.
  
- **Function for Custom Configuration**: `setCustomDistributionConfig(address feesVault_, DistributionConfig memory config_)`
  - **Parameters**:
    - `feesVault_`: The address of the fees vault.
    - `config_`: The custom distribution configuration to apply.

- **Function for Configuration for FeesVaults by Creator address**: `setCustomDistributionConfig(address feesVault_, DistributionConfig memory config_)`
  - **Parameters**:
    - `creator`: The address of the creator_.
    - `config_`: The custom distribution configuration to apply.
  - **Access Control**: Only callable by accounts with the `FEES_VAULT_ADMINISTRATOR_ROLE`.

In all functions, the `DistributionConfig` structure contains information about:
- `toGaugeRate`: The rate at which fees are distributed to the gauge.
- `recipients`: An array of addresses that receive a portion of the fees.
- `rates`: Corresponding rates for each recipient address.

**If the configuration (config_) has a toGaugeRate of 0, and both the recipients and rates arrays are empty, the distribution configuration for the specified creator/feesVault is deleted. Otherwise, the distribution configuration is validated and then applied.**


#### Priority Order for Configurations
When configuring the FeesVault, the following priority order should be applied:
1. **Custom FeesVault Configuration**: If a specific configuration is set for a FeesVault, it takes precedence.
2. **Creator Configuration**: If no custom configuration is set for the FeesVault, the configuration set for the Creator is used.
3. **Default Configuration**: If neither a custom configuration nor a creator configuration is set, the default configuration is applied.

In both functions, the `DistributionConfig` structure contains information about:
- `toGaugeRate`: The rate at which fees are distributed to the gauge.
- `recipients`: An array of addresses that receive a portion of the fees.
- `rates`: Corresponding rates for each recipient address.

### Configure

**Caller Address**: `0xED8276141873621c18258D1c963C9F5d4014b5E5`
On the [`FeesVaultFactoryUpgradeable`](https://blastscan.io/address/0x25D84140b5a611Fc8b13B0a73b7ac86d30C81edB) contract

After called `claimFees` on all FeesVaults and attach address of their Creator, you should update the configurations of the distribution config by default for v2 and v3 FeesVaults

To set up a distribution configuration for swap fees for newly created or unassigned pools (i.e., pools without a gauge), use the `setDefaultDistributionConfig`, `setCustomDistributionConfig`, `setCustomDistributionConfig` functions to set up default or custom fee distributions for FeesVault, according to the needs and requirements to support Gauge and other recipients. 

**Important: Also, do not forget about the impact of distribution and fee within PairFactory/AlgebraPoolFactory, only % of the swap fee set in the v2/v3 factory is transferred to FeesVault**

#### Setup Distribution config for V3 pools fees vaults
To set the configuration, you should call `setDistributionConfigForCreator()` with the address of AlgebraFactory as the creator, as a result, this configuration will take precedence over the simple standard one for those FeesVaults that were created for Algebra Pool (V3)

In the configuration, you should consider:
- **Percentage of allocation to Gauge**.
- **Percentage of other partners/recipients as needed, for example, Algebra will take 3%**
- **Percentage to Fenix tresuary as needed**.

**Example:**
```solidity
FeesVaultFactory(`0x25D84140b5a611Fc8b13B0a73b7ac86d30C81edB`).setDistributionConfigForCreator("0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df", {
    toGaugeRate: 9500, // 95%
    recipients: ["{Fenix tresuary}", "{Algebra tresuary}"],
    rates: [200, 300]
});
```
As a result of applying this configuration, 95% will be sent to Gauge of this pool, 2% to Fenix Tresuary, 3% to Algebra Tresuary

#### Setup Distributioon config for V2 pools fees vaults
Repeat the steps with the appropriate changes for v2 pools
