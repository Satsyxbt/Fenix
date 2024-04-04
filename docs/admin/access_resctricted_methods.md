# Contracts access control

## ProxyAdmin
The `ProxyAdmin` contract uses an `Ownable` type of access control, which means the control is centralized to the owner of the contract.

### Authorized methods

- `changeProxyAdmin(ITransparentUpgradeableProxy proxy, address newAdmin)`: Changes the admin of the proxy. Only callable by the contract owner.

  **Parameters:**
  - `proxy`: The proxy to change the admin of.
  - `newAdmin`: The address of the new admin.

- `upgrade(ITransparentUpgradeableProxy proxy, address implementation)`: Upgrades the implementation of the proxy. Only callable by the contract owner.

  **Parameters:**
  - `proxy`: The proxy to upgrade.
  - `implementation`: The address of the new implementation contract.

- `upgradeAndCall(ITransparentUpgradeableProxy proxy, address implementation, bytes memory data)`: Upgrades the implementation of the proxy and executes a function on the new implementation in the same transaction. Only callable by the contract owner.

  **Parameters:**
  - `proxy`: The proxy to upgrade.
  - `implementation`: The address of the new implementation contract.
  - `data`: The calldata to execute on the new implementation.

## FeesVaultFactoryUpgradeable
Inherits from `AccessControlUpgradeable` and utilizes `BlastERC20FactoryManager` for managing the creation and configuration of fee vaults within the ecosystem, with the following roles:

- `DEFAULT_ADMIN_ROLE`: Full administrative control, capable of managing other roles and critical contract functionalities.
- `CLAIM_FEES_CALLER_ROLE`: Grants permission to call distribute fees from the vaults.
- `WHITELISTED_CREATOR_ROLE`: Allows the creation of fee vaults for designated pools, typically reserved for trusted entities or automated processes within the ecosystem.
- `FEES_VAULT_ADMINISTRATOR_ROLE`: Empowers the management of fee distribution configurations, both default and custom, for the fee vaults.

### Authorized methods under `DEFAULT_ADMIN_ROLE`

- `changeImplementation(address implementation_)`: Updates the fee vault contract implementation.

  **Parameters:**
  - `implementation_`: Address of the new fee vault contract implementation.

- `setVoter(address voter_)`: Sets the address that will be used for voting rights in the fee vaults.

  **Parameters:**
  - `voter_`: Address to be granted voting rights.

### Authorized methods under `FEES_VAULT_ADMINISTRATOR_ROLE`

- `setDefaultDistributionConfig(DistributionConfig memory config_)`: Establishes the default fee distribution configuration.

  **Parameters:**
  - `config_`: Struct containing the distribution configuration details.

- `setCustomDistributionConfig(address feesVault_, DistributionConfig memory config_)`: Sets a custom distribution configuration for a specific fee vault.

  **Parameters:**
  - `feesVault_`: Address of the fee vault to configure.
  - `config_`: Struct containing the custom distribution configuration.
- `setDefaultBlastGovernor(address defaultBlastGovernor_)`: Sets the default governor for new fee vaults.

  **Parameters:**
  - `defaultBlastGovernor_`: The new default governor address.

- `setDefaultBlastPoints(address defaultBlastPoints_)`: Sets the default BlastPoints address used in fee vaults.

  **Parameters:**
  - `defaultBlastPoints_`: The new default BlastPoints address.

- `setDefaultBlastPointsOperator(address defaultBlastPointsOperator_)`: Sets the operator for BlastPoints.

  **Parameters:**
  - `defaultBlastPointsOperator_`: The new operator address for BlastPoints.

- `setConfigurationForRebaseToken(address token_, bool isRebase_, YieldMode mode_)`: Configures the rebase settings for a specific token.

  **Parameters:**
  - `token_`: The token address to configure.
  - `isRebase_`: Indicates if the token is a rebase token.
  - `mode_`: The yield mode for the token.


### Authorized methods under `WHITELISTED_CREATOR_ROLE`

- `createVaultForPool(address pool_)`: Creates a new fee vault for a specified liquidity pool.

  **Parameters:**
  - `pool_`: Address of the liquidity pool for which to create the fee vault.

- `afterPoolInitialize(address pool_)`: Completes the post-initialization setup for a pool's fee vault, typically configuring rebasing token parameters.

  **Parameters:**
  - `pool_`: Address of the liquidity pool whose fee vault requires final setup.

