
## Fee Distribution

This guide explains how to manage the distribution of fees in v2 pair

### Example of a distribution chart
```lua
                        +-------+
                        |  Pair |
                        +-------+
                           | #fee
    +----------------------|------------+
    |                                   |
    | #fee - #protocol fee              | #protocol fee
    |                                   |
    v                                   v
+-----------+                       +---------+
| Lp        |                       | Fees    |
| providers |                       | Vault   |
+-----------+                       +---------+
                                        |
                                        | #protocol fee
                                        |
                                        v
                                    +-----------+
                                    | Distribute|
                                    | according |
                                    | to config |
                                    +-----------+
                                        |
                        +---------------|-------------+
                        |               |              |
                        | #toGaugeRate  |              |
                        v               v              v
                    +--------+     +---------+     +------------+
                    | Gauge  |     | Other   | ... | Recipients |
                    |        |     |recipient|     |            |
                    +--------+     +---------+     +------------+
```
#### Overview
Fee distribution v2 is managed through setting parameters in PairFactory (protocol fee, custom protocol fee) and configuration for `FeesVault` within `FeesVaultFactory`

#### Default Protocol Fee
The default protocol fee defines how swap fees are split between LP providers and the `FeesVault`. By default, it can be set to direct 100% of the swap fees to the `FeesVault`.

To adjust the default protocol fee, use the `setProtocolFee` method:

```javascript
function setProtocolFee(uint256 _newFee)
```

- `_newFee`: The new protocol fee percentage, ranging from 0% to 100% (0 to 10,000 basis points).

#### Custom Protocol Fee
For flexibility, you can set a custom protocol fee for individual pairs using the `setCustomProtocolFee` method:

```javascript
function setCustomProtocolFee(address _pair, uint256 _newFee)
```

- `_pair`: The pair's address for which the custom protocol fee is being set.
- `_newFee`: The custom protocol fee rate, within the 0% to 100% range (0 to 10,000 basis points).

### FeesVaultFactory Configuration

#### Configuration structure
```js
    struct DistributionConfig {
        uint256 toGaugeRate; // The rate at which fees are distributed to the gauge.
        address[] recipients; // The addresses of the recipients who will receive the fees.
        uint256[] rates; // The rates at which fees are distributed to each recipient.
    }
```
### Setting Custom Distribution Configuration
To define a custom fee distribution for a specific FeesVault, use the `setCustomDistributionConfig` method:
```js
function setCustomDistributionConfig(address feesVault_, DistributionConfig memory config_)
```
- `feesVault_`: The address of the FeesVault to configure.
- `config_`: The distribution configuration to apply, specifying `toGaugeRate`, `recipients`, and their respective `rates`.

#### Setting Custom Distribution Configuration
To define a custom fee distribution for a specific FeesVault, use the `setCustomDistributionConfig` method:
```js
function setCustomDistributionConfig(address feesVault_, DistributionConfig memory config_)
```
- `feesVault_`: The address of the FeesVault to configure.
- `config_`: The distribution configuration to apply, specifying `toGaugeRate`, `recipients`, and their respective `rates`.
- 
#### Setting Default Distribution Configuration
To define a default fee distribution for a all FeesVault, use the `setDefaultDistributionConfig` method:
```js
function setDefaultDistributionConfig(DistributionConfig memory config_)
```
- `config_`: The distribution configuration to apply, specifying `toGaugeRate`, `recipients`, and their respective `rates`.
  
#### Accessing Fee Distribution Configurations
To view fee distribution configurations, use the following methods:

- `getDistributionConfig(address feesVault_)`: Retrieves the distribution configuration for a specific `FeesVault`.
- `defaultDistributionConfig()`: Shows the default distribution configuration across the platform.
- `customDistributionConfigs(address feesVault_)`: Accesses the custom distribution configuration for a specified FeesVault.
