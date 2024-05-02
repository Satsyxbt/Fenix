# Strategy lifecyle
The lifecycle of a compound strategy in the VeFNX ecosystem is managed through various contract interactions, specifically orchestrated by the CompoundVeFNXManagedNFTStrategyFactoryUpgradeable. Below is a detailed description and enhancement of each step involv
1. **Create strategy**
An authorized address calls the factory to create a new strategy by specifying the strategy's name. This is done through the method:
```js
CompoundVeFNXManagedNFTStrategyFactoryUpgradeable.createStrategy(string calldata name_)
```
Upon successful creation, the following event is emitted:****
```js
    /**
     * @dev Emitted when a new strategy and its corresponding virtual rewarder are created.
     *
     * @param strategy The address of the newly created strategy.
     * @param virtualRewarder The address of the corresponding virtual rewarder created alongside the strategy.
     * @param name The name assigned to the new strategy.
     */
    event CreateStrategy(address indexed strategy, address indexed virtualRewarder, string name);
```
2. **Create and Attach Managed veNFT**
The next step involves creating a new managed veNFT and attaching it to the newly created strategy. This is performed via:
```js
ManagedNFTManagerUpgradeable.createManagedNFT(address strategy_)
```
During this process, the following event is triggered:
```js
    /**
     * @dev Emitted when a new managed NFT is created and attached to a strategy.
     * @param sender The address that performed the creation.
     * @param strategy The address of the strategy to which the NFT is attached.
     * @param tokenId The ID of the newly created managed NFT.
     */
    event CreateManagedNFT(address indexed sender, address indexed strategy, uint256 indexed tokenId);
```
3. **Assigning an Authorized Address**
The authorized address, which holds permission within this contract, is set through:
```js
ManagedNFTManagerUpgradeable.setAuthorizedUser(uint256 managedTokenId_, address authorizedUser_)
```
This action is accompanied by the emission of the following event:

```js
    /**
     * @dev Emitted when an authorized user is set for a managed NFT.
     * @param managedTokenId The ID of the managed NFT.
     * @param authorizedUser The address being authorized.
     */
    event SetAuthorizedUser(uint256 indexed managedTokenId, address authorizedUser);
```
4. **User Accessibility**
After the creation and setup processes, the managed veNFT becomes accessible to users for interaction, such as staking or participating in governance activities linked to the strategy.
6. **Admin Controls for Deposits**
```js
    ManagedNFTManagerUpgradeable.toggleDisableManagedNFT(uint256 managedTokenId_)
```
This is marked by the following event:

```js
    /**
     * @dev Emitted when the disabled state of a managed NFT is toggled.
     * @param sender The address that triggered the state change.
     * @param tokenId The ID of the managed NFT affected.
     * @param isDisable True if the NFT is now disabled, false if it is enabled.
     */
    event ToggleDisableManagedNFT(address indexed sender, uint256 indexed tokenId, bool indexed isDisable);
```