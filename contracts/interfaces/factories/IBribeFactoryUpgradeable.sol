// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {IBaseFactoryUpgradeable} from "./IBaseFactoryUpgradeable.sol";

/**
 * @title IBribeFactoryUpgradeable
 * @author Fenix Protocol team
 * @dev Interface for the BribeFactoryUpgradeable contract.
 */
interface IBribeFactoryUpgradeable is IBaseFactoryUpgradeable {
    /**
     * @dev Emitted when a new bribe is created.
     * @param bribe Address of the created bribe contract.
     */
    event BribeCreated(address indexed bribe);

    /**
     * @dev Emitted when a new default reward token is added.
     * @param token Address of the added reward token.
     */
    event AddedDefaultRewardToken(address indexed token);

    /**
     * @dev Emitted when a default reward token is removed.
     * @param token Address of the removed reward token.
     */
    event RemoveDefaultRewardToken(address indexed token);

    /**
     * @dev Emitted when the voter address is set.
     * @param voter Address of the voter.
     */
    event SetVoter(address indexed voter);

    /**
     * @dev Emitted when the permission registry address is set.
     * @param permissionRegistry Address of the permission registry.
     */
    event SetPermissionRegistry(address indexed permissionRegistry);

    // Error definitions
    error ZeroAddress();
    error TokenIsMissing();
    error TokenAlreadyAdded();
    error MismatchArrayLen();
    error AccessDenied();
    error RewardTokenExist();
    error RewardTokenNotExist();

    /**
     * @dev Initializes the bribe factory with necessary components and initial configuration.
     * @param voter_ Address of the voting contract.
     * @param permissionsRegistry_ Address of the permissions registry contract.
     * @param bribeImeplementation_ Implementation address for the bribe contracts.
     * @param defaultRewardTokens_ Array of addresses representing the default reward tokens.
     */
    function initialize(
        address voter_,
        address permissionsRegistry_,
        address bribeImeplementation_,
        address[] calldata defaultRewardTokens_
    ) external;

    /**
     * @dev Upgrades the implementation of all bribe contracts to a new implementation.
     * @param newImplementation_ Address of the new implementation contract.
     */
    function upgradeProxiesTo(address newImplementation_) external;

    /**
     * @dev Creates a new bribe contract.
     * @param owner_ Address of the owner for the new bribe contract.
     * @param token0_ Address of the first reward token.
     * @param token1_ Address of the second reward token.
     * @param type_ Type or category of the bribe.
     * @return Address of the newly created bribe contract.
     */
    function createBribe(address owner_, address token0_, address token1_, string memory type_) external returns (address);

    /**
     * @dev Adds a reward token to a specific bribe contract.
     * @param token_ Address of the reward token to add.
     * @param bribe_ Address of the bribe contract to which the token will be added.
     */
    function addRewardTokenToBribe(address token_, address bribe_) external;

    /**
     * @dev Adds multiple reward tokens to a specific bribe contract.
     *
     * Requirements:
     * - Can only be called by an authorized user (owner or user with 'BRIBE_ADMIN' role).
     * - `bribe_` cannot be the zero address.
     *
     * @param token_ Array of reward token addresses to add.
     * @param bribe_ The bribe contract address to which the reward tokens will be added.
     */
    function addRewardTokensToBribe(address[] calldata token_, address bribe_) external;

    /**
     * @dev Adds a reward token to multiple bribe contracts.
     *
     * Requirements:
     * - Can only be called by an authorized user (owner or user with 'BRIBE_ADMIN' role).
     *
     * @param token_ The reward token address to add to each bribe contract.
     * @param bribes_ Array of bribe contract addresses.
     */
    function addRewardTokenToBribes(address token_, address[] calldata bribes_) external;

    /**
     * @dev Adds multiple reward tokens to multiple bribe contracts.
     *
     * Requirements:
     * - Can only be called by an authorized user (owner or user with 'BRIBE_ADMIN' role).
     * - Lengths of `bribes_` and `tokens_` arrays must match.
     *
     * @param tokens_ Array of arrays of reward token addresses.
     * @param bribes_ Array of bribe contract addresses.
     */
    function addRewardTokensToBribes(address[][] calldata tokens_, address[] calldata bribes_) external;

    /**
     * @dev Sets a new voter for a batch of bribe contracts.
     *
     * Requirements:
     * - Can only be called by the contract owner.
     *
     * @param bribes_ Array of bribe contract addresses.
     * @param voter_ The new voter address to be set in the given bribe contracts.
     */
    function setBribesVoter(address[] calldata bribes_, address voter_) external;