## PairFactoryUpgradeable
Inherits from `AccessControlUpgradeable` and introduces several key roles for managing pair creation and fee settings:

- `DEFAULT_ADMIN_ROLE`: Provides full access to role management, allowing the assignment or revocation of any roles within the contract.
- `PAIRS_ADMINISTRATOR_ROLE`: Enables the administration of core functions of the pair factory, such as pausing pair creation, managing fee settings, etc.
- `FEES_MANAGER_ROLE`: Responsible for setting and managing the fees charged on liquidity pool operations, including protocol fees.
- `PAIRS_CREATOR_ROLE`: Authorizes the creation of new liquidity pairs, allowing addresses with this role to launch new trading pairs in the ecosystem.


### Authorized methods under `PAIRS_ADMINISTRATOR_ROLE`

- `setPause(bool _state)`: Pauses or unpauses pool creation.

  *Parameters:*
  - `_state`: The pause state.

- `setCommunityVaultFactory(address communityVaultFactory_)`: Sets a new community vault factory.

  *Parameters:*
  - `communityVaultFactory_`: The address of the new community vault factory.

- `setIsPublicPoolCreationMode(bool mode_)`: Allows or disallows public pool creation.

  *Parameters:*
  - `mode_`: Enable or disable public pool creation.

- `setDefaultBlastGovernor(address defaultBlastGovernor_)`: Sets the default governor for new fee vaults.

  **Parameters:**
  - `defaultBlastGovernor_`: The new default governor address.

- `setDefaultBlastPoints(address defaultBlastPoints_)`: Sets the default BlastPoints address used in fee vaults.

  **Parameters:**
  - `defaultBlastPoints_`: The new default BlastPoints address.

- `setDefaultBlastPointsOperator(address defaultBlastPointsOperator_)`: Sets the operator for BlastPoints.

  **Parameters:**
  - `defaultBlastPointsOperator_`: The new operator address for BlastPoints.

- `setConfigurationForRebaseToken(address token_, bool isRebase_, YieldMode mode_)`: Configures the rebase settings for a specific token.

  **Parameters:**
  - `token_`: The token address to configure.
  - `isRebase_`: Indicates if the token is a rebase token.
  - `mode_`: The yield mode for the token.


### Authorized methods under `FEES_MANAGER_ROLE`

- `setProtocolFee(uint256 _newFee)`: Sets a new protocol fee.

  *Parameters:*
  - `_newFee`: The new protocol fee.

- `setCustomProtocolFee(address _pair, uint256 _newFee)`: Sets a custom protocol fee for a specific pair.

  *Parameters:*
  - `_pair`: The pair to set the custom fee for.
  - `_newFee`: The new custom fee.

- `setCustomFee(address _pair, uint256 _fee)`: Sets a custom fee for a specific pair.

  *Parameters:*
  - `_pair`: The pair to set the custom fee for.
  - `_fee`: The new custom fee.

- `setFee(bool _stable, uint256 _fee)`: Sets the fee for stable or volatile pairs.

  *Parameters:*
  - `_stable`: Boolean indicating if it's for stable pairs.
  - `_fee`: The fee amount.

### Authorized methods under `PAIRS_CREATOR_ROLE`

- `createPair(address tokenA, address tokenB, bool stable)`: Creates a new pair.

  *Parameters:*
  - `tokenA`: The first token in the pair.
  - `tokenB`: The second token in the pair.
  - `stable`: Indicates if the pair is stable.

## VoterUpgradeable
Has two authorized roles 'admin' and 'governance'

### Authorized methods under `VoterAdmin`

- `setVoteDelay(uint256 _delay)`: Sets the voting delay in seconds.

  *Parameters:*
  - `_delay`: Delay duration in seconds.

- `setMinter(address _minter)`: Sets a new minter contract address.

  *Parameters:*
  - `_minter`: Address of the new minter contract.

- `setBribeFactory(address _bribeFactory)`: Sets a new bribe factory address.

  *Parameters:*
  - `_bribeFactory`: Address of the new bribe factory.

- `setNewBribes(address _gauge, address _internal, address _external)`: Sets new internal and external bribe addresses for a specific gauge.

  *Parameters:*
  - `_gauge`: The gauge for which to set the bribes.
  - `_internal`: Address of the new internal bribe contract.
  - `_external`: Address of the new external bribe contract.

