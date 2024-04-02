## Dynamic Fee Management

### On-Chain Process:
1. **User's Swap Request:**
   - A user initiates a swap on the blockchain.

2. **Fee Calculation Before Each Swap:**
   - Prior to each exchange, a new fee for the pool is calculated. This fee will be applied to the swap.
   - Similarly, in line with the Oracle UniV3 model, information about the tick value and volatility for block in which the exchange occurs is stored (for future calculations).

3. **Setting New Fee Value in the Pool:**
   - The new fee value is set in the pool. This is not done for every exchange, but only for those that result in changes in the fee or are the first within the block

4. **Execution of the Swap:**
   - The user then completes the exchange with the newly calculated fee for the swap.

### How Dynamic Fee Works: Calculation and Key Aspects:
- **Basis of Dynamic Fee Calculation:**
  - The dynamic fee calculation is based on the average volatility over the **last day**, as well as configurations set for the dynamic fee.

- **Volatility Calculation Between Two Time Points Involves:**
  - Time delta between the two timepoints.
  - Tick value at the first timepoint.
  - Tick value at the second timepoint.
  - Average tick value at the time of the first timepoint.
  - Average tick value at the time of the second timepoint.
  
- **Volatility Mathematical Approach:**
  - Over the time interval from the previous timepoint to the current, tick and average tick change can be represented as two straight lines:
    - `tick = k*t + b`, where `k` and `b` are constants.
    - `avgTick = p*t + q`, where `p` and `q` are constants.
  - The goal is to calculate the sum of `(tick(t) - avgTick(t))^2` for every `t` in the interval `(0; dt]`.
  - The formula for this calculation involves quadratic and arithmetic progressions for `t` and `t^2`:
    - `sum(t)` from 1 to `dt` = `dt*(dt + 1)/2` = `sumOfSequence`.
    - `sum(t^2)` from 1 to `dt` = `dt*(dt+1)*(2dt + 1)/6` = `sumOfSquares`.
  - The result is calculated as: `(k-p)^2 * sumOfSquares + 2(k-p)(b-q)*sumOfSequence + dt*(b-q)^2`.
  - Where:
```js
        // On the time interval from the previous timepoint to the current
        // we can represent tick and average tick change as two straight lines:
        // tick = k*t + b, where k and b are some constants
        // avgTick = p*t + q, where p and q are some constants
        // we want to get sum of (tick(t) - avgTick(t))^2 for every t in the interval (0; dt]
        // so: (tick(t) - avgTick(t))^2 = ((k*t + b) - (p*t + q))^2 = (k-p)^2 * t^2 + 2(k-p)(b-q)t + (b-q)^2
        // since everything except t is a constant, we need to use progressions for t and t^2:
        // sum(t) for t from 1 to dt = dt*(dt + 1)/2 = sumOfSequence
        // sum(t^2) for t from 1 to dt = dt*(dt+1)*(2dt + 1)/6 = sumOfSquares
        // so result will be: (k-p)^2 * sumOfSquares + 2(k-p)(b-q)*sumOfSequence + dt*(b-q)^2
        unchecked {
            int256 k = (tick1 - tick0) - (avgTick1 - avgTick0); // (k - p)*dt
            int256 b = (tick0 - avgTick0) * dt; // (b - q)*dt
            int256 sumOfSequence = dt * (dt + 1); // sumOfSequence * 2
            int256 sumOfSquares = sumOfSequence * (2 * dt + 1); // sumOfSquares * 6
            volatility = uint256((k ** 2 * sumOfSquares + 6 * b * k * sumOfSequence + 6 * dt * b ** 2) / (6 * dt ** 2));
        }
```

- **Fee Calculation Based on Volatility and Configuration:**
  - The average volatility of the last day is normalized to a 15-second interval (`volatility = volatility / 15`).
  - Based on the configuration described in [Algebra Finance Documentation](https://docs.algebra.finance/en/docs/contracts/adaptive-fee/math/how-to-tweak-formula-behaviour), the new fee is computed as:
    - `Fee = baseFee + sigmoid(volatility, gamma1, alpha1, beta1) + sigmoid(volatility, gamma2, alpha2, beta2)`.
    - sigmoid formula:
$$ y = {\alpha \over 1 + e^{y *(\beta - x)}} $$

- **Configuration**
```js
  struct Configuration {
    uint16 alpha1; // max value of the first sigmoid
    uint16 alpha2; // max value of the second sigmoid
    uint32 beta1; // shift along the x-axis for the first sigmoid
    uint32 beta2; // shift along the x-axis for the second sigmoid
    uint16 gamma1; // horizontal stretch factor for the first sigmoid
    uint16 gamma2; // horizontal stretch factor for the second sigmoid
    uint32 volumeBeta; // shift along the x-axis for the outer volume-sigmoid
    uint16 volumeGamma; // horizontal stretch factor the outer volume-sigmoid
    uint16 baseFee; // minimum possible fee
  }
```