    /**
     * @dev Sets a new emission manager for a batch of bribe contracts.
     *
     * Requirements:
     * - Can only be called by the contract owner.
     *
     * @param bribes_ Array of bribe contract addresses.
     * @param emissionManager_ The new emission manager address to be set in the given bribe contracts.
     */
    function setBribesEmissionManager(address[] memory bribes_, address emissionManager_) external;

    /**
     * @dev Sets a new owner for a batch of bribe contracts.
     *
     * Requirements:
     * - Can only be called by the contract owner.
     *
     * @param bribes_ Array of bribe contract addresses.
     * @param owner_ The new owner address to be set in the given bribe contracts.
     */
    function setBribesOwner(address[] memory bribes_, address owner_) external;

    /**
     * @dev Sets the voter address for the bribe factory.
     *
     * Emits an {SetVoter} event with new voter address
     *
     * Requirements:
     * - Can only be called by the contract owner.
     * - `voter_` cannot be the zero address.
     *
     * @param voter_ The new voter address.
     */
    function setVoter(address voter_) external;

    /**
     * @dev Recovers ERC20 tokens from a batch of bribe contracts to owner of bribe in case of emergency.
     *
     * Requirements:
     * - Can only be called by the contract owner.
     * - The lengths of `bribes_`, `tokens_`, and `amounts_` arrays must match.
     *
     * @param bribes_ Array of bribe contract addresses.
     * @param tokens_ Array of token addresses for recovery.
     * @param amounts_ Array of amounts of tokens to recover.
     */
    function emergencyRecoverERC20(address[] memory bribes_, address[] memory tokens_, uint256[] memory amounts_) external;

    /**
     * @dev Recovers ERC20 tokens from a batch of bribe contracts and updates internal data.
     *
     * Requirements:
     * - Can only be called by the contract owner.
     * - The lengths of `bribes_`, `tokens_`, and `amounts_` arrays must match.
     *
     * @param bribes_ Array of bribe contract addresses.
     * @param tokens_ Array of token addresses for recovery.
     * @param amounts_ Array of amounts of tokens to recover.
     */
    function recoverERC20AndUpdateData(address[] calldata bribes_, address[] calldata tokens_, uint256[] calldata amounts_) external;

    /**
     * @dev Adds a default reward token to the bribe factory.
     *
     * Requirements:
     * - Can only be called by the contract owner.
     *
     * @param token_ The token address to add as a default reward token.
     */
    function pushDefaultRewardToken(address token_) external;

    /**
     * @dev Removes a default reward token from the bribe factory.
     *
     * Emits an {RemoveDefaultRewardToken} event with removed reward token
     *
     * Requirements:
     * - Can only be called by the contract owner.
     * - `token_` cannot be the zero address.
     * - The token must exist in the default reward tokens set.
     *
     * @param token_ The token address to remove from the default reward tokens.
     */
    function removeDefaultRewardToken(address token_) external;

    /**
     * @dev Sets the permissions registry address for the bribe factory.
     *
     * Emits an {SetPermissionRegistry} event with new permission registry address
     *
     * Requirements:
     * - Can only be called by the contract owner.
     * - `permissionsRegistry_` cannot be the zero address.
     *
     * @param permissionsRegistry_ The new permissions registry address.
     */
    function setPermissionsRegistry(address permissionsRegistry_) external;

    /**
     * @dev Return the address of the last created bribe contract.
     */
    function lastBribe() external view returns (address);

    /**
     * @dev Return the address of the voter contract.
     */
    function voter() external view returns (address);

    /**
     * @dev Returns the total number of bribes created.
     *
     * @return uint256 The total number of bribes.
     */
    function length() external view returns (uint256);

    /**
     * @dev Lists a subset of all bribes, defined by an offset and a limit.
     *
     * @param offset_ The starting index for the subset.
     * @param limit_ The maximum number of items to return.
     * @return address[] Array of bribe contract addresses in the specified range.
     */
    function list(uint256 offset_, uint256 limit_) external view returns (address[] memory);

    /**
     * @dev Returns the addresses of the default reward tokens.
     *
     * @return address[] An array of addresses of the default reward tokens.
     */
    function getDefaultRewardTokens() external view returns (address[] memory);

    /**
     * @dev Checks if a given address is a default reward token.
     *
     * @param token_ The address to check.
     * @return bool True if `token_` is a default reward token, false otherwise.
     */
    function isDefaultRewardToken(address token_) external view returns (bool);
}