- `setInternalBribeFor(address _gauge, address _internal)`: Sets a new internal bribe address for a specific gauge.

  *Parameters:*
  - `_gauge`: The gauge for which to set the internal bribe.
  - `_internal`: Address of the new internal bribe contract.

- `setExternalBribeFor(address _gauge, address _external)`: Sets a new external bribe address for a specific gauge.

  *Parameters:*
  - `_gauge`: The gauge for which to set the external bribe.
  - `_external`: Address of the new external bribe contract.

- `addFactory(address _pairFactory, address _gaugeFactory)`: Adds a new pair factory and gauge factory.

  *Parameters:*
  - `_pairFactory`: Address of the new pair factory.
  - `_gaugeFactory`: Address of the new gauge factory.

- `replaceFactory(address _pairFactory, address _gaugeFactory, uint256 _pos)`: Replaces existing pair and gauge factories at a specified position.

  *Parameters:*
  - `_pairFactory`: Address of the new pair factory.
  - `_gaugeFactory`: Address of the new gauge factory.
  - `_pos`: Position index to replace the factories.

- `removeFactory(uint256 _pos)`: Removes a factory pair at a specified position.

  *Parameters:*
  - `_pos`: Position index of the factory pair to remove.

### Authorized methods under `Governance`

- `whitelist(address[] memory _token)`: Whitelists an array of tokens for gauge creation.

  *Parameters:*
  - `_token`: Array of token addresses to whitelist.

- `blacklist(address[] memory _token)`: Blacklists an array of tokens to prevent their use in gauge creation.

  *Parameters:*
  - `_token`: Array of token addresses to blacklist.

- `killGauge(address _gauge)`: Marks a gauge as inactive or "killed."

  *Parameters:*
  - `_gauge`: Address of the gauge to mark as killed.

- `reviveGauge(address _gauge)`: Reactivates a "killed" gauge.

  *Parameters:*
  - `_gauge`: Address of the gauge to reactivate.

- `createGauges(address[] memory _pool, uint256[] memory _gaugeTypes)`: Creates multiple gauges for the given pools and gauge types.

  *Parameters:*
  - `_pool`: Array of pool addresses for which gauges are to be created.
  - `_gaugeTypes`: Corresponding array of gauge types for the pools.

## VotingEscrowUpgradeable
Implements its own specific logic for control based on Ownable, but the name of the `team`

### Authorized methods 

- `setTeam(address _team)`: Sets a new team address.

  *Parameters:*
  - `_team`: New team address.

- `setArtProxy(address _proxy)`: Sets a new art proxy address.

  *Parameters:*
  - `_proxy`: New art proxy address.

- `setVeBoost(address _veBoost)`: Sets a new veBoost contract address.

  *Parameters:*
  - `_veBoost`: New veBoost contract address.

- `setVoter(address _voter)`: Sets a new voter address for the contract.

  *Parameters:*
  - `_voter`: New voter address.

## MinterUpgradeable
This contract follows the Ownable2Step type of access control, which provides for a 2-step process of transferring rights.

### Authorized methods

- `start()`: Starts the minting process, ensuring that it can only be called once and setting the initial active period for minting.

- `setVoter(address __voter)`: Sets the address of the voter contract, only callable by the contract owner.

  *Parameters:*
  - `__voter`: The new address for the voter contract.

- `setTeamRate(uint256 _teamRate)`: Adjusts the team rate for minting, with limitations to prevent setting a rate too high, only callable by the contract owner.

  *Parameters:*
  - `_teamRate`: The new team rate, in bips.

- `setDecayRate(uint256 _decayRate)`: Sets the decay rate for emission calculations, only callable by the contract owner.

  *Parameters:*
  - `_decayRate`: The new decay rate, must not exceed 100%.

- `setInflationRate(uint256 _inflationRate)`: Configures the inflation rate, ensuring it doesn’t surpass a certain threshold, only callable by the contract owner.

  *Parameters:*
  - `_inflationRate`: The new inflation rate, must not exceed 100%.


## VeBoostUpgradeable
This contract follows the Ownable2Step type of access control, which provides for a 2-step process of transferring rights. 

### Authorized methods

- `setPriceProvider(address priceProvider_)`: Sets the address of the price provider used to convert USD to FNX, which determines the minimum FNX amount required for boosts. This function is only callable by the contract owner.

  *Parameters:*
  - `priceProvider_`: Address of the new price provider contract.

