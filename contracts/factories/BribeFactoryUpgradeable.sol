// // SPDX-License-Identifier: MIT
// pragma solidity =0.8.19;

// import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
// import {BeaconProxy} from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

// import {IBribeFactoryUpgradeable} from "../interfaces/factories/IBribeFactoryUpgradeable.sol";
// import {IBribeUpgradeable} from "../interfaces/IBribeUpgradeable.sol";
// import {BaseFactoryUpgradeable} from "./BaseFactoryUpgradeable.sol";

// /**
//  * @title BribeFactoryUpgradeable Contract
//  * @author The Fenix Protocol team
//  * @dev
//  */
// contract BribeFactoryUpgradeable is IBribeFactoryUpgradeable, BaseFactoryUpgradeable {
//     address public lastBribe;
//     address public voter;
//     address[] public defaultRewardToken;
//     address[] internal _bribes;

//     /**
//      * @dev Initializes the contract by disabling initializers to prevent the implementation contract
//      * from being misused.
//      */
//     constructor() {
//         _disableInitializers();
//     }

//     /**
//      * @dev Initializes the contract with the provided parameters.
//      * Sets up the initial configuration for the bribe factory, including the voter address,
//      * the bribe implementation, and the default reward tokens.
//      *
//      * @param voter_ Address to be set as the voter.
//      * @param bribeImplementation_ Address of the bribe implementation contract.
//      * @param defaultRewardTokens_ Array of addresses for the default reward tokens.
//      */
//     function initialize(
//         address voter_,
//         address bribeImplementation_,
//         address[] calldata defaultRewardTokens_
//     ) external virtual override initializer {
//         __Base_Factory_init(bribeImplementation_);

//         voter = voter_;

//         //bribe default tokens
//         for (uint256 i; i < defaultRewardTokens_.length; ) {
//             _pushDefaultRewardToken(defaultRewardTokens_[i]);
//             unchecked {
//                 i++;
//             }
//         }

//         _setImplementation(bribeImplementation_);
//     }

//     /// @notice create a bribe contract
//     /// @dev _owner must be teamMultisig
//     function createBribe(
//         address owner_,
//         address token0_,
//         address token1_,
//         string memory type_
//     ) external virtual override returns (address) {
//         if (_msgSender() != voter) {
//             _checkRole(DEFAULT_ADMIN_ROLE);
//         }

//         address newBribeProxy = address(
//             new BeaconProxy(address(this), abi.encodeWithSelector(BribeUpgradeable.initialize.selector, voter, address(this), type_))
//         );

//         IBribeUpgradeable newBribe = IBribeUpgradeable(newBribeProxy);

//         if (token0_ != address(0)) newBribe.addReward(token0_);
//         if (token1_ != address(0)) newBribe.addReward(token1_);

//         newBribe.addRewards(_defaultRewardTokens);

//         lastBribe = newBribeProxy;

//         _bribes.push(newBribeProxy);

//         emit BribeCreated(newBribeProxy);

//         return newBribeProxy;
//     }

//     /* Can be called only from BRIBE_ADMIN_ROLE */

//     /// @notice Add a reward token to a given bribe
//     function addRewardToBribe(address token_, address bribe_) external virtual override onlyRole(BRIBE_ADMIN_ROLE) {
//         IBribeUpgradeable(bribe_).addReward(token_);
//     }

//     /// @notice Add a reward token to given bribes
//     function addRewardToBribes(address token_, address[] calldata bribes_) external virtual override onlyRole(BRIBE_ADMIN_ROLE) {
//         for (uint256 i; i < bribes_.length; ) {
//             IBribeUpgradeable(bribes_[i]).addReward(token_);
//             unchecked {
//                 i++;
//             }
//         }
//     }

//     /// @notice Add multiple reward token to a given bribe
//     function addRewardsToBribe(address[] calldata token_, address bribe_) external virtual override onlyRole(BRIBE_ADMIN_ROLE) {
//         for (uint256 i; i < token_.length; ) {
//             IBribeUpgradeable(bribe_).addReward(token_[i]);
//             unchecked {
//                 i++;
//             }
//         }
//     }

