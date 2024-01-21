// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {BeaconProxy} from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import {EnumerableSetUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import {IPermissionsRegistry} from "../interfaces/IPermissionsRegistry.sol";
import {IBribeUpgradeable} from "../interfaces/IBribeUpgradeable.sol";
import {IBribeFactoryUpgradeable} from "../interfaces/factories/IBribeFactoryUpgradeable.sol";
import {BaseFactoryUpgradeable} from "./BaseFactoryUpgradeable.sol";

/**
 * @title BribeFactoryUpgradeable
 * @author Fenix Protocol team
 * @dev This contract creates and manages bribe contracts
 *      Inherits from OwnableUpgradeable and BaseFactoryUpgradeable for ownership and factory patterns,
 *      respectively. It uses EnumerableSetUpgradeable to manage a set of addresses.
 *      It is a variant of BeaconUpgrade, providing the implementation address of the deployed bribes,
 *      as well as a mechanism for updating the implementation of all bribes
 */
contract BribeFactoryUpgradeable is IBribeFactoryUpgradeable, BaseFactoryUpgradeable, OwnableUpgradeable {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    /**
     * @dev Stores the address of the last created bribe contract.
     */
    address public override lastBribe;

    /**
     * @dev Stores the address of the voter contract.
     */
    address public override voter;

    /**
     * @dev Reference to the permissions registry contract.
     * This contract manages various roles and permissions within the ecosystem.
     */
    IPermissionsRegistry public permissionsRegistry;

    /**
     * @dev An array storing addresses of all the bribe contracts created.
     */
    address[] internal _bribes;

    /**
     * @dev A set of addresses representing the default reward tokens.
     * Utilizes OpenZeppelin's EnumerableSetUpgradeable for efficient address management.
     */
    EnumerableSetUpgradeable.AddressSet internal _defaultRewardTokens;

    /**
     * @dev Modifier to restrict function access to either the contract owner or addresses with the 'BRIBE_ADMIN' role.
     * Checks if the message sender is the owner or has the 'BRIBE_ADMIN' role in the permissions registry.
     * Reverts with 'AccessDenied' custom error if the conditions are not met.
     */
    modifier onlyAllowed() {
        if (_msgSender() != owner() && !permissionsRegistry.hasRole("BRIBE_ADMIN", _msgSender())) {
            revert AccessDenied();
        }
        _;
    }

    /**
     * @dev Modifier to check that address is not the zero address.
     * Checks if the provided address is the zero address and reverts with 'ZeroAddress' error if it is.
     */
    modifier notZero(address addr_) {
        if (addr_ == address(0)) {
            revert ZeroAddress();
        }
        _;
    }

    /**
     * @dev Initializes the contract by disabling initializers to prevent the implementation contract
     * from being misused.
     */
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract with necessary components and initial configuration.
     *
     * This function sets the initial state of the contract, including the addresses of key contracts
     * within the Fenix ecosystem and initial default reward tokens.
     *
     * @param voter_ Address of the Voting contract through which Gauge and  Bribes is created.
     * @param permissionsRegistry_ The address of the Permissions Registry contract, used to manage access and roles.
     * @param bribeImeplementation_ The implementation address for the bribe contracts created by this factory.
     * @param defaultRewardTokens_ An array of addresses representing the default reward tokens to be used in bribe contracts.
     */
    function initialize(
        address voter_,
        address permissionsRegistry_,
        address bribeImeplementation_,
        address[] calldata defaultRewardTokens_
    ) external virtual override initializer notZero(voter_) notZero(permissionsRegistry_) {
        __Base_Factory_init(bribeImeplementation_);
        __Ownable_init(); //after deploy ownership to multisig
        voter = voter_;
        permissionsRegistry = IPermissionsRegistry(permissionsRegistry_);

        for (uint256 i; i < defaultRewardTokens_.length; ) {
            _pushDefaultRewardToken(defaultRewardTokens_[i]);
            unchecked {
                i++;
            }
        }
    }

    /**
     * @dev Upgrades the bribes to a new implementation.
     *
     * Requirements:
     *
     * - msg.sender must be the owner of the contract.
     * - `newImplementation` must be a contract.
     */
    function upgradeProxiesTo(address newImplementation_) external virtual override onlyOwner {
        _setImplementation(newImplementation_);
    }

    /**
     * @dev Creates a new bribe contract
     *
     * Emits an {BribeCreated} event with new bribe address
     *
     * Requirements:
     * - msg.sender must be the voter or the owner of this contract.
     * - Parameters must meet the requirements of the initializer {IBribeUpgradeable-initializer}
     *
     * @param owner_ The owner of the new bribe contract, must be multisign
     * @param token0_ First reward token address
     * @param token1_ Second reward token address
     * @param type_ The type of bribe
     * @return Address of the newly created bribe contract
     */
    function createBribe(
        address owner_,
        address token0_,
        address token1_,
        string memory type_
    ) external virtual override returns (address) {
        if (_msgSender() != voter && _msgSender() != owner()) {
            revert AccessDenied();
        }

        IBribeUpgradeable newBribe = IBribeUpgradeable(
            address(
                new BeaconProxy(
                    address(this),
                    abi.encodeWithSelector(IBribeUpgradeable.initialize.selector, owner_, voter, address(this), type_)
                )
            )
        );

        if (token0_ != address(0)) newBribe.addRewardToken(token0_);
        if (token1_ != address(0)) newBribe.addRewardToken(token1_);

        newBribe.addRewardTokens(_getDefaultRewardTokens());

        lastBribe = address(newBribe);
        _bribes.push(address(newBribe));

        emit BribeCreated(address(newBribe));

        return address(newBribe);
    }

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
    function setVoter(address voter_) external virtual override onlyOwner notZero(voter_) {
        voter = voter_;
        emit SetVoter(voter_);
    }

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
    function setPermissionsRegistry(address permissionsRegistry_) external virtual override onlyOwner notZero(permissionsRegistry_) {
        permissionsRegistry = IPermissionsRegistry(permissionsRegistry_);
        emit SetPermissionRegistry(permissionsRegistry_);
    }

    /**
     * @dev Adds a default reward token to the bribe factory.
     *
     * Requirements:
     * - Can only be called by the contract owner.
     *
     * @param token_ The token address to add as a default reward token.
     */
    function pushDefaultRewardToken(address token_) external virtual override onlyOwner {
        _pushDefaultRewardToken(token_);
    }

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
    function removeDefaultRewardToken(address token_) external virtual override onlyOwner notZero(token_) {
        if (!_defaultRewardTokens.remove(token_)) {
            revert RewardTokenNotExist();
        }
        emit RemoveDefaultRewardToken(token_);
    }

    /**
     * @dev Sets a new voter for a batch of bribe contracts.
     *
     * Requirements:
     * - Can only be called by the contract owner.
     *
     * @param bribes_ Array of bribe contract addresses.
     * @param voter_ The new voter address to be set in the given bribe contracts.
     */
    function setBribesVoter(address[] calldata bribes_, address voter_) external virtual override onlyOwner {
        for (uint256 i; i < bribes_.length; ) {
            IBribeUpgradeable(bribes_[i]).setVoter(voter_);
            unchecked {
                i++;
            }
        }
    }

    /**
     * @dev Sets a new emission manager for a batch of bribe contracts.
     *
     * Requirements:
     * - Can only be called by the contract owner.
     *
     * @param bribes_ Array of bribe contract addresses.
     * @param emissionManager_ The new minter address to be set in the given bribe contracts.
     */
    function setBribesEmissionManager(address[] calldata bribes_, address emissionManager_) external virtual override onlyOwner {
        for (uint256 i; i < bribes_.length; ) {
            IBribeUpgradeable(bribes_[i]).setEmissionManager(emissionManager_);
            unchecked {
                i++;
            }
        }
    }

    /**
     * @dev Sets a new owner for a batch of bribe contracts.
     *
     * Requirements:
     * - Can only be called by the contract owner.
     *
     * @param bribes_ Array of bribe contract addresses.
     * @param owner_ The new owner address to be set in the given bribe contracts.
     */
    function setBribesOwner(address[] calldata bribes_, address owner_) external virtual override onlyOwner {
        for (uint256 i; i < bribes_.length; ) {
            IBribeUpgradeable(bribes_[i]).setOwner(owner_);
            unchecked {
                i++;
            }
        }
    }

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
    function emergencyRecoverERC20(
        address[] calldata bribes_,
        address[] calldata tokens_,
        uint256[] calldata amounts_
    ) external virtual override onlyOwner {
        if (bribes_.length != tokens_.length || bribes_.length != amounts_.length) {
            revert MismatchArrayLen();
        }
        for (uint256 i; i < bribes_.length; ) {
            if (amounts_[i] > 0) IBribeUpgradeable(bribes_[i]).emergencyRecoverERC20(tokens_[i], amounts_[i]);
            unchecked {
                i++;
            }
        }
    }

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
    function recoverERC20AndUpdateData(
        address[] calldata bribes_,
        address[] calldata tokens_,
        uint256[] calldata amounts_
    ) external virtual override onlyOwner {
        if (bribes_.length != tokens_.length || bribes_.length != amounts_.length) {
            revert MismatchArrayLen();
        }
        for (uint256 i; i < bribes_.length; ) {
            if (amounts_[i] > 0) IBribeUpgradeable(bribes_[i]).recoverERC20AndUpdateData(tokens_[i], amounts_[i]);
            unchecked {
                i++;
            }
        }
    }

    /**
     * @dev Adds a reward token to a specific bribe contract.
     *
     * Requirements:
     * - Can only be called by an authorized user (owner or user with 'BRIBE_ADMIN' role).
     * - `bribe_` cannot be the zero address.
     *
     * @param token_ The reward token address to add.
     * @param bribe_ The bribe contract address to which the reward token will be added.
     */
    function addRewardTokenToBribe(address token_, address bribe_) external virtual override onlyAllowed {
        IBribeUpgradeable(bribe_).addRewardToken(token_);
    }

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
    function addRewardTokensToBribe(address[] calldata token_, address bribe_) external virtual override onlyAllowed {
        IBribeUpgradeable(bribe_).addRewardTokens(token_);
    }

    /**
     * @dev Adds a reward token to multiple bribe contracts.
     *
     * Requirements:
     * - Can only be called by an authorized user (owner or user with 'BRIBE_ADMIN' role).
     *
     * @param token_ The reward token address to add to each bribe contract.
     * @param bribes_ Array of bribe contract addresses.
     */
    function addRewardTokenToBribes(address token_, address[] calldata bribes_) external virtual override onlyAllowed {
        for (uint256 i; i < bribes_.length; ) {
            IBribeUpgradeable(bribes_[i]).addRewardToken(token_);
            unchecked {
                i++;
            }
        }
    }

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
    function addRewardTokensToBribes(address[][] calldata tokens_, address[] calldata bribes_) external virtual override onlyAllowed {
        if (bribes_.length != tokens_.length) {
            revert MismatchArrayLen();
        }
        for (uint256 i; i < bribes_.length; ) {
            address bribe = bribes_[i];
            IBribeUpgradeable(bribe).addRewardTokens(tokens_[i]);
            unchecked {
                i++;
            }
        }
    }

    /**
     * @dev Returns the total number of bribes created.
     *
     * @return uint256 The total number of bribes.
     */
    function length() external view virtual override returns (uint256) {
        return _bribes.length;
    }

    /**
     * @dev Lists a subset of all bribes, defined by an offset and a limit.
     *
     * @param offset_ The starting index for the subset.
     * @param limit_ The maximum number of items to return.
     * @return address[] Array of bribe contract addresses in the specified range.
     */
    function list(uint256 offset_, uint256 limit_) external view virtual override returns (address[] memory) {
        uint256 totalBribes = _bribes.length;
        if (offset_ >= totalBribes) {
            return new address[](0);
        }
        uint256 numElements = limit_;
        if (offset_ + limit_ > totalBribes) {
            numElements = totalBribes - offset_;
        }
        address[] memory gaugeSubset = new address[](numElements);
        for (uint256 i; i < numElements; ) {
            gaugeSubset[i] = _bribes[offset_ + i];
            unchecked {
                i++;
            }
        }
        return gaugeSubset;
    }

    /**
     * @dev Returns the addresses of the default reward tokens.
     *
     * @return address[] An array of addresses of the default reward tokens.
     */
    function getDefaultRewardTokens() external view virtual override returns (address[] memory) {
        return _getDefaultRewardTokens();
    }

    /**
     * @dev Checks if a given address is a default reward token.
     *
     * @param token_ The address to check.
     * @return bool True if `token_` is a default reward token, false otherwise.
     */
    function isDefaultRewardToken(address token_) external view virtual override returns (bool) {
        return _defaultRewardTokens.contains(token_);
    }

    /**
     * @dev Internal function to get default reward tokens.
     *
     * @return address[] An array of addresses of the default reward tokens.
     */
    function _getDefaultRewardTokens() internal view virtual returns (address[] memory) {
        return _defaultRewardTokens.values();
    }

    /**
     * @dev Internal function to add a default reward token.
     *
     * Emits an {AddedDefaultRewardToken} event with added default reward token
     *
     * Requirements:
     * - `token_` cannot be the zero address.
     * - `token_` must not already exist as a default reward token.
     *
     * @param token_ The reward token address to add as default.
     */
    function _pushDefaultRewardToken(address token_) internal virtual notZero(token_) {
        if (!_defaultRewardTokens.add(token_)) {
            revert RewardTokenExist();
        }
        emit AddedDefaultRewardToken(token_);
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}