- `setFNXBoostPercentage(uint256 boostFNXPercentage_)`: Defines the percentage of FNX tokens that can be boosted, adjustable only by the contract owner.

  *Parameters:*
  - `boostFNXPercentage_`: The new boost percentage in basis points.

- `setMinUSDAmount(uint256 minUSDAmount_)`: Establishes the minimum USD value required to be eligible for boosts, only modifiable by the contract owner.

  *Parameters:*
  - `minUSDAmount_`: The new minimum USD amount in 18 decimal places.

- `setMinLockedTime(uint256 minLockedTime_)`: Sets the minimum time FNX tokens must be locked to qualify for a boost, with the function restricted to the contract owner.

  *Parameters:*
  - `minLockedTime_`: The new minimum locked time in seconds.

- `recoverTokens(address token_, uint256 recoverAmount_)`: Allows the contract owner to recover ERC20 tokens accidentally sent to the contract.

  *Parameters:*
  - `token_`: The token address to recover.
  - `recoverAmount_`: The amount of the token to recover.

- `addRewardToken(address newRewardToken_)`: Adds a new token to the list of reward tokens distributed as boosts. This method is owner-restricted.

  *Parameters:*
  - `newRewardToken_`: The address of the token to be added as a reward token.

- `removeRewardToken(address rewardToken_)`: Removes a token from the list of reward tokens, also restricted to the contract owner.

  *Parameters:*
  - `rewardToken_`: The address of the token to be removed from the reward list.

## Merkl Gauge Middleman
This contract follows the Ownable type of access control, which implies a single control address

### Authorized methods
- `setGauge(address gauge_, DistributionParameters memory params_)`: Configures the reward distribution parameters for a specific gauge. This method is restricted to the contract owner and requires valid gauge and reward token addresses.

  *Parameters:*
  - `gauge_`: The gauge for which the distribution parameters are being set.
  - `params_`: A struct containing the reward distribution settings, including reward token, amount, and distribution epochs.


## VeFnxDistributorUpgradeable
This contract follows the Ownable2Step type of access control, which provides for a 2-step process of transferring rights. 

### Authorized methods

- `distributeVeFnx(address[] calldata recipients_, uint256[] calldata amounts_)`: Distributes veFnx tokens to an array of recipients by locking the specified amounts of FNX tokens on their behalf.

  *Parameters:*
  - `recipients_`: An array of addresses representing the recipients of the veFnx tokens.
  - `amounts_`: An array of token amounts corresponding to each recipient, representing the quantity of FNX tokens to be locked and converted into veFnx.

## RFenix
This contract follows the Ownable2Step type of access control, which provides for a 2-step process of transferring rights. 

### Authorized methods

- `recoverToken(uint256 amount_)`: Permits the contract's owner to recover FNX tokens from the contract.

  *Parameters:*
  - `amount_`: The amount of FNX tokens to recover and transfer to the owner's address.

- `mint(address to_, uint256 amount_)`: Allows the contract's owner to mint rFNX tokens to a specified address.

  *Parameters:*
  - `to_`: The address receiving the minted rFNX tokens.
  - `amount_`: The number of rFNX tokens to be minted and transferred.


## GaugeFactory
This contract follows the Ownable type of access control, which implies a single control address

### Authorized methods
- `changeImplementation(address _implementation)`: Updates the gauge contract implementation, restricted to the `owner`, allowing for upgrades in the gauge logic.

  *Parameters:*
  - `_implementation`: Address of the new gauge implementation contract.

- `setDefaultBlastGovernor(address defaultBlastGovernor_)`: Sets the default governor address for new fee vaults, only callable by the `owner`.

  *Parameters:*
  - `defaultBlastGovernor_`: The address of the new default governor.

- `setMerklGaugeMiddleman(address _newMerklGaugeMiddleman)`: Assigns the new Merkl Gauge Middleman address, a function restricted to the `owner`.

  *Parameters:*
  - `_newMerklGaugeMiddleman`: The address of the new Merkl Gauge Middleman.


## BribeFactory
This contract follows the Ownable type of access control, which implies a single control address

### Authorized methods

- `changeImplementation(address _implementation)`: Updates the bribe contract implementation. This function is restricted to the `owner` and allows for upgrading the logic of future bribe contracts.

  *Parameters:*
  - `_implementation`: Address of the new bribe implementation contract.

