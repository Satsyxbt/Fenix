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

    /// @notice create a bribe contract
    /// @dev    _owner must be fenixTeamMultisign
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

    /* -----------------------------------------------------------------------------
    --------------------------------------------------------------------------------
    --------------------------------------------------------------------------------
                                    ONLY OWNER
    --------------------------------------------------------------------------------
    --------------------------------------------------------------------------------
    ----------------------------------------------------------------------------- */

    /// @notice set the bribe factory voter
    function setVoter(address voter_) external virtual override onlyOwner notZero(voter_) {
        voter = voter_;
    }

    /// @notice set the bribe factory permission registry
    function setPermissionsRegistry(address permissionsRegistry_) external virtual override onlyOwner notZero(permissionsRegistry_) {
        permissionsRegistry = IPermissionsRegistry(permissionsRegistry_);
    }

    /// @notice set the bribe factory permission registry
    function pushDefaultRewardToken(address token_) external virtual override onlyOwner {
        _pushDefaultRewardToken(token_);
    }

    /// @notice set the bribe factory permission registry
    function removeDefaultRewardToken(address token_) external virtual override onlyOwner notZero(token_) {
        if (!_defaultRewardTokens.remove(token_)) {
            revert RewardTokenNotExist();
        }
        emit RemoveDefaultRewardToken(token_);
    }

    /// @notice set a new voter in given bribes
    function setBribesVoter(address[] memory bribes_, address voter_) external virtual override onlyOwner {
        for (uint256 i; i < bribes_.length; ) {
            IBribeUpgradeable(bribes_[i]).setVoter(voter_);
            unchecked {
                i++;
            }
        }
    }

    /// @notice set a new minter in given bribes
    function setBribesMinter(address[] memory bribes_, address minter_) external virtual override onlyOwner {
        for (uint256 i; i < bribes_.length; ) {
            IBribeUpgradeable(bribes_[i]).setMinter(minter_);
            unchecked {
                i++;
            }
        }
    }

    /// @notice set a new owner in given bribes
    function setBribesOwner(address[] memory bribes_, address owner_) external virtual override onlyOwner {
        for (uint256 i; i < bribes_.length; ) {
            IBribeUpgradeable(bribes_[i]).setOwner(owner_);
            unchecked {
                i++;
            }
        }
    }

    /// @notice recover an ERC20 from bribe contracts.
    function recoverERC20From(
        address[] memory bribes_,
        address[] memory tokens_,
        uint256[] memory amounts_
    ) external virtual override onlyOwner {
        if (bribes_.length == tokens_.length && bribes_.length == amounts_.length) {
            revert MismatchArrayLen();
        }
        for (uint256 i; i < bribes_.length; ) {
            if (amounts_[i] > 0) IBribeUpgradeable(bribes_[i]).emergencyRecoverERC20(tokens_[i], amounts_[i]);
            unchecked {
                i++;
            }
        }
    }

    /// @notice recover an ERC20 from bribe contracts and update.
    function recoverERC20AndUpdateData(
        address[] memory bribes_,
        address[] memory tokens_,
        uint256[] memory amounts_
    ) external virtual override onlyOwner {
        if (bribes_.length == tokens_.length && bribes_.length == amounts_.length) {
            revert MismatchArrayLen();
        }
        for (uint256 i; i < bribes_.length; ) {
            if (amounts_[i] > 0) IBribeUpgradeable(bribes_[i]).emergencyRecoverERC20(tokens_[i], amounts_[i]);
            unchecked {
                i++;
            }
        }
    }

    /* -----------------------------------------------------------------------------
    --------------------------------------------------------------------------------
    --------------------------------------------------------------------------------
                                    ONLY OWNER or BRIBE ADMIN
    --------------------------------------------------------------------------------
    --------------------------------------------------------------------------------
    ----------------------------------------------------------------------------- */

    /// @notice Add a reward token to a given bribe
    function addRewardTokenToBribe(address token_, address bribe_) external virtual override onlyAllowed {
        IBribeUpgradeable(bribe_).addReward(token_);
    }

    /// @notice Add multiple reward token to a given bribe
    function addRewardTokensToBribe(address[] memory token_, address bribe_) external virtual override onlyAllowed {
        for (uint256 i; i < token_.length; ) {
            IBribeUpgradeable(bribe_).addReward(token_[i]);
            unchecked {
                i++;
            }
        }
    }

    /// @notice Add a reward token to given bribes
    function addRewardTokenToBribes(address token_, address[] memory bribes_) external virtual override onlyAllowed {
        for (uint256 i; i < bribes_.length; ) {
            IBribeUpgradeable(bribes_[i]).addReward(token_);
            unchecked {
                i++;
            }
        }
    }

    /// @notice Add multiple reward tokens to given bribes
    function addRewardTokensToBribes(address[][] memory tokens_, address[] memory bribes_) external virtual override onlyAllowed {
        for (uint256 i; i < bribes_.length; ) {
            address bribe = bribes_[i];
            for (uint256 k; k < tokens_.length; ) {
                IBribeUpgradeable(bribe).addReward(tokens_[i][k]);
                unchecked {
                    k++;
                }
            }
            unchecked {
                i++;
            }
        }
    }

    function length() external view virtual override returns (uint256) {
        return _bribes.length;
    }

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

    function getDefaultRewardTokens() external view virtual override returns (address[] memory) {
        return _getDefaultRewardTokens();
    }

    function isDefaultRewardToken(address token_) external view virtual override returns (bool) {
        return _defaultRewardTokens.contains(token_);
    }

    function _getDefaultRewardTokens() internal view returns (address[] memory) {
        return _defaultRewardTokens.values();
    }

    function _pushDefaultRewardToken(address token_) internal notZero(token_) {
        if (!_defaultRewardTokens.add(token_)) {
            revert RewardTokenExist();
        }
        emit AddedDefaultRewardToken(token_);
    }
}
