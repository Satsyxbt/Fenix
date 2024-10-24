## Documentation: Swap Fee Distribution Between LP Providers and FeesVault

### Key Contracts Involved
- **PairFactoryUpgradeable**: Manages the creation of token pairs and configures swap fees for stable and volatile pools.
- **Pair**: Represents a liquidity pool for a pair of tokens, either stable or volatile, and handles fee accumulation and claims.

### Swap Fee Distribution Parameters
1. **Protocol Fee** (`protocolFee`): A percentage of the total swap fee that is allocated to the community vault. The default protocol fee is set to 100% of the total swap fee.
2. **Stable Fee** (`stableFee`): The fee applied to stable token swaps, initially set to 0.04% (4 basis points).
3. **Volatile Fee** (`volatileFee`): The fee applied to volatile token swaps, initially set to 0.18% (18 basis points).
4. **Custom Fees** (`_customFee`, `_customProtocolFee`): Specific pairs can have custom swap and protocol fees that override the default rates.

### V2 Fee Configuration Guide

#### Fee Limits and Precision
- **`MAX_FEE`**: Set at 5% (500 in terms of basis points).
- **`PRECISION`**: Represents 100%, established at 10,000 for exact fee calculations.

#### Fee Conversion Reference
- 100% = 10,000 basis points
- 50% = 5,000 basis points
- 1% = 100 basis points
- 0.1% = 10 basis points
- 0.01% = 1 basis point

### Functions for Fee Management
- **`setProtocolFee(uint256 _newFee)`**: Updates the protocol fee that is allocated to the community vault. Only accessible by an account with the `FEES_MANAGER_ROLE`.
- **`setCustomProtocolFee(address _pair, uint256 _newFee)`**: Sets a custom protocol fee for a specific pair. Only accessible by an account with the `FEES_MANAGER_ROLE`.
- **`setCustomFee(address _pair, uint256 _fee)`**: Sets a custom swap fee for a specific pair. Only accessible by an account with the `FEES_MANAGER_ROLE`.
- **`setFee(bool _stable, uint256 _fee)`**: Updates the default fee for either stable or volatile pairs. Only accessible by an account with the `FEES_MANAGER_ROLE`.

### Default Fee for Volatility/Stable Pairs
To configure the default trading fee for either volatile or stable pairs, use the `setFee` function:

```javascript
function setFee(bool _stable, uint256 _fee)
```

- `_stable`: Boolean indicating if the pair is stable (`true`) or volatile (`false`).
- `_fee`: The fee to set, within the 0.01% to 5% range (1 to 500 basis points).

### Custom Fee
For setting a custom trading fee for a specific pair, utilize the `setCustomFee` function:

```javascript
function setCustomFee(address _pair, uint256 _fee)
```

- `_pair`: The address of the pair for which the custom fee is to be set.
- `_fee`: The custom fee amount, ensure it is within the 0.01% to 5% range (1 to 500 basis points).

### Retrieving Current Fee Values for a Pair
To obtain the current fee values for a specific pair in the smart contract, you can use the following functions provided in the `PairFactoryUpgradeable` contract:

1. **Getting the Trading Fee for a Pair**
Use the `getFee` function to find out the trading fee for a specific pair, which can be either stable or volatile:
```js
function getFee(address pair_, bool stable_) external view returns (uint256)
```

- `pair_`: The address of the trading pair for which you want to retrieve the trading fee.
- `stable_`: Boolean flag indicating whether you are querying the fee for a stable (true) or volatile (false) pair.
  
This function checks if there is a custom trading fee set for the given pair. If a custom fee exists, it returns that value; otherwise, it returns the default fee applicable for stable or volatile pairs, based on the `stable_` flag.

### Fee Distribution Workflow
1. **Accruing Fees in the Pair Contract**: 
   - The `Pair` contract is responsible for accruing swap fees for both tokens in the pair. The accrued fees are split between liquidity providers and the community vault.
   - During a swap, fees are calculated based on the swap amount and distributed accordingly.
2. **Protocol Fee Allocation**: 
   - When a swap occurs, a portion of the fee, defined by the protocol fee rate, is transferred to the community vault. The remaining fee is allocated to liquidity providers.
3. **Claiming Fees**: 
   - LPs can claim their portion of the accumulated fees using the `claimFees` function in the `Pair` contract. This function calculates the unclaimed fees based on the user's share of the liquidity and transfers the tokens.

### Fee Distribution Chart Example
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

### Example: Setting Custom Swap Fee
To set a custom swap fee for a specific pair, the `setCustomFee` function is used. For example:
```solidity
pairFactory.setCustomFee(pairAddress, 25); // Sets a custom fee of 0.25% for the given pair
```
This overrides the default fee for the specified pair, allowing for greater flexibility in fee management.

### Events Related to Fee Management
- **`SetProtocolFee(uint256 newFee)`**: Emitted when the protocol fee is updated.
- **`SetCustomProtocolFee(address indexed pair, uint256 newFee)`**: Emitted when a custom protocol fee is set for a pair.
- **`SetCustomFee(address indexed pair, uint256 fee)`**: Emitted when a custom swap fee is set for a pair.
- **`Fees(address indexed sender, uint amount0, uint amount1)`**: Emitted when fees are accrued in the `Pair` contract.

### Roles and Permissions
- **`FEES_MANAGER_ROLE`**: Required to update protocol fees, custom fees, and default swap fees.
- **`PAIRS_ADMINISTRATOR_ROLE`**: Required to set community vault addresses and pause state for the pair factory.