- `setVoter(address voter_)`: Sets the `voter` address allowed to create bribes. This is an `onlyOwner` function and is essential for maintaining control over who can initiate new bribes.
  *Parameters*:
  - `voter_`: Address of the new voter entity.

- `setDefaultBlastGovernor(address defaultBlastGovernor_)`: Assigns the default governor address for new fee vaults associated with the bribes, callable only by the `owner`.

  *Parameters:*
  - `defaultBlastGovernor_`: The address of the new default governor.

- `addRewards(address _token, address[] memory _bribes)`: Adds a reward token to a list of bribe contracts. This function can only be called by the `owner` and facilitates dynamic reward structure management.

  *Parameters:*
  - `_token`: Address of the reward token to add.
  - `_bribes`: Array of bribe contract addresses to which the reward token will be added.

- `addRewards(address[][] memory _token, address[] memory _bribes)`: Similar to `addRewards` but allows for adding multiple tokens to multiple bribe contracts in one transaction, callable by either the `voter` or the `owner`.

  *Parameters:*
  - `_token`: A two-dimensional array where each array of addresses represents reward tokens to be added to each bribe.
  - `_bribes`: An array of bribe contract addresses to which the reward tokens will be added.

- `pushDefaultRewardToken(address _token)`: Appends a token to the default reward token list, enabling it to be used in all subsequent bribes. This action can only be performed by the `owner`.

  *Parameters:*
  - `_token`: Address of the reward token to add to the default list.

- `removeDefaultRewardToken(address _token)`: Removes a token from the default reward token list, callable only by the `owner`, which affects the reward structure of future bribes.

  *Parameters:*
  - `_token`: Address of the reward token to be removed from the default list.




## Bribe
The contract is managed by the owner with BribeFactory

### Authorized methods
- `addRewardTokens(address[] memory _rewardsToken)`: Adds multiple reward tokens to the contract. This function can only be executed by addresses with special permissions, typically the contract owner or another designated authority.

  *Parameters:*
  - `_rewardsToken`: An array of addresses of the reward tokens to be added.

- `addRewardToken(address _rewardsToken)`: Adds a single reward token to the contract, allowing it to be distributed as a bribe. Similar to `addRewardTokens`, but for a single token.

  *Parameters:*
  - `_rewardsToken`: The address of the reward token to be added.

- `recoverERC20AndUpdateData(address tokenAddress, uint256 tokenAmount)`: Recovers ERC20 tokens from the contract and updates the associated bribe data accordingly. This method is crucial for managing the contract's token balances and ensuring the integrity of bribe distributions.

  *Parameters:*
  - `tokenAddress`: The address of the token to recover.
  - `tokenAmount`: The amount of the token to recover.

- `emergencyRecoverERC20(address tokenAddress, uint256 tokenAmount)`: Allows the recovery of ERC20 tokens from the contract in case of an emergency. This function bypasses the normal bribe updating logic and is intended for urgent situations.

  *Parameters:*
  - `tokenAddress`: The address of the token to recover.
  - `tokenAmount`: The amount of the token to recover.

- `setVoter(address _Voter)`: Assigns a new voter address for the bribe contract. This function changes who has the authority to interact with the contract in a voting capacity.

  *Parameters:*
  - `_Voter`: The address of the new voter.

- `setMinter(address _minter)`: Sets a new minter address for the bribe contract, affecting how new rewards are generated and distributed.

  *Parameters:*
  - `_minter`: The address of the new minter.


## Gauge
The contract is managed by the owner with GaugeFactory

### Authorized methods
- `setDistribution(address _distribution)`: Sets the Voter address

  *Parameters:*
  - `_distribution`: Address of the distribution contract.

- `setMerklGaugeMiddleman(address _newMerklGaugeMiddleman)`: Sets the address for the Merkl Gauge Middleman, which is used in distributing emissions to Merkle-based gauges.

  *Parameters:*
  - `_newMerklGaugeMiddleman`: Address of the new Merkl Gauge Middleman.

- `setIsDistributeEmissionToMerkle(bool _isDistributeEmissionToMerkle)`: Configures whether emissions should be distributed to Merkle or direct distribution methods.

  *Parameters:*
  - `_isDistributeEmissionToMerkle`: Boolean flag indicating whether to distribute emissions to Merkle.

