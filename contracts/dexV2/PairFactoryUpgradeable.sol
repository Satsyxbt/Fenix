// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

import {YieldMode, IPairFactory} from "./interfaces/IPairFactory.sol";
import {IPair} from "./interfaces/IPair.sol";
import {IFeesVaultFactory} from "../integration/interfaces/IFeesVaultFactory.sol";
import {BlastGovernorSetup} from "../integration/BlastGovernorSetup.sol";
import {IBlastERC20RebasingManage} from "../integration/interfaces/IBlastERC20RebasingManage.sol";

contract PairFactoryUpgradeable is IPairFactory, BlastGovernorSetup, AccessControlUpgradeable {
    bytes32 public constant override PAIRS_ADMINISTRATOR_ROLE = keccak256("PAIRS_ADMINISTRATOR");
    bytes32 public constant override FEES_MANAGER_ROLE = keccak256("FEES_MANAGER");
    bytes32 public constant override PAIRS_CREATOR_ROLE = keccak256("PAIRS_CREATOR");

    uint256 public constant MAX_FEE = 500; // 0.25%
    uint256 public constant PRECISION = 10000; // 100%

    address public override implementation;
    bool public override isPaused;
    bool public override isPublicPoolCreationMode;

    uint256 public protocolFee;
    uint256 public stableFee;
    uint256 public volatileFee;

    address public communityVaultFactory;
    address public defaultBlastGovernor;

    mapping(address => YieldMode) public configurationForBlastRebaseTokens;
    mapping(address => bool) public isRebaseToken;

    address[] public allPairs;
    mapping(address => mapping(address => mapping(bool => address))) public getPair;
    mapping(address => bool) public isPair; // simplified check if its a pair, given that `stable` flag might not be available in peripherals

    mapping(address => uint256) internal _customFee;
    mapping(address => uint256) internal _customProtocolFee;

    constructor() {
        _disableInitializers();
    }

    function initialize(address blastGovernor_, address implementation_, address communityVaultFactory_) external initializer {
        __BlastGovernorSetup_init(blastGovernor_);
        __AccessControl_init();
        _checkAddressZero(implementation_);
        _checkAddressZero(communityVaultFactory_);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        stableFee = 4; // 0.04%
        volatileFee = 18; // 0.18%
        protocolFee = 10000; // 100% of stable/volatileFee to communit vaults

        implementation = implementation_;

        communityVaultFactory = communityVaultFactory_;
        defaultBlastGovernor = blastGovernor_;
    }

    function setConfigurationForRebaseToken(address token_, bool isRebase_, YieldMode mode_) external onlyRole(PAIRS_ADMINISTRATOR_ROLE) {
        isRebaseToken[token_] = isRebase_;
        configurationForBlastRebaseTokens[token_] = mode_;
        emit SetConfigurationForRebaseToken(token_, isRebase_, mode_);
    }

    function setPause(bool _state) external onlyRole(PAIRS_ADMINISTRATOR_ROLE) {
        isPaused = _state;
        emit SetPaused(_state);
    }

    function setDefaultBlastGovernor(address defaultBlastGovernor_) external onlyRole(PAIRS_ADMINISTRATOR_ROLE) {
        _checkAddressZero(defaultBlastGovernor_);
        defaultBlastGovernor = defaultBlastGovernor_;
        emit SetDefaultBlastGovernor(defaultBlastGovernor_);
    }

    function setCommunityVaultFactory(address communityVaultFactory_) external onlyRole(PAIRS_ADMINISTRATOR_ROLE) {
        _checkAddressZero(communityVaultFactory_);
        communityVaultFactory = communityVaultFactory_;
        emit SetCommunityVaultFactory(communityVaultFactory_);
    }

    function setIsPublicPoolCreationMode(bool mode_) external onlyRole(PAIRS_ADMINISTRATOR_ROLE) {
        isPublicPoolCreationMode = mode_;
        emit SetIsPublicPoolCreationMode(mode_);
    }

    function setProtocolFee(uint256 _newFee) external onlyRole(FEES_MANAGER_ROLE) {
        if (_newFee > PRECISION) {
            revert IncorrcectFee();
        }
        protocolFee = _newFee;
        emit SetProtocolFee(_newFee);
    }

    function setCustomProtocolFee(address _pair, uint256 _newFee) external onlyRole(FEES_MANAGER_ROLE) {
        _checkFeeAndPair(_pair, _newFee, PRECISION);
        _customProtocolFee[_pair] = _newFee;
        emit SetCustomProtocolFee(_pair, _newFee);
    }

    function setCustomFee(address _pair, uint256 _fee) external onlyRole(FEES_MANAGER_ROLE) {
        _checkFeeAndPair(_pair, _fee, MAX_FEE);
        _customFee[_pair] = _fee;
        emit SetCustomFee(_pair, _fee);
    }

    function setFee(bool _stable, uint256 _fee) external onlyRole(FEES_MANAGER_ROLE) {
        if (_fee == 0 || _fee > MAX_FEE) {
            revert IncorrcectFee();
        }
        if (_stable) {
            stableFee = _fee;
        } else {
            volatileFee = _fee;
        }

        emit SetFee(_stable, _fee);
    }

    function createPair(address tokenA, address tokenB, bool stable) external virtual override returns (address pair) {
        if (!isPublicPoolCreationMode) {
            _checkRole(PAIRS_CREATOR_ROLE);
        }

        if (tokenA == tokenB) {
            revert IdenticalAddress();
        }

        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        if (token0 == address(0)) {
            revert AddressZero();
        }

        if (getPair[token0][token1][stable] != address(0)) {
            revert PairExist();
        }

        pair = Clones.cloneDeterministic(implementation, keccak256(abi.encodePacked(token0, token1, stable)));

        address feesVaultForPool = IFeesVaultFactory(communityVaultFactory).createVaultForPool(pair);

        IPair(pair).initialize(defaultBlastGovernor, token0, token1, stable, feesVaultForPool);

        if (isRebaseToken[token0]) {
            IBlastERC20RebasingManage(pair).configure(token0, configurationForBlastRebaseTokens[token0]);
        }

        if (isRebaseToken[token1]) {
            IBlastERC20RebasingManage(pair).configure(token1, configurationForBlastRebaseTokens[token1]);
        }

        getPair[token0][token1][stable] = pair;
        getPair[token1][token0][stable] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        isPair[pair] = true;

        emit PairCreated(token0, token1, stable, pair, allPairs.length);
    }

    function hasRole(bytes32 role, address user) public view override(AccessControlUpgradeable, IPairFactory) returns (bool) {
        return super.hasRole(role, user);
    }

    // Stub functions for future improvments
    function getHookTarget(address /*pair_*/) external view virtual override returns (address) {
        return address(0);
    }

    function getFee(address pair_, bool stable_) external view virtual override returns (uint256) {
        uint256 fee = _customFee[pair_];
        if (fee != 0) {
            return fee;
        }
        return stable_ ? stableFee : volatileFee;
    }

    function getProtocolFee(address pair_) external view virtual override returns (uint256) {
        uint256 fee = _customProtocolFee[pair_];
        if (fee != 0) {
            return fee;
        }
        return protocolFee;
    }

    function allPairsLength() external view virtual override returns (uint) {
        return allPairs.length;
    }

    function pairs() external view virtual override returns (address[] memory) {
        return allPairs;
    }

    function _checkFeeAndPair(address pair_, uint256 fee_, uint256 upperLimit_) internal view {
        if (fee_ > upperLimit_) {
            revert IncorrcectFee();
        }
        if (!isPair[pair_]) {
            revert IncorrectPair();
        }
    }

    /**
     * @dev Checked provided address on zero value, throw AddressZero error in case when addr_ is zero
     *
     * @param addr_ The address which will checked on zero
     */
    function _checkAddressZero(address addr_) internal pure {
        if (addr_ == address(0)) {
            revert AddressZero();
        }
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}
