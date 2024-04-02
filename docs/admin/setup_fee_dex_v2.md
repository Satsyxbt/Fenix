
### V2 Fee Configuration Guide

In V2 of the PairFactoryUpgradeable smart contract, authorized addresses (with `FEES_MANAGER_ROLE`) can manage fee settings as follows:

#### Fee Limits and Precision
- **`MAX_FEE`**: Set at 5% (500 in terms of basis points).
- **`PRECISION`**: Represents 100%, established at 10,000 for exact fee calculations.

#### Fee Conversion Reference
- 100% = 10,000 basis points
- 50% = 5,000 basis points
- 1% = 100 basis points
- 0.1% = 10 basis points
- 0.01% = 1 basis point

#### Default Fee for Volatility/Stable Pairs

To configure the default trading fee for either volatile or stable pairs, use the `setFee` function:

```javascript
function setFee(bool _stable, uint256 _fee)
```

- `_stable`: Boolean indicating if the pair is stable (`true`) or volatile (`false`).
- `_fee`: The fee to set, within the 0.01% to 5% range (1 to 500 basis points).

#### Custom Fee

For setting a custom trading fee for a specific pair, utilize the `setCustomFee` function:

```javascript
function setCustomFee(address _pair, uint256 _fee)
```

- `_pair`: The address of the pair for which the custom fee is to be set.
- `_fee`: The custom fee amount, ensure it is within the 0.01% to 5% range (1 to 500 basis points).


#### Retrieving Current Fee Values for a Pair
To obtain the current fee values for a specific pair in the smart contract, you can use the following functions provided in the PairFactoryUpgradeable contract:

1. Getting the Trading Fee for a Pair
Use the getFee function to find out the trading fee for a specific pair, which can be either stable or volatile:
```js
function getFee(address pair_, bool stable_) external view returns (uint256)
```

* `pair_`: The address of the trading pair for which you want to retrieve the trading fee.
* `stable_`: Boolean flag indicating whether you are querying the fee for a stable (true) or volatile (false) pair.
This function checks if there is a custom trading fee set for the given pair. If a custom fee exists, it returns that value; otherwise, it returns the default fee applicable for stable or volatile pairs, based on the `stable_` flag.