- `setGaugeRewarder(address _gaugeRewarder)`: Assigns a new gauge rewarder address which is responsible for additional reward mechanisms within the gauge.

  *Parameters:*
  - `_gaugeRewarder`: Address of the new gauge rewarder.

- `setFeeVault(address _feeVault)`: Sets the fee vault address where the gauge's fees are collected and distributed.

  *Parameters:*
  - `_feeVault`: Address of the fee vault.

- `setInternalBribe(address _int)`: Updates the internal bribe contract address, where the internal fees (like swap fees) are directed.

  *Parameters:*
  - `_int`: Address of the new internal bribe contract.

- `activateEmergencyMode()`: Activates the emergency mode which halts certain functions of the gauge to protect the ecosystem in critical situations.

- `stopEmergencyMode()`: Deactivates the emergency mode, resuming normal operations of the gauge.


## FeesVault
The contract relies on setted roles within FeesVaultFactory

### Authorized methods under `CLAIM_FEES_CALLER_ROLE`

- `claimFees()`: Claims fees for redistribution from the vault, distributing them according to the configured distribution parameters.

  **Parameters:** None

  **Returns:**
  - `gauge0`: Amount of fees distributed to the gauge for token0.
  - `gauge1`: Amount of fees distributed to the gauge for token1.

### Authorized methods under `FEES_VAULT_ADMINISTRATOR_ROLE`

- `emergencyRecoverERC20(address token_, uint256 amount_)`: Allows for the emergency recovery of ERC20 tokens.

  **Parameters:**
  - `token_`: The address of the token to recover.
  - `amount_`: The amount of the token to recover.
- `configure(address erc20Rebasing_, YieldMode mode_)`: Configures the rebasing parameters for a specified ERC20 rebasing token.

  **Parameters:**
  - `erc20Rebasing_`: The address of the ERC20 rebasing token to configure.
  - `mode_`: The yield mode to apply to the token.

  **Returns:** A `uint256` value representing the outcome of the configuration operation.

- `claim(address erc20Rebasing_, address recipient_, uint256 amount_)`: Claims rebasing tokens on behalf of the caller and transfers them to a specified recipient.

  **Parameters:**
  - `erc20Rebasing_`: The address of the ERC20 rebasing token from which tokens are claimed.
  - `recipient_`: The recipient address to receive the claimed tokens.
  - `amount_`: The amount of tokens to claim.

  **Returns:** The result of the claim operation, specific to the ERC20 rebasing token implementation.


## PairFees
The contract relies on setted roles within PairFactory

### Authorized methods under `PAIRS_ADMINISTRATOR_ROLE`

- `configure(address erc20Rebasing_, YieldMode mode_)`: Configures the rebasing parameters for a specified ERC20 rebasing token.

  **Parameters:**
  - `erc20Rebasing_`: The address of the ERC20 rebasing token to configure.
  - `mode_`: The yield mode to apply to the token.

  **Returns:** A `uint256` value representing the outcome of the configuration operation.

- `claim(address erc20Rebasing_, address recipient_, uint256 amount_)`: Claims rebasing tokens on behalf of the caller and transfers them to a specified recipient.

  **Parameters:**
  - `erc20Rebasing_`: The address of the ERC20 rebasing token from which tokens are claimed.
  - `recipient_`: The recipient address to receive the claimed tokens.
  - `amount_`: The amount of tokens to claim.

  **Returns:** The result of the claim operation, specific to the ERC20 rebasing token implementation.



## Pair
The contract relies on setted roles within PairFactory

### Authorized methods under `PAIRS_ADMINISTRATOR_ROLE`
- `configure(address erc20Rebasing_, YieldMode mode_)`: Configures the rebasing parameters for a specified ERC20 rebasing token.

  **Parameters:**
  - `erc20Rebasing_`: The address of the ERC20 rebasing token to configure.
  - `mode_`: The yield mode to apply to the token.

  **Returns:** A `uint256` value representing the outcome of the configuration operation.

- `claim(address erc20Rebasing_, address recipient_, uint256 amount_)`: Claims rebasing tokens on behalf of the caller and transfers them to a specified recipient.

  **Parameters:**
  - `erc20Rebasing_`: The address of the ERC20 rebasing token from which tokens are claimed.
  - `recipient_`: The recipient address to receive the claimed tokens.
  - `amount_`: The amount of tokens to claim.

  **Returns:** The result of the claim operation, specific to the ERC20 rebasing token implementation.