//     /// @notice Add multiple reward tokens to given bribes
//     function addRewardsToBribes(
//         address[][] calldata token_,
//         address[] calldata bribes_
//     ) external virtual override onlyRole(BRIBE_ADMIN_ROLE) {
//         for (uint256 i; i < bribes_.length; ) {
//             for (uint256 k; k < token_.length; ) {
//                 IBribeUpgradeable(bribes_[i]).addReward(token_[i][k]);
//                 unchecked {
//                     k++;
//                 }
//             }
//             unchecked {
//                 i++;
//             }
//         }
//     }

//     /* Can be called only from ADMIN_ROLE */

//     function pushDefaultRewardToken(address token_) external virtual override onlyOwner {
//         _pushDefaultRewardToken(token_);
//     }

//     function removeDefaultRewardToken(address token_) external virtual override onlyOwner {
//         for (uint256 i; i < defaultRewardToken.length; ) {
//             if (defaultRewardToken[i] == token_) {
//                 defaultRewardToken[i] = defaultRewardToken[defaultRewardToken.length - 1];
//                 defaultRewardToken.pop();
//                 return;
//             }
//             unchecked {
//                 i++;
//             }
//         }
//         revert TokenIsMissing();
//     }

//     function setVoter(address voter_) external virtual override onlyOwner {
//         require(voter_ != address(0));
//         voter = voter_;
//     }

//     /// @notice set a new voter in given bribes
//     function setBribeVoter(address[] calldata bribes_, address voter_) external virtual override onlyOwner {
//         for (uint256 i; i < bribes_.length; ) {
//             IBribeUpgradeable(bribes_[i]).setVoter(voter_);
//             unchecked {
//                 i++;
//             }
//         }
//     }

//     /// @notice set a new minter in given bribes
//     function setBribeMinter(address[] memory bribes_, address minter_) external virtual override onlyOwner {
//         for (uint256 i; i < bribes_.length; ) {
//             IBribeUpgradeable(bribes_[i]).setMinter(minter_);
//             unchecked {
//                 i++;
//             }
//         }
//     }

//     /// @notice set a new owner in given bribes
//     function setBribeOwner(address[] memory bribes_, address _owner) external virtual override onlyOwner {
//         for (uint256 i; i < bribes_.length; ) {
//             IBribeUpgradeable(bribes_[i]).setOwner(_owner);
//             unchecked {
//                 i++;
//             }
//         }
//     }

//     /// @notice recover an ERC20 from bribe contracts.
//     function recoverERC20From(
//         address[] calldata bribes_,
//         address[] calldata tokens_,
//         uint256[] calldata amounts_
//     ) external virtual override onlyOwner {
//         if (bribes_.length == tokens_.length && bribes_.length == amounts_.length) {
//             revert MismatchLen();
//         }
//         for (uint256 i; i < bribes_.length; ) {
//             if (amounts_[i] > 0) IBribeUpgradeable(bribes_[i]).emergencyRecoverERC20(tokens_[i], amounts_[i]);
//             unchecked {
//                 i++;
//             }
//         }
//     }

//     /// @notice recover an ERC20 from bribe contracts and update.
//     function recoverERC20AndUpdateData(
//         address[] calldata bribes_,
//         address[] calldata tokens_,
//         uint256[] calldata amounts_
//     ) external virtual override onlyOwner {
//         if (bribes_.length == tokens_.length && bribes_.length == amounts_.length) {
//             revert MismatchLen();
//         }
//         for (uint256 i; i < bribes_.length; ) {
//             if (amounts_[i] > 0) IBribeUpgradeable(bribes_[i]).emergencyRecoverERC20(tokens_[i], amounts_[i]);
//             unchecked {
//                 i++;
//             }
//         }
//     }

//     function _pushDefaultRewardToken(address token_) internal virtual {
//         if (token_ == address(0)) {
//             revert ZeroAddress();
//         }
//         if (isDefaultRewardToken[token_]) {
//             revert TokenAlreadyAdded();
//         }
//         isDefaultRewardToken[token_] = true;
//         _defaultRewardTokens.push(token_);
//     }

//     /**
//      * @dev This empty reserved space is put in place to allow future versions to add new
//      * variables without shifting down storage in the inheritance chain.
//      * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
//      */
//     uint256[50] private __gap;
// }
