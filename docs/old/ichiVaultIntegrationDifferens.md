# Integration Modifications for Fenix V3 within ICHI Contracts

The following outlines necessary adjustments to the `ICHIVault` and `ICHIFactory` contracts, originally designed for Algebra V3, to ensure compatibility with Fenix V3. These modifications address import changes, method adjustments, and compatibility enhancements required for seamless integration with the Fenix V3 protocol.

## Contract Instances

- **ICHIVault**: [BSCScan ICHIVault](https://bscscan.com/address/0x5F82CF3A2E4e1Ec8b31C4eEbCB2815151509a082#code)
- **ICHIFactory**: [BSCScan ICHIFactory](https://bscscan.com/address/0xac93148e93d1c49d89b1166bfd74942e80f5d501#code)

## 1. Import Changes

Replace Algebra-specific imports in the contracts with their Fenix counterparts to align with Fenix V3's interface structure.

### ICHIFactory.sol

- **Before**:
```javascript
5: import {IAlgebraFactory} from '@cryptoalgebra/v1-core/contracts/interfaces/IAlgebraFactory.sol';
9: import {IAlgebraPool} from "@cryptoalgebra/v1-core/contracts/interfaces/IAlgebraPool.sol";
```
- **After**:
```javascript
5: import {IFenixV3Factory} from '{..}/intefaces/IFenixV3Factory.sol';
9: import {IUniswapV3Pool} from "{..}/intefaces/IUniswapV3Pool.sol";
```

### ICHIVault.sol

- **Before**:
  
```javascript
5:  import {IAlgebraFactory} from '@cryptoalgebra/v1-core/contracts/interfaces/IAlgebraFactory.sol';
15: import {IAlgebraMintCallback} from "@cryptoalgebra/v1-core/contracts/interfaces/callback/IAlgebraMintCallback.sol";
16: import {IAlgebraSwapCallback} from "@cryptoalgebra/v1-core/contracts/interfaces/callback/IAlgebraSwapCallback.sol";
17: import {IAlgebraPool} from "@cryptoalgebra/v1-core/contracts/interfaces/IAlgebraPool.sol";
18: import {IDataStorageOperator} from "@cryptoalgebra/v1-core/contracts/interfaces/IDataStorageOperator.sol";
```

- **After**:
```js
5:  import {IFenixV3Factory} from '{..}/intefaces/IAlgebraFactory.sol';
15: import {IUniswapV3MintCallback} from "{..}/intefaces/callback/IUniswapV3MintCallback .sol";
16: import {IUniswapV3SwapCallback} from "{..}/intefaces/callback/IUniswapV3SwapCallback.sol";
17: import {IUniswapV3Pool} from "{..}/intefaces/IUniswapV3Pool.sol";
```

## 2. Pool Address Retrieval

Adjust the way to obtain deployed pool addresses, incorporating `tickSpacing` for Fenix pools.

- **Algebra**:
    ```javascript
    address pool = IAlgebraFactory(algebraFactory).poolByPair(tokenA, tokenB);
    ```
- **Fenix**:
    Requires passing `tickSpacing` in addition to token addresses.
    ```javascript
    address pool = IFenixV3Factory(fenixFactory).getPool(tokenA, tokenB, tickSpacing);
    ```

## 3. Reading Global State

Modify global state reading to accommodate Fenix's use of a more standard `slot0` format, noting the absence of `feeProtocol`.

- **Algebra**:
    ```javascript
    ICHIFactory.sol

        (/*uint160 price*/,
         /*int24 tick*/,
         /*uint16 fee*/,
         /*uint16 timepointIndex*/,
         /*uint16 communityFeeToken0*/,
         /*uint16 communityFeeToken1*/,
         bool unlocked
        80:  ) = IAlgebraPool(pool).globalState();
    ```
- **Fenix**:
    ```javascript
    ICHIFactory.sol

        (/*uint160 sqrtPriceX96*/,
        /*int24 tick*/,
        /*uint16 observationIndex*/,
        /*uint16 observationCardinality*/,
        /*uint16 observationCardinalityNext*/,
        bool unlocked
    80: ) = IUniswapV3Pool(pool).slot0();
    ```

## 4. genKey Generation in ICHIVault

Enhance `genKey` function to include `tickSpacing`, ensuring unique keys for different pools with identical tokens.

## 5. Fee Retrieval

Update the method to obtain pool fee

- **Algebra**:
    ```javascript
    function fee() external override view returns(uint24 fee_) {
        (, , fee_, , , , ) = IAlgebraPool(pool).globalState();
    }
    ```
- **Fenix**:
    ```javascript
    function fee() external override view returns(uint24 fee_) {
        return IUniswapV3Pool(pool).fee();
    }
    ```

## 6. Solidity Version Update

Upgrade to `pragma solidity >=0.8.0;` to align with current standards and ensure compatibility.

## 7. Global State and Observations Adjustments

Adapt global state readings and subsequent actions to the standard Uniswap V3 observations approach, eliminating reliance on `dataStorageOperator`.

- **Fenix** adaptation involves direct usage of Uniswap V3's observation methodology.

### 8. And others...
