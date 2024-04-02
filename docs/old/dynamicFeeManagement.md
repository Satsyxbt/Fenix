## Dynamic Fee Management
This document provides an guide on the management of dynamic fees in a UniswapV3 fork. It outlines the functionality and interaction with various contract methods and modules related to fee settings and distribution.


## Overview
In this UniswapV3 fork, dynamic fee management involves adjusting fee settings and allocations through specific contract methods within the pool or associated modules.

### Key Modules for Pool Management

1. **DynamicFeeModule**
   The DynamicFeeModule is a contract responsible for calculating and updating dynamic fees for each pool. Each pool is associated with its own instance of DynamicFeeModule, allowing for tailored fee management based on individual pool performance and market dynamics.
2. **FeeSplitter** 
   The FeeSplitter contract handles the distribution of fees not allocated to liquidity providers (LPs), such as treasury, gauges, etc. Similar to DynamicFeeModule, each pool has its dedicated FeeSplitter to manage its specific fee distributions.
  
### Access Control
Access to certain methods is restricted to authorized addresses only, ensuring that only designated parties can make adjustments to the fee structure and distributions

### State Variables:
Each pool is equipped with a set of state variables essential for the management of fees:

- `uint24 public override fee`: The base fee rate applied to swap transactions within the pool.
- `address public override feeModule`: The address of the contract responsible for managing dynamic fee adjustments.
- `address public override feeSplitter`: The recipient address for a specified portion of the collected fees.
- `uint24 public override feeToSplitterRate`: The rate at which fees are divided between the liquidity providers and the FeeSplitter.

## Interaction Methods within the Pool

### Adjusting the Fee Splitter Rate

The `setFeeSplitterRate(uint24 feeToSplitterRate_)` method is designed to configure the percentage of fees distributed between the pool's LPs and the FeeSplitter. For instance, to allocate 80% of the fees to LPs and 20% to the FeeSplitter, the method should be called as follows:

```javascript
setFeeSplitterRate(200000); // This sets a 20% allocation to the FeeSplitter.
```
Notably:

* `100%` is represented as `1e6`.
* `1%` is equivalent to `10000`.
* The total fee rate must not exceed `100%`.

### Fee Configuration Method
Each pool interacts with a dedicated `DynamicFeeModule`, accessible via `pool.feeModule()`. The `setDynamicFeeConfiguration(DynamicFeeConfiguration calldata config_)` method within this module allows for the customization of fee configurations adhering to the following structure:
```js
struct Configuration {
  uint16 alpha1; // Maximum value for the first sigmoid function.
  uint16 alpha2; // Maximum value for the second sigmoid function.
  uint32 beta1;  // X-axis shift for the first sigmoid function.
  uint32 beta2;  // X-axis shift for the second sigmoid function.
  uint16 gamma1; // Horizontal stretch factor for the first sigmoid function.
  uint16 gamma2; // Horizontal stretch factor for the second sigmoid function.
  uint16 baseFee; // The minimum fee applicable.
}
```
  **Example:** Setting or Changing a Static Fee for the Pool
  To implement a static fee rate of 3% for a pool, the `setDynamicFeeConfiguration()` method should be invoked on the pool's DynamicFeeModule with the desired settings:


```js
dynamicFeeModule.setDynamicFeeConfiguration([0, 0, 0, 0, 1, 1, 30000]);
// This is equivalent to calling:
// dynamicFeeModule.setDynamicFeeConfiguration([alpha1, alpha2, beta1, beta2, gamma1, gamma2, baseFee]);
```

To switch to another configuration, dynamic, another static percentage, simply call `dynamicFeeModule.setDynamicFeeConfiguration()` with the desired configuration


Requirements:
* Both `gamma1` and `gamma2` must be greater than 0 for the configuration to be valid.
* Setting `alpha1` and `alpha2` to 0 establishes a fixed fee, as it disables the sigmoid functions.
  
**Any modifications made through this method will take effect during the next swap**