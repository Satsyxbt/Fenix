# Report


## Gas Optimizations


| |Issue|Instances|
|-|:-|:-:|
| [GAS-1](#GAS-1) | `a = a + b` is more gas effective than `a += b` for state variables (excluding arrays and mappings) | 6 |
| [GAS-2](#GAS-2) | Use assembly to check for `address(0)` | 11 |
| [GAS-3](#GAS-3) | Using bools for storage incurs overhead | 2 |
| [GAS-4](#GAS-4) | Cache array length outside of loop | 6 |
| [GAS-5](#GAS-5) | State variables should be cached in stack variables rather than re-reading them from storage | 3 |
| [GAS-6](#GAS-6) | Use calldata instead of memory for function arguments that do not get mutated | 3 |
| [GAS-7](#GAS-7) | For Operations that will not overflow, you could use unchecked | 92 |
| [GAS-8](#GAS-8) | Avoid contract existence checks by using low level calls | 6 |
| [GAS-9](#GAS-9) | Functions guaranteed to revert when called by normal users can be marked `payable` | 25 |
| [GAS-10](#GAS-10) | `++i` costs less gas compared to `i++` or `i += 1` (same for `--i` vs `i--` or `i -= 1`) | 10 |
| [GAS-11](#GAS-11) | Using `private` rather than `public` for constants, saves gas | 5 |
| [GAS-12](#GAS-12) | Use shift right/left instead of division/multiplication if possible | 2 |
| [GAS-13](#GAS-13) | `uint256` to `bool` `mapping`: Utilizing Bitmaps to dramatically save on Gas | 1 |
| [GAS-14](#GAS-14) | Use != 0 instead of > 0 for unsigned integer comparison | 3 |
| [GAS-15](#GAS-15) | `internal` functions not called by the contract should be removed | 4 |
| [GAS-16](#GAS-16) | Don't use `_msgSender()` if not supporting EIP-2771 | 1 |
### <a name="GAS-1"></a>[GAS-1] `a = a + b` is more gas effective than `a += b` for state variables (excluding arrays and mappings)
This saves **16 gas per instance.**

*Instances (6)*:
```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

356:                     count += 2;

```

```solidity
File: contracts/nest/SingelTokenVirtualRewarderUpgradeable.sol

127:         info.balance += amount_;

128:         totalSupply += amount_;

190:         rewardsPerEpoch[currentEpoch] += amount_;

308:             reward += _calculateRewardPerEpoch(tokenId_, startEpoch);

310:             startEpoch += _WEEK;

```

### <a name="GAS-2"></a>[GAS-2] Use assembly to check for `address(0)`
*Saves 6 gas per instance*

*Instances (11)*:
```solidity
File: contracts/nest/BaseManagedNFTStrategyUpgradeable.sol

154:         if (addr_ == address(0)) {

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyFactoryUpgradeable.sol

167:         if (addr_ == address(0)) {

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyUpgradeable.sol

197:         if (addr_ == address(0)) {

```

```solidity
File: contracts/nest/ManagedNFTManagerUpgradeable.sol

301:         if (addr_ == address(0)) {

```

```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

218:                 factoryCache.getPair(routesTokenToToken[i][0].from, routesTokenToToken[i][0].to, routesTokenToToken[i][0].stable) !=

237:         if (factoryCache.getPair(inputToken_, outputToken_, true) != address(0)) {

244:         if (factoryCache.getPair(inputToken_, outputToken_, false) != address(0)) {

288:             if (pair == address(0)) {

371:         if (addr_ == address(0)) {

```

```solidity
File: contracts/nest/SingelTokenBuybackUpgradeable.sol

209:         if (addr_ == address(0)) {

```

```solidity
File: contracts/nest/SingelTokenVirtualRewarderUpgradeable.sol

368:         if (addr_ == address(0)) {

```

### <a name="GAS-3"></a>[GAS-3] Using bools for storage incurs overhead
Use uint256(1) and uint256(2) for true/false to avoid a Gwarmaccess (100 gas), and to avoid Gsset (20000 gas) when changing from ‘false’ to ‘true’, after having been ‘true’ in the past. See [source](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/58f635312aa21f947cae5f8578638a85aa2519f5/contracts/security/ReentrancyGuard.sol#L23-L27).

*Instances (2)*:
```solidity
File: contracts/nest/ManagedNFTManagerUpgradeable.sol

95:     mapping(uint256 => bool) public override isWhitelistedNFT;

```

```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

39:     mapping(address => bool) public override isAllowedTokenInInputRoutes;

```

### <a name="GAS-4"></a>[GAS-4] Cache array length outside of loop
If not cached, the solidity compiler will always read the length of the array during each iteration. That is, if it is a storage array, this is an extra sload operation (100 additional extra gas for each iteration except for the first) and if it is a memory array, this is an extra mload operation (3 additional gas for each iteration except for the first).

*Instances (6)*:
```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

216:         for (uint256 i; i < routesTokenToToken.length; ) {

276:         for (uint256 i; i < routes_.length - 1; ) {

286:         for (uint256 i; i < routes_.length; ) {

308:         for (uint256 i; i < inputRouters_.length; ) {

332:         for (uint256 i; i < tokenRoutes.length; ) {

343:         for (uint256 i; i < tokenRoutes.length; ) {

```

### <a name="GAS-5"></a>[GAS-5] State variables should be cached in stack variables rather than re-reading them from storage
The instances below point to the second+ access of a state variable within a function. Caching of a state variable replaces each Gwarmaccess (100 gas) with a much cheaper stack read. Other less obvious fixes/optimizations include having local memory caches of state variable structs, or having local caches of state variable contracts/addresses.

*Saves 100 gas per instance*

*Instances (3)*:
```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyFactoryUpgradeable.sol

105:         virtualRewarder.initialize(defaultBlastGovernor, address(strategy));

```

```solidity
File: contracts/nest/ManagedNFTManagerUpgradeable.sol

194:         IManagedNFTStrategy(IVotingEscrow(votingEscrow).ownerOf(managedTokenId_)).onAttach(tokenId_, userBalance);

215:         IVotingEscrowV1_2(votingEscrow).onDettachFromManagedNFT(

```

### <a name="GAS-6"></a>[GAS-6] Use calldata instead of memory for function arguments that do not get mutated
When a function with a `memory` array is called externally, the `abi.decode()` step has to use a for-loop to copy each index of the `calldata` to the `memory` index. Each iteration of this for-loop costs at least 60 gas (i.e. `60 * <mem_array>.length`). Using `calldata` directly bypasses this loop. 

If the array is passed to an `internal` function which passes the array to another internal function where the array is modified and therefore `memory` is used in the `external` call, it's still more gas-efficient to use `calldata` when the `external` function uses modifiers, since the modifiers may prevent the internal functions from being called. Structs have the same overhead as an array of length one. 

 *Saves 60 gas per instance*

*Instances (3)*:
```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyUpgradeable.sol

63:         string memory name_

```

```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

119:     function addRouteToToken(address token_, IRouterV2.route memory route_) external onlyOwner {

148:     function removeRouteFromToken(address token_, IRouterV2.route memory route_) external onlyOwner {

```

### <a name="GAS-7"></a>[GAS-7] For Operations that will not overflow, you could use unchecked

*Instances (92)*:
```solidity
File: contracts/nest/BaseManagedNFTStrategyUpgradeable.sol

4: import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

5: import "./../../contracts/integration/BlastGovernorClaimableSetup.sol";

6: import "./../../contracts/core/interfaces/IVoterV1_2.sol";

7: import "./../../contracts/core/interfaces/IVotingEscrow.sol";

9: import "./../../contracts/nest/interfaces/IManagedNFTManager.sol";

10: import "./../../contracts/nest/interfaces/IManagedNFTStrategy.sol";

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyFactoryUpgradeable.sol

4: import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

5: import "./../../contracts/integration/BlastGovernorClaimableSetup.sol";

6: import "./../../contracts/nest/interfaces/ICompoundVeFNXManagedNFTStrategyFactory.sol";

7: import "./../../contracts/nest/interfaces/ISingelTokenVirtualRewarder.sol";

8: import "./../../contracts/nest/interfaces/ICompoundVeFNXManagedNFTStrategy.sol";

9: import "./../../contracts/nest/StrategyProxy.sol";

10: import "./../../contracts/nest/VirtualRewarderProxy.sol";

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyUpgradeable.sol

4: import "./../../contracts/nest/BaseManagedNFTStrategyUpgradeable.sol";

6: import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

8: import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

9: import "./../../contracts/core/interfaces/IVotingEscrowV1_2.sol";

11: import "./../../contracts/nest/interfaces/ISingelTokenVirtualRewarder.sol";

12: import "./../../contracts/nest/interfaces/ICompoundVeFNXManagedNFTStrategy.sol";

13: import "./../../contracts/nest/SingelTokenBuybackUpgradeable.sol";

```

```solidity
File: contracts/nest/ManagedNFTManagerUpgradeable.sol

4: import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

5: import "./../../contracts/integration/BlastGovernorClaimableSetup.sol";

6: import "./../../contracts/core/interfaces/IVotingEscrowV1_2.sol";

7: import "./../../contracts/core/interfaces/IVotingEscrow.sol";

9: import "./../../contracts/nest/interfaces/IManagedNFTStrategy.sol";

10: import "./../../contracts/nest/interfaces/IManagedNFTManager.sol";

52:         bool isAttached; // Indicates if the NFT is currently attached to a managed strategy.

53:         uint256 attachedManagedTokenId; // The ID of the managed token to which this NFT is attached.

54:         uint256 amount; // The amount associated with this NFT in the context of the managed strategy.

62:         bool isManaged; // True if the token is recognized as a managed token.

63:         bool isDisabled; // Indicates if the token is currently disabled and not operational.

64:         address authorizedUser; // Address authorized to perform restricted operations for this managed token.

218:             tokenInfo.amount + lockedRewards

```

```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

4: import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

5: import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";

7: import "./../../contracts/integration/BlastGovernorClaimableSetup.sol";

8: import "./../../contracts/dexV2/interfaces/IRouterV2.sol";

9: import "./../../contracts/dexV2/interfaces/IPairFactory.sol";

10: import "./../../contracts/nest/interfaces/IRouterV2PathProvider.sol";

11: import "./../../contracts/nest/interfaces/IPairQuote.sol";

133:                 i++;

159:                 tokenToRoutes[token_][i] = tokenToRoutes[token_][length - 1];

165:                 i++;

229:                 i++;

276:         for (uint256 i; i < routes_.length - 1; ) {

277:             if (routes_[i].to != routes_[i + 1].from) {

281:                 i++;

294:                 i++;

313:                 i++;

334:                 actualSize++;

337:                 i++;

341:         routes = new IRouterV2.route[][](actualSize * 2);

347:                 routes[count + 1] = new IRouterV2.route[](2);

352:                 routes[count + 1][0] = IRouterV2.route({from: inputToken_, to: route.from, stable: false});

353:                 routes[count + 1][1] = route;

356:                     count += 2;

360:                 i++;

```

```solidity
File: contracts/nest/SingelTokenBuybackUpgradeable.sol

4: import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

5: import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

6: import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

8: import "./../../contracts/dexV2/interfaces/IRouterV2.sol";

9: import "./../../contracts/nest/interfaces/IRouterV2PathProvider.sol";

10: import "./../../contracts/nest/interfaces/ISingelTokenBuyback.sol";

145:             if (inputRouters_[0].from != inputToken_ || inputRouters_[inputRouters_.length - 1].to != targetToken) {

161:         amountOutQuote = amountOutQuote - (amountOutQuote * slippage_) / SLIPPAGE_PRECISION;

173:         uint256 amountOut = amountsOut[amountsOut.length - 1];

175:         assert(IERC20(targetToken).balanceOf(address(this)) - balanceBefore == amountOut);

```

```solidity
File: contracts/nest/SingelTokenVirtualRewarderUpgradeable.sol

4: import "./../../contracts/nest/interfaces/ISingelTokenVirtualRewarder.sol";

5: import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

6: import "./../../contracts/integration/BlastGovernorClaimableSetup.sol";

7: import "./../../contracts/nest/libraries/VirtualRewarderCheckpoints.sol";

21:         uint256 balance; // Current balance of the token

22:         uint256 checkpointLastIndex; // Index of the last checkpoint for the token

23:         uint256 lastEarnEpoch; // The last epoch during which rewards were calculated for the token

24:         mapping(uint256 index => VirtualRewarderCheckpoints.Checkpoint) balanceCheckpoints; // Mapping of index to balance checkpoints

67:     uint256 internal constant _WEEK = 86400 * 7;

127:         info.balance += amount_;

128:         totalSupply += amount_;

149:         info.balance -= amount_;

150:         totalSupply -= amount_;

190:         rewardsPerEpoch[currentEpoch] += amount_;

305:         uint256 notHarvestedEpochCount = (currentEpoch - startEpoch) / _WEEK;

308:             reward += _calculateRewardPerEpoch(tokenId_, startEpoch);

310:             startEpoch += _WEEK;

312:                 i++;

338:         return (balance * rewardsPerEpoch[epoch_ + _WEEK]) / supply;

359:         return (timestamp_ / _WEEK) * _WEEK;

```

```solidity
File: contracts/nest/libraries/VirtualRewarderCheckpoints.sol

11:         uint256 timestamp; // Timestamp at which the checkpoint is logged

12:         uint256 amount; // Amount or value associated with the checkpoint

38:         newIndex = last.timestamp == timestamp_ ? lastIndex_ : lastIndex_ + 1;

94:             uint256 middle = end - (end - start) / 2;

101:                 end = middle - 1;

```

### <a name="GAS-8"></a>[GAS-8] Avoid contract existence checks by using low level calls
Prior to 0.8.10 the compiler inserted extra code, including `EXTCODESIZE` (**100 gas**), to check for contract existence for external function calls. In more recent solidity versions, the compiler will not insert these checks if the external call has a return value. Similar behavior can be achieved in earlier versions by using low-level calls, since low level calls never check for contract existence

*Instances (6)*:
```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyUpgradeable.sol

114:         return ISingelTokenVirtualRewarder(virtualRewarder).balanceOf(tokenId_);

131:         uint256 currentBalance = fenixCache.balanceOf(address(this));

165:         uint256 amount = IERC20(token_).balanceOf(address(this));

```

```solidity
File: contracts/nest/SingelTokenBuybackUpgradeable.sol

124:         uint256 amountIn = inputTokenCache.balanceOf(address(this));

169:         uint256 balanceBefore = IERC20(targetToken).balanceOf(address(this));

175:         assert(IERC20(targetToken).balanceOf(address(this)) - balanceBefore == amountOut);

```

### <a name="GAS-9"></a>[GAS-9] Functions guaranteed to revert when called by normal users can be marked `payable`
If a function modifier such as `onlyOwner` is used, the function will revert if a normal user tries to pay the function. Marking the function as `payable` will lower the gas cost for legitimate callers because the compiler will not include checks for whether a payment was provided.

*Instances (25)*:
```solidity
File: contracts/nest/BaseManagedNFTStrategyUpgradeable.sol

96:     function attachManagedNFT(uint256 managedTokenId_) external onlyAdmin {

117:     function setName(string calldata name_) external onlyAdmin {

127:     function vote(address[] calldata poolVote_, uint256[] calldata weights_) external onlyAuthorized {

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyFactoryUpgradeable.sol

100:     function createStrategy(string calldata name_) external override onlyRole(STRATEGY_CREATOR_ROLE) returns (address) {

117:     function changeVirtualRewarderImplementation(address virtualRewarderImplementation_) external onlyRole(DEFAULT_ADMIN_ROLE) {

130:     function changeStrategyImplementation(address strategyImplementation_) external onlyRole(DEFAULT_ADMIN_ROLE) {

142:     function setRouterV2PathProvider(address routerV2PathProvider_) external virtual onlyRole(DEFAULT_ADMIN_ROLE) {

154:     function setDefaultBlastGovernor(address defaultBlastGovernor_) external virtual onlyRole(DEFAULT_ADMIN_ROLE) {

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyUpgradeable.sol

79:     function onAttach(uint256 tokenId_, uint256 userBalance_) external override onlyManagedNFTManager {

92:     function onDettach(uint256 tokenId_, uint256 userBalance_) external override onlyManagedNFTManager returns (uint256 lockedRewards) {

146:     function setRouterV2PathProvider(address routerV2PathProvider_) external virtual onlyAdmin {

```

```solidity
File: contracts/nest/ManagedNFTManagerUpgradeable.sol

138:     function createManagedNFT(address strategy_) external onlyRole(MANAGED_NFT_ADMIN) returns (uint256 managedTokenId) {

150:     function setAuthorizedUser(uint256 managedTokenId_, address authorizedUser_) external onlyRole(MANAGED_NFT_ADMIN) {

163:     function toggleDisableManagedNFT(uint256 managedTokenId_) external onlyRole(MANAGED_NFT_ADMIN) {

177:     function onAttachToManagedNFT(uint256 tokenId_, uint256 managedTokenId_) external onlyVoter {

201:     function onDettachFromManagedNFT(uint256 tokenId_) external onlyVoter {

229:     function setWhitelistedNFT(uint256 tokenId_, bool isWhitelisted_) external onlyRole(MANAGED_NFT_ADMIN) {

```

```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

107:     function setAllowedTokenInInputRouters(address token_, bool isAllowed_) external onlyOwner {

119:     function addRouteToToken(address token_, IRouterV2.route memory route_) external onlyOwner {

148:     function removeRouteFromToken(address token_, IRouterV2.route memory route_) external onlyOwner {

```

```solidity
File: contracts/nest/SingelTokenBuybackUpgradeable.sol

99:     function __SingelTokenBuyback__init(address routerV2PathProvider_) internal onlyInitializing {

```

```solidity
File: contracts/nest/SingelTokenVirtualRewarderUpgradeable.sol

121:     function deposit(uint256 tokenId_, uint256 amount_) external onlyStrategy {

143:     function withdraw(uint256 tokenId_, uint256 amount_) external onlyStrategy {

168:     function harvest(uint256 tokenId_) external onlyStrategy returns (uint256 reward) {

184:     function notifyRewardAmount(uint256 amount_) external onlyStrategy {

```

### <a name="GAS-10"></a>[GAS-10] `++i` costs less gas compared to `i++` or `i += 1` (same for `--i` vs `i--` or `i -= 1`)
Pre-increments and pre-decrements are cheaper.

For a `uint256 i` variable, the following is true with the Optimizer enabled at 10k:

**Increment:**

- `i += 1` is the most expensive form
- `i++` costs 6 gas less than `i += 1`
- `++i` costs 5 gas less than `i++` (11 gas less than `i += 1`)

**Decrement:**

- `i -= 1` is the most expensive form
- `i--` costs 11 gas less than `i -= 1`
- `--i` costs 5 gas less than `i--` (16 gas less than `i -= 1`)

Note that post-increments (or post-decrements) return the old value before incrementing or decrementing, hence the name *post-increment*:

```solidity
uint i = 1;  
uint j = 2;
require(j == i++, "This will be false as i is incremented after the comparison");
```
  
However, pre-increments (or pre-decrements) return the new value:
  
```solidity
uint i = 1;  
uint j = 2;
require(j == ++i, "This will be true as i is incremented before the comparison");
```

In the pre-increment case, the compiler has to create a temporary variable (when used) for returning `1` instead of `2`.

Consider using pre-increments and pre-decrements where they are relevant (meaning: not where post-increments/decrements logic are relevant).

*Saves 5 gas per instance*

*Instances (10)*:
```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

133:                 i++;

165:                 i++;

229:                 i++;

281:                 i++;

294:                 i++;

313:                 i++;

334:                 actualSize++;

337:                 i++;

360:                 i++;

```

```solidity
File: contracts/nest/SingelTokenVirtualRewarderUpgradeable.sol

312:                 i++;

```

### <a name="GAS-11"></a>[GAS-11] Using `private` rather than `public` for constants, saves gas
If needed, the values can be read from the verified contract source code, or if there are multiple values there can be a single getter function that [returns a tuple](https://github.com/code-423n4/2022-08-frax/blob/90f55a9ce4e25bceed3a74290b854341d8de6afa/src/contracts/FraxlendPair.sol#L156-L178) of the values of all currently-public constants. Saves **3406-3606 gas** in deployment gas due to the compiler not having to create non-payable getter functions for deployment calldata, not having to store the bytes of the value outside of where it's used, and not adding another entry to the method ID table

*Instances (5)*:
```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyFactoryUpgradeable.sol

26:     bytes32 public constant STRATEGY_CREATOR_ROLE = keccak256("STRATEGY_CREATOR_ROLE");

```

```solidity
File: contracts/nest/ManagedNFTManagerUpgradeable.sol

70:     bytes32 public constant MANAGED_NFT_ADMIN = keccak256("MANAGED_NFT_ADMIN");

```

```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

22:     uint256 public constant PAIR_QUOTE_GRANULARITY = 3;

```

```solidity
File: contracts/nest/SingelTokenBuybackUpgradeable.sol

54:     uint256 public constant MAX_SLIPPAGE = 400;

60:     uint256 public constant SLIPPAGE_PRECISION = 10_000;

```

### <a name="GAS-12"></a>[GAS-12] Use shift right/left instead of division/multiplication if possible
While the `DIV` / `MUL` opcode uses 5 gas, the `SHR` / `SHL` opcode only uses 3 gas. Furthermore, beware that Solidity's division operation also includes a division-by-0 prevention which is bypassed using shifting. Eventually, overflow checks are never performed for shift operations as they are done for arithmetic operations. Instead, the result is always truncated, so the calculation can be unchecked in Solidity version `0.8+`
- Use `>> 1` instead of `/ 2`
- Use `>> 2` instead of `/ 4`
- Use `<< 3` instead of `* 8`
- ...
- Use `>> 5` instead of `/ 2^5 == / 32`
- Use `<< 6` instead of `* 2^6 == * 64`

TL;DR:
- Shifting left by N is like multiplying by 2^N (Each bits to the left is an increased power of 2)
- Shifting right by N is like dividing by 2^N (Each bits to the right is a decreased power of 2)

*Saves around 2 gas + 20 for unchecked per instance*

*Instances (2)*:
```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

341:         routes = new IRouterV2.route[][](actualSize * 2);

```

```solidity
File: contracts/nest/libraries/VirtualRewarderCheckpoints.sol

94:             uint256 middle = end - (end - start) / 2;

```

### <a name="GAS-13"></a>[GAS-13] `uint256` to `bool` `mapping`: Utilizing Bitmaps to dramatically save on Gas
https://soliditydeveloper.com/bitmaps

https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/structs/BitMaps.sol

- [BitMaps.sol#L5-L16](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/structs/BitMaps.sol#L5-L16):

```solidity
/**
 * @dev Library for managing uint256 to bool mapping in a compact and efficient way, provided the keys are sequential.
 * Largely inspired by Uniswap's https://github.com/Uniswap/merkle-distributor/blob/master/contracts/MerkleDistributor.sol[merkle-distributor].
 *
 * BitMaps pack 256 booleans across each bit of a single 256-bit slot of `uint256` type.
 * Hence booleans corresponding to 256 _sequential_ indices would only consume a single slot,
 * unlike the regular `bool` which would consume an entire slot for a single value.
 *
 * This results in gas savings in two ways:
 *
 * - Setting a zero value to non-zero only once every 256 times
 * - Accessing the same warm slot for every 256 _sequential_ indices
 */
```

*Instances (1)*:
```solidity
File: contracts/nest/ManagedNFTManagerUpgradeable.sol

95:     mapping(uint256 => bool) public override isWhitelistedNFT;

```

### <a name="GAS-14"></a>[GAS-14] Use != 0 instead of > 0 for unsigned integer comparison

*Instances (3)*:
```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyUpgradeable.sol

132:         if (currentBalance > 0) {

```

```solidity
File: contracts/nest/SingelTokenBuybackUpgradeable.sol

140:         if (optimalRoute.length > 0) {

176:         assert(amountOut > 0);

```

### <a name="GAS-15"></a>[GAS-15] `internal` functions not called by the contract should be removed
If the functions are required by an interface, the contract should inherit from that interface and use the `override` keyword

*Instances (4)*:
```solidity
File: contracts/nest/BaseManagedNFTStrategyUpgradeable.sol

73:     function __BaseManagedNFTStrategy__init(

```

```solidity
File: contracts/nest/SingelTokenBuybackUpgradeable.sol

99:     function __SingelTokenBuyback__init(address routerV2PathProvider_) internal onlyInitializing {

```

```solidity
File: contracts/nest/libraries/VirtualRewarderCheckpoints.sol

30:     function writeCheckpoint(

54:     function getAmount(

```

### <a name="GAS-16"></a>[GAS-16] Don't use `_msgSender()` if not supporting EIP-2771
Use `msg.sender` if the code does not implement [EIP-2771 trusted forwarder](https://eips.ethereum.org/EIPS/eip-2771) support

*Instances (1)*:
```solidity
File: contracts/nest/ManagedNFTManagerUpgradeable.sol

101:         if (_msgSender() != voter) {

```


## Non Critical Issues


| |Issue|Instances|
|-|:-|:-:|
| [NC-1](#NC-1) | Missing checks for `address(0)` when assigning values to address state variables | 17 |
| [NC-2](#NC-2) | Array indices should be referenced via `enum`s rather than via numeric literals | 14 |
| [NC-3](#NC-3) | `require()` should be used instead of `assert()` | 3 |
| [NC-4](#NC-4) | `constant`s should be defined rather than using magic numbers | 3 |
| [NC-5](#NC-5) | Control structures do not follow the Solidity Style Guide | 7 |
| [NC-6](#NC-6) | Critical Changes Should Use Two-step Procedure | 3 |
| [NC-7](#NC-7) | Consider disabling `renounceOwnership()` | 1 |
| [NC-8](#NC-8) | Events that mark critical parameter changes should contain both the old and the new value | 7 |
| [NC-9](#NC-9) | Function ordering does not follow the Solidity style guide | 2 |
| [NC-10](#NC-10) | Functions should not be longer than 50 lines | 67 |
| [NC-11](#NC-11) | Change int to int256 | 9 |
| [NC-12](#NC-12) | Lack of checks in setters | 3 |
| [NC-13](#NC-13) | Incomplete NatSpec: `@return` is missing on actually documented functions | 1 |
| [NC-14](#NC-14) | Use a `modifier` instead of a `require/if` statement for a special `msg.sender` actor | 6 |
| [NC-15](#NC-15) | Consider using named mappings | 5 |
| [NC-16](#NC-16) | Adding a `return` statement when the function defines a named return variable, is redundant | 4 |
| [NC-17](#NC-17) | Take advantage of Custom Error's return value property | 37 |
| [NC-18](#NC-18) | Avoid the use of sensitive terms | 4 |
| [NC-19](#NC-19) | Contract does not follow the Solidity style guide's suggested layout ordering | 7 |
| [NC-20](#NC-20) | Use Underscores for Number Literals (add an underscore every 3 digits) | 1 |
| [NC-21](#NC-21) | Internal and private variables and functions names should begin with an underscore | 3 |
### <a name="NC-1"></a>[NC-1] Missing checks for `address(0)` when assigning values to address state variables

*Instances (17)*:
```solidity
File: contracts/nest/BaseManagedNFTStrategyUpgradeable.sol

82:         managedNFTManager = managedNFTManager_;

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyFactoryUpgradeable.sol

87:         strategyImplementation = strategyImplementation_;

88:         virtualRewarderImplementation = virtualRewarderImplementation_;

89:         defaultBlastGovernor = blastGovernor_;

90:         managedNFTManager = managedNFTManager_;

91:         routerV2PathProvider = routerV2PathProvider_;

121:         virtualRewarderImplementation = virtualRewarderImplementation_;

134:         strategyImplementation = strategyImplementation_;

146:         routerV2PathProvider = routerV2PathProvider_;

158:         defaultBlastGovernor = defaultBlastGovernor_;

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyUpgradeable.sol

69:         virtualRewarder = virtualRewarder_;

```

```solidity
File: contracts/nest/ManagedNFTManagerUpgradeable.sol

130:         votingEscrow = votingEscrow_;

131:         voter = voter_;

```

```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

95:         factory = factory_;

96:         router = router_;

```

```solidity
File: contracts/nest/SingelTokenBuybackUpgradeable.sol

102:         routerV2PathProvider = routerV2PathProvider_;

```

```solidity
File: contracts/nest/SingelTokenVirtualRewarderUpgradeable.sol

111:         strategy = strategy_;

```

### <a name="NC-2"></a>[NC-2] Array indices should be referenced via `enum`s rather than via numeric literals

*Instances (14)*:
```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

218:                 factoryCache.getPair(routesTokenToToken[i][0].from, routesTokenToToken[i][0].to, routesTokenToToken[i][0].stable) !=

222:                     if (amountsOut[2] > bestMultiRouteAmountOut) {

223:                         bestMultiRouteAmountOut = amountsOut[2];

238:             singelRoute[0] = IRouterV2.route({from: inputToken_, to: outputToken_, stable: true});

240:                 amountOutStabel = amountsOut[1];

245:             singelRoute[0] = IRouterV2.route({from: inputToken_, to: outputToken_, stable: false});

247:                 amountOutVolatility = amountsOut[1];

257:             singelRoute[0] = IRouterV2.route({from: inputToken_, to: outputToken_, stable: true});

349:                 routes[count][0] = IRouterV2.route({from: inputToken_, to: route.from, stable: true});

350:                 routes[count][1] = route;

352:                 routes[count + 1][0] = IRouterV2.route({from: inputToken_, to: route.from, stable: false});

353:                 routes[count + 1][1] = route;

```

```solidity
File: contracts/nest/SingelTokenBuybackUpgradeable.sol

145:             if (inputRouters_[0].from != inputToken_ || inputRouters_[inputRouters_.length - 1].to != targetToken) {

```

```solidity
File: contracts/nest/libraries/VirtualRewarderCheckpoints.sol

87:         if (self_[0].timestamp > timestamp_) {

```

### <a name="NC-3"></a>[NC-3] `require()` should be used instead of `assert()`
Prior to solidity version 0.8.0, hitting an assert consumes the **remainder of the transaction's available gas** rather than returning it, as `require()`/`revert()` do. `assert()` should be avoided even past solidity version 0.8.0 as its [documentation](https://docs.soliditylang.org/en/v0.8.14/control-structures.html#panic-via-assert-and-error-via-require) states that "The assert function creates an error of type Panic(uint256). ... Properly functioning code should never create a Panic, not even on invalid external input. If this happens, then there is a bug in your contract which you should fix. Additionally, a require statement (or a custom error) are more friendly in terms of understanding what happened."

*Instances (3)*:
```solidity
File: contracts/nest/ManagedNFTManagerUpgradeable.sol

208:         assert(tokenInfo.attachedManagedTokenId != 0);

```

```solidity
File: contracts/nest/SingelTokenBuybackUpgradeable.sol

175:         assert(IERC20(targetToken).balanceOf(address(this)) - balanceBefore == amountOut);

176:         assert(amountOut > 0);

```

### <a name="NC-4"></a>[NC-4] `constant`s should be defined rather than using magic numbers
Even [assembly](https://github.com/code-423n4/2022-05-opensea-seaport/blob/9d7ce4d08bf3c3010304a0476a785c70c0e90ae7/contracts/lib/TokenTransferrer.sol#L35-L39) can benefit from using readable constants instead of hex/numeric literals

*Instances (3)*:
```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

341:         routes = new IRouterV2.route[][](actualSize * 2);

356:                     count += 2;

```

```solidity
File: contracts/nest/libraries/VirtualRewarderCheckpoints.sol

94:             uint256 middle = end - (end - start) / 2;

```

### <a name="NC-5"></a>[NC-5] Control structures do not follow the Solidity Style Guide
See the [control structures](https://docs.soliditylang.org/en/latest/style-guide.html#control-structures) section of the Solidity Style Guide

*Instances (7)*:
```solidity
File: contracts/nest/BaseManagedNFTStrategyUpgradeable.sol

100:         if (

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyUpgradeable.sol

136:             ISingelTokenVirtualRewarder(virtualRewarder).notifyRewardAmount(currentBalance);

```

```solidity
File: contracts/nest/ManagedNFTManagerUpgradeable.sol

52:         bool isAttached; // Indicates if the NFT is currently attached to a managed strategy.

62:         bool isManaged; // True if the token is recognized as a managed token.

63:         bool isDisabled; // Indicates if the token is currently disabled and not operational.

```

```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

217:             if (

```

```solidity
File: contracts/nest/SingelTokenVirtualRewarderUpgradeable.sol

192:         emit NotifyReward(amount_, currentEpoch);

```

### <a name="NC-6"></a>[NC-6] Critical Changes Should Use Two-step Procedure
The critical procedures should be two step process.

See similar findings in previous Code4rena contests for reference: <https://code4rena.com/reports/2022-06-illuminate/#2-critical-changes-should-use-two-step-procedure>

**Recommended Mitigation Steps**

Lack of two-step procedure for critical operations leaves them error-prone. Consider adding two step procedure on the critical functions.

*Instances (3)*:
```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyFactoryUpgradeable.sol

142:     function setRouterV2PathProvider(address routerV2PathProvider_) external virtual onlyRole(DEFAULT_ADMIN_ROLE) {

154:     function setDefaultBlastGovernor(address defaultBlastGovernor_) external virtual onlyRole(DEFAULT_ADMIN_ROLE) {

```

```solidity
File: contracts/nest/ManagedNFTManagerUpgradeable.sol

150:     function setAuthorizedUser(uint256 managedTokenId_, address authorizedUser_) external onlyRole(MANAGED_NFT_ADMIN) {

```

### <a name="NC-7"></a>[NC-7] Consider disabling `renounceOwnership()`
If the plan for your project does not include eventually giving up all ownership control, consider overwriting OpenZeppelin's `Ownable`'s `renounceOwnership()` function in order to disable it.

*Instances (1)*:
```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

18: contract RouterV2PathProviderUpgradeable is IRouterV2PathProvider, Ownable2StepUpgradeable, BlastGovernorClaimableSetup {

```

### <a name="NC-8"></a>[NC-8] Events that mark critical parameter changes should contain both the old and the new value
This should especially be done if the new value is not required to be different from the old value

*Instances (7)*:
```solidity
File: contracts/nest/BaseManagedNFTStrategyUpgradeable.sol

117:     function setName(string calldata name_) external onlyAdmin {
             name = name_;
             emit SetName(name_);

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyFactoryUpgradeable.sol

142:     function setRouterV2PathProvider(address routerV2PathProvider_) external virtual onlyRole(DEFAULT_ADMIN_ROLE) {
             _checkAddressZero(routerV2PathProvider_);
             emit SetRouterV2PathProvider(routerV2PathProvider, routerV2PathProvider_);

154:     function setDefaultBlastGovernor(address defaultBlastGovernor_) external virtual onlyRole(DEFAULT_ADMIN_ROLE) {
             _checkAddressZero(defaultBlastGovernor_);
     
             emit SetDefaultBlastGovernor(defaultBlastGovernor, defaultBlastGovernor_);

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyUpgradeable.sol

146:     function setRouterV2PathProvider(address routerV2PathProvider_) external virtual onlyAdmin {
             _checkAddressZero(routerV2PathProvider_);
             emit SetRouterV2PathProvider(routerV2PathProvider, routerV2PathProvider_);

```

```solidity
File: contracts/nest/ManagedNFTManagerUpgradeable.sol

150:     function setAuthorizedUser(uint256 managedTokenId_, address authorizedUser_) external onlyRole(MANAGED_NFT_ADMIN) {
             if (!managedTokensInfo[managedTokenId_].isManaged) {
                 revert NotManagedNFT();
             }
             managedTokensInfo[managedTokenId_].authorizedUser = authorizedUser_;
             emit SetAuthorizedUser(managedTokenId_, authorizedUser_);

229:     function setWhitelistedNFT(uint256 tokenId_, bool isWhitelisted_) external onlyRole(MANAGED_NFT_ADMIN) {
             isWhitelistedNFT[tokenId_] = isWhitelisted_;
             emit SetWhitelistedNFT(tokenId_, isWhitelisted_);

```

```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

107:     function setAllowedTokenInInputRouters(address token_, bool isAllowed_) external onlyOwner {
             isAllowedTokenInInputRoutes[token_] = isAllowed_;
             emit SetAllowedTokenInInputRouters(token_, isAllowed_);

```

### <a name="NC-9"></a>[NC-9] Function ordering does not follow the Solidity style guide
According to the [Solidity style guide](https://docs.soliditylang.org/en/v0.8.17/style-guide.html#order-of-functions), functions should be laid out in the following order :`constructor()`, `receive()`, `fallback()`, `external`, `public`, `internal`, `private`, but the cases below do not follow this pattern

*Instances (2)*:
```solidity
File: contracts/nest/BaseManagedNFTStrategyUpgradeable.sol

1: 
   Current order:
   internal __BaseManagedNFTStrategy__init
   external attachManagedNFT
   external setName
   external vote
   external claimRewards
   external claimBribes
   internal _checkAddressZero
   
   Suggested order:
   external attachManagedNFT
   external setName
   external vote
   external claimRewards
   external claimBribes
   internal __BaseManagedNFTStrategy__init
   internal _checkAddressZero

```

```solidity
File: contracts/nest/SingelTokenBuybackUpgradeable.sol

1: 
   Current order:
   internal __SingelTokenBuyback__init
   external buybackTokenByV2
   external getBuybackTargetToken
   internal _checkBuybackSwapPermissions
   internal _getBuybackTargetToken
   internal _checkAddressZero
   
   Suggested order:
   external buybackTokenByV2
   external getBuybackTargetToken
   internal __SingelTokenBuyback__init
   internal _checkBuybackSwapPermissions
   internal _getBuybackTargetToken
   internal _checkAddressZero

```

### <a name="NC-10"></a>[NC-10] Functions should not be longer than 50 lines
Overly complex code can make understanding functionality more difficult, try to further modularize your code to ensure readability 

*Instances (67)*:
```solidity
File: contracts/nest/BaseManagedNFTStrategyUpgradeable.sol

96:     function attachManagedNFT(uint256 managedTokenId_) external onlyAdmin {

117:     function setName(string calldata name_) external onlyAdmin {

127:     function vote(address[] calldata poolVote_, uint256[] calldata weights_) external onlyAuthorized {

135:     function claimRewards(address[] calldata gauges_) external {

144:     function claimBribes(address[] calldata bribes_, address[][] calldata tokens_) external {

153:     function _checkAddressZero(address addr_) internal pure virtual {

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyFactoryUpgradeable.sol

100:     function createStrategy(string calldata name_) external override onlyRole(STRATEGY_CREATOR_ROLE) returns (address) {

117:     function changeVirtualRewarderImplementation(address virtualRewarderImplementation_) external onlyRole(DEFAULT_ADMIN_ROLE) {

130:     function changeStrategyImplementation(address strategyImplementation_) external onlyRole(DEFAULT_ADMIN_ROLE) {

142:     function setRouterV2PathProvider(address routerV2PathProvider_) external virtual onlyRole(DEFAULT_ADMIN_ROLE) {

154:     function setDefaultBlastGovernor(address defaultBlastGovernor_) external virtual onlyRole(DEFAULT_ADMIN_ROLE) {

166:     function _checkAddressZero(address addr_) internal pure {

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyUpgradeable.sol

79:     function onAttach(uint256 tokenId_, uint256 userBalance_) external override onlyManagedNFTManager {

92:     function onDettach(uint256 tokenId_, uint256 userBalance_) external override onlyManagedNFTManager returns (uint256 lockedRewards) {

104:     function getLockedRewardsBalance(uint256 tokenId_) external view returns (uint256) {

113:     function balanceOf(uint256 tokenId_) external view returns (uint256) {

121:     function totalSupply() external view returns (uint256) {

146:     function setRouterV2PathProvider(address routerV2PathProvider_) external virtual onlyAdmin {

158:     function erc20Recover(address token_, address recipient_) external {

173:     function _checkBuybackSwapPermissions() internal view virtual override {

187:     function _getBuybackTargetToken() internal view virtual override returns (address) {

196:     function _checkAddressZero(address addr_) internal pure override(BaseManagedNFTStrategyUpgradeable, SingelTokenBuybackUpgradeable) {

```

```solidity
File: contracts/nest/ManagedNFTManagerUpgradeable.sol

120:     function initialize(address blastGovernor_, address votingEscrow_, address voter_) external initializer {

138:     function createManagedNFT(address strategy_) external onlyRole(MANAGED_NFT_ADMIN) returns (uint256 managedTokenId) {

150:     function setAuthorizedUser(uint256 managedTokenId_, address authorizedUser_) external onlyRole(MANAGED_NFT_ADMIN) {

163:     function toggleDisableManagedNFT(uint256 managedTokenId_) external onlyRole(MANAGED_NFT_ADMIN) {

177:     function onAttachToManagedNFT(uint256 tokenId_, uint256 managedTokenId_) external onlyVoter {

201:     function onDettachFromManagedNFT(uint256 tokenId_) external onlyVoter {

229:     function setWhitelistedNFT(uint256 tokenId_, bool isWhitelisted_) external onlyRole(MANAGED_NFT_ADMIN) {

240:     function getAttachedManagedTokenId(uint256 tokenId_) external view returns (uint256) {

250:     function isAttachedNFT(uint256 tokenId_) external view returns (bool) {

260:     function isDisabledNFT(uint256 managedTokenId_) external view returns (bool) {

270:     function isAdmin(address account_) external view returns (bool) {

281:     function isAuthorized(uint256 managedTokenId_, address account_) external view returns (bool) {

291:     function isManagedNFT(uint256 managedTokenId_) external view override returns (bool) {

300:     function _checkAddressZero(address addr_) internal pure {

```

```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

87:     function initialize(address blastGovernor_, address factory_, address router_) external initializer {

107:     function setAllowedTokenInInputRouters(address token_, bool isAllowed_) external onlyOwner {

119:     function addRouteToToken(address token_, IRouterV2.route memory route_) external onlyOwner {

148:     function removeRouteFromToken(address token_, IRouterV2.route memory route_) external onlyOwner {

178:     function getTokenRoutes(address token_) external view returns (IRouterV2.route[] memory) {

190:     function getRoutesTokenToToken(address inputToken_, address outputToken_) external view returns (IRouterV2.route[][] memory) {

272:     function getAmountOutQuote(uint256 amountIn_, IRouterV2.route[] calldata routes_) external view returns (uint256) {

307:     function isValidInputRoutes(IRouterV2.route[] calldata inputRouters_) external view returns (bool) {

328:     function _getRoutesTokenToToken(address inputToken_, address outputToken_) internal view returns (IRouterV2.route[][] memory routes) {

370:     function _checkAddressZero(address addr_) internal pure {

```

```solidity
File: contracts/nest/SingelTokenBuybackUpgradeable.sol

99:     function __SingelTokenBuyback__init(address routerV2PathProvider_) internal onlyInitializing {

188:     function getBuybackTargetToken() external view returns (address) {

195:     function _checkBuybackSwapPermissions() internal view virtual;

201:     function _getBuybackTargetToken() internal view virtual returns (address);

208:     function _checkAddressZero(address addr_) internal pure virtual {

```

```solidity
File: contracts/nest/SingelTokenVirtualRewarderUpgradeable.sol

106:     function initialize(address blastGovernor_, address strategy_) external override initializer {

121:     function deposit(uint256 tokenId_, uint256 amount_) external onlyStrategy {

143:     function withdraw(uint256 tokenId_, uint256 amount_) external onlyStrategy {

168:     function harvest(uint256 tokenId_) external onlyStrategy returns (uint256 reward) {

184:     function notifyRewardAmount(uint256 amount_) external onlyStrategy {

201:     function calculateAvailableRewardsAmount(uint256 tokenId_) external view returns (uint256 reward) {

211:     function balanceOf(uint256 tokenId_) external view returns (uint256) {

222:     function balanceOfAt(uint256 tokenId_, uint256 timestamp_) external view returns (uint256) {

237:     function totalSupplyAt(uint256 timestamp_) external view returns (uint256) {

248:     function balanceCheckpoints(uint256 tokenId_, uint256 index) external view returns (VirtualRewarderCheckpoints.Checkpoint memory) {

259:     function _writeCheckpoints(TokenInfo storage info_, uint256 epoch_) internal {

282:     function _calculateAvailableRewardsAmount(uint256 tokenId_) internal view returns (uint256 reward) {

325:     function _calculateRewardPerEpoch(uint256 tokenId_, uint256 epoch_) internal view returns (uint256) {

347:     function _currentEpoch() internal view returns (uint256) {

358:     function _roundToEpoch(uint256 timestamp_) internal pure returns (uint256) {

367:     function _checkAddressZero(address addr_) internal pure {

```

### <a name="NC-11"></a>[NC-11] Change int to int256
Throughout the code base, some variables are declared as `int`. To favor explicitness, consider changing all instances of `int` to `int256`

*Instances (9)*:
```solidity
File: contracts/nest/SingelTokenVirtualRewarderUpgradeable.sol

22:         uint256 checkpointLastIndex; // Index of the last checkpoint for the token

248:     function balanceCheckpoints(uint256 tokenId_, uint256 index) external view returns (VirtualRewarderCheckpoints.Checkpoint memory) {

```

```solidity
File: contracts/nest/libraries/VirtualRewarderCheckpoints.sol

10:     struct Checkpoint {

11:         uint256 timestamp; // Timestamp at which the checkpoint is logged

31:         mapping(uint256 index => Checkpoint checkpoint) storage self_,

36:         Checkpoint memory last = self_[lastIndex_];

55:         mapping(uint256 index => Checkpoint checkpoint) storage self_,

75:         mapping(uint256 index => Checkpoint checkpoint) storage self_,

95:             Checkpoint memory checkpoint = self_[middle];

```

### <a name="NC-12"></a>[NC-12] Lack of checks in setters
Be it sanity checks (like checks against `0`-values) or initial setting checks: it's best for Setter functions to have them

*Instances (3)*:
```solidity
File: contracts/nest/BaseManagedNFTStrategyUpgradeable.sol

117:     function setName(string calldata name_) external onlyAdmin {
             name = name_;
             emit SetName(name_);

```

```solidity
File: contracts/nest/ManagedNFTManagerUpgradeable.sol

229:     function setWhitelistedNFT(uint256 tokenId_, bool isWhitelisted_) external onlyRole(MANAGED_NFT_ADMIN) {
             isWhitelistedNFT[tokenId_] = isWhitelisted_;
             emit SetWhitelistedNFT(tokenId_, isWhitelisted_);

```

```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

107:     function setAllowedTokenInInputRouters(address token_, bool isAllowed_) external onlyOwner {
             isAllowedTokenInInputRoutes[token_] = isAllowed_;
             emit SetAllowedTokenInInputRouters(token_, isAllowed_);

```

### <a name="NC-13"></a>[NC-13] Incomplete NatSpec: `@return` is missing on actually documented functions
The following functions are missing `@return` NatSpec comments.

*Instances (1)*:
```solidity
File: contracts/nest/ManagedNFTManagerUpgradeable.sol

134:     /**
          * @notice Creates a managed NFT and attaches it to a strategy
          * @param strategy_ The strategy to which the managed NFT will be attached
          */
         function createManagedNFT(address strategy_) external onlyRole(MANAGED_NFT_ADMIN) returns (uint256 managedTokenId) {

```

### <a name="NC-14"></a>[NC-14] Use a `modifier` instead of a `require/if` statement for a special `msg.sender` actor
If a function is supposed to be access-controlled, a `modifier` should be used instead of a `require/if` statement for more readability.

*Instances (6)*:
```solidity
File: contracts/nest/BaseManagedNFTStrategyUpgradeable.sol

44:         if (managedNFTManager != msg.sender) {

52:         if (!IManagedNFTManager(managedNFTManager).isAdmin(msg.sender)) {

60:         if (!IManagedNFTManager(managedNFTManager).isAuthorized(managedTokenId, msg.sender)) {

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyUpgradeable.sol

174:         if (IManagedNFTManager(managedNFTManager).isAdmin(msg.sender)) {

177:         if (IManagedNFTManager(managedNFTManager).isAuthorized(managedTokenId, msg.sender)) {

```

```solidity
File: contracts/nest/SingelTokenVirtualRewarderUpgradeable.sol

86:         if (msg.sender != strategy) {

```

### <a name="NC-15"></a>[NC-15] Consider using named mappings
Consider moving to solidity version 0.8.18 or later, and using [named mappings](https://ethereum.stackexchange.com/questions/51629/how-to-name-the-arguments-in-mapping/145555#145555) to make it easier to understand the purpose of each mapping

*Instances (5)*:
```solidity
File: contracts/nest/ManagedNFTManagerUpgradeable.sol

85:     mapping(uint256 => TokenInfo) public tokensInfo;

90:     mapping(uint256 => ManagedTokenInfo) public managedTokensInfo;

95:     mapping(uint256 => bool) public override isWhitelistedNFT;

```

```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

39:     mapping(address => bool) public override isAllowedTokenInInputRoutes;

45:     mapping(address => IRouterV2.route[]) public tokenToRoutes;

```

### <a name="NC-16"></a>[NC-16] Adding a `return` statement when the function defines a named return variable, is redundant

*Instances (4)*:
```solidity
File: contracts/nest/SingelTokenBuybackUpgradeable.sol

105:     /**
          * @notice Buys back tokens by swapping specified input tokens for a target token via a DEX
          * @dev Executes a token swap using the optimal route found via Router V2 Path Provider. Ensures input token is not the target token and validates slippage.
          *
          * @param inputToken_ The ERC20 token to swap from.
          * @param inputRouters_ Array of routes to potentially use for the swap.
          * @param slippage_ The maximum allowed slippage for the swap, in basis points.
          * @param deadline_ Unix timestamp after which the transaction will revert.
          */
         function buybackTokenByV2(
             address inputToken_,
             IRouterV2.route[] calldata inputRouters_,
             uint256 slippage_,
             uint256 deadline_
         ) external virtual override onlyCorrectInputToken(inputToken_) onlyCorrectSlippage(slippage_) returns (uint256 outputAmount) {
             _checkBuybackSwapPermissions();
     
             IERC20 inputTokenCache = IERC20(inputToken_);
     
             uint256 amountIn = inputTokenCache.balanceOf(address(this));
             if (amountIn == 0) {
                 revert ZeroBalance();
             }
     
             address targetToken = _getBuybackTargetToken();
     
             IRouterV2PathProvider routerV2PathProviderCache = IRouterV2PathProvider(routerV2PathProvider);
     
             (IRouterV2.route[] memory optimalRoute, ) = routerV2PathProviderCache.getOptimalTokenToTokenRoute(
                 inputToken_,
                 targetToken,
                 amountIn
             );
     
             uint256 amountOutQuote;
             if (optimalRoute.length > 0) {
                 amountOutQuote = routerV2PathProviderCache.getAmountOutQuote(amountIn, optimalRoute);
             }
     
             if (inputRouters_.length > 1) {
                 if (inputRouters_[0].from != inputToken_ || inputRouters_[inputRouters_.length - 1].to != targetToken) {
                     revert InvalidInputRoutes();
                 }
     
                 if (!routerV2PathProviderCache.isValidInputRoutes(inputRouters_)) {
                     revert InvalidInputRoutes();
                 }
     
                 uint256 amountOutQuoteInputRouters = routerV2PathProviderCache.getAmountOutQuote(amountIn, inputRouters_);
     
                 if (amountOutQuoteInputRouters > amountOutQuote) {
                     optimalRoute = inputRouters_;
                     amountOutQuote = amountOutQuoteInputRouters;
                 }
             }
     
             amountOutQuote = amountOutQuote - (amountOutQuote * slippage_) / SLIPPAGE_PRECISION;
             if (amountOutQuote == 0) {
                 revert RouteNotFound();
             }
     
             IRouterV2 router = IRouterV2(routerV2PathProviderCache.router());
             inputTokenCache.safeApprove(address(router), amountIn);
     
             uint256 balanceBefore = IERC20(targetToken).balanceOf(address(this));
     
             uint256[] memory amountsOut = router.swapExactTokensForTokens(amountIn, amountOutQuote, optimalRoute, address(this), deadline_);
     
             uint256 amountOut = amountsOut[amountsOut.length - 1];
     
             assert(IERC20(targetToken).balanceOf(address(this)) - balanceBefore == amountOut);
             assert(amountOut > 0);
     
             emit BuybackTokenByV2(msg.sender, inputToken_, targetToken, optimalRoute, amountIn, amountOut);
     
             return amountOut;

```

```solidity
File: contracts/nest/SingelTokenVirtualRewarderUpgradeable.sol

158:     /**
          * @notice Harvests rewards for a specific tokenId
          * @dev Calculates the available rewards for the token and updates the last earned epoch.
          *
          * IMPORTANT: If the reward was issued after the harvest summon in an epoch,
          *  you will not be able to claim it. Wait for the distribution of rewards for the past era
          *
          * @param tokenId_ The ID of the token for which to harvest rewards
          * @return reward The amount of rewards harvested
          */
         function harvest(uint256 tokenId_) external onlyStrategy returns (uint256 reward) {
             reward = _calculateAvailableRewardsAmount(tokenId_);
     
             uint256 currentEpoch = _currentEpoch();
             tokensInfo[tokenId_].lastEarnEpoch = currentEpoch;
     
             emit Harvest(tokenId_, reward, currentEpoch);
             return reward;

195:     /**
          * @notice Calculates the available rewards amount for a given tokenId
          *
          * @param tokenId_ The ID of the token to calculate rewards for
          * @return reward The calculated reward amount
          */
         function calculateAvailableRewardsAmount(uint256 tokenId_) external view returns (uint256 reward) {
             return _calculateAvailableRewardsAmount(tokenId_);

275:     /**
          * @notice This function accumulates rewards over each epoch since last claimed to present.
          * @dev Calculates the total available rewards for a given tokenId since the last earned epoch.
          *
          * @param tokenId_ The identifier of the token for which rewards are being calculated.
          * @return reward The total accumulated reward since the last claim.
          */
         function _calculateAvailableRewardsAmount(uint256 tokenId_) internal view returns (uint256 reward) {
             uint256 checkpointLastIndex = tokensInfo[tokenId_].checkpointLastIndex;
             if (checkpointLastIndex == 0) {
                 return 0;

```

### <a name="NC-17"></a>[NC-17] Take advantage of Custom Error's return value property
An important feature of Custom Error is that values such as address, tokenID, msg.value can be written inside the () sign, this kind of approach provides a serious advantage in debugging and examining the revert details of dapps such as tenderly.

*Instances (37)*:
```solidity
File: contracts/nest/BaseManagedNFTStrategyUpgradeable.sol

45:             revert AccessDenied();

53:             revert AccessDenied();

61:             revert AccessDenied();

98:             revert AlreadyAttached();

104:             revert IncorrectManagedTokenId();

155:             revert AddressZero();

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyFactoryUpgradeable.sol

168:             revert AddressZero();

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyUpgradeable.sol

162:             revert IncorrectRecoverToken();

180:         revert AccessDenied();

198:             revert AddressZero();

```

```solidity
File: contracts/nest/ManagedNFTManagerUpgradeable.sol

102:             revert AccessDenied();

152:             revert NotManagedNFT();

165:             revert NotManagedNFT();

180:             revert NotManagedNFT();

184:             revert ManagedNFTIsDisabled();

188:             revert IncorrectUserNFT();

205:             revert NotAttached();

302:             revert AddressZero();

```

```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

124:             revert InvalidRoute();

130:                 revert RouteAlreadyExist();

153:             revert InvalidRoute();

168:         revert RouteNotExist();

274:             revert InvalidPath();

278:                 revert InvalidPath();

372:             revert AddressZero();

```

```solidity
File: contracts/nest/SingelTokenBuybackUpgradeable.sol

76:             revert IncorrectSlippage();

89:             revert IncorrectInputToken();

126:             revert ZeroBalance();

146:                 revert InvalidInputRoutes();

150:                 revert InvalidInputRoutes();

163:             revert RouteNotFound();

210:             revert ZeroAddress();

```

```solidity
File: contracts/nest/SingelTokenVirtualRewarderUpgradeable.sol

87:             revert AccessDenied();

123:             revert ZeroAmount();

146:             revert ZeroAmount();

186:             revert ZeroAmount();

369:             revert AddressZero();

```

### <a name="NC-18"></a>[NC-18] Avoid the use of sensitive terms
Use [alternative variants](https://www.zdnet.com/article/mysql-drops-master-slave-and-blacklist-whitelist-terminology/), e.g. allowlist/denylist instead of whitelist/blacklist

*Instances (4)*:
```solidity
File: contracts/nest/ManagedNFTManagerUpgradeable.sol

95:     mapping(uint256 => bool) public override isWhitelistedNFT;

229:     function setWhitelistedNFT(uint256 tokenId_, bool isWhitelisted_) external onlyRole(MANAGED_NFT_ADMIN) {

230:         isWhitelistedNFT[tokenId_] = isWhitelisted_;

231:         emit SetWhitelistedNFT(tokenId_, isWhitelisted_);

```

### <a name="NC-19"></a>[NC-19] Contract does not follow the Solidity style guide's suggested layout ordering
The [style guide](https://docs.soliditylang.org/en/v0.8.16/style-guide.html#order-of-layout) says that, within a contract, the ordering should be:

1) Type declarations
2) State variables
3) Events
4) Modifiers
5) Functions

However, the contract(s) below do not follow this ordering

*Instances (7)*:
```solidity
File: contracts/nest/BaseManagedNFTStrategyUpgradeable.sol

1: 
   Current order:
   VariableDeclaration.name
   VariableDeclaration.managedNFTManager
   VariableDeclaration.managedTokenId
   VariableDeclaration.votingEscrow
   VariableDeclaration.voter
   ErrorDefinition.AccessDenied
   ErrorDefinition.IncorrectManagedTokenId
   ErrorDefinition.AlreadyAttached
   ModifierDefinition.onlyManagedNFTManager
   ModifierDefinition.onlyAdmin
   ModifierDefinition.onlyAuthorized
   FunctionDefinition.__BaseManagedNFTStrategy__init
   FunctionDefinition.attachManagedNFT
   FunctionDefinition.setName
   FunctionDefinition.vote
   FunctionDefinition.claimRewards
   FunctionDefinition.claimBribes
   FunctionDefinition._checkAddressZero
   VariableDeclaration.__gap
   
   Suggested order:
   VariableDeclaration.name
   VariableDeclaration.managedNFTManager
   VariableDeclaration.managedTokenId
   VariableDeclaration.votingEscrow
   VariableDeclaration.voter
   VariableDeclaration.__gap
   ErrorDefinition.AccessDenied
   ErrorDefinition.IncorrectManagedTokenId
   ErrorDefinition.AlreadyAttached
   ModifierDefinition.onlyManagedNFTManager
   ModifierDefinition.onlyAdmin
   ModifierDefinition.onlyAuthorized
   FunctionDefinition.__BaseManagedNFTStrategy__init
   FunctionDefinition.attachManagedNFT
   FunctionDefinition.setName
   FunctionDefinition.vote
   FunctionDefinition.claimRewards
   FunctionDefinition.claimBribes
   FunctionDefinition._checkAddressZero

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyFactoryUpgradeable.sol

1: 
   Current order:
   VariableDeclaration.STRATEGY_CREATOR_ROLE
   VariableDeclaration.strategyImplementation
   VariableDeclaration.virtualRewarderImplementation
   VariableDeclaration.managedNFTManager
   VariableDeclaration.defaultBlastGovernor
   VariableDeclaration.routerV2PathProvider
   FunctionDefinition.constructor
   FunctionDefinition.initialize
   FunctionDefinition.createStrategy
   FunctionDefinition.changeVirtualRewarderImplementation
   FunctionDefinition.changeStrategyImplementation
   FunctionDefinition.setRouterV2PathProvider
   FunctionDefinition.setDefaultBlastGovernor
   FunctionDefinition._checkAddressZero
   VariableDeclaration.__gap
   
   Suggested order:
   VariableDeclaration.STRATEGY_CREATOR_ROLE
   VariableDeclaration.strategyImplementation
   VariableDeclaration.virtualRewarderImplementation
   VariableDeclaration.managedNFTManager
   VariableDeclaration.defaultBlastGovernor
   VariableDeclaration.routerV2PathProvider
   VariableDeclaration.__gap
   FunctionDefinition.constructor
   FunctionDefinition.initialize
   FunctionDefinition.createStrategy
   FunctionDefinition.changeVirtualRewarderImplementation
   FunctionDefinition.changeStrategyImplementation
   FunctionDefinition.setRouterV2PathProvider
   FunctionDefinition.setDefaultBlastGovernor
   FunctionDefinition._checkAddressZero

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyUpgradeable.sol

1: 
   Current order:
   UsingForDirective.IERC20
   ErrorDefinition.IncorrectRecoverToken
   VariableDeclaration.fenix
   VariableDeclaration.virtualRewarder
   FunctionDefinition.constructor
   FunctionDefinition.initialize
   FunctionDefinition.onAttach
   FunctionDefinition.onDettach
   FunctionDefinition.getLockedRewardsBalance
   FunctionDefinition.balanceOf
   FunctionDefinition.totalSupply
   FunctionDefinition.compound
   FunctionDefinition.setRouterV2PathProvider
   FunctionDefinition.erc20Recover
   FunctionDefinition._checkBuybackSwapPermissions
   FunctionDefinition._getBuybackTargetToken
   FunctionDefinition._checkAddressZero
   VariableDeclaration.__gap
   
   Suggested order:
   UsingForDirective.IERC20
   VariableDeclaration.fenix
   VariableDeclaration.virtualRewarder
   VariableDeclaration.__gap
   ErrorDefinition.IncorrectRecoverToken
   FunctionDefinition.constructor
   FunctionDefinition.initialize
   FunctionDefinition.onAttach
   FunctionDefinition.onDettach
   FunctionDefinition.getLockedRewardsBalance
   FunctionDefinition.balanceOf
   FunctionDefinition.totalSupply
   FunctionDefinition.compound
   FunctionDefinition.setRouterV2PathProvider
   FunctionDefinition.erc20Recover
   FunctionDefinition._checkBuybackSwapPermissions
   FunctionDefinition._getBuybackTargetToken
   FunctionDefinition._checkAddressZero

```

```solidity
File: contracts/nest/ManagedNFTManagerUpgradeable.sol

1: 
   Current order:
   ErrorDefinition.AccessDenied
   ErrorDefinition.ManagedNFTIsDisabled
   ErrorDefinition.NotAttached
   ErrorDefinition.NotManagedNFT
   ErrorDefinition.AlreadyAttached
   ErrorDefinition.IncorrectUserNFT
   StructDefinition.TokenInfo
   StructDefinition.ManagedTokenInfo
   VariableDeclaration.MANAGED_NFT_ADMIN
   VariableDeclaration.votingEscrow
   VariableDeclaration.voter
   VariableDeclaration.tokensInfo
   VariableDeclaration.managedTokensInfo
   VariableDeclaration.isWhitelistedNFT
   ModifierDefinition.onlyVoter
   FunctionDefinition.constructor
   FunctionDefinition.initialize
   FunctionDefinition.createManagedNFT
   FunctionDefinition.setAuthorizedUser
   FunctionDefinition.toggleDisableManagedNFT
   FunctionDefinition.onAttachToManagedNFT
   FunctionDefinition.onDettachFromManagedNFT
   FunctionDefinition.setWhitelistedNFT
   FunctionDefinition.getAttachedManagedTokenId
   FunctionDefinition.isAttachedNFT
   FunctionDefinition.isDisabledNFT
   FunctionDefinition.isAdmin
   FunctionDefinition.isAuthorized
   FunctionDefinition.isManagedNFT
   FunctionDefinition._checkAddressZero
   VariableDeclaration.__gap
   
   Suggested order:
   VariableDeclaration.MANAGED_NFT_ADMIN
   VariableDeclaration.votingEscrow
   VariableDeclaration.voter
   VariableDeclaration.tokensInfo
   VariableDeclaration.managedTokensInfo
   VariableDeclaration.isWhitelistedNFT
   VariableDeclaration.__gap
   StructDefinition.TokenInfo
   StructDefinition.ManagedTokenInfo
   ErrorDefinition.AccessDenied
   ErrorDefinition.ManagedNFTIsDisabled
   ErrorDefinition.NotAttached
   ErrorDefinition.NotManagedNFT
   ErrorDefinition.AlreadyAttached
   ErrorDefinition.IncorrectUserNFT
   ModifierDefinition.onlyVoter
   FunctionDefinition.constructor
   FunctionDefinition.initialize
   FunctionDefinition.createManagedNFT
   FunctionDefinition.setAuthorizedUser
   FunctionDefinition.toggleDisableManagedNFT
   FunctionDefinition.onAttachToManagedNFT
   FunctionDefinition.onDettachFromManagedNFT
   FunctionDefinition.setWhitelistedNFT
   FunctionDefinition.getAttachedManagedTokenId
   FunctionDefinition.isAttachedNFT
   FunctionDefinition.isDisabledNFT
   FunctionDefinition.isAdmin
   FunctionDefinition.isAuthorized
   FunctionDefinition.isManagedNFT
   FunctionDefinition._checkAddressZero

```

```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

1: 
   Current order:
   VariableDeclaration.PAIR_QUOTE_GRANULARITY
   VariableDeclaration.router
   VariableDeclaration.factory
   VariableDeclaration.isAllowedTokenInInputRoutes
   VariableDeclaration.tokenToRoutes
   ErrorDefinition.InvalidPath
   ErrorDefinition.InvalidRoute
   ErrorDefinition.RouteNotExist
   ErrorDefinition.RouteAlreadyExist
   FunctionDefinition.constructor
   FunctionDefinition.initialize
   FunctionDefinition.setAllowedTokenInInputRouters
   FunctionDefinition.addRouteToToken
   FunctionDefinition.removeRouteFromToken
   FunctionDefinition.getTokenRoutes
   FunctionDefinition.getRoutesTokenToToken
   FunctionDefinition.getOptimalTokenToTokenRoute
   FunctionDefinition.getAmountOutQuote
   FunctionDefinition.isValidInputRoutes
   FunctionDefinition._getRoutesTokenToToken
   FunctionDefinition._checkAddressZero
   VariableDeclaration.__gap
   
   Suggested order:
   VariableDeclaration.PAIR_QUOTE_GRANULARITY
   VariableDeclaration.router
   VariableDeclaration.factory
   VariableDeclaration.isAllowedTokenInInputRoutes
   VariableDeclaration.tokenToRoutes
   VariableDeclaration.__gap
   ErrorDefinition.InvalidPath
   ErrorDefinition.InvalidRoute
   ErrorDefinition.RouteNotExist
   ErrorDefinition.RouteAlreadyExist
   FunctionDefinition.constructor
   FunctionDefinition.initialize
   FunctionDefinition.setAllowedTokenInInputRouters
   FunctionDefinition.addRouteToToken
   FunctionDefinition.removeRouteFromToken
   FunctionDefinition.getTokenRoutes
   FunctionDefinition.getRoutesTokenToToken
   FunctionDefinition.getOptimalTokenToTokenRoute
   FunctionDefinition.getAmountOutQuote
   FunctionDefinition.isValidInputRoutes
   FunctionDefinition._getRoutesTokenToToken
   FunctionDefinition._checkAddressZero

```

```solidity
File: contracts/nest/SingelTokenBuybackUpgradeable.sol

1: 
   Current order:
   UsingForDirective.IERC20
   ErrorDefinition.IncorrectInputToken
   ErrorDefinition.IncorrectSlippage
   ErrorDefinition.ZeroBalance
   ErrorDefinition.InvalidInputRoutes
   ErrorDefinition.RouteNotFound
   ErrorDefinition.ZeroAddress
   VariableDeclaration.MAX_SLIPPAGE
   VariableDeclaration.SLIPPAGE_PRECISION
   VariableDeclaration.routerV2PathProvider
   ModifierDefinition.onlyCorrectSlippage
   ModifierDefinition.onlyCorrectInputToken
   FunctionDefinition.__SingelTokenBuyback__init
   FunctionDefinition.buybackTokenByV2
   FunctionDefinition.getBuybackTargetToken
   FunctionDefinition._checkBuybackSwapPermissions
   FunctionDefinition._getBuybackTargetToken
   FunctionDefinition._checkAddressZero
   VariableDeclaration.__gap
   
   Suggested order:
   UsingForDirective.IERC20
   VariableDeclaration.MAX_SLIPPAGE
   VariableDeclaration.SLIPPAGE_PRECISION
   VariableDeclaration.routerV2PathProvider
   VariableDeclaration.__gap
   ErrorDefinition.IncorrectInputToken
   ErrorDefinition.IncorrectSlippage
   ErrorDefinition.ZeroBalance
   ErrorDefinition.InvalidInputRoutes
   ErrorDefinition.RouteNotFound
   ErrorDefinition.ZeroAddress
   ModifierDefinition.onlyCorrectSlippage
   ModifierDefinition.onlyCorrectInputToken
   FunctionDefinition.__SingelTokenBuyback__init
   FunctionDefinition.buybackTokenByV2
   FunctionDefinition.getBuybackTargetToken
   FunctionDefinition._checkBuybackSwapPermissions
   FunctionDefinition._getBuybackTargetToken
   FunctionDefinition._checkAddressZero

```

```solidity
File: contracts/nest/SingelTokenVirtualRewarderUpgradeable.sol

1: 
   Current order:
   StructDefinition.TokenInfo
   VariableDeclaration.strategy
   VariableDeclaration.totalSupply
   VariableDeclaration.totalSupplyCheckpointLastIndex
   VariableDeclaration.totalSupplyCheckpoints
   VariableDeclaration.tokensInfo
   VariableDeclaration.rewardsPerEpoch
   VariableDeclaration._WEEK
   ErrorDefinition.AccessDenied
   ErrorDefinition.ZeroAmount
   ModifierDefinition.onlyStrategy
   FunctionDefinition.constructor
   FunctionDefinition.initialize
   FunctionDefinition.deposit
   FunctionDefinition.withdraw
   FunctionDefinition.harvest
   FunctionDefinition.notifyRewardAmount
   FunctionDefinition.calculateAvailableRewardsAmount
   FunctionDefinition.balanceOf
   FunctionDefinition.balanceOfAt
   FunctionDefinition.totalSupplyAt
   FunctionDefinition.balanceCheckpoints
   FunctionDefinition._writeCheckpoints
   FunctionDefinition._calculateAvailableRewardsAmount
   FunctionDefinition._calculateRewardPerEpoch
   FunctionDefinition._currentEpoch
   FunctionDefinition._roundToEpoch
   FunctionDefinition._checkAddressZero
   VariableDeclaration.__gap
   
   Suggested order:
   VariableDeclaration.strategy
   VariableDeclaration.totalSupply
   VariableDeclaration.totalSupplyCheckpointLastIndex
   VariableDeclaration.totalSupplyCheckpoints
   VariableDeclaration.tokensInfo
   VariableDeclaration.rewardsPerEpoch
   VariableDeclaration._WEEK
   VariableDeclaration.__gap
   StructDefinition.TokenInfo
   ErrorDefinition.AccessDenied
   ErrorDefinition.ZeroAmount
   ModifierDefinition.onlyStrategy
   FunctionDefinition.constructor
   FunctionDefinition.initialize
   FunctionDefinition.deposit
   FunctionDefinition.withdraw
   FunctionDefinition.harvest
   FunctionDefinition.notifyRewardAmount
   FunctionDefinition.calculateAvailableRewardsAmount
   FunctionDefinition.balanceOf
   FunctionDefinition.balanceOfAt
   FunctionDefinition.totalSupplyAt
   FunctionDefinition.balanceCheckpoints
   FunctionDefinition._writeCheckpoints
   FunctionDefinition._calculateAvailableRewardsAmount
   FunctionDefinition._calculateRewardPerEpoch
   FunctionDefinition._currentEpoch
   FunctionDefinition._roundToEpoch
   FunctionDefinition._checkAddressZero

```

### <a name="NC-20"></a>[NC-20] Use Underscores for Number Literals (add an underscore every 3 digits)

*Instances (1)*:
```solidity
File: contracts/nest/SingelTokenVirtualRewarderUpgradeable.sol

67:     uint256 internal constant _WEEK = 86400 * 7;

```

### <a name="NC-21"></a>[NC-21] Internal and private variables and functions names should begin with an underscore
According to the Solidity Style Guide, Non-`external` variable and function names should begin with an [underscore](https://docs.soliditylang.org/en/latest/style-guide.html#underscore-prefix-for-non-external-functions-and-variables)

*Instances (3)*:
```solidity
File: contracts/nest/libraries/VirtualRewarderCheckpoints.sol

30:     function writeCheckpoint(

54:     function getAmount(

74:     function getCheckpointIndex(

```


## Low Issues


| |Issue|Instances|
|-|:-|:-:|
| [L-1](#L-1) | `approve()`/`safeApprove()` may revert if the current approval is not zero | 2 |
| [L-2](#L-2) | Missing checks for `address(0)` when assigning values to address state variables | 17 |
| [L-3](#L-3) | Do not use deprecated library functions | 2 |
| [L-4](#L-4) | `safeApprove()` is deprecated | 2 |
| [L-5](#L-5) | Division by zero not prevented | 3 |
| [L-6](#L-6) | External calls in an un-bounded `for-`loop may result in a DOS | 1 |
| [L-7](#L-7) | Initializers could be front-run | 21 |
| [L-8](#L-8) | Possible rounding issue | 1 |
| [L-9](#L-9) | Loss of precision | 3 |
| [L-10](#L-10) | Solidity version 0.8.20+ may not work on other chains due to `PUSH0` | 6 |
| [L-11](#L-11) | Some tokens may revert when zero value transfers are made | 1 |
| [L-12](#L-12) | Sweeping may break accounting if tokens with multiple addresses are used | 2 |
| [L-13](#L-13) | Upgradeable contract is missing a `__gap[50]` storage variable to allow for new storage variables in later versions | 18 |
| [L-14](#L-14) | Upgradeable contract not initialized | 44 |
### <a name="L-1"></a>[L-1] `approve()`/`safeApprove()` may revert if the current approval is not zero
- Some tokens (like the *very popular* USDT) do not work when changing the allowance from an existing non-zero allowance value (it will revert if the current approval is not zero to protect against front-running changes of approvals). These tokens must first be approved for zero and then the actual allowance can be approved.
- Furthermore, OZ's implementation of safeApprove would throw an error if an approve is attempted from a non-zero value (`"SafeERC20: approve from non-zero to non-zero allowance"`)

Set the allowance to zero immediately before each of the existing allowance calls

*Instances (2)*:
```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyUpgradeable.sol

134:             fenixCache.safeApprove(votingEscrowCache, currentBalance);

```

```solidity
File: contracts/nest/SingelTokenBuybackUpgradeable.sol

167:         inputTokenCache.safeApprove(address(router), amountIn);

```

### <a name="L-2"></a>[L-2] Missing checks for `address(0)` when assigning values to address state variables

*Instances (17)*:
```solidity
File: contracts/nest/BaseManagedNFTStrategyUpgradeable.sol

82:         managedNFTManager = managedNFTManager_;

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyFactoryUpgradeable.sol

87:         strategyImplementation = strategyImplementation_;

88:         virtualRewarderImplementation = virtualRewarderImplementation_;

89:         defaultBlastGovernor = blastGovernor_;

90:         managedNFTManager = managedNFTManager_;

91:         routerV2PathProvider = routerV2PathProvider_;

121:         virtualRewarderImplementation = virtualRewarderImplementation_;

134:         strategyImplementation = strategyImplementation_;

146:         routerV2PathProvider = routerV2PathProvider_;

158:         defaultBlastGovernor = defaultBlastGovernor_;

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyUpgradeable.sol

69:         virtualRewarder = virtualRewarder_;

```

```solidity
File: contracts/nest/ManagedNFTManagerUpgradeable.sol

130:         votingEscrow = votingEscrow_;

131:         voter = voter_;

```

```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

95:         factory = factory_;

96:         router = router_;

```

```solidity
File: contracts/nest/SingelTokenBuybackUpgradeable.sol

102:         routerV2PathProvider = routerV2PathProvider_;

```

```solidity
File: contracts/nest/SingelTokenVirtualRewarderUpgradeable.sol

111:         strategy = strategy_;

```

### <a name="L-3"></a>[L-3] Do not use deprecated library functions

*Instances (2)*:
```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyUpgradeable.sol

134:             fenixCache.safeApprove(votingEscrowCache, currentBalance);

```

```solidity
File: contracts/nest/SingelTokenBuybackUpgradeable.sol

167:         inputTokenCache.safeApprove(address(router), amountIn);

```

### <a name="L-4"></a>[L-4] `safeApprove()` is deprecated
[Deprecated](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/bfff03c0d2a59bcd8e2ead1da9aed9edf0080d05/contracts/token/ERC20/utils/SafeERC20.sol#L38-L45) in favor of `safeIncreaseAllowance()` and `safeDecreaseAllowance()`. If only setting the initial allowance to the value that means infinite, `safeIncreaseAllowance()` can be used instead. The function may currently work, but if a bug is found in this version of OpenZeppelin, and the version that you're forced to upgrade to no longer has this function, you'll encounter unnecessary delays in porting and testing replacement contracts.

*Instances (2)*:
```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyUpgradeable.sol

134:             fenixCache.safeApprove(votingEscrowCache, currentBalance);

```

```solidity
File: contracts/nest/SingelTokenBuybackUpgradeable.sol

167:         inputTokenCache.safeApprove(address(router), amountIn);

```

### <a name="L-5"></a>[L-5] Division by zero not prevented
The divisions below take an input parameter which does not have any zero-value checks, which may lead to the functions reverting when zero is passed.

*Instances (3)*:
```solidity
File: contracts/nest/SingelTokenVirtualRewarderUpgradeable.sol

305:         uint256 notHarvestedEpochCount = (currentEpoch - startEpoch) / _WEEK;

338:         return (balance * rewardsPerEpoch[epoch_ + _WEEK]) / supply;

359:         return (timestamp_ / _WEEK) * _WEEK;

```

### <a name="L-6"></a>[L-6] External calls in an un-bounded `for-`loop may result in a DOS
Consider limiting the number of iterations in for-loops that make external calls

*Instances (1)*:
```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

160:                 tokenToRoutes[token_].pop();

```

### <a name="L-7"></a>[L-7] Initializers could be front-run
Initializers could be front-run, allowing an attacker to either set their own values, take ownership of the contract, and in the best case forcing a re-deployment

*Instances (21)*:
```solidity
File: contracts/nest/BaseManagedNFTStrategyUpgradeable.sol

73:     function __BaseManagedNFTStrategy__init(

78:         __BlastGovernorClaimableSetup_init(blastGovernor_);

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyFactoryUpgradeable.sol

69:     function initialize(

75:     ) external initializer {

81:         __BlastGovernorClaimableSetup_init(blastGovernor_);

82:         __AccessControl_init();

104:         strategy.initialize(defaultBlastGovernor, managedNFTManager, address(virtualRewarder), routerV2PathProvider, name_);

105:         virtualRewarder.initialize(defaultBlastGovernor, address(strategy));

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyUpgradeable.sol

58:     function initialize(

64:     ) external override initializer {

66:         __BaseManagedNFTStrategy__init(blastGovernor_, managedNFTManager_, name_);

67:         __SingelTokenBuyback__init(routerV2PathProvider_);

```

```solidity
File: contracts/nest/ManagedNFTManagerUpgradeable.sol

120:     function initialize(address blastGovernor_, address votingEscrow_, address voter_) external initializer {

121:         __BlastGovernorClaimableSetup_init(blastGovernor_);

122:         __AccessControl_init();

```

```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

87:     function initialize(address blastGovernor_, address factory_, address router_) external initializer {

91:         __BlastGovernorClaimableSetup_init(blastGovernor_);

93:         __Ownable2Step_init();

```

```solidity
File: contracts/nest/SingelTokenBuybackUpgradeable.sol

99:     function __SingelTokenBuyback__init(address routerV2PathProvider_) internal onlyInitializing {

```

```solidity
File: contracts/nest/SingelTokenVirtualRewarderUpgradeable.sol

106:     function initialize(address blastGovernor_, address strategy_) external override initializer {

107:         __BlastGovernorClaimableSetup_init(blastGovernor_);

```

### <a name="L-8"></a>[L-8] Possible rounding issue
Division by large numbers may result in the result being zero, due to solidity not supporting fractions. Consider requiring a minimum amount for the numerator to ensure that it is always larger than the denominator. Also, there is indication of multiplication and division without the use of parenthesis which could result in issues.

*Instances (1)*:
```solidity
File: contracts/nest/SingelTokenVirtualRewarderUpgradeable.sol

338:         return (balance * rewardsPerEpoch[epoch_ + _WEEK]) / supply;

```

### <a name="L-9"></a>[L-9] Loss of precision
Division by large numbers may result in the result being zero, due to solidity not supporting fractions. Consider requiring a minimum amount for the numerator to ensure that it is always larger than the denominator

*Instances (3)*:
```solidity
File: contracts/nest/SingelTokenBuybackUpgradeable.sol

161:         amountOutQuote = amountOutQuote - (amountOutQuote * slippage_) / SLIPPAGE_PRECISION;

```

```solidity
File: contracts/nest/SingelTokenVirtualRewarderUpgradeable.sol

305:         uint256 notHarvestedEpochCount = (currentEpoch - startEpoch) / _WEEK;

359:         return (timestamp_ / _WEEK) * _WEEK;

```

### <a name="L-10"></a>[L-10] Solidity version 0.8.20+ may not work on other chains due to `PUSH0`
The compiler for Solidity 0.8.20 switches the default target EVM version to [Shanghai](https://blog.soliditylang.org/2023/05/10/solidity-0.8.20-release-announcement/#important-note), which includes the new `PUSH0` op code. This op code may not yet be implemented on all L2s, so deployment on these chains will fail. To work around this issue, use an earlier [EVM](https://docs.soliditylang.org/en/v0.8.20/using-the-compiler.html?ref=zaryabs.com#setting-the-evm-version-to-target) [version](https://book.getfoundry.sh/reference/config/solidity-compiler#evm_version). While the project itself may or may not compile with 0.8.20, other projects with which it integrates, or which extend this project may, and those projects will have problems deploying these contracts/libraries.

*Instances (6)*:
```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyFactoryUpgradeable.sol

2: pragma solidity =0.8.19;

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyUpgradeable.sol

2: pragma solidity =0.8.19;

```

```solidity
File: contracts/nest/ManagedNFTManagerUpgradeable.sol

2: pragma solidity =0.8.19;

```

```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

2: pragma solidity =0.8.19;

```

```solidity
File: contracts/nest/SingelTokenVirtualRewarderUpgradeable.sol

2: pragma solidity =0.8.19;

```

```solidity
File: contracts/nest/libraries/VirtualRewarderCheckpoints.sol

2: pragma solidity =0.8.19;

```

### <a name="L-11"></a>[L-11] Some tokens may revert when zero value transfers are made
Example: https://github.com/d-xo/weird-erc20#revert-on-zero-value-transfers.

In spite of the fact that EIP-20 [states](https://github.com/ethereum/EIPs/blob/46b9b698815abbfa628cd1097311deee77dd45c5/EIPS/eip-20.md?plain=1#L116) that zero-valued transfers must be accepted, some tokens, such as LEND will revert if this is attempted, which may cause transactions that involve other tokens (such as batch operations) to fully revert. Consider skipping the transfer if the amount is zero, which will also save gas.

*Instances (1)*:
```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyUpgradeable.sol

166:         IERC20(token_).safeTransfer(recipient_, amount);

```

### <a name="L-12"></a>[L-12] Sweeping may break accounting if tokens with multiple addresses are used
There have been [cases](https://blog.openzeppelin.com/compound-tusd-integration-issue-retrospective/) in the past where a token mistakenly had two addresses that could control its balance, and transfers using one address impacted the balance of the other. To protect against this potential scenario, sweep functions should ensure that the balance of the non-sweepable token does not change after the transfer of the swept tokens.

*Instances (2)*:
```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyUpgradeable.sol

33:     error IncorrectRecoverToken();

162:             revert IncorrectRecoverToken();

```

### <a name="L-13"></a>[L-13] Upgradeable contract is missing a `__gap[50]` storage variable to allow for new storage variables in later versions
See [this](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps) link for a description of this storage variable. While some contracts may not currently be sub-classed, adding the variable now protects against forgetting to add it in the future.

*Instances (18)*:
```solidity
File: contracts/nest/BaseManagedNFTStrategyUpgradeable.sol

4: import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

17: abstract contract BaseManagedNFTStrategyUpgradeable is IManagedNFTStrategy, Initializable, BlastGovernorClaimableSetup {

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyFactoryUpgradeable.sol

4: import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

18: contract CompoundVeFNXManagedNFTStrategyFactoryUpgradeable is

21:     AccessControlUpgradeable

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyUpgradeable.sol

4: import "./../../contracts/nest/BaseManagedNFTStrategyUpgradeable.sol";

13: import "./../../contracts/nest/SingelTokenBuybackUpgradeable.sol";

21: contract CompoundVeFNXManagedNFTStrategyUpgradeable is

23:     BaseManagedNFTStrategyUpgradeable,

24:     SingelTokenBuybackUpgradeable

196:     function _checkAddressZero(address addr_) internal pure override(BaseManagedNFTStrategyUpgradeable, SingelTokenBuybackUpgradeable) {

```

```solidity
File: contracts/nest/ManagedNFTManagerUpgradeable.sol

4: import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

17: contract ManagedNFTManagerUpgradeable is IManagedNFTManager, AccessControlUpgradeable, BlastGovernorClaimableSetup {

```

```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

5: import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";

18: contract RouterV2PathProviderUpgradeable is IRouterV2PathProvider, Ownable2StepUpgradeable, BlastGovernorClaimableSetup {

```

```solidity
File: contracts/nest/SingelTokenBuybackUpgradeable.sol

4: import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

17: abstract contract SingelTokenBuybackUpgradeable is ISingelTokenBuyback, Initializable {

```

```solidity
File: contracts/nest/SingelTokenVirtualRewarderUpgradeable.sol

14: contract SingelTokenVirtualRewarderUpgradeable is ISingelTokenVirtualRewarder, BlastGovernorClaimableSetup, Initializable {

```

### <a name="L-14"></a>[L-14] Upgradeable contract not initialized
Upgradeable contracts are initialized via an initializer function rather than by a constructor. Leaving such a contract uninitialized may lead to it being taken over by a malicious user

*Instances (44)*:
```solidity
File: contracts/nest/BaseManagedNFTStrategyUpgradeable.sol

4: import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

17: abstract contract BaseManagedNFTStrategyUpgradeable is IManagedNFTStrategy, Initializable, BlastGovernorClaimableSetup {

73:     function __BaseManagedNFTStrategy__init(

78:         __BlastGovernorClaimableSetup_init(blastGovernor_);

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyFactoryUpgradeable.sol

4: import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

18: contract CompoundVeFNXManagedNFTStrategyFactoryUpgradeable is

21:     AccessControlUpgradeable

57:         _disableInitializers();

69:     function initialize(

75:     ) external initializer {

81:         __BlastGovernorClaimableSetup_init(blastGovernor_);

82:         __AccessControl_init();

104:         strategy.initialize(defaultBlastGovernor, managedNFTManager, address(virtualRewarder), routerV2PathProvider, name_);

105:         virtualRewarder.initialize(defaultBlastGovernor, address(strategy));

```

```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyUpgradeable.sol

4: import "./../../contracts/nest/BaseManagedNFTStrategyUpgradeable.sol";

13: import "./../../contracts/nest/SingelTokenBuybackUpgradeable.sol";

21: contract CompoundVeFNXManagedNFTStrategyUpgradeable is

23:     BaseManagedNFTStrategyUpgradeable,

24:     SingelTokenBuybackUpgradeable

45:         _disableInitializers();

58:     function initialize(

64:     ) external override initializer {

66:         __BaseManagedNFTStrategy__init(blastGovernor_, managedNFTManager_, name_);

67:         __SingelTokenBuyback__init(routerV2PathProvider_);

196:     function _checkAddressZero(address addr_) internal pure override(BaseManagedNFTStrategyUpgradeable, SingelTokenBuybackUpgradeable) {

```

```solidity
File: contracts/nest/ManagedNFTManagerUpgradeable.sol

4: import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

17: contract ManagedNFTManagerUpgradeable is IManagedNFTManager, AccessControlUpgradeable, BlastGovernorClaimableSetup {

111:         _disableInitializers();

120:     function initialize(address blastGovernor_, address votingEscrow_, address voter_) external initializer {

121:         __BlastGovernorClaimableSetup_init(blastGovernor_);

122:         __AccessControl_init();

```

```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

5: import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";

18: contract RouterV2PathProviderUpgradeable is IRouterV2PathProvider, Ownable2StepUpgradeable, BlastGovernorClaimableSetup {

76:         _disableInitializers();

87:     function initialize(address blastGovernor_, address factory_, address router_) external initializer {

91:         __BlastGovernorClaimableSetup_init(blastGovernor_);

93:         __Ownable2Step_init();

```

```solidity
File: contracts/nest/SingelTokenBuybackUpgradeable.sol

4: import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

17: abstract contract SingelTokenBuybackUpgradeable is ISingelTokenBuyback, Initializable {

99:     function __SingelTokenBuyback__init(address routerV2PathProvider_) internal onlyInitializing {

```

```solidity
File: contracts/nest/SingelTokenVirtualRewarderUpgradeable.sol

14: contract SingelTokenVirtualRewarderUpgradeable is ISingelTokenVirtualRewarder, BlastGovernorClaimableSetup, Initializable {

96:         _disableInitializers();

106:     function initialize(address blastGovernor_, address strategy_) external override initializer {

107:         __BlastGovernorClaimableSetup_init(blastGovernor_);

```


## Medium Issues


| |Issue|Instances|
|-|:-|:-:|
| [M-1](#M-1) | Centralization Risk for trusted owners | 12 |
### <a name="M-1"></a>[M-1] Centralization Risk for trusted owners

#### Impact:
Contracts have owners with privileged rights to perform admin tasks and need to be trusted to not perform malicious updates or drain funds.

*Instances (12)*:
```solidity
File: contracts/nest/CompoundVeFNXManagedNFTStrategyFactoryUpgradeable.sol

100:     function createStrategy(string calldata name_) external override onlyRole(STRATEGY_CREATOR_ROLE) returns (address) {

117:     function changeVirtualRewarderImplementation(address virtualRewarderImplementation_) external onlyRole(DEFAULT_ADMIN_ROLE) {

130:     function changeStrategyImplementation(address strategyImplementation_) external onlyRole(DEFAULT_ADMIN_ROLE) {

142:     function setRouterV2PathProvider(address routerV2PathProvider_) external virtual onlyRole(DEFAULT_ADMIN_ROLE) {

154:     function setDefaultBlastGovernor(address defaultBlastGovernor_) external virtual onlyRole(DEFAULT_ADMIN_ROLE) {

```

```solidity
File: contracts/nest/ManagedNFTManagerUpgradeable.sol

138:     function createManagedNFT(address strategy_) external onlyRole(MANAGED_NFT_ADMIN) returns (uint256 managedTokenId) {

150:     function setAuthorizedUser(uint256 managedTokenId_, address authorizedUser_) external onlyRole(MANAGED_NFT_ADMIN) {

163:     function toggleDisableManagedNFT(uint256 managedTokenId_) external onlyRole(MANAGED_NFT_ADMIN) {

229:     function setWhitelistedNFT(uint256 tokenId_, bool isWhitelisted_) external onlyRole(MANAGED_NFT_ADMIN) {

```

```solidity
File: contracts/nest/RouterV2PathProviderUpgradeable.sol

107:     function setAllowedTokenInInputRouters(address token_, bool isAllowed_) external onlyOwner {

119:     function addRouteToToken(address token_, IRouterV2.route memory route_) external onlyOwner {

148:     function removeRouteFromToken(address token_, IRouterV2.route memory route_) external onlyOwner {

```

