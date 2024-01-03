// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

import "../interfaces/factories/IBribeFactoryUpgradeable.sol";
import "../interfaces/IBribeUpgradeable.sol";
import "../Bribe.sol";

contract BribeFactoryUpgradeable is IBribeFactoryUpgradeable, AccessControlUpgradeable {
    bytes32 public constant BRIBE_ADMIN_ROLE = keccak256("BRIBE_ADMIN");

    address public override lastBribe;
    address public override voter;

    mapping(address => bool) public override isDefaultRewardToken;

    address[] internal _defaultRewardTokens;
    address[] internal _bribes;
    address internal _bribeImplementation;

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address voter_,
        address bribeImplementation_,
        address[] calldata defaultRewardTokens_
    ) external virtual override initializer {
        __AccessControl_init();

        voter = voter_;

        //bribe default tokens
        for (uint256 i; i < defaultRewardTokens_.length;) {
            _pushDefaultRewardToken(defaultRewardTokens_[i]);
            unchecked {
                i++;
            }
        }

        _setImplementation(bribeImplementation_);
    }

    function implementation() external view virtual override returns (address) {
        return _bribeImplementation;
    }

    /**
     * @dev Upgrades the bribes to a new implementation.
     *
     * Emits an {Upgraded} event.
     *
     * Requirements:
     *
     * - msg.sender must have the ADMIN_ROLE of the contract.
     * - `newImplementation_` must be a contract.
     */
    function upgradeTo(address newImplementation_) external virtual override onlyRole(DEFAULT_ADMIN_ROLE) {
        _setImplementation(newImplementation_);
        emit Upgraded(newImplementation_);
    }

    /// @notice create a bribe contract
    /// @dev _owner must be teamMultisig
    function createBribe(
        address owner_,
        address token0_,
        address token1_,
        string memory type_
    ) external virtual override returns (address) {
        if (_msgSender() != voter) {
            _checkRole(DEFAULT_ADMIN_ROLE);
        }

        address newBribeProxy = address(
            new BeaconProxy(address(this), abi.encodeWithSelector(BribeUpgradeable.initialize.selector, voter, address(this), type_))
        );

        IBribeUpgradeable newBribe = IBribeUpgradeable(newBribeProxy);

        if (token0_ != address(0)) newBribe.addReward(token0_);
        if (token1_ != address(0)) newBribe.addReward(token1_);

        newBribe.addRewards(_defaultRewardTokens);

        lastBribe = newBribeProxy;

        _bribes.push(newBribeProxy);

        return newBribeProxy;
    }

    /* Can be called only from BRIBE_ADMIN_ROLE */

    /// @notice Add a reward token to a given bribe
    function addRewardToBribe(address token_, address bribe_) external virtual override onlyRole(BRIBE_ADMIN_ROLE) {
        IBribeUpgradeable(bribe_).addReward(token_);
    }

    /// @notice Add a reward token to given bribes
    function addRewardToBribes(address token_, address[] calldata bribes_) external virtual override onlyRole(BRIBE_ADMIN_ROLE) {
        for (uint256 i; i < bribes_.length; ) {
            IBribeUpgradeable(bribes_[i]).addReward(token_);
            unchecked {
                i++;
            }
        }
    }
    /// @notice Add multiple reward token to a given bribe
    function addRewardsToBribe(address[] calldata token_, address bribe_) external virtual override onlyRole(BRIBE_ADMIN_ROLE) {
        for (uint256 i; i < token_.length; ) {
            IBribeUpgradeable(bribe_).addReward(token_[i]);
            unchecked {
                i++;
            }
        }
    }

    /// @notice Add multiple reward tokens to given bribes
    function addRewardsToBribes(
        address[][] calldata token_,
        address[] calldata bribes_
    ) external virtual override onlyRole(BRIBE_ADMIN_ROLE) {
        for (uint256 i; i < bribes_.length; ) {
            for (uint256 k; k < token_.length; ) {
                IBribeUpgradeable(bribes_[i]).addReward(token_[i][k]);
                unchecked {
                    k++;
                }
            }
            unchecked {
                i++;
            }
        }
    }

    /* Can be called only from ADMIN_ROLE */

    function pushDefaultRewardToken(address token_) external virtual override onlyRole(DEFAULT_ADMIN_ROLE) {
        _pushDefaultRewardToken(token_);
    }

    function removeDefaultRewardToken(address token_) external virtual override onlyRole(DEFAULT_ADMIN_ROLE) {
        if (isDefaultRewardToken[token_]) {
            for (uint256 i; i < _defaultRewardTokens.length; ) {
                if (_defaultRewardTokens[i] == token_) {
                    _defaultRewardTokens[i] = _defaultRewardTokens[_defaultRewardTokens.length - 1];
                    _defaultRewardTokens.pop();
                    delete isDefaultRewardToken[token_];
                    return;
                }
                unchecked {
                    i++;
                }
            }
        }
        revert TokenIsMissing();
    }

    function setVoter(address voter_) external virtual override onlyRole(DEFAULT_ADMIN_ROLE) {
        require(voter_ != address(0));
        voter = voter_;
    }

    /// @notice set a new voter in given bribes
    function setBribeVoter(address[] calldata bribes_, address voter_) external virtual override onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i; i < bribes_.length; ) {
            IBribeUpgradeable(bribes_[i]).setVoter(voter_);
            unchecked {
                i++;
            }
        }
    }

    /// @notice set a new minter in given bribes
    function setBribeMinter(address[] memory bribes_, address minter_) external virtual override onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i; i < bribes_.length; ) {
            IBribeUpgradeable(bribes_[i]).setMinter(minter_);
            unchecked {
                i++;
            }
        }
    }

    /// @notice set a new owner in given bribes
    function setBribeOwner(address[] memory bribes_, address _owner) external virtual override onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i; i < bribes_.length; ) {
            IBribeUpgradeable(bribes_[i]).setOwner(_owner);
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
    ) external virtual override onlyRole(DEFAULT_ADMIN_ROLE) {
        if (bribes_.length == tokens_.length && bribes_.length == amounts_.length) {
            revert MismatchLen();
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
        address[] calldata bribes_,
        address[] calldata tokens_,
        uint256[] calldata amounts_
    ) external virtual override onlyRole(DEFAULT_ADMIN_ROLE) {
        if (bribes_.length == tokens_.length && bribes_.length == amounts_.length) {
            revert MismatchLen();
        }
        for (uint256 i; i < bribes_.length; ) {
            if (amounts_[i] > 0) IBribeUpgradeable(bribes_[i]).emergencyRecoverERC20(tokens_[i], amounts_[i]);
            unchecked {
                i++;
            }
        }
    }

    function _pushDefaultRewardToken(address token_) internal virtual {
        if (token_ == address(0)) {
            revert ZeroAddress();
        }
        if (isDefaultRewardToken[token_]) {
            revert TokenAlreadyAdded();
        }
        isDefaultRewardToken[token_] = true;
        _defaultRewardTokens.push(token_);
    }

    /**
     * @dev Sets the implementation contract address for this beacon
     *
     * Requirements:
     *
     * - `newImplementation` must be a contract.
     */
    function _setImplementation(address newImplementation_) internal virtual {
        require(Address.isContract(newImplementation_), "UpgradeableBeacon: implementation is not a contract");
        _bribeImplementation = newImplementation_;
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